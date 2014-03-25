define(["dojo/_base/declare", "dojo/when", "dojo/promise/all", "dojo/_base/array", "nq/nqWebGlChart", 'dojo/dom-construct', "dojo/_base/lang", 
        "dojo/dom-geometry", "dojo/Deferred"],
	function(declare, when, all, arrayUtil, nqWebGlChart, domConstruct, lang, domGeom, Deferred){

	return declare("nqClassChartWidget", [nqWebGlChart], {
		XYAxisRootId: '844/67', // Process Classes 
		ZYAxisRootId: '844/53', //Attributes
		viewId: '844',
		nameAttrId: 852,
		bodyViewHeight: 400,
		bodyViewWidth: 800,
		bodyViewDepth: 800,
		skyboxArray: [ 'img/Neuralquest/space_3_right.jpg', 'img/Neuralquest/space_3_left.jpg', 'img/Neuralquest/space_3_top.jpg' ,'img/Neuralquest/space_3_bottom.jpg','img/Neuralquest/space_3_front.jpg','img/Neuralquest/space_3_back.jpg'],
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
					//console.log(cellPositionsObj);
					this.clearScene();
					sceneObject3D = this.fillScene(this.XYAxisRootId, cellPositionsObj);
					var positionInfo = cellPositionsObj[this.XYAxisRootId];
					var ourVec = new THREE.Vector3(- positionInfo.pos.x, 0, 0 );
					sceneObject3D.position = ourVec;
					this.addToScene(sceneObject3D);

					var arr = [];
					var attrPositionsObj = {};
					when(this.buildHierarchy(this.ZYAxisRootId, attrPositionsObj, arr), lang.hitch(this, function(attrItem){
						var newPos = new THREE.Vector3();
						this.postionObjectsXY(this.ZYAxisRootId, newPos, attrPositionsObj);
						//this.moveAttributesToProperPosition(cellPositionsObj, attrPositionsObj);
						sceneObject3D = this.fillScene(this.ZYAxisRootId, attrPositionsObj);
						var ourVec = new THREE.Vector3(0, this.bodyViewHeight*2, -this.bodyViewWidth);
						sceneObject3D.rotation.y += Math.PI / 2;;
						sceneObject3D.position = ourVec;
						this.addToScene(sceneObject3D);
						this.drawAssociations(cellPositionsObj, attrPositionsObj);
						deferred.resolve(classItem);
					}));
				}));
			}));
			return deferred;
		},
		buildHierarchy: function(objectId, cellPositionsObj, parentChildrenArray){
			if(objectId in cellPositionsObj) return;//loop protection
			return when(this.store.get(objectId), lang.hitch(this, function(classItem){
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
				cellPositionsObj[objectId] = {children: children, name: classItem[this.nameAttrId], associations: classItem['1613']}; 
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
		moveAttributesToProperPosition: function(cellPositionsObj, attrPositionsObj){
			for(var key in cellPositionsObj){
				var associations = cellPositionsObj[key].associations;
				if(!associations) continue;
				var attibutesArr = associations['4'];//attributes
				if(attibutesArr){
					var classMesh = this.getMeshByName(key);
					if(!classMesh) continue;
					var classPosition = new THREE.Vector3();
					classPosition.getPositionFromMatrix( classMesh.matrixWorld );
					for(var i=0;i<attibutesArr.length;i++){
						var attrId = attibutesArr[i];
						var attrMesh = this.getMeshByName(attrId);
						if(!attrMesh) continue;
						var attrPosition = new THREE.Vector3();
						attrPosition.getPositionFromMatrix( attrMesh.matrixWorld );
						var newPosition = new THREE.Vector3();
						newPosition.z = attrPosition.z;
						newPosition.x = classPosition.x;
						newPosition.y = classPosition.y;
						attrMesh.worldToLocal(newPosition);
						//attrMesh.position = newPosition;
					}					
				}
			}
			for(var key in cellPositionsObj){
				var associations = cellPositionsObj[key].associations;
				if(!associations) continue;
				var attibutesArr = associations['4'];
				if(!attibutesArr) continue;
				var cellPositionInfo = cellPositionsObj[key];
				for(var i=0;i<attibutesArr.length;i++){
					var attrId = attibutesArr[i];
					var attrPositionInfo = attrPositionsObj[attrId];
					var newPos = new THREE.Vector3();
					newPos.x = attrPositionInfo.pos.x;
					newPos.y = cellPositionInfo.pos.y;
					newPos.z = cellPositionInfo.pos.z;
					attrPositionInfo.pos = newPos;
				}
			}
			
		},
		fillScene: function(objectId, cellPositionsObj){

			var classMaterial = new THREE.MeshLambertMaterial( {color: 0x8904B1});
			//var connectorMaterial =  new THREE.MeshPhongMaterial({specular: 0xffffff, color: 0x9F9F9F, emissive: 0x4F4F4F,shininess: 100 });
			var connectorMaterial = new THREE.MeshLambertMaterial({color: 0xEFEFEF});
			var textMaterial = new THREE.MeshLambertMaterial({color: 0xEFEFEF});
			//console.dir(cellPositionsObj);
			var sceneObject3D = new THREE.Object3D();
			for(var key in cellPositionsObj){
				var positionInfo = cellPositionsObj[key];

				var classObject = new THREE.Object3D();
				classObject.position = positionInfo.pos;
				
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
				//for the subclasses
				if(positionInfo.children.length>0){
					//get the length of the connector
					var firstId = positionInfo.children[0];
					var firstPos = new THREE.Vector3();
					var lastId = positionInfo.children[positionInfo.children.length -1];
					var lastPos = new THREE.Vector3();
					firstPos.x = cellPositionsObj[firstId].pos.x;
					firstPos.y = positionInfo.pos.y - this.bodyViewHeight/2;
					firstPos.z = positionInfo.pos.z;
					lastPos.x = cellPositionsObj[lastId].pos.x;
					lastPos.y = positionInfo.pos.y - this.bodyViewHeight/2;
					lastPos.z = positionInfo.pos.z;
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
					
					//vertical connector to super attr
					var ourVec = new THREE.Vector3( positionInfo.pos.x, positionInfo.pos.y - this.bodyViewHeight/2, positionInfo.pos.z);
					this.drawBeam(positionInfo.pos, ourVec, connectorMaterial, sceneObject3D);
					
					//vertical connectors to sub classes
					for(var i=0;i<positionInfo.children.length;i++){
						var chlidClassItemId = positionInfo.children[i];
						var childPositionInfo = cellPositionsObj[chlidClassItemId];
						var connectorDestPos = new THREE.Vector3();
						connectorDestPos.x = childPositionInfo.pos.x;
						connectorDestPos.y = firstPos.y;
						connectorDestPos.z = firstPos.z;
						this.drawBeam(connectorDestPos, childPositionInfo.pos, connectorMaterial, sceneObject3D);
					};
				}
			}
			return sceneObject3D;		
		},
		drawAssociations: function(cellPositionsObj, attrPositionsObj){
			var sceneObject3D = new THREE.Object3D();
			for(var key in cellPositionsObj){
				var associations = cellPositionsObj[key].associations;
				if(!associations) continue;
				var fromMesh = this.getMeshByName(key);
				if(!fromMesh) continue;
				var fromPosition = new THREE.Vector3();
				fromPosition.getPositionFromMatrix( fromMesh.matrixWorld );
				var attibutesArr = associations['4'];//attributes
				if(attibutesArr){
					var connectorMaterial = new THREE.MeshLambertMaterial({color: 0x000EF});//blue
					for(var i=0;i<attibutesArr.length;i++){
						var toObjId = attibutesArr[i];
						var toMesh = this.getMeshByName(toObjId);
						if(!toMesh) continue;
						var toPosition = new THREE.Vector3();
						toPosition.getPositionFromMatrix( toMesh.matrixWorld );
						this.drawBeam(fromPosition, toPosition, connectorMaterial, sceneObject3D, 'attribute', false, false);
					}
				}
				var attibutesArr = associations['8'];// ordered
				if(attibutesArr){
					var connectorMaterial = new THREE.MeshLambertMaterial({color: 0xEF0000}); //red
					for(var i=0;i<attibutesArr.length;i++){
						var toObjId = attibutesArr[i];
						var toMesh = this.getMeshByName(toObjId);
						if(!toMesh) continue;
						var toPosition = new THREE.Vector3();
						toPosition.getPositionFromMatrix( toMesh.matrixWorld );
						this.drawHorseshoe(fromPosition, toPosition, connectorMaterial, sceneObject3D, 'ordered', false, true);
					}
				}
				var attibutesArr = associations['10'];//many to many
				if(attibutesArr){
					var connectorMaterial = new THREE.MeshLambertMaterial({color: 0x00EFEF});
					for(var i=0;i<attibutesArr.length;i++){
						var toObjId = attibutesArr[i];
						var toMesh = this.getMeshByName(toObjId);
						if(!toMesh) continue;
						var toPosition = new THREE.Vector3();
						toPosition.getPositionFromMatrix( toMesh.matrixWorld );
						this.drawHorseshoe(fromPosition, toPosition, connectorMaterial, sceneObject3D, 'many to many', true, true);
					}
				}
				var attibutesArr = associations['11']; // one to many
				if(attibutesArr){
					var connectorMaterial = new THREE.MeshLambertMaterial({color: 0x00EF00});//green
					for(var i=0;i<attibutesArr.length;i++){
						var toObjId = attibutesArr[i];
						var toMesh = this.getMeshByName(toObjId);
						if(!toMesh) continue;
						var toPosition = new THREE.Vector3();
						toPosition.getPositionFromMatrix( toMesh.matrixWorld );
						this.drawHorseshoe(fromPosition, toPosition, connectorMaterial, sceneObject3D, 'one to many', false, true);
					}
				}
			}
			this.addToScene(sceneObject3D);			
		},
		drawHorseshoe: function(fromPosition, toPosition, connectorMaterial, sceneObject3D, name, fromCone, toCone){
			var secondPos = new THREE.Vector3();
			secondPos.copy(fromPosition);
			secondPos.z += this.bodyViewDepth/2;
			var thirdPos = new THREE.Vector3();
			thirdPos.copy(toPosition);
			thirdPos.z += this.bodyViewDepth/2;
			this.drawBeam(fromPosition, secondPos, connectorMaterial, sceneObject3D);
			this.drawBeam(secondPos, thirdPos, connectorMaterial, sceneObject3D, name);
			this.drawBeam(thirdPos, toPosition, connectorMaterial, sceneObject3D);

			var sphereGeometry = new THREE.SphereGeometry( 10 );
			//sphere at the left end
			var leftSphere = new THREE.Mesh( sphereGeometry, connectorMaterial );
			leftSphere.position = secondPos;
			sceneObject3D.add(leftSphere);
			
			//sphere at the right end
			var rightSphere = new THREE.Mesh( sphereGeometry, connectorMaterial );
			rightSphere.position = thirdPos;
			sceneObject3D.add(rightSphere);

			var coneGeometry = new THREE.CylinderGeometry(0, 50, 180, 50, 50, false);
			//cone at the left end
			if(fromCone){
				var leftCone = new THREE.Mesh( coneGeometry, connectorMaterial );
				leftCone.position = fromPosition;
				leftCone.position.z += 60;
				leftCone.rotation.x = Math.PI / 2;
				sceneObject3D.add(leftCone);
			}
			//cone at the right end
			if(toCone){
				var rightCone = new THREE.Mesh( coneGeometry, connectorMaterial );
				rightCone.position = toPosition;
				rightCone.position.z += 60;
				rightCone.rotation.x = Math.PI / 2;
				sceneObject3D.add(rightCone);
			}
		},
		drawBeam: function(p1, p2, beamMaterial, sceneObject3D, name){
			var diffVector = new THREE.Vector3();
			diffVector.subVectors(p2, p1);

			var beamVector = new THREE.Vector3( 0, 1, 0 );
			var theta = beamVector.angleTo(diffVector);

			var rotationAxis = new THREE.Vector3();
			rotationAxis.crossVectors(beamVector, diffVector);
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
			
			if(name){
				var textMaterial = new THREE.MeshLambertMaterial({color: 0xEFEFEF});
				var text3d = new THREE.TextGeometry(name, {size: 30, height: 1, font: 'helvetiker'});
				var textMesh = new THREE.Mesh(text3d, textMaterial);
				text3d.computeBoundingBox();
				var xOffset = -0.5 * ( text3d.boundingBox.max.x - text3d.boundingBox.min.x );
				textMesh.position = postionVec;
				textMesh.position.x += xOffset;
				textMesh.position.z += 20;
				textMesh.rotation.y = Math.PI * 2;
				sceneObject3D.add(textMesh);
			}

		}
	});
});
