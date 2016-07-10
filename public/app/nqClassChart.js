define(["dojo/_base/declare", "dojo/when", "dojo/promise/all", "dojo/_base/array", "app/nqWebGlChart", 'dojo/dom-construct', "dojo/_base/lang", 
        "dojo/dom-geometry", "dojo/Deferred", 'dojo/store/Memory'],
	function(declare, when, all, arrayUtil, nqWebGlChart, domConstruct, lang, domGeom, Deferred, Memory){

	var cellPostionsStore = new Memory({});

	return declare("nqClassChart", [nqWebGlChart], {
		bodyViewHeight: 400,
		bodyViewWidth: 800,
		bodyViewDepth: 800,
		skyboxArray: [ 'app/resources/img/Neuralquest/space_3_right.jpg', 'app/resources/img/Neuralquest/space_3_left.jpg', 'app/resources/img/Neuralquest/space_3_top.jpg' ,'app/resources/img/Neuralquest/space_3_bottom.jpg','app/resources/img/Neuralquest/space_3_front.jpg','app/resources/img/Neuralquest/space_3_back.jpg'],
		classGeometry: null,


		postCreate: function(){
			this.inherited(arguments);//create the scene
			var self = this;
			this.rootId = this.widget.rootId;

            // load any meshes, return a defered so that selecting the object can wait
			var loader = new THREE.JSONLoader(true);			
			loader.load("app/resources/img/Neuralquest/mesh/classMesh.json", function(geometry, materials) {
                self.classGeometry = geometry;
                loader.load("app/resources/img/Neuralquest/mesh/objectMesh.json", function (geometry, materials) {
                    self.objectGeometry = geometry;
                    when(self.buildHierarchy(self.rootId), function (res) {
                        console.dir(cellPostionsStore);
                        var newPos = new THREE.Vector3(0, 0, 0);
                        self.postionObjectsXY(self.rootId, newPos);
                        //shift all the cells
                        var positionInfo = cellPostionsStore.get(self.rootId);
                        var addPos = new THREE.Vector3(-positionInfo.pos.x, 0, 0);
                        cellPostionsStore.query({}).forEach(function (cellInfo) {
                            cellInfo.pos.add(addPos);
                        });
                        self.clearScene();
                        var sceneObject3D = self.fillScene(self.rootId);
                        self.addToScene(sceneObject3D);
                        //self.drawAssociations();
                    }, nq.errorDialog);
                });
			});
		},
		buildHierarchy: function(id) {
			var self = this;
			return when(self.store.get(id), function (doc) {
				//if (cell.type == 'object') return cell;
                var associations = {};
                var promisses = [];
                if(self.schema && self.schema.childrenQuery) {
                    var childrenFilter = self.store.buildFilterFromQuery(doc, self.schema.childrenQuery);
                    if(childrenFilter) {
                        var childrenCollection = self.store.filter(childrenFilter);
                        promisses.push(childrenCollection.fetch());
                    }
                }
                var name = doc.docType == 'class'?doc.title:doc.name;
				cellPostionsStore.put({id:doc._id, name: name, docType: doc.docType, associations:associations});
                return when(all(promisses), function(resArrArr) {
                    var subClassesArr = [];
                    resArrArr[0].forEach(function (child) {
                        subClassesArr.push(child._id);
                    });
                    associations['subclasses'] = subClassesArr;

                    var childPromisses = [];
                    for(var i=0;i<associations['subclasses'].length;i++){
                        var childId = associations['subclasses'][i];
                        childPromisses.push(self.buildHierarchy(childId));
                    }
                    return all(childPromisses);
                });
			});
		},
        postionObjectsXY: function(id, ourPos){
            var cellPositionsObj = cellPostionsStore.get(id);
            if(!cellPositionsObj) return ourPos.x;
            var x = ourPos.x;
            var y = ourPos.y - this.bodyViewHeight;
            var z = ourPos.z;
            var maxXUntilNow = ourPos.x;
            cellPositionsObj.isAttr = false;
            var children = cellPositionsObj.associations['subclasses'];
            for(var i=0;i<children.length;i++){
                var subObjectId = children[i];
                var newPos = new THREE.Vector3( x, y, z );
                maxXUntilNow = this.postionObjectsXY(subObjectId, newPos);
                x = maxXUntilNow + this.bodyViewWidth;
            }
            //place our position over the center of the children
            if(children.length>1){
                var maxXId = children[children.length-1];
                if(cellPostionsStore.get(maxXId)){
                    var maxX = cellPostionsStore.get(maxXId).pos.x;
                    var minXId = children[0];
                    var minX = cellPostionsStore.get(minXId).pos.x;
                    ourPos.x = (maxX - minX)/2 + minX;
                }
            }

            cellPositionsObj.pos = ourPos;
            return maxXUntilNow;
        },
        fillScene: function(){
            var classMaterial = new THREE.MeshLambertMaterial( {color: 0x8904B1});
            var objectMaterial = new THREE.MeshLambertMaterial( {color:0x00CC00});
            //var connectorMaterial =  new THREE.MeshPhongMaterial({specular: 0xffffff, color: 0x9F9F9F, emissive: 0x4F4F4F,shininess: 100 });
            var connectorMaterial = new THREE.MeshLambertMaterial({color: 0xEFEFEF});
            var textMaterial = new THREE.MeshLambertMaterial({color: 0xEFEFEF});
            //console.dir(cellPositionsObj);
            var sceneObject3D = new THREE.Object3D();
            var cellPosArr = cellPostionsStore.query({});
            for(var i=0;i<cellPosArr.length;i++){
                var positionInfo = cellPosArr[i];
                if(positionInfo.isDrawn) continue;
                positionInfo.isDrawn = true;

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


            //now add connectors
            for(var i=0;i<cellPosArr.length;i++){
                //console.log('connectors positionInfo', positionInfo);
                var positionInfo = cellPosArr[i];
                var children = positionInfo.associations['subclasses'];
                var parentPos = positionInfo.pos;
                if(children.length==0) continue;
                //for the subclasses
                var firstPos = new THREE.Vector3();
                var lastPos = new THREE.Vector3();
                if(positionInfo.isAttr){
                    //get the length of the connector
                    var firstId = children[0];
                    var lastId = children[children.length -1];
                    firstPos.x = parentPos.x;
                    firstPos.y = parentPos.y - this.bodyViewHeight/2;
                    firstPos.z = cellPostionsStore.get(firstId).pos.z;
                    //firstPos.z = cellPositionsObj[firstId].pos.z;
                    lastPos.x = parentPos.x;
                    lastPos.y = parentPos.y - this.bodyViewHeight/2;
                    lastPos.z = cellPostionsStore.get(lastId).pos.z;
                    //lastPos.z = cellPositionsObj[lastId].pos.z;
                }
                else {
                    //get the length of the connector
                    var firstId = children[0];
                    if(!cellPostionsStore.get(firstId)) {
                        return sceneObject3D;
                    }
                    var lastId = children[children.length -1];
                    firstPos.x = cellPostionsStore.get(firstId).pos.x;
                    //firstPos.x = cellPositionsObj[firstId].pos.x;
                    firstPos.y = parentPos.y - this.bodyViewHeight/2;
                    firstPos.z = parentPos.z;
                    lastPos.x = cellPostionsStore.get(lastId).pos.x;
                    //lastPos.x = cellPositionsObj[lastId].pos.x;
                    lastPos.y = parentPos.y - this.bodyViewHeight/2;
                    lastPos.z = parentPos.z;
                }
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
                for(var j=0;j<children.length;j++){
                    var chlidClassItemId = children[j];
                    var childPositionInfo = cellPostionsStore.get(chlidClassItemId);
                    var connectorDestPos = new THREE.Vector3();
                    if(positionInfo.isAttr){
                        connectorDestPos.x = firstPos.x;
                        connectorDestPos.y = firstPos.y;
                        connectorDestPos.z = childPositionInfo.pos.z;
                    }
                    else{
                        connectorDestPos.x = childPositionInfo.pos.x;
                        connectorDestPos.y = firstPos.y;
                        connectorDestPos.z = firstPos.z;
                    }
                    this.drawBeam(connectorDestPos, childPositionInfo.pos, connectorMaterial, sceneObject3D);
                };
            }
            return sceneObject3D;
        },
        drawAssociations: function(){
            var sceneObject3D = new THREE.Object3D();
            var cellPosArr = cellPostionsStore.query({});
            for(var j=0;j<cellPosArr.length;j++){
                var positionInfo = cellPosArr[j];
                var associations = positionInfo.associations;
                if(!associations) continue;
                var fromMesh = this.getMeshByName(positionInfo.id);
                if(!fromMesh) continue;
                var fromPosition = new THREE.Vector3();
                fromPosition.getPositionFromMatrix( fromMesh.matrixWorld );
                /*var attibutesArr = associations[ATTRIBUTE_ASSOC];//attributes
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
                 }*/
                var attibutesArr = associations['ordered'];// ordered
                if(attibutesArr){
                    var connectorMaterial = new THREE.MeshLambertMaterial({color: 0xEF0000}); //red
                    for(var i=0;i<attibutesArr.length;i++){
                        var toObjId = attibutesArr[i];
                        var toMesh = this.getMeshByName(toObjId);
                        if(!toMesh) continue;
                        var toPosition = new THREE.Vector3();
                        toPosition.getPositionFromMatrix( toMesh.matrixWorld );
                        this.drawHorseshoe(fromPosition, toPosition, this.bodyViewDepth/4, connectorMaterial, sceneObject3D, 'ordered', false, true);
                    }
                }
                var attibutesArr = associations['oneToMany'];//many to many
                if(attibutesArr){
                    var connectorMaterial = new THREE.MeshLambertMaterial({color: 0x00EFEF});
                    for(var i=0;i<attibutesArr.length;i++){
                        var toObjId = attibutesArr[i];
                        var toMesh = this.getMeshByName(toObjId);
                        if(!toMesh) continue;
                        var toPosition = new THREE.Vector3();
                        toPosition.getPositionFromMatrix( toMesh.matrixWorld );
                        this.drawHorseshoe(fromPosition, toPosition, this.bodyViewDepth/2, connectorMaterial, sceneObject3D, 'one to many', false, true);
                    }
                }
                var attibutesArr = associations['manyToMany']; // one to many
                if(attibutesArr){
                    var connectorMaterial = new THREE.MeshLambertMaterial({color: 0x00EF00});//green
                    for(var i=0;i<attibutesArr.length;i++){
                        var toObjId = attibutesArr[i];
                        var toMesh = this.getMeshByName(toObjId);
                        if(!toMesh) continue;
                        var toPosition = new THREE.Vector3();
                        toPosition.getPositionFromMatrix( toMesh.matrixWorld );
                        this.drawHorseshoe(fromPosition, toPosition, (this.bodyViewDepth/4)*3, connectorMaterial, sceneObject3D, 'many to many', true, true);
                    }
                }
                var attibutesArr = associations['mapsTo']; // one to many
                if(attibutesArr){
                    var connectorMaterial = new THREE.MeshLambertMaterial({color: 0xEFEF00});//?
                    for(var i=0;i<attibutesArr.length;i++){
                        var toObjId = attibutesArr[i];
                        var toMesh = this.getMeshByName(toObjId);
                        if(!toMesh) continue;
                        var toPosition = new THREE.Vector3();
                        toPosition.getPositionFromMatrix( toMesh.matrixWorld );
                        this.drawHorseshoe(fromPosition, toPosition, (this.bodyViewDepth/4)*4, connectorMaterial, sceneObject3D, 'mapsTo', false, true);
                    }
                }
                var attibutesArr = associations['owns']; // one to many
                if(attibutesArr){
                    var connectorMaterial = new THREE.MeshLambertMaterial({color: 0x000EF});//blue
                    for(var i=0;i<attibutesArr.length;i++){
                        var toObjId = attibutesArr[i];
                        var toMesh = this.getMeshByName(toObjId);
                        if(!toMesh) continue;
                        var toPosition = new THREE.Vector3();
                        toPosition.getPositionFromMatrix( toMesh.matrixWorld );
                        this.drawHorseshoe(fromPosition, toPosition, (this.bodyViewDepth/4)*5, connectorMaterial, sceneObject3D, 'ownes', false, true);
                    }
                }
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

            var coneGeometry = new THREE.CylinderGeometry(0, 50, 180, 50, 50, false);
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

				cellPostionsStore.put({id:cell._id, name: cell.name, type: cell.type, associations:associations});
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
			return when(cellPostionsStore.query({isAttribute:false}), function(cellPosArr){
				for(var i=0;i<cellPosArr.length;i++){
					var cellPosObj = cellPosArr[i];
					var assocArr = cellPosObj.associations[ATTRIBUTE_ASSOC]
					for(var j=0;j<assocArr.length;j++){
						var attrId = assocArr[j];
						var attrPosObj = cellPostionsStore.get(attrId);						
						attrPosObj.pos = new THREE.Vector3(cellPosObj.pos.x, cellPosObj.pos.y, -500 );//500 is a temporary value
						attrPosObj.attrOwnedByClass = true;
					}
				}
				return cellPosArr;
			});
		},*/

		/*postionObjectsZY: function(id, ourPos){
			var cellPositionsObj = cellPostionsStore.get(id);
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
					var minZ = cellPostionsStore.get(minZId).pos.z;
					//var minZ = cellPositionsObj[minZId].pos.z;
					var maxZId = children[0];
					var maxZ = cellPostionsStore.get(maxZId).pos.z;
					//var maxZ = cellPositionsObj[maxZId].pos.z;
					ourPos.z = (minZ - maxZ)/2 + maxZ;
				}
				cellPositionsObj.pos = ourPos;
				return minZUntilNow;
			}
		},*/

	});
});
