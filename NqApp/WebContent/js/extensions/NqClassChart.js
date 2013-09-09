define(["dojo/_base/declare", "dojo/when", "dojo/promise/all", "dojo/_base/array", "nq/NqWebGlChart", 'dojo/dom-construct', "dojo/_base/lang", 
        "dojo/dom-geometry", "dojo/Deferred"],
	function(declare, when, all, arrayUtil, NqWebGlChart, domConstruct, lang, domGeom, Deferred){

	return declare("NqClassChartWidget", [NqWebGlChart], {
		XYAxisRootId: null,
		ZYAxisRootId: null,
		viewId: null,
		nameAttrId: null,
		bodyViewHeight: 400,
		bodyViewWidth: 800,
		bodyViewDepth: 800,
		classGeometry: null,

		startup: function(){
			this.inherited(arguments);
			
			// load any meshes, return a defered so that selecting the object can wait
			var loader = new THREE.JSONLoader(true);			
			var deferred = new Deferred();
			loader.load("img/Neuralquest/mesh/classMesh.js", lang.hitch(this, function(geometry, materials) {
				this.classGeometry = geometry;
				var parentChildrenArray = [];
				var cellPositionsObj = {};
				when(this.buildHierarchy(this.XYAxisRootId, cellPositionsObj, parentChildrenArray), lang.hitch(this, function(classItem){
					var newPos = new THREE.Vector3( 0, 0, 0 );
					this.postionObjectsXY(this.XYAxisRootId, newPos, cellPositionsObj);
					console.log(cellPositionsObj);
					this.clearScene();
					this.fillScene(this.XYAxisRootId, cellPositionsObj, false);	

					var arr = [];
					var attrPositionsObj = {};
					when(this.buildHierarchy(this.ZYAxisRootId, attrPositionsObj, arr), lang.hitch(this, function(attrItem){
						var newPos = new THREE.Vector3( 0, 0, 0 );
						this.postionObjectsZY(this.ZYAxisRootId, newPos, attrPositionsObj);
						console.log(attrPositionsObj);
						this.fillScene(this.ZYAxisRootId, attrPositionsObj, true);	
						deferred.resolve(classItem);
					}));
				}));
			}));
			return deferred;
		},
		buildHierarchy: function(objectId, cellPositionsObj, parentChildrenArray){
			if(objectId in cellPositionsObj) return;//loop protection
			return when(_nqDataStore.get(objectId), lang.hitch(this, function(classItem){
				if(classItem.classId != 0) return;// class as opposed to object
				parentChildrenArray.push(classItem.id);
				var promisses = [];
				var children = [];
				var viewYArr = classItem[this.viewId];
				for(var i=0;i<viewYArr.length;i++){
					var subObjectId = viewYArr[i];
					var result = this.buildHierarchy(subObjectId, cellPositionsObj, children);
					promisses.push(result);				
				}
				cellPositionsObj[objectId] = {children: children, name: classItem[this.nameAttrId]}; 
				return all(promisses);
			}));
		},
		postionObjectsXY: function(objectId, ourPos, cellPositionsObj){
			var x = ourPos.x;
			var y = ourPos.y - this.bodyViewHeight;
			var z = ourPos.z;
			var maxXUntilNow = ourPos.x;
			var children = cellPositionsObj[objectId].children;
			for(var i=0;i<children.length;i++){
				var subObjectId = children[i];
				var newPos = new THREE.Vector3( x, y, z );
				maxXUntilNow = this.postionObjectsXY(subObjectId, newPos, cellPositionsObj);
				x = maxXUntilNow + this.bodyViewWidth;
			}
			if(children.length>1){
				var maxXId = children[children.length-1];
				var maxX = cellPositionsObj[maxXId].pos.x;
				var minXId = children[0];
				var minX = cellPositionsObj[minXId].pos.x;
				ourPos.x = (maxX - minX)/2 + minX;
			}
			cellPositionsObj[objectId].pos = ourPos;
			return maxXUntilNow;
		},
		postionObjectsZY: function(objectId, ourPos, cellPositionsObj){
			var x = ourPos.x;
			var y = ourPos.y - this.bodyViewHeight;
			var z = ourPos.z;
			var maxZUntilNow = ourPos.z;
			var children = cellPositionsObj[objectId].children;
			for(var i=0;i<children.length;i++){
				var subObjectId = children[i];
				var newPos = new THREE.Vector3( x, y, z );
				maxZUntilNow = this.postionObjectsZY(subObjectId, newPos, cellPositionsObj);
				z = maxZUntilNow - this.bodyViewDepth;
			}
			if(children.length>1){
				var maxZId = children[children.length-1];
				var maxZ = cellPositionsObj[maxZId].pos.z;
				var minZId = children[0];
				var minZ = cellPositionsObj[minZId].pos.z;
				ourPos.z = (maxZ - minZ)/2 + minZ;
			}
			cellPositionsObj[objectId].pos = ourPos;
			return maxZUntilNow;
		},
		fillScene: function(objectId, cellPositionsObj, rotate){
			var classMaterial = new THREE.MeshLambertMaterial( {color: 0x8904B1});
			var connectorMaterial =  new THREE.MeshPhongMaterial({specular: 0xffffff, color: 0x9F9F9F, emissive: 0x4F4F4F,shininess: 100 });
			var textMaterial = new THREE.MeshLambertMaterial({color: 0xEFEFEF});
			//console.dir(cellPositionsObj);
			var sceneObject3D = new THREE.Object3D();
			for(var key in cellPositionsObj){
				var positionInfo = cellPositionsObj[key];

				var classObject = new THREE.Object3D();
				classObject.position = positionInfo.pos;
				if(rotate == true) classObject.rotation.y = + 90 * ( Math.PI / 180 );
				
				//The mesh
		    	mesh = new THREE.Mesh(this.classGeometry, classMaterial);
		        mesh.scale.set(100,100,100);
		        mesh.name = key;
		        classObject.add(mesh);
		        classObject.name = positionInfo.name;
		        
		        this.selectableObjects.push(mesh);
		        
		        //The Name
		        var name = positionInfo.name;
				var text3d = new THREE.TextGeometry(name, {size: 30, height: 1, font: 'helvetiker'});
				//var text3d = new THREE.TextGeometry( 'Organizations', {size: 70, height: 20, curveSegments: 4, font: 'helvetiker', weight: 'normal', style: 'normal',  });
				text3d.computeBoundingBox();
				var xOffset = -0.5 * ( text3d.boundingBox.max.x - text3d.boundingBox.min.x );
				var yOffset = -0.5 * ( text3d.boundingBox.max.y - text3d.boundingBox.min.y );
				var textMesh = new THREE.Mesh(text3d, textMaterial);
				textMesh.position.x = xOffset;
				textMesh.position.y = yOffset;
				textMesh.position.z = 55;
				textMesh.rotation.x = 0;
				textMesh.rotation.y = Math.PI * 2;
				classObject.add(textMesh);
				
				sceneObject3D.add(classObject);
			}
			//now add connectors
			for(var key in cellPositionsObj){
				var positionInfo = cellPositionsObj[key];
				//z axis for the attributes
				if(positionInfo.lastAttrId < 0) {					
					var connectorLength = positionInfo.lastAttrId;
					var connectorGeometry = new THREE.CylinderGeometry( 10, 10, connectorLength, 15, 15, true );
					var connectorMesh = new THREE.Mesh( connectorGeometry, connectorMaterial );
					var ourVec = new THREE.Vector3( positionInfo.pos.x, positionInfo.pos.y, positionInfo.pos.z + (connectorLength/2) );
					connectorMesh.position = ourVec;
					connectorMesh.rotation.x = + 90 * ( Math.PI / 180 );
					sceneObject3D.add(connectorMesh);
				}
				//for the subclasses
				if(positionInfo.children.length>0){
					//get the length of the connector
					var firstId = positionInfo.children[0];
					var firstPos = new THREE.Vector3();
					firstPos.copy(cellPositionsObj[firstId].pos);
					firstPos.y = firstPos.y + this.bodyViewHeight/2;
					var lastId = positionInfo.children[positionInfo.children.length -1];
					var lastPos = new THREE.Vector3();
					lastPos.copy(cellPositionsObj[lastId].pos);
					lastPos.y = lastPos.y + this.bodyViewHeight/2;
					
					//horizontal connector
					this.drawBeam(firstPos, lastPos, connectorMaterial, sceneObject3D);
					
					//sphere at the left end
					var connectorGeometry = new THREE.SphereGeometry( 10 );
					var connectorMesh = new THREE.Mesh( connectorGeometry, connectorMaterial );
					connectorMesh.position = firstPos;
					sceneObject3D.add(connectorMesh);
					
					//sphere at the right end
					var connectorGeometry = new THREE.SphereGeometry( 10 );
					var connectorMesh = new THREE.Mesh( connectorGeometry, connectorMaterial );
					connectorMesh.position = lastPos;
					sceneObject3D.add(connectorMesh);
					
					//vertical connector to super class
					var connectorGeometry = new THREE.CylinderGeometry( 10, 10, 200, 15, 15, true );
					var connectorMesh = new THREE.Mesh( connectorGeometry, connectorMaterial );
					var ourVec = new THREE.Vector3( positionInfo.pos.x, positionInfo.pos.y - 100, positionInfo.pos.z);
					connectorMesh.position = ourVec;
					sceneObject3D.add(connectorMesh);
					
					//vertical connectors to sub classes
					arrayUtil.forEach(positionInfo.children, function(chlidClassItemId){
						var positionInfo = cellPositionsObj[chlidClassItemId];
						var connectorGeometry = new THREE.CylinderGeometry( 10, 10, 200, 15, 15, true );
						var connectorMesh = new THREE.Mesh( connectorGeometry, connectorMaterial );
						var ourVec = new THREE.Vector3( positionInfo.pos.x, positionInfo.pos.y + 100, positionInfo.pos.z);
						connectorMesh.position = ourVec;
						sceneObject3D.add(connectorMesh);
						
					});
				}
			}
			var positionInfo = cellPositionsObj[objectId];
			var ourVec = new THREE.Vector3(- positionInfo.pos.x, 0, 0 );
			sceneObject3D.position = ourVec;
			this.addToScene(sceneObject3D);
		},
		drawBeam: function(p1, p2, beamMaterial, sceneObject3D){
			var diffVector = new THREE.Vector3();
			diffVector.subVectors(p2, p1);

			var beamVector = new THREE.Vector3( 0, 1, 0 );
			var theta = beamVector.angleTo(diffVector);

			var rotationAxis = new THREE.Vector3();
			rotationAxis.crossVectors(diffVector, beamVector);
			if ( rotationAxis.length() < 0.000001 )
			{
				// Special case: if rotationAxis is just about zero, set to X axis,
				// so that the angle can be given as 0 or PI. This works ONLY
				// because we know one of the two axes is +Y.
				rotationAxis.set( 1, 0, 0 );
			}
			rotationAxis.normalize();
	
			var postionVec = new THREE.Vector3();
			postionVec.copy(diffVector);
			postionVec.divideScalar(2);
			postionVec.add(p1);

			var orientation = new THREE.Matrix4();
			orientation.matrixAutoUpdate = false;
			orientation.makeRotationAxis(rotationAxis, theta);
			orientation.setPosition(postionVec);

			var beamLength = diffVector.length();
			var beamGeometry = new THREE.CylinderGeometry(10, 10, beamLength, 12, 1, true );
			beamGeometry.applyMatrix(orientation);//apply transformation for geometry
			var beamMesh = new THREE.Mesh( beamGeometry, beamMaterial );
			sceneObject3D.add(beamMesh);

		}
	});
});
