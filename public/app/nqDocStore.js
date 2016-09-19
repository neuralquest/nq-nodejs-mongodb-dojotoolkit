define(['dojo/_base/declare', "dojo/_base/lang", "dojo/when", "dojo/promise/all", 'dijit/registry',"dojo/request",
		'dstore/RequestMemory', 'dstore/QueryMethod', 'dojo/dom-construct'],
function(declare, lang, when, all, registry, request,
		 RequestMemory, QueryMethod, domConstruct){

    return declare("nqDocStore", [RequestMemory], {
        target: '/documents',
        idProperty: '_id',
        autoEmitEvents: false,
        transactionObj: {add:{}, update:{}, delete:{}},
        constructor: function () {

            this.root = this;
            this.cachingStore.getChildren = function(parent){
                var filter = {};
                for(var attrName in parent){
                    if(attrName == 'structuredDocPathArr') continue;
                    var attrProps = parent[attrName];
                    if(Array.isArray(attrProps)) {
                        var childrenArr = parent[attrName];
                        var idx = 0;
                        childrenArr.forEach(function(childObj){
                            //childObj.arrayName = parent.arrayName?parent.arrayName+'.'+attrName:attrName;

                            var structuredDocPathArr = [];
                            if(parent.structuredDocPathArr) structuredDocPathArr = parent.structuredDocPathArr.slice(0);//clone
                            structuredDocPathArr.push({arrayName:attrName,idx:idx});
                            childObj.structuredDocPathArr = structuredDocPathArr;
                            idx++;
                        });
                        filter = {data: childrenArr}
                    }
                }
                return this.dotArray(filter);
            };
            this.cachingStore.dotArray = new QueryMethod({
                type: 'dotArray',
                querierFactory: function(filter){
                    return function (data) {
                        return filter.data;
                        //return data[filter._id][filter.arrayName];
                    };
                }
            });
            this.mayHaveChildren = function(obj) {
                return true;
            }
        },
        add: function (item, directives) {
            var self = this;
            this.enableTransactionButtons();
            item._id = this.makeObjectId();
            self.transactionObj.add[item._id] = item;
            return this.cachingStore.add(item, directives).then(function(item){
                self.emit('update', {target:item, directives:directives});
                if(directives && 'parentId' in directives){
                    var parentObj = this.cachingStore.getSync(directives.parentId);
                    if(directives.schema.childrenQuery && 'in' in directives.schema.childrenQuery){
                        var inObj = directives.schema.childrenQuery['in'];
                        for(var key in inObj){
                            var arrayName = inObj[key];
                            var fkArray = parentObj[arrayName];
                            if(!fkArray) fkArray = [];
                            fkArray.push(item[key]);
                            parentObj[arrayName] = fkArray;
                            //parentObj.hasChildren = true;
                        }
                    }
                    else if(directives.schema.childrenQuery && 'and' in directives.schema.childrenQuery){
                        var queryArray = directives.schema.childrenQuery['and'];
                        debugger;
                    }
                    return self.put(parentObj).then(function(){
                        return item;
                    });
                }
                else return item;
            });

            return;
            var item = {};
            if(_item) item = _item;
            if(directives.schema){
                item._id = this.makeObjectId();
                self.transactionObj.add[item._id] = item;
                /*for(var propName in directives.schema.properties){
                    var prop = directives.schema.properties[propName];
                    if(prop.default){
                        item[propName]= prop.default;
                    }
                }*/
                if(directives.schema.query && 'isA' in directives.schema.query){
                    item.classId = directives.schema.query['isA'];
                }
                else if(directives.schema.query && 'and' in directives.schema.query){
                    var queryArray = directives.schema.query['and'];
                    var mapsToId = null;
                    if('isA' in queryArray[0]) mapsToId = queryArray[0]['isA'];
                    else if('isA' in queryArray[1]) mapsToId = queryArray[0]['isA'];
                    item.classId = mapsToId;
                }

                var parentObj = null;
                if(directives.parentId){
                    parentObj = this.cachingStore.getSync(directives.parentId);
                    if(directives.schema.childrenQuery && 'in' in directives.schema.childrenQuery){
                        var inObj = directives.schema.childrenQuery['in'];
                        for(var key in inObj){
                            var arrayName = inObj[key];
                            var fkArray = parentObj[arrayName];
                            if(!fkArray) fkArray = [];
                            fkArray.push(item[key]);
                            parentObj[arrayName] = fkArray;
                            //parentObj.hasChildren = true;

                        }
                    }
                    else if(directives.schema.childrenQuery && 'and' in directives.schema.childrenQuery){
                        var queryArray = directives.schema.childrenQuery['and'];
                        debugger;
                    }
                }

                if(directives.ownerId){
                    item.ownerId = directives.ownerId;
                }
                return this.cachingStore.add(item, directives).then(function(item){
                    if(parentObj) return self.put(parentObj).then(function(){
                        return item;
                    });
                    else return item;
                });


            }
        },
        put: function (item, directives) {
            var self = this;
            this.enableTransactionButtons();
            if(!item._id in self.transactionObj.add) self.transactionObj.update[item._id] = item;
            //if(!directives.viewId) directives.viewId = item._viewId;//TODO pastItem should send viewID in directives
            this.processDirectives(item, directives);
            return this.cachingStore.put(item, directives).then(function(item){
                self.emit('update', {target:item, directives:directives});
                return item;
            });
        },
        remove: function (item, directives) {
            this.enableTransactionButtons();
            if(!item._id in self.transactionObj.add) delete self.transactionObj.add[item._id];
            else {
                delete self.transactionObj.update[item._id];
                self.transactionObj.delete[item._id] = item;
            }
            this.emit('remove', {target:item, directives:directives});
            return this.cachingStore.remove(item, directives);
        },
        processDirectives: function(object, directives){
            if(!directives) return;
            var self = this;
            var viewId = directives.viewId;
            var arrayName = 'childDocs';
            var movingObjectId = object._id;
            var oldParent = directives.oldParent;
            var newParent = directives.parent;
            //var newParentId = directives.parent.id;
            var beforeId = directives.before?directives.before._id:undefined;
            var promises = [];

            if(true == true){
                if(oldParent){
                    if(newParent){ //the 'moving object' is detached from the old parent and attached to the new parent
                        var idx = oldParent[arrayName].indexOf(movingObjectId);
                        if(idx>-1) {
                            oldParent[arrayName].splice(idx,1);
                            //store put old
                            promises.push(self.put(oldParent));
                            if(beforeId) {
                                var beforeIdx = newParent[arrayName].indexOf(beforeId);
                                if(beforeIdx>0) {
                                    newParent[arrayName].splice(beforeIdx,0,movingObjectId);
                                }
                                else {
                                    if(newParent[arrayName]) newParent[arrayName].push(movingObjectId);
                                    else newParent[arrayName] = [movingObjectId];
                                }
                            }
                            else {
                                if(newParent[arrayName]) newParent[arrayName].push(movingObjectId);
                                else newParent[arrayName] = [movingObjectId];
                            }
                            //store put new
                            promises.push(self.put(newParent));
                        }

                    }
                    else{//no new parent means we are detaching the 'moving object' from the old parent
                        var idx = oldParent[arrayName].indexOf(movingObjectId);
                        if(idx>0) {
                            oldParent[arrayName].splice(idx,1);
                            //store put old
                            promises.push(self.put(oldParent));
                        }
                    }
                }
                else if(newParent) {//no oldParent means a new 'moving object' is attached to the new parent
                    if(beforeId) {
                        var beforeIdx = newParent[arrayName].indexOf(beforeId);
                        if(beforeIdx>0) {
                            newParent[arrayName].splice(beforeIdx,0,movingObjectId);
                        }
                        else {
                            if(newParent[arrayName]) newParent[arrayName].push(movingObjectId);
                            else newParent[arrayName] = [movingObjectId];
                        }
                    }
                    else {
                        if(newParent[arrayName]) newParent[arrayName].push(movingObjectId);
                        else newParent[arrayName]= [movingObjectId];
                    }
                    //store put new
                    promises.push(self.put(newParent));
                }
            }
            else{
                if(oldParent){
                    if(newParent){ //the 'moving object' is detached from the old parent and attached to the new parent
                    }
                    else{//no new parent means we are detaching the 'moving object' from the old parent
                    }
                }
                else if(newParent) {//no oldParent means a new 'moving object' is attached to the new parent

                }
            }
            return all(promises);
        },
        getRootCollection: function () {

        },
        getParentClass: function(id) {
            var self = this;
            var parentFilter = self.Filter().contains('children', [id]);
            var parentCollection = self.filter(parentFilter);
            return parentCollection.fetch().then(function(parentsArr){
                if(parentsArr.length>1) throw new Error('More than one parent found');
                else if(parentsArr.length==1) return parentsArr[0];
                else return null;//no parent, we are at the root
            });
        },
        getSchemaForView: function (viewId) {
            if(!viewId) return null;
            var self = this;
            return self.get(viewId).then(function(viewObj){
                if(!viewObj) throw new Error('View Object not found');
                //console.log('viewObj',viewObj);
                var inheritedClassSchemaPromise = {};
                //var docFilter = viewObj.query;
                if(viewObj.isA) {
                    inheritedClassSchemaPromise = self.getInheritedClassSchema(viewObj.isA);
                    /*if ('isA' in viewObj.query) {
                        var mapsToId = viewObj.query['isA'];
                        if (mapsToId) inheritedClassSchemaPromise = self.getInheritedClassSchema(mapsToId);
                    }
                    else if ('and' in viewObj.query) {
                        var queryArray = viewObj.query['and'];
                        var mapsToId = null;
                        if ('isA' in queryArray[0]) mapsToId = queryArray[0]['isA'];
                        else if ('isA' in queryArray[1]) mapsToId = queryArray[0]['isA'];
                        if (mapsToId) inheritedClassSchemaPromise = self.getInheritedClassSchema(mapsToId);
                    }*/
                }
                return when(inheritedClassSchemaPromise, function(inheritedClassSchema){
                    //var properties = viewObj.properties;
                    var inheritedClassProperties = inheritedClassSchema.properties;
                    if(viewObj.query && 'subDoc' in viewObj.query){
                        var subDocName = viewObj.query.subDoc;
                        var subDocItems = inheritedClassSchema.properties[subDocName];
                        inheritedClassProperties = subDocItems.items.properties;
                    }
                    var schema = lang.clone(viewObj);
                    schema.properties = self.mergeProperties(viewObj.properties, inheritedClassSchema.properties);
                    schema.required = [];

                    schema.required = schema.required.concat(schema.required, inheritedClassSchema.required);
                    //console.log('SCHEMA');
                    //console.dir(schema);
                    return schema;
                });
            });
        },
        getAncestors: function(id) {
            var self = this;
            return this.get(id).then(function(classObj){
                if(classObj.parentId) return self.getAncestors(classObj.parentId).then(function(ancestorsArr){
                    ancestorsArr.unshift(classObj);//add to the beginning
                    return ancestorsArr;
                });
                else return [classObj];//no parent, we are at the root
            });
        },
        getInheritedClassSchema: function(id){
            return this.getAncestors(id).then(function(ancestorsArr){
                var inheritedClassSchema = {
                    $schema: "http://json-schema.org/draft-04/schema#",
                    properties:{},
                    required:[],
                    additionalProperties: false
                };
                for(var i = ancestorsArr.length-1; i>=0; i--){
                    var ancestor = ancestorsArr[i];
                    //combine the the two class.properties, there should be no overlap. If there is, the parent is leading
                    //we have to clone otherwise we start messing with the real class
                    lang.mixin(inheritedClassSchema.properties, lang.clone(ancestor.properties));
                    //merge.recursive(inheritedClassSchema.properties, ancestor.properties);
                    //combine the to class.required arrays. There should be no overlap
                    if(ancestor.required) inheritedClassSchema.required = inheritedClassSchema.required.concat(ancestor.required);

                };
                /*ancestorsArr.forEach(function(ancestor){
                    //combine the the two class.properties, there should be no overlap. If there is, the parent is leading
                    //we have to clone otherwise we start messing with the real class
                    lang.mixin(inheritedClassSchema.properties, lang.clone(ancestor.properties));
                    //merge.recursive(inheritedClassSchema.properties, ancestor.properties);
                    //combine the to class.required arrays. There should be no overlap
                    if(ancestor.required) inheritedClassSchema.required = inheritedClassSchema.required.concat(ancestor.required);
                });*/
                return inheritedClassSchema;
            });
        },
        mergeProperties: function(viewProps, classProps) {
            var self = this;
            var properties = {};
            for(var viewPropName in viewProps){
                var viewProp = viewProps[viewPropName];
                if(classProps) {
                    var classProp = classProps[viewPropName];
                    var newProp = {};
                    if(classProp) {
                        if (classProp.type == 'object' && 'properties' in classProp && 'properties' in viewProp) {
                            var subDocClassProps = classProp.properties;
                            var subDocViewProps = viewProp.properties;
                            newProp.properties = self.mergeProperties(subDocViewProps, subDocClassProps);
                            newProp.type = 'object';
                            newProp.title = classProp.title;
                        }
                        else if (classProp.type == 'array' && 'items' in classProp && 'properties' in classProp.items &&
                            'items' in viewProp && 'properties' in viewProp.items) {
                            var subDocClassProps = classProp.items.properties;
                            var subDocViewProps = viewProp.items.properties;
                            var items = self.mergeProperties(subDocViewProps, subDocClassProps);
                            newProp.items = {properties: self.mergeProperties(subDocViewProps, subDocClassProps)};
                            newProp.type = 'array';
                            newProp.title = classProp.title;
                        }
                        else {
                            newProp = lang.clone(classProp);
                            if (classProp.readOnly) newProp.readOnly = true;
                            else newProp.readOnly = viewProp.readOnly == undefined ? true : viewProp.readOnly;
                            if (classProp.maxLength) {
                                if (viewProp.maxLength && viewProp.maxLength < classProp.maxLength) newProp.maxLength = viewProp.maxLength
                            }
                            if (classProp.minLength) {
                                if (viewProp.minLength && viewProp.minLength > classProp.minLength) newProp.minLength = viewProp.minLength
                            }
                            if (classProp.maximum) {
                                if (viewProp.maximum && viewProp.maximum < classProp.maximum) newProp.maximum = viewProp.maximum
                            }
                            if (classProp.minimum) {
                                if (viewProp.minimum && viewProp.minimum > classProp.minimum) newProp.minimum = viewProp.minimum
                            }
                        }
                        if(viewProp.title) newProp.title = viewProp.title;
                        if(viewProp.col) newProp.col = viewProp.col;
                        if(viewProp.row) newProp.row = viewProp.row;
                        if(viewProp.default) newProp.default = viewProp.default;
                        if(viewProp.styleColumn) newProp.styleColumn = viewProp.styleColumn;
                        if(viewPropName=='_id') newProp.type = 'string';
                    }
                    else newProp = lang.clone(viewProp);
                    properties[viewPropName] = newProp;
                }
                else properties[viewPropName] = lang.clone(viewProp);
            }
            return properties;
        },
        isASync: function(doc, id) {
            if(doc._id === id) return true;
            var parentId = doc.docType=='object'?doc.classId:doc.parentId;
            if(!parentId) return false;
            var parentDoc =  this.cachingStore.getSync(parentId);
            return this.isASync(parentDoc, id);
        },
        isA: function(doc, id) {
            var self = this;
            if(doc._id === id) return true;
            var parentId = doc.docType=='object'?doc.classId:doc.parentId;
            if(!parentId) return false;
            return this.get(parentId).then(function(parentDoc){
                return self.isA(parentDoc, id);
            });
        },
        getInstances: function(id) {

        },
        getSubclasses: function(id) {

        },
        buildFilterFromQuery: function(parentObj, docQuery) {
            var self = this;
            for(var filterType in docQuery){
                var docFilter = docQuery[filterType];
                switch (filterType) {
                    case 'eq':
                        for(var key in docFilter){
                            var propName = docFilter[key];
                            var value = parentObj[propName];
                            return self.Filter().eq(key, value);
                        }
                        break;
                    case 'and':
                        var firstDocQuery = docFilter[0];
                        var secondDocQuery = docFilter[1];
                        var firstFilter = this.buildFilterFromQuery(parentObj, firstDocQuery);
                        var secondFilter = this.buildFilterFromQuery(parentObj, secondDocQuery);
                        if (firstFilter && secondFilter) return self.Filter().and(firstFilter, secondFilter);
                        break;
                    case 'or':
                        var firstDocQuery = docFilter[0];
                        var secondDocQuery = docFilter[1];
                        var firstFilter = this.buildFilterFromQuery(parentObj, firstDocQuery);
                        var secondFilter = this.buildFilterFromQuery(parentObj, secondDocQuery);
                        if (firstFilter && secondFilter) return self.Filter().or(firstFilter, secondFilter);
                        if (firstFilter) return firstFilter;
                        if (secondFilter) return secondFilter;
                        break;
                    case 'in':
                        for(var key in docFilter){
                            var idArrName = docFilter[key];
                            var idArr = parentObj[idArrName];
                            if(!idArr) return;
                            return this.Filter().in(key, idArr);
                        }
                        break;
                    case 'isA':
                        return self.cachingStore.Filter(function (obj) {
                            if(obj.docType == 'class') return false;
                            return self.isASync(obj, docFilter);
                        });
                        break;
                    case 'view':
                        var subView = this.cachingStore.getSync(docFilter);
                        if (subView) {
                            var fil = this.buildFilterFromQuery(parentObj, subView.query);
                            fil.viewId = docFilter;
                            return fil;//TODO how to determin viewId from object?
                            //return this.buildFilterFromQuery(parentObj, subView.query);
                        }
                        break;
                    case 'array':
                        debugger;
                        break;
                    default:
                        break;
                }
            }
        },
        amAuthorizedToUpdate: function(doc){
            return true;
            var user = nq.getUser();
            if(user.id) return user.id;
            return false;
            var userId = "575d4c3f2cf3d6dc3ed83148";
            var ownerFilter = this.Filter().contains('owns', +[doc._id]);
            var ownerCollection = this.filter(ownerFilter);
            return ownerCollection.fetch().then(function(owners){
                console.log('owner of', doc.name, ownerFilter);
                console.dir(owners);
                if(owners[0]._id == userId) return true;
                return false;
            });
        },
        makeObjectId: function() {
            var timestamp = (new Date().getTime() / 1000 | 0).toString(16);
            return timestamp + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, function() {
                    return (Math.random() * 16 | 0).toString(16);
                }).toLowerCase();
        },
        enableTransactionButtons: function () {
            registry.byId('cancelButtonId').set('disabled', false);
            registry.byId('saveButtonId').set('disabled', false);
        },
        commit: function(){
            var self = this;
            request.post('/documents', {
                // send all the operations in the body
                headers: {'Content-Type': 'application/json; charset=UTF-8'},//This is not the default!!
                data: JSON.stringify(self.transactionObj)
            }).then(function(data){
                console.log('data', data);
                self.transactionObj = {};
                var domNode = domConstruct.create("div", {
                    style:{
                        border: '2px solid gray','border-radius': '5px',position: 'fixed','z-index': 2,opacity: 0,
                        'background-color': 'lime',top: '30%',left: '40%',width: '100px',height: '50px'
                    }
                }, 'fullPage');
                domConstruct.create("div", {
                    style:{ 'font-size': '20px','font-weight': 'bold','text-align': 'center', 'margin-top': '15px'},
                    innerHTML: 'Saved'
                }, domNode);
                dojo.fadeIn({
                    node:domNode,duration: 300,
                    onEnd: function(){
                        dojo.fadeOut({
                            node:domNode,duration: 300,delay:300,
                            onEnd: function(){domConstruct.destroy(domNode)}
                        }).play();
                    }}).play();
                registry.byId('cancelButtonId').set('disabled',true);
                registry.byId('saveButtonId').set('disabled',true);
            },function(error){
                nq.errorDialog(error);
            });
        },
        abort: function(){
            registry.byId('cancelButtonId').set('disabled',true);
            registry.byId('saveButtonId').set('disabled',true);
            self.transactionObj = {};
        }
    });
});
