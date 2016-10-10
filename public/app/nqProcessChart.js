define(["dojo/_base/declare", "dojo/when", "dojo/promise/all", "dojo/_base/array", "app/nqWebGlChart", 'dojo/dom-construct', "dojo/_base/lang", 
        "dojo/dom-geometry", "dojo/Deferred", 'dojo/store/Memory'],
	function(declare, when, all, arrayUtil, nqWebGlChart, domConstruct, lang, domGeom, Deferred, Memory){
        var docPositionStore = new Memory({});

	return declare("nqProcessChart", [nqWebGlChart], {
        bodyViewHeight: 400,
        bodyViewWidth: 800,
        bodyViewDepth: 800,

        orgUnitRootId: null,
		orgUnitViewId: null,
		orgUnitNameAttrId: null,
		stateRootId: null,
		stateViewId: null,
		stateNameAttrId: null,
		gridHeight: 400,
		gridWidth: 800,
		gridDepth: 800,
		rowHeaderWidth: 200,
		highlightColors: [],
		rowHeaderColors: [],
		stateColors: [],
		swimlaneColors: [],
		
				
		postCreate: function(){
			this.inherited(arguments);//create the scene

			this.highlightColors.push(new THREE.Color( 0xFFFFEF ));
			this.highlightColors.push(new THREE.Color( 0xFFFFEF ));
			this.highlightColors.push(new THREE.Color( 0xFFFF00 ));
			this.highlightColors.push(new THREE.Color( 0xFFFF00 ));

			this.rowHeaderColors.push(new THREE.Color( 0x6699FF ));
			this.rowHeaderColors.push(new THREE.Color( 0x3366FF ));
			this.rowHeaderColors.push(new THREE.Color( 0x3366FF ));
			this.rowHeaderColors.push(new THREE.Color( 0x3333FF ));

			this.stateColors.push(new THREE.Color( 0x66FF66 ));
			this.stateColors.push(new THREE.Color( 0x33CC33 ));
			this.stateColors.push(new THREE.Color( 0x33CC33 ));
			this.stateColors.push(new THREE.Color( 0x009900 ));

			this.swimlaneColors.push(new THREE.Color( 0xB2E6FF ));
			this.swimlaneColors.push(new THREE.Color( 0x85D6FF ));
			this.swimlaneColors.push(new THREE.Color( 0x85D6FF ));
			this.swimlaneColors.push(new THREE.Color( 0x5CB8E6 ));
/*
return;
			
			var parentChildrenArray = [];
			var rowHeaderPositionsObj = {};
			when(this.buildHierarchy(this.orgUnitRootId, rowHeaderPositionsObj, parentChildrenArray, this.orgUnitViewId, this.orgUnitNameAttrId), lang.hitch(this, function(classItem){
				var newPos = new THREE.Vector3( 0, 0, 0 );
				this.postionObjectsOrgUnit(this.orgUnitRootId, newPos, rowHeaderPositionsObj);
				//console.log(rowHeaderPositionsObj);
				this.clearScene();
				sceneObject3D = this.drawRowHeader(this.orgUnitRootId, rowHeaderPositionsObj);
				var positionInfo = rowHeaderPositionsObj[this.orgUnitRootId];
				var ourVec = new THREE.Vector3(0, - positionInfo.pos.y, 0 );
//				sceneObject3D.position = ourVec;
				this.addToScene(sceneObject3D, 'rowHeader');

				var arr = [];
				var statePositionsObj = {};
				when(this.buildHierarchy(this.stateRootId, statePositionsObj, arr, this.stateViewId, this.stateNameAttrId), lang.hitch(this, function(attrItem){
					var newPos = new THREE.Vector3();
					this.postionObjectsState(this.stateRootId, newPos, statePositionsObj, rowHeaderPositionsObj);
					//this.moveAttributesToProperPosition(rowHeaderPositionsObj, statePositionsObj);
					sceneObject3D = this.drawStates(this.stateRootId, statePositionsObj);
					//var ourVec = new THREE.Vector3(0, this.gridHeight*2, -this.gridWidth);
					//sceneObject3D.rotation.y += Math.PI / 2;;
					//sceneObject3D.position = ourVec;
					this.addToScene(sceneObject3D, 'body');
					
					this.createDeferred.resolve(this);//tell the caller that the diagram is done
				}));
			}));*/
		},
        _setDocIdAttr: function(docId){
            if(docId == this.docId) return;
            this.inherited(arguments);
            var self = this;
            if(!this.docId) return;
            self.store.get(self.docId).then(function(doc){
                var offeringsId =  '574234113c6d3cd598a5a30b';
                when(self.store.isA(doc, offeringsId), function(res){
                    if(res == true){
                        var initialStateId = doc.initialStateId;
                        if(initialStateId){
                            when(self.buildStateHierarchy(initialStateId), function (res) {
                                console.dir(docPositionStore);
                                var newPos = new THREE.Vector3(0, 0, 0);
                                self.positionStates(initialStateId, newPos);
                                //find the lowest class
                                /*var lowestY = 0;
                                 docPositionStore.query({}).forEach(function (cellInfo) {
                                 if(cellInfo.pos && cellInfo.pos.y < lowestY) lowestY = cellInfo.pos.y;
                                 });
                                 self.positionObjects(lowestY);
                                 //shift all the cells
                                 var positionInfo = docPositionStore.get(self.rootId);
                                 var addPos = new THREE.Vector3(-positionInfo.pos.x, 0, 0);
                                 docPositionStore.query({}).forEach(function (cellInfo) {
                                 cellInfo.pos.add(addPos);
                                 });*/
                                self.clearScene();
                                var sceneObject3D = self.fillScene(self.docId);
                                self.addToScene(sceneObject3D);
                                //self.drawAssociations();
                            }, nq.errorDialog);
                        }

                    }
                });
            });
        },
        buildStateHierarchy: function(id) {
			var self = this;
			return when(self.store.get(id), function (doc) {
				//if (cell.type == 'object') return cell;
				var cellPosInfo = {
					id:doc._id,
					name: doc.docType == 'class'?doc.title:doc.name,
					docType: doc.docType,
					subStates:[]
				};
				docPositionStore.put(cellPosInfo);

				var promisses = [];
				if(self.schema && self.schema.childrenQuery) {
					var childrenFilter = self.store.buildBaseFilterFromQuery(self.schema.childrenQuery, doc, self.schema.isA);
					if(childrenFilter) {
						var childrenCollection = self.store.filter(childrenFilter);
						promisses.push(childrenCollection.fetch());
					}
				}

				return all(promisses).then(function(resArrArr) {
					var childPromisses = [];
					if(resArrArr.length>0) resArrArr[0].forEach(function(child) {
						cellPosInfo.subStates.push(child._id);
						childPromisses.push(self.buildStateHierarchy(child._id));
					});

					return all(childPromisses);
				});
			});
		},
        positionStates: function(id, ourPos){
            var cellPositionsObj = docPositionStore.get(id);
            if(!cellPositionsObj) return ourPos.x;
            var x = ourPos.x;
            var y = ourPos.y - this.bodyViewHeight;
            var z = ourPos.z;
            var maxXUntilNow = ourPos.x;
            var subStates = cellPositionsObj.subStates;
            for(var i=0;i<subStates.length;i++){
                var subObjectId = subStates[i];
                var newPos = new THREE.Vector3( x, y, z );
                maxXUntilNow = this.positionStates(subObjectId, newPos);
                x = maxXUntilNow + this.bodyViewWidth;
            }

            cellPositionsObj.pos = ourPos;
            return maxXUntilNow;
        },
        fillScene: function(){
            var self = this;
            var connectorMaterial = new THREE.MeshLambertMaterial({color: 0xEFEFEF});
            var textMaterial = new THREE.MeshLambertMaterial({color: 0x000000});

            var sceneObject3D = new THREE.Object3D();
            var cellPosArr = docPositionStore.query({});
            for(var i=0;i<cellPosArr.length;i++) {
                var positionInfo = cellPosArr[i];

                var state3DObject = new THREE.Object3D();
                state3DObject.position = positionInfo.pos;

                //The cube
                var cubeGeometry = new THREE.CubeGeometry(this.gridWidth/2, this.gridHeight/2, 25, 1, 1, 1);
                this.colorVerticies(cubeGeometry, this.stateColors);
                var cubeMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff, vertexColors: THREE.VertexColors } );
                var cube = new THREE.Mesh( cubeGeometry, cubeMaterial );
                cube.name = positionInfo.name;
                this.selectableObjects.push(cube);
                state3DObject.add(cube);

                state3DObject.name = positionInfo.name;

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
                state3DObject.add(textMesh);

                sceneObject3D.add(state3DObject);

            }
            //now add connectors
            for(var i=0;i<cellPosArr.length;i++) {
                var positionInfo = cellPosArr[i];
                //for the subclasses
                if(positionInfo.subStates.length>0){
                    //get the length of the vertical connector
                    //vertical connectors to sub classes
                    var highY = positionInfo.pos.y;
                    var lowY = positionInfo.pos.y;
                    for(var i=0;i<positionInfo.subStates.length;i++){
                        var chlidClassItemId = positionInfo.subStates[i];
                        var childPositionInfo = docPositionStore.get(chlidClassItemId);
                        if(childPositionInfo.pos.y > highY) highY = childPositionInfo.pos.y;
                        if(childPositionInfo.pos.y < lowY) lowY = childPositionInfo.pos.y;
                    }
                    var highPos = new THREE.Vector3(positionInfo.pos.x + this.gridWidth/2, highY, positionInfo.pos.z);
                    var lowPos = new THREE.Vector3(positionInfo.pos.x + this.gridWidth/2, lowY, positionInfo.pos.z);
                    this.drawBeam(highPos, lowPos, connectorMaterial, sceneObject3D);

                    //sphere at the left end
                    var connectorGeometry = new THREE.SphereGeometry( 10 );
                    var connectorMesh = new THREE.Mesh( connectorGeometry, connectorMaterial );
                    connectorMesh.position = highPos;
                    sceneObject3D.add(connectorMesh);

                    //sphere at the right end
                    var connectorGeometry = new THREE.SphereGeometry( 10 );
                    var connectorMesh = new THREE.Mesh( connectorGeometry, connectorMaterial );
                    connectorMesh.position = lowPos;
                    sceneObject3D.add(connectorMesh);

                    //vertical connector to super attr
                    var ourVec = new THREE.Vector3(positionInfo.pos.x + this.gridWidth/2, positionInfo.pos.y, positionInfo.pos.z);
                    this.drawBeam(positionInfo.pos, ourVec, connectorMaterial, sceneObject3D);

                    //vertical connectors to sub classes
                    for(var i=0;i<positionInfo.subStates.length;i++){
                        var chlidClassItemId = positionInfo.subStates[i];
                        var childPositionInfo = docPositionStore.get(chlidClassItemId);
                        var connectorDestPos = new THREE.Vector3();
                        connectorDestPos.x = childPositionInfo.pos.x - this.gridWidth/2;
                        connectorDestPos.y = childPositionInfo.pos.y;
                        connectorDestPos.z = childPositionInfo.pos.z;
                        this.drawBeam(connectorDestPos, childPositionInfo.pos, connectorMaterial, sceneObject3D);
                    }
                }
            }
            return sceneObject3D;
        },
		postionObjectsOrgUnit: function(objectId, ourPos, rowHeaderPositionsObj){
			var x = ourPos.x + this.rowHeaderWidth;
			var y = ourPos.y;
			var z = ourPos.z;
			var maxYUntilNow = ourPos.y;
			var children = rowHeaderPositionsObj[objectId].children;
			for(var i=0;i<children.length;i++){
				var subObjectId = children[i];
				var newPos = new THREE.Vector3( x, y, z );
				maxYUntilNow = this.postionObjectsOrgUnit(subObjectId, newPos, rowHeaderPositionsObj);
				y = maxYUntilNow - this.gridHeight;
			}
			var minChild = ourPos.y;
			var maxChild = ourPos.y;
			if(children.length>1){
				var maxYId = children[children.length-1];
				maxChild = rowHeaderPositionsObj[maxYId].pos.y;
				var minYId = children[0];
				minChild = rowHeaderPositionsObj[minYId].pos.y;
				ourPos.y = (maxChild - minChild)/2 + minChild;
			}
			rowHeaderPositionsObj[objectId].pos = ourPos;
			rowHeaderPositionsObj[objectId].minChild = minChild;
			rowHeaderPositionsObj[objectId].maxChild = maxChild;
			return maxYUntilNow;
		},
		postionObjectsState: function(objectId, ourPos, statePositionsObj, rowHeaderPositionsObj){
			var x = ourPos.x + this.gridWidth;
			var y = ourPos.y;
			var z = ourPos.z;
			var maxYUntilNow = ourPos.y;
			var children = statePositionsObj[objectId].children;
			for(var i=0;i<children.length;i++){
				var subObjectId = children[i];
				var newPos = new THREE.Vector3( x, y, z );
				maxYUntilNow = this.postionObjectsState(subObjectId, newPos, statePositionsObj, rowHeaderPositionsObj);
				y = maxYUntilNow - this.gridHeight;
			}
			var associations = statePositionsObj[objectId].associations;
			var attibutesArr = associations['11']; // one to many
			var orgUnitIdArr = attibutesArr[0].split('/');
			var orgUnitId = this.orgUnitViewId+'/'+orgUnitIdArr[1];
			var orgUintPositionInfo = rowHeaderPositionsObj[orgUnitId];
			if(orgUintPositionInfo) ourPos.y = orgUintPositionInfo.pos.y;
			
			var minChild = ourPos.y;
			var maxChild = ourPos.y;
			if(children.length>1){
				var maxYId = children[children.length-1];
				maxChild = statePositionsObj[maxYId].pos.y;
				var minYId = children[0];
				minChild = statePositionsObj[minYId].pos.y;
				//ourPos.y = (maxChild - minChild)/2 + minChild;
			}
			statePositionsObj[objectId].pos = ourPos;
			statePositionsObj[objectId].minChild = minChild;
			statePositionsObj[objectId].maxChild = maxChild;
			return maxYUntilNow;
		},		
		drawRowHeader: function(objectId, rowHeaderPositionsObj){
			var textMaterial = new THREE.MeshLambertMaterial({color: 0xEFEFEF});
			//console.dir(rowHeaderPositionsObj);
			var sceneObject3D = new THREE.Object3D();
			for(var key in rowHeaderPositionsObj){
				var positionInfo = rowHeaderPositionsObj[key];

				var rowHeaderObject = new THREE.Object3D();
				rowHeaderObject.position.x = positionInfo.pos.x;
				rowHeaderObject.position.y = positionInfo.pos.y;
				rowHeaderObject.position.z = positionInfo.pos.z+30;
				
				var height = this.gridHeight; 
				if(positionInfo.children.length>0){
					height = positionInfo.minChild - positionInfo.maxChild + this.gridHeight;
				}
				height = height-10;
				var width = this.rowHeaderWidth-10;
				
				var cubeGeometry = new THREE.CubeGeometry(width, height, 10, 1, 1, 1);
				this.colorVerticies(cubeGeometry, this.rowHeaderColors);
				var cubeMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff, vertexColors: THREE.VertexColors } );
				var cube = new THREE.Mesh( cubeGeometry, cubeMaterial );
		    	cube.name = key;
		        this.selectableObjects.push(cube);
		        rowHeaderObject.add(cube);

		        rowHeaderObject.name = positionInfo.name;		        
		        
		        //The Name
		        var name = positionInfo.name;
				var text3d = new THREE.TextGeometry(name, {size: 30, height: 0, font: 'helvetiker'});
				//var text3d = new THREE.TextGeometry( 'Organizations', {size: 70, height: 20, curveSegments: 4, font: 'helvetiker', weight: 'normal', style: 'normal',  });
				text3d.computeBoundingBox();
				var xOffset = -0.5 * ( text3d.boundingBox.max.x - text3d.boundingBox.min.x );
				var yOffset = -0.5 * ( text3d.boundingBox.max.y - text3d.boundingBox.min.y );
				var textMesh = new THREE.Mesh(text3d, textMaterial);
				textMesh.position.x = yOffset;
				textMesh.position.y = xOffset;
				textMesh.position.z = 20;
				//textMesh.rotation.x = 0;
				textMesh.rotation.z = Math.PI / 2;
				rowHeaderObject.add(textMesh);
				
				sceneObject3D.add(rowHeaderObject);				
				
				if(positionInfo.children.length==0){
					var cubeGeometry = new THREE.CubeGeometry(5000, height, 1, 1, 1, 1);
					this.colorVerticies(cubeGeometry, this.swimlaneColors);
					var cubeMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff, vertexColors: THREE.VertexColors } );
					var cube = new THREE.Mesh( cubeGeometry, cubeMaterial );
					cube.position.x = positionInfo.pos.x + this.rowHeaderWidth/2 -10 + 2500 ;
					cube.position.y = positionInfo.pos.y;
					cube.position.z = -30;
					sceneObject3D.add(cube);									
				}			
			}
			return sceneObject3D;		
		
		},
		drawStates: function(objectId, statePositionsObj){
			//var stateMaterial = new THREE.MeshLambertMaterial( {color: 0x00EF00});
			//var connectorMaterial =  new THREE.MeshPhongMaterial({specular: 0xffffff, color: 0x9F9F9F, emissive: 0x4F4F4F,shininess: 100 });
			var connectorMaterial = new THREE.MeshLambertMaterial({color: 0xEFEFEF});
			var textMaterial = new THREE.MeshLambertMaterial({color: 0x000000});
			//console.dir(statePositionsObj);
			var sceneObject3D = new THREE.Object3D();
			for(var key in statePositionsObj){
				var positionInfo = statePositionsObj[key];

				var state3DObject = new THREE.Object3D();
				state3DObject.position = positionInfo.pos;
				
				//The cube
				var cubeGeometry = new THREE.CubeGeometry(this.gridWidth/2, this.gridHeight/2, 25, 1, 1, 1);
				this.colorVerticies(cubeGeometry, this.stateColors);
				var cubeMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff, vertexColors: THREE.VertexColors } );
				var cube = new THREE.Mesh( cubeGeometry, cubeMaterial );
		    	cube.name = key;
		        this.selectableObjects.push(cube);
		        state3DObject.add(cube);
		        
				state3DObject.name = positionInfo.name;

		       
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
				state3DObject.add(textMesh);
				
				sceneObject3D.add(state3DObject);
			}
			//now add connectors
			for(var key in statePositionsObj){
				var positionInfo = statePositionsObj[key];
				//for the subclasses
				if(positionInfo.children.length>0){
					//get the length of the vertical connector
					//vertical connectors to sub classes
					var highY = positionInfo.pos.y;
					var lowY = positionInfo.pos.y;
					for(var i=0;i<positionInfo.children.length;i++){
						var chlidClassItemId = positionInfo.children[i];
						var childPositionInfo = statePositionsObj[chlidClassItemId];
						if(childPositionInfo.pos.y > highY) highY = childPositionInfo.pos.y;
						if(childPositionInfo.pos.y < lowY) lowY = childPositionInfo.pos.y;
					};
					var highPos = new THREE.Vector3(positionInfo.pos.x + this.gridWidth/2, highY, positionInfo.pos.z);
					var lowPos = new THREE.Vector3(positionInfo.pos.x + this.gridWidth/2, lowY, positionInfo.pos.z);
					this.drawBeam(highPos, lowPos, connectorMaterial, sceneObject3D);
					
					//sphere at the left end
					var connectorGeometry = new THREE.SphereGeometry( 10 );
					var connectorMesh = new THREE.Mesh( connectorGeometry, connectorMaterial );
					connectorMesh.position = highPos;
					sceneObject3D.add(connectorMesh);
					
					//sphere at the right end
					var connectorGeometry = new THREE.SphereGeometry( 10 );
					var connectorMesh = new THREE.Mesh( connectorGeometry, connectorMaterial );
					connectorMesh.position = lowPos;
					sceneObject3D.add(connectorMesh);
					
					//vertical connector to super attr
					var ourVec = new THREE.Vector3(positionInfo.pos.x + this.gridWidth/2, positionInfo.pos.y, positionInfo.pos.z);
					this.drawBeam(positionInfo.pos, ourVec, connectorMaterial, sceneObject3D);
					
					//vertical connectors to sub classes
					for(var i=0;i<positionInfo.children.length;i++){
						var chlidClassItemId = positionInfo.children[i];
						var childPositionInfo = statePositionsObj[chlidClassItemId];
						var connectorDestPos = new THREE.Vector3();
						connectorDestPos.x = childPositionInfo.pos.x - this.gridWidth/2;
						connectorDestPos.y = childPositionInfo.pos.y;
						connectorDestPos.z = childPositionInfo.pos.z;
						this.drawBeam(connectorDestPos, childPositionInfo.pos, connectorMaterial, sceneObject3D);
					};
				}
			}
			return sceneObject3D;		
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

		},
		swapSelectedItemMaterial: function(mesh){

			if(this.selectedMeshColorsBeforeSelection) {
				//set the colors of the current selected mesh to what it was
				this.colorVerticies(this.selectedMesh.geometry, this.selectedMeshColorsBeforeSelection);
				this.selectedMesh.geometry.colorsNeedUpdate = true;
			}
			//set the new SelectedMesh
			this.selectedItemId = mesh.name;
			this.selectedMesh = mesh;
			this.selectedMeshColorsBeforeSelection = this.colorVerticies(mesh.geometry, this.highlightColors);
			//mesh.material.needsUpdate = true;
			mesh.geometry.colorsNeedUpdate = true;
		},
		colorVerticies: function(cubeGeometry, colors){
			var curentColors = [];
			var face = cubeGeometry.faces[0];
			var numberOfSides = ( face instanceof THREE.Face3 ) ? 3 : 4;
			for( var j = 0; j < numberOfSides; j++ ){
				curentColors.push(face.vertexColors[j]);
			}
			for ( var i = 0; i < cubeGeometry.faces.length; i++ ){
				var face = cubeGeometry.faces[ i ];
				// determine if current face is a tri or a quad
				var numberOfSides = ( face instanceof THREE.Face3 ) ? 3 : 4;
				// assign color to each vertex of current face
				for( var j = 0; j < numberOfSides; j++ ){
					face.vertexColors[j] = colors[j];
				}
			}
			return curentColors;
		}
	});
});
