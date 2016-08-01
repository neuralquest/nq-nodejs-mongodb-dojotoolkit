define(["dojo/_base/declare", "dojo/when", "dojo/promise/all", "dojo/_base/array", "app/nqWebGlChart", 'dojo/dom-construct', "dojo/_base/lang", 
        "dojo/dom-geometry", "dojo/Deferred", 'dojo/store/Memory'],
	function(declare, when, all, arrayUtil, nqWebGlChart, domConstruct, lang, domGeom, Deferred, Memory){

	var docPositionStore = new Memory({});

	return declare("nqClassChart", [nqWebGlChart], {
		bodyViewHeight: 400,
		bodyViewWidth: 800,
		bodyViewDepth: 800,
		skyboxArray: [ 'app/resources/img/Neuralquest/space_3_right.jpg', 'app/resources/img/Neuralquest/space_3_left.jpg', 'app/resources/img/Neuralquest/space_3_top.jpg' ,'app/resources/img/Neuralquest/space_3_bottom.jpg','app/resources/img/Neuralquest/space_3_front.jpg','app/resources/img/Neuralquest/space_3_back.jpg'],
		classGeometry: null,
        assocProps: {
            ownerId:{
                depth: -200,
                connectorMaterial: new THREE.MeshLambertMaterial({color: 0xEF0000}) //red
            },
            pageId:{
                depth: -300,
                connectorMaterial: new THREE.MeshLambertMaterial({color: 0x00EFEF})
            },
            buyerId:{
                depth: -400,
                connectorMaterial: new THREE.MeshLambertMaterial({color: 0x00EF00})//green
            },
            sellerId:{
                depth: -500,
                connectorMaterial: new THREE.MeshLambertMaterial({color: 0xEFEF00})//?
            },
            assetId:{
                depth: -600,
                connectorMaterial: new THREE.MeshLambertMaterial({color: 0x000EF})//blue
            }
        },

		postCreate: function(){
			this.inherited(arguments);//create the scene
			var self = this;
			this.rootId = this.widget.rootId;

            // load any meshes, return a defered so that selecting the object can wait
			var loader = new THREE.JSONLoader(true);			
			loader.load("app/resources/img/Neuralquest/mesh/classMesh.json", function(classGeometry, materials) {
                self.classGeometry = classGeometry;
                loader.load("app/resources/img/Neuralquest/mesh/objectMesh.json", function (objectGeometry, materials) {
                    objectGeometry.mergeVertices();
                    self.objectGeometry = objectGeometry;
                    when(self.buildHierarchy(self.rootId), function (res) {
                        console.dir(docPositionStore);
                        var newPos = new THREE.Vector3(0, 0, 0);
                        self.positionClasses(self.rootId, newPos);
                        //find the lowest class
                        var lowestY = 0;
                        docPositionStore.query({}).forEach(function (cellInfo) {
                            if(cellInfo.pos && cellInfo.pos.y < lowestY) lowestY = cellInfo.pos.y;
                        });
                        self.positionObjects(lowestY);
                        //shift all the cells
                        var positionInfo = docPositionStore.get(self.rootId);
                        var addPos = new THREE.Vector3(-positionInfo.pos.x, 0, 0);
                        docPositionStore.query({}).forEach(function (cellInfo) {
                            cellInfo.pos.add(addPos);
                        });
                        self.clearScene();
                        var sceneObject3D = self.fillScene(self.rootId);
                        self.addToScene(sceneObject3D);
                        self.drawAssociations();
                    }, nq.errorDialog);
                });
			});
		},
		buildHierarchy: function(id) {
			var self = this;
			return when(self.store.get(id), function (doc) {
				//if (cell.type == 'object') return cell;
                var cellPosInfo = {
                    id:doc._id,
                    name: doc.docType == 'class'?doc.title:doc.name,
                    docType: doc.docType,
                    subClasses:[],
                    instantiations:[],
                    associations:[]
                };
                if(doc.docType == 'class'){
                    for(var attrName in doc.properties){
                        var attrProps = doc.properties[attrName];
                        if(self.assocProps[attrName] && attrProps.query && attrProps.query.isA){
                            cellPosInfo.associations.push({assocName:attrName, destId:attrProps.query.isA});
                        }
                    }
                }
                else{
                    for(var attrName in doc){
                        var attrProps = doc[attrName];
                        if(self.assocProps[attrName]){
                            cellPosInfo.associations.push({assocName:attrName, destId:attrProps});
                        }
                    }
                }
                docPositionStore.put(cellPosInfo);
                
                var promisses = [];
                if(self.schema && self.schema.childrenQuery) {
                    var childrenFilter = self.store.buildFilterFromQuery(doc, self.schema.childrenQuery);
                    if(childrenFilter) {
                        var childrenCollection = self.store.filter(childrenFilter);
                        promisses.push(childrenCollection.fetch());
                    }
                }
				
                return all(promisses).then(function(resArrArr) {
                    var childPromisses = [];
                    resArrArr[0].forEach(function (child) {
                        if(child.docType == 'class') cellPosInfo.subClasses.push(child._id);
                        else cellPosInfo.instantiations.push(child._id);
                        childPromisses.push(self.buildHierarchy(child._id));
                    });

                    return all(childPromisses);
                });
			});
		},
        positionClasses: function(id, ourPos){
            var cellPositionsObj = docPositionStore.get(id);
            if(!cellPositionsObj) return ourPos.x;
            var x = ourPos.x;
            var y = ourPos.y - this.bodyViewHeight;
            var z = ourPos.z;
            var maxXUntilNow = ourPos.x;
            var children = cellPositionsObj.subClasses;
            for(var i=0;i<children.length;i++){
                var subObjectId = children[i];
                var newPos = new THREE.Vector3( x, y, z );
                maxXUntilNow = this.positionClasses(subObjectId, newPos);
                x = maxXUntilNow + this.bodyViewWidth;
            }
            /*var instantiations = cellPositionsObj.instantiations;
            for(var j=0;j<instantiations.length;j++){
                var objId = instantiations[j];
                var objPos = docPositionStore.get(objId);
                objPos.pos = new THREE.Vector3( x, y, z );
                cellPositionsObj.pos = objPos;
                y -= this.bodyViewHeight;
            }*/
            //place our position over the center of the children
            if(children.length>1){
                var maxXId = children[children.length-1];
                if(docPositionStore.get(maxXId)){
                    var maxX = docPositionStore.get(maxXId).pos.x;
                    var minXId = children[0];
                    var minX = docPositionStore.get(minXId).pos.x;
                    ourPos.x = (maxX - minX)/2 + minX;
                }
            }

            cellPositionsObj.pos = ourPos;
            return maxXUntilNow;
        },
        positionObjects: function(lowestY){
            var self = this;
            docPositionStore.query({}).forEach(function (cellInfo) {
                var x = cellInfo.pos.x;
                var y = lowestY - self.bodyViewHeight;
                var z = cellInfo.pos.z;
                cellInfo.instantiations.forEach(function(instantiationId){
                    var objPos = docPositionStore.get(instantiationId);
                    objPos.pos = new THREE.Vector3( x, y, z );
                    y -= self.bodyViewHeight;
                });
            });
        },
        fillScene: function(){
            var self = this;
            var classMaterial = new THREE.MeshLambertMaterial( {color: 0x8904B1});
            var objectMaterial = new THREE.MeshLambertMaterial( {color:0x00A300});//0x00A300
            //var connectorMaterial =  new THREE.MeshPhongMaterial({specular: 0xffffff, color: 0x9F9F9F, emissive: 0x4F4F4F,shininess: 100 });
            var connectorMaterial = new THREE.MeshLambertMaterial({color: 0xEFEFEF});
            var textMaterial = new THREE.MeshLambertMaterial({color: 0xEFEFEF});
            //console.dir(cellPositionsObj);
            var sceneObject3D = new THREE.Object3D();
            var cellPosArr = docPositionStore.query({});
            for(var i=0;i<cellPosArr.length;i++){
                var positionInfo = cellPosArr[i];

                var classObject = new THREE.Object3D();
                classObject.position = positionInfo.pos;

                //The mesh
                var mesh;
                if(positionInfo.docType == 'class'){
                    mesh = new THREE.Mesh(this.classGeometry, classMaterial);
                }
                else mesh = new THREE.Mesh(this.objectGeometry, objectMaterial);

                mesh.scale.set(100,100,100);
                mesh.name = positionInfo.id;
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

                if(positionInfo.isAttr) classObject.rotation.y += Math.PI / 2;
                //this.addToScene(classObject);
                sceneObject3D.add(classObject);
            }


            //now add class connectors
            for(var i=0;i<cellPosArr.length;i++){
                //console.log('connectors positionInfo', positionInfo);
                var positionInfo = cellPosArr[i];
                var parentPos = positionInfo.pos;
                //for the subclasses
                if(positionInfo.subClasses.length >0){
                    var firstPos = new THREE.Vector3();
                    var lastPos = new THREE.Vector3();
                    //get the length of the connector
                    var firstId = positionInfo.subClasses[0];
                    if(!docPositionStore.get(firstId)) {
                        return sceneObject3D;
                    }
                    var lastId = positionInfo.subClasses[positionInfo.subClasses.length -1];
                    firstPos.x = docPositionStore.get(firstId).pos.x;
                    //firstPos.x = cellPositionsObj[firstId].pos.x;
                    firstPos.y = parentPos.y - this.bodyViewHeight/2;
                    firstPos.z = parentPos.z;
                    lastPos.x = docPositionStore.get(lastId).pos.x;
                    //lastPos.x = cellPositionsObj[lastId].pos.x;
                    lastPos.y = parentPos.y - this.bodyViewHeight/2;
                    lastPos.z = parentPos.z;
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
                    var ourVec = new THREE.Vector3( parentPos.x, parentPos.y - this.bodyViewHeight/2, parentPos.z);
                    this.drawBeam(parentPos, ourVec, connectorMaterial, sceneObject3D);

                    //vertical connectors to sub classes
                    positionInfo.subClasses.forEach(function(subClassId){
                        var childPositionInfo = docPositionStore.get(subClassId);
                        var connectorDestPos = new THREE.Vector3();
                        connectorDestPos.x = childPositionInfo.pos.x;
                        connectorDestPos.y = firstPos.y;
                        connectorDestPos.z = firstPos.z;
                        self.drawBeam(connectorDestPos, childPositionInfo.pos, connectorMaterial, sceneObject3D);
                    });
                }

                //for the objects
                positionInfo.instantiations.forEach(function(instantiationId){
                    var childPositionInfo = docPositionStore.get(instantiationId);
                    var connectorDestPos = new THREE.Vector3();
                    connectorDestPos.x = childPositionInfo.pos.x;
                    connectorDestPos.y = firstPos.y;
                    connectorDestPos.z = firstPos.z;
                    self.drawBeam(connectorDestPos, childPositionInfo.pos, connectorMaterial, sceneObject3D);
                });


                var children = positionInfo.subClasses;
                var parentPos = positionInfo.pos;
                if(children.length==0) continue;

            }
            return sceneObject3D;
        },
        drawAssociations: function(){
            var self = this;
            var sceneObject3D = new THREE.Object3D();
            var cellPosArr = docPositionStore.query({});
            for(var j=0;j<cellPosArr.length;j++){
                var positionInfo = cellPosArr[j];
                var associationsArr = positionInfo.associations;
                if(!associationsArr) continue;

                var fromMesh = this.getMeshByName(positionInfo.id);
                if(!fromMesh) continue;
                var fromPosition = new THREE.Vector3();
                fromPosition.getPositionFromMatrix( fromMesh.matrixWorld );

                var num = 0;
                associationsArr.forEach(function(association){
                    var assocProp = self.assocProps[association.assocName];
                    if(!assocProp) assocProp = self.assocProps.default;
                    //var connectorMaterial = new THREE.MeshLambertMaterial({color: 0xEF0000}); //red
                    var toMesh = self.getMeshByName(association.destId);
                    if(toMesh) {
                        var toPosition = new THREE.Vector3();
                        toPosition.getPositionFromMatrix(toMesh.matrixWorld);
                        self.drawHorseshoe(fromPosition, toPosition, assocProp.depth, assocProp.connectorMaterial, sceneObject3D, association.assocName, false, true);
                    }
                    num++;
                });
            }
            this.addToScene(sceneObject3D);
        },
        drawHorseshoe: function(fromPosition, toPosition, depth, connectorMaterial, sceneObject3D, name, fromCone, toCone){
            var firstPos = new THREE.Vector3();
            firstPos.copy(fromPosition);
            firstPos.x-=60;
            firstPos.y-=60;
            var lastPos = new THREE.Vector3();
            lastPos.copy(toPosition);
            lastPos.x+=60;
            lastPos.y-=60;
            var secondPos = new THREE.Vector3();
            secondPos.copy(firstPos);
            secondPos.z += depth;
            var thirdPos = new THREE.Vector3();
            thirdPos.copy(lastPos);
            thirdPos.z += depth;
            this.drawBeam(firstPos, secondPos, connectorMaterial, sceneObject3D);
            this.drawBeam(secondPos, thirdPos, connectorMaterial, sceneObject3D, name);
            this.drawBeam(thirdPos, lastPos, connectorMaterial, sceneObject3D);

            var sphereGeometry = new THREE.SphereGeometry( 10 );
            //sphere at the left end
            var leftSphere = new THREE.Mesh( sphereGeometry, connectorMaterial );
            leftSphere.position = secondPos;
            sceneObject3D.add(leftSphere);

            //sphere at the right end
            var rightSphere = new THREE.Mesh( sphereGeometry, connectorMaterial );
            rightSphere.position = thirdPos;
            sceneObject3D.add(rightSphere);

            var coneGeometry = new THREE.CylinderGeometry(0, 40, 100, 40, 40, false);
            //cone at the left end
            if(fromCone){
                var leftCone = new THREE.Mesh( coneGeometry, connectorMaterial );
                leftCone.position = firstPos;
                leftCone.position.z += 60;
                leftCone.rotation.x = Math.PI / 2;
                sceneObject3D.add(leftCone);
            }
            //cone at the right end
            if(toCone){
                var rightCone = new THREE.Mesh( coneGeometry, connectorMaterial );
                rightCone.position = lastPos;
                rightCone.position.z -= 80;
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
        /*		XXXbuildHierarchy: function(id){
			var self = this;
			return when(self.store.get(id), function(cell){
				if(cell.type == 'object') return cell;
				//var isAPermittedvalue = pv?pv:cell.id==PERTMITTEDVALUE_CLASS;
				var associations = {};
				var promisses = [];
                promisses.push(self.store.getItemsByAssocType(id, 'subclasses'));
                promisses.push(self.store.getItemsByAssocType(id, 'ordered'));
                promisses.push(self.store.getItemsByAssocType(id, 'oneToMany'));
                promisses.push(self.store.getItemsByAssocType(id, 'manyToMany'));
                promisses.push(self.store.getItemsByAssocType(id, 'mapsTo'));
                promisses.push(self.store.getItemsByAssocType(id, 'owns'));

				docPositionStore.put({id:cell._id, name: cell.name, type: cell.type, associations:associations});
				return when(all(promisses), function(resArrArr){
                    var subClassesArr = [];
                    resArrArr[0].forEach(function(child){
                        subClassesArr.push(child._id);
                    });
                    associations['subclasses'] = subClassesArr;

                    var orderedArr = [];
                    resArrArr[1].forEach(function(child){
                        orderedArr.push(child._id);
                    });
                    associations['ordered'] = orderedArr;

                    var oneToManyArr = [];
                    resArrArr[2].forEach(function(child){
                        oneToManyArr.push(child._id);
                    });
                    associations['oneToMany'] = oneToManyArr;

                    var manyToManyArr = [];
                    resArrArr[3].forEach(function(child){
                        manyToManyArr.push(child._id);
                    });
                    associations['manyToMany'] = manyToManyArr;

                    var mapsToArr = [];
                    resArrArr[4].forEach(function(child){
                        mapsToArr.push(child._id);
                    });
                    associations['mapsTo'] = mapsToArr;

                    var ownsArr = [];
                    resArrArr[5].forEach(function(child){
                        ownsArr.push(child._id);
                    });
                    associations['owns'] = ownsArr;

					var childPromisses = [];
					for(var i=0;i<associations['subclasses'].length;i++){
						var childId = associations['subclasses'][i];
						childPromisses.push(self.buildHierarchy(childId));
					}
					return all(childPromisses);
				});
			});
		},

		XaddAssociations: function(id, type){
			var OBJECT_TYPE = 1;
			var self = this;
			if(type<15) {
				var query = {fk_source: id, type: type};
				var collection = this.store.filter(query);
				var assocsArr = collection.fetch();
				//return when(this.store.query(query), function(assocsArr){
					var childrenArr = [];
					var promisses = [];
					for(var i=0;i<assocsArr.length;i++){
						var assoc = assocsArr[i];
//get rid of promise
						promisses.push(when(self.store.getCell(assoc.fk_dest), function(cell){
							//if(cell.type == OBJECT_TYPE) return cell;
							childrenArr.push(cell.id);
							return cell;
						}));
					}
					return when(all(promisses), function(res){return childrenArr;});
				//});
			}
			else{
					/*filter doesn't work with promises
				var query = {fk_dest: id, type: type-12};
				return when(this.store.query(query), function(assocsArr){
					console.log('assocsArr', assocsArr);
					return when(assocsArr.filter(function(assoc, index){
						console.log('getCell', self.store.getCell(assoc.fk_source));
						return when(self.store.getCell(assoc.fk_source), function(cell){
							if(cell.type == OBJECT_TYPE) console.log('isObject', cell);;
							if(cell.type == OBJECT_TYPE) return false;
							return true;
						});
					}), function(filteredArray){
						console.log('filteredArray', filteredArray);
						return filteredArray.map(function(assoc, index){
							return assoc.fk_source;
						});
					});
				});
					 * /
				var query = {fk_dest: id, type: type-12};
				var collection = this.store.filter(query);
				var assocsArr = collection.fetch();
				//return when(this.store.filter(query), function(assocsArr){
					var childrenArr = [];
					var promisses = [];
					for(var i=0;i<assocsArr.length;i++){
						var assoc = assocsArr[i];
						promisses.push(when(self.store.getCell(assoc.fk_source), function(cell){
							if(cell.type == OBJECT_TYPE) return cell;
							childrenArr.push(cell.id);
							return cell;
						}));
					}
					return when(all(promisses), function(res){return childrenArr});
				//});
					
			}
		},
		positionAttributeClasses: function(){
			var self = this;
			return when(docPositionStore.query({isAttribute:false}), function(cellPosArr){
				for(var i=0;i<cellPosArr.length;i++){
					var cellPosObj = cellPosArr[i];
					var assocArr = cellPosObj.associations[ATTRIBUTE_ASSOC]
					for(var j=0;j<assocArr.length;j++){
						var attrId = assocArr[j];
						var attrPosObj = docPositionStore.get(attrId);						
						attrPosObj.pos = new THREE.Vector3(cellPosObj.pos.x, cellPosObj.pos.y, -500 );//500 is a temporary value
						attrPosObj.attrOwnedByClass = true;
					}
				}
				return cellPosArr;
			});
		},*/

		/*postionObjectsZY: function(id, ourPos){
			var cellPositionsObj = docPositionStore.get(id);
			if(!cellPositionsObj) return ourPos.x;
			if(cellPositionsObj.pos){//already has a position, got it from positionAttributeClasses
				cellPositionsObj.pos.z = ourPos.z;//simply provide depth
				cellPositionsObj.isAttr = true;
				return ourPos.z;
			}
			else{
				var x = ourPos.x;
				var y = ourPos.y - this.bodyViewHeight;
				var z = ourPos.z;
				var minZUntilNow = ourPos.z;
				cellPositionsObj.isAttr = true;
				var children = cellPositionsObj.associations['subclasses'];
				for(var i=0;i<children.length;i++){
					var subObjectId = children[i];
					var newPos = new THREE.Vector3( x, y, z );
					minZUntilNow = this.postionObjectsZY(subObjectId, newPos);
					z = minZUntilNow - this.bodyViewWidth;
				}
				//place our position over the center of the children
				if(children.length>1){
					var minZId = children[children.length-1];
					var minZ = docPositionStore.get(minZId).pos.z;
					//var minZ = cellPositionsObj[minZId].pos.z;
					var maxZId = children[0];
					var maxZ = docPositionStore.get(maxZId).pos.z;
					//var maxZ = cellPositionsObj[maxZId].pos.z;
					ourPos.z = (minZ - maxZ)/2 + maxZ;
				}
				cellPositionsObj.pos = ourPos;
				return minZUntilNow;
			}
		},*/

	});
});
