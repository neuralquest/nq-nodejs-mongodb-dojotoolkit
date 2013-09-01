define(["dojo/_base/declare", "dojo/when", "dojo/promise/all", "dojo/_base/array", "nq/NqWebGlChart", 'dojo/dom-construct', "dojo/_base/lang", 
        "dojo/dom-geometry", "dojo/Deferred"],
	function(declare, when, all, arrayUtil, NqWebGlChart, domConstruct, lang, domGeom, Deferred){

	return declare("NqClassChartWidget", [NqWebGlChart], {
		classGeometry: null,

		startup: function(){
			this.inherited(arguments);
			// load any meshes, return a defered so that loading the scene can wait
			var loader = new THREE.JSONLoader(true);			
			var deferred = new Deferred();
			loader.load("img/Neuralquest/mesh/classMesh.js", lang.hitch(this, function(geometry, materials) {
				this.classGeometry = geometry;
				var parentChildrenArray = [];
				var cellPositionsObj = {};
				when(this.buildHierarchy(this.bodyRootId, cellPositionsObj, parentChildrenArray), lang.hitch(this, function(classItem){
					var newPos = new THREE.Vector3( 0, 0, 0 );
					this.postionObjects(this.bodyRootId, newPos, cellPositionsObj);
					console.log(cellPositionsObj);
					this.fillScene(this.bodyRootId, cellPositionsObj);	
					deferred.resolve(classItem);
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
				var childrenY = [];
				var childrenZ = [];
				var viewYArr = classItem[this.bodyViewXYAxisId];
				for(var i=0;i<viewYArr.length;i++){
					var subObjectId = viewYArr[i];
					var result = this.buildHierarchy(subObjectId, cellPositionsObj, childrenY);
					promisses.push(result);				
				}
				if(this.bodyViewZAxisId){
					var viewZArr = classItem[this.bodyViewZAxisId];
					for(var i=0;i<viewZArr.length;i++){
						var subObjectId = viewZArr[i];
						childrenZ.push(subObjectId);
						var result = when(_nqDataStore.get(subObjectId), lang.hitch(this, function(classItem){
							cellPositionsObj[subObjectId] = {childrenY: [], childrenZ: []}; 						
						}));
						promisses.push(result);				
					}
				}			
				cellPositionsObj[objectId] = {childrenY: childrenY, childrenZ: childrenZ}; 
				return all(promisses);
			}));
		},
		postionObjects: function(objectId, ourPos, cellPositionsObj){
			var x = ourPos.x;
			var y = ourPos.y - this.bodyViewHeight;
			var z = ourPos.z;
			var childrenY = cellPositionsObj[objectId].childrenY;
			for(var i=0;i<childrenY.length;i++){
				var subObjectId = childrenY[i];
				var newPos = new THREE.Vector3( x, y, z );
				this.postionObjects(subObjectId, newPos, cellPositionsObj);
				x = x + this.bodyViewWidth;
			}
			if(childrenY.length>1){
				var maxXId = childrenY[childrenY.length-1];
				var maxX = cellPositionsObj[maxXId].pos.x;
				ourPos.x = (maxX - ourPos.x)/2 + ourPos.x;
			}
			cellPositionsObj[objectId].pos = ourPos;
		},
		fillScene: function(objectId, cellPositionsObj){
			this.clearScene();
			var classMaterial = new THREE.MeshLambertMaterial( {color: 0x8904B1});
			var connectorMaterial =  new THREE.MeshPhongMaterial({specular: 0xffffff, color: 0x9F9F9F, emissive: 0x4F4F4F,shininess: 100 });
			var textMaterial = new THREE.MeshLambertMaterial({color: 0xEFEFEF});
			//console.dir(cellPositionsObj);
			var sceneObject3D = new THREE.Object3D();
			for(var key in cellPositionsObj){
				var positionInfo = cellPositionsObj[key];

				var classObject = new THREE.Object3D();
				classObject.position = positionInfo.pos;
				if(positionInfo.rotate == true) classObject.rotation.y = + 90 * ( Math.PI / 180 );
				
				//The mesh
		    	mesh = new THREE.Mesh(this.classGeometry, classMaterial);
		        mesh.scale.set(100,100,100);
		        mesh.name = key;
		        classObject.add(mesh);
		        classObject.name = positionInfo.name;
		        
		        this.selectableObjects.push(mesh);
		        
		        //The Name
		        var name = _nqDataStore.get(key)[852];
				var text3d = new THREE.TextGeometry(name, {size: 30, height: 5, font: 'helvetiker'});
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
				if(positionInfo.childrenY.length>0){
					//get the length of the connector
					var firstId = positionInfo.childrenY[0];
					var firstX = cellPositionsObj[firstId].pos.x;
					var lastId = positionInfo.childrenY[positionInfo.childrenY.length -1];
					var lastX = cellPositionsObj[lastId].pos.x;
					var connectorLength = lastX - firstX;

					//horizontal connector
					var connectorGeometry = new THREE.CylinderGeometry( 10, 10, connectorLength, 15, 15, true );
					var connectorMesh = new THREE.Mesh( connectorGeometry, connectorMaterial );
					var ourVec = new THREE.Vector3( positionInfo.pos.x, positionInfo.pos.y - 200, positionInfo.pos.z);
					connectorMesh.position = ourVec;
					connectorMesh.rotation.z = + 90 * ( Math.PI / 180 );
					sceneObject3D.add(connectorMesh);

					//sphere at the left end
					var connectorGeometry = new THREE.SphereGeometry( 10 );
					var connectorMesh = new THREE.Mesh( connectorGeometry, connectorMaterial );
					var ourVec = new THREE.Vector3(firstX, positionInfo.pos.y - 200, positionInfo.pos.z);
					connectorMesh.position = ourVec;
					sceneObject3D.add(connectorMesh);
					
					//sphere at the right end
					var connectorGeometry = new THREE.SphereGeometry( 10 );
					var connectorMesh = new THREE.Mesh( connectorGeometry, connectorMaterial );
					var ourVec = new THREE.Vector3(lastX, positionInfo.pos.y - 200, positionInfo.pos.z);
					connectorMesh.position = ourVec;
					sceneObject3D.add(connectorMesh);
					
					//vertical connector to super class
					var connectorGeometry = new THREE.CylinderGeometry( 10, 10, 200, 15, 15, true );
					var connectorMesh = new THREE.Mesh( connectorGeometry, connectorMaterial );
					var ourVec = new THREE.Vector3( positionInfo.pos.x, positionInfo.pos.y - 100, positionInfo.pos.z);
					connectorMesh.position = ourVec;
					sceneObject3D.add(connectorMesh);
					
					//vertical connectors to sub class
					arrayUtil.forEach(positionInfo.childrenY, function(chlidClassItemId){
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
		}
	});
});
