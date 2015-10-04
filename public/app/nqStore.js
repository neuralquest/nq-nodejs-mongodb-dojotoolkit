define(['dojo/_base/declare', "dojo/_base/lang", "dojo/_base/array", "dojo/when", "dojo/promise/all", 'dstore/Store', 'dstore/QueryResults',
		'dstore/RequestMemory', 'dijit/registry'],
function(declare, lang, array, when, all, Store, QueryResults,
		 RequestMemory, registry){

    return declare("nqStore", [Store], {
        assocsColl: new RequestMemory({target: '/assocs', idProperty: '_id'}),
        itemsColl: new RequestMemory({target: '/items', idProperty: '_id'}),

        get: function (_itemId) {
            var itemId = Number(_itemId);
            //return this.itemsColl.fetch({itemId:itemId});
            this.enableTransactionButtons();
            return this.itemsColl.get(itemId);
        },
        add: function (item, directives) {
            this.enableTransactionButtons();
            return this.itemsColl.add(item);
        },
        put: function (item, directives) {
            this.enableTransactionButtons();
            return this.itemsColl.put(item);
        },
        remove: function (itemId, directives) {
            return this.itemsColl.remove(itemId);
        },
        getChildren: function (object, onComplete) {
            var promise = this.getItemsByParentView(object._id, object._viewId);
            //var collection = this.filter({parentId: object.id, parentViewId: object.viewId });
            return promise.then(function (results) {
                return onComplete(results);
            });
            var results = new QueryResults(promise);
            return onComplete(results);
        },
        /*mayHaveChildren: function(item){
         //return 'children' in item;
         return true;
         },
         getRoot: function(onItem, onError){
         // there should be only a single object in (the root of) this collection,
         // so we just return that
         this.forEach(onItem);
         },
         getLabel: function(object){
         return object.name;
         },*/
        getItemsByView: function (parentId, viewId) {
            var self = this;
            return self.get(viewId).then(function (view) {
                return self.getItemsByAssocTypeAndDestClass(parentId, view.toMannyAssociations, view.mapsTo)
            });
        },
        getItemsByParentView: function (parentId, parentViewId) {
            var self = this;
            return self.getItemsByAssocTypeAndDestClass(parentViewId, 'manyToMany', VIEW_CLASS_TYPE).then(function (viewsArr) {
                //console.log('viewsArr',viewsArr);
                var promises = [];
                viewsArr.forEach(function (view) {
                    /*self.getAllowedAssocClassesForView(view._id).then(function(schema){
                        console.dir(schema);
                    });*/
                    if(view.subDocument) promises.push(self.get(parentId));
                    else{
                        var assocType = view.toMannyAssociations;
                        if(!assocType) assocType = view.toOneAssociations;
                        if(parentId == 2016) debugger;
                        if(view.onlyIfParentEquals){
                            var oipe = Number(view.onlyIfParentEquals);
                            if(parentId == oipe) promises.push(self.getItemsByAssocTypeAndDestClass(view.mapsTo, assocType));
                            else promises.push([]);
                        }
                        else promises.push(self.getItemsByAssocTypeAndDestClass(parentId, assocType, view.mapsTo));
                    }
                });
                return when(all(promises), function (viewResArr) {
                    var results = [];
                    var count = 0;

                    //console.log('viewResArr', viewResArr);
                    viewResArr.forEach(function (itemsArr) {
                        var subDocument = viewsArr[count].subDocument;
                        if(subDocument){
                            var doc = itemsArr[subDocument];
                            for(var attrName in doc) {
                                var subDocItem = doc[attrName];
                                subDocItem.name = attrName;
                                subDocItem._viewId = viewsArr[count]._id;
                                results.push(subDocItem);
                            };
                        }
                        else{
                            itemsArr.forEach(function (item) {
                                item._viewId = viewsArr[count]._id;
                                results.push(item);
                            });
                        }
                        count++;
                    });
                    return results;
                });
            });
        },
        getItemsByAssocTypeAndDestClass: function (parentId, type, destClassId) {
            if(!parentId || !type) throw new Error('invalid parms');
            var self = this;
            return when(self.getItemsByAssocType(parentId, type), function(itemsArr){//use when here because getItemsByAssocType sometimes returns a completed array
                if(!destClassId) return itemsArr;
                var isAPromises = [];
                itemsArr.forEach(function(item){
                    isAPromises.push(self.isA(item._id, destClassId));
                });
                return all(isAPromises).then(function (isADestClassArr) {
                    var results = [];
                    var count = 0;
                    isADestClassArr.forEach(function(isADestClass){
                        if(isADestClass) results.push(itemsArr[count]);
                        count ++;
                    });
                    if(results.length == 1 && type == 'ordered') {
                        var itemsPromisesArr = [];
                        itemsPromisesArr.push(results[0]);//add the first one
                        return self.followAssocType(results[0]._id, 'next', itemsPromisesArr).then(function (itemsPromisesArrResults) {
                            return all(itemsPromisesArrResults);
                        });
                    }
                    return results;
                });
            });
            /*if (type == 'ordered') {
                var query = {source: parentId, type: 'ordered'};
                var collection = this.assocsColl.filter(query);
                var isAPromises = [];
                collection.forEach(function (assoc) {
                    isAPromises.push(self.isA(assoc.dest, destClassId));
                });
                return all(isAPromises).then(function (isADestClassArr) {
                    //console.log('isADestClassArr', isADestClassArr);
                    var count = 0;
                    var firstId = null;
                    for (var i = 0; i < isADestClassArr.length; i++) {
                        if (isADestClassArr[i]) {
                            firstId = isADestClassArr[i];
                            count += 1;
                        }
                    }
                    if (count > 1) throw new Error(new Error("More than one 'ordered' found"));
                    else if (count == 1) {
                        var itemsPromisesArr = [];
                        itemsPromisesArr.push(self.itemsColl.get(firstId));//add the first one
                        return self.followAssocType(firstId, 'next', itemsPromisesArr).then(function (itemsPromisesArrResults) {
                            return all(itemsPromisesArrResults);
                        });
                    }
                    else return ([]);
                });
            }
            else if (type == 'instantiations') {
                var query = {dest: destClassId, type: 'parent'};
                var collection = this.assocsColl.filter(query);
                var itemPromises = [];
                collection.forEach(function (assoc) {
                    itemPromises.push(self.itemsColl.get(assoc.source));
                });
                return all(itemPromises);
            }
            else if (type == 'subclasses') {
                var query = {dest: parentId, type: 'parent'};
                var collection = this.assocsColl.filter(query);
                var itemPromises = [];
                collection.forEach(function (assoc) {
                    itemPromises.push(self.itemsColl.get(assoc.source));
                });
                return all(itemPromises);
            }
            else if (type == 'associations') {
                var query = {source: parentId};
                var collection = this.assocsColl.filter(query);
                var typesObj = {};
                collection.forEach(function (assoc) {
                    if(assoc.type != 'parent') typesObj[assoc.type] = true;
                });
                var query2 = {dest: parentId};
                var collection2 = this.assocsColl.filter(query2);
                collection2.forEach(function (assoc) {
                    var assocProps = ASSOCPROPERTIES[assoc.type];
                    typesObj[assocProps.inverse] = true;
                });
                var assocs = [];
                for(type in typesObj){
                    assocs.push({_id:parentId+':'+type, _name:type, _type:'assoc', _icon:11});
                }
                return assocs;
            }
            else if (type == 'by association type') {
                var pars = _parentId.split(':');
                var query = {source: Number(pars[0]), type: pars[1]};
                var collection = this.assocsColl.filter(query);
                var itemPromises = [];
                collection.forEach(function (assoc) {
                    itemPromises.push(self.itemsColl.get(assoc.dest));
                });
                return all(itemPromises);
            }
            else {
                var query = {source: parentId, type: type};
                var collection = this.assocsColl.filter(query);
                var isAPromises = [];
                collection.forEach(function (assoc) {
                    isAPromises.push(self.isA(assoc.dest, destClassId));
                });
                return all(isAPromises).then(function (isADestClassArr) {
                    var itemPromises = [];
                    isADestClassArr.forEach(function (isA) {
                        if (isA)itemPromises.push(self.get(isA));
                    });
                    return all(itemPromises);
                });
            }*/
        },
        getItemsByAssocType: function(_parentId, assocType){
            if(assocType == 'the user') return [];
            var parentId = Number(_parentId);
            var self = this;
            if (assocType == 'subclasses' || assocType == 'instantiations') {
                var query = {dest: parentId, type: 'parent'};
                var collection = this.assocsColl.filter(query);
                var itemPromises = [];
                collection.forEach(function (assoc) {
                    itemPromises.push(self.itemsColl.get(assoc.source));
                });
                return all(itemPromises).then(function(itemsArr){
                    var results = [];
                    itemsArr.forEach(function (item){
                        if(assocType == 'subclasses' && item._type == 'class') results.push(item);
                        else if(assocType == 'instantiations' && item._type == 'object') results.push(item);
                    });
                    return results;
                });
            }
            else if (assocType == 'associations') {
                var query = {source: parentId};
                var collection = this.assocsColl.filter(query);
                var typesObj = {};
                collection.forEach(function (assoc) {
                    if(assoc.type != 'parent') typesObj[assoc.type] = true;
                });
                var query2 = {dest: parentId};
                var collection2 = this.assocsColl.filter(query2);
                collection2.forEach(function (assoc) {
                    var assocProps = ASSOCPROPERTIES[assoc.type];
                    typesObj[assocProps.inverse] = true;
                });
                var assocs = [];
                for(var type in typesObj){
                    assocs.push({_id:parentId+':'+type, _name:type, _type:'assoc', _icon:ASSOCPROPERTIES[type].icon});
                }
                return assocs;
            }
            else if (assocType == 'by association type') {
                var pars = _parentId.split(':');
                return self.getItemsByAssocType(Number(pars[0]), pars[1]);
            }
            else {
                var query  = self.normalizeAssocQuery(parentId, assocType);
                var collection = this.assocsColl.filter(query);
                var itemPromises = [];
                collection.forEach(function (assoc) {
                    if(query.source) itemPromises.push(self.itemsColl.get(assoc.dest));
                    else itemPromises.push(self.itemsColl.get(assoc.source));
                });
                return all(itemPromises);
            }
        },
        fetch: function() {
            //var data = this.data;
            var data =[];
            if (!data || data._version !== this.storage.version || 1==1) {
                // our data is absent or out-of-date, so we requery from the root
                // start with the root data
                //data = this.storage.fullData;
                var queryLog = this.queryLog;
                // iterate through the query log, applying each querier
                for (var i = 0, l = queryLog.length; i < l; i++) {
                    if(queryLog[i].type == 'filter'){
                        var query = queryLog[i].arguments[0];
                        if(query.itemId && query.assocType) {
                            var promise = this.getItemsByAssocType(query.itemId, query.assocType);
                            promise.then(function (res) {
                                data = res;
                            });
                        }
                        else if(query.itemId) {
                            this.get(query.itemId).then(function(res){
                                data = [res];
                            });
                        }
                        else if (query.viewId && query.parentId) {
                            var promise = this.getItemsByView(query.parentId, query.viewId);
                            promise.then(function (res) {
                                data = res;
                            });
                        }
                        else if(query.parentViewId && query.parentId) {
                            this.getItemsByParentView(query.parentId, query.parentViewId).then(function(res){
                                data = res;
                            });
                        }
                        else if(query.parentId && query.type && query.destClassId) {
                            this.getItemsByAssocTypeAndDestClass(query.parentId, query.type, query.destClassId).then(function(res){
                                data = res;
                            });
                        }
                    }
                }
                // store it, with the storage version stamp
                data._version = this.storage.version;
                this.data = data;
            }
            return new QueryResults(data);
        },
        fetchRange: function (kwArgs) {
            var data = this.fetch(),
                start = kwArgs.start,
                end = kwArgs.end;
            return new QueryResults(data.slice(start, end), {
                totalLength: data.length
            });
        },
        isA: function (itemId, destClassId, originalId) {
            var self = this;
            if (!originalId) originalId = itemId;
            if (itemId == destClassId) return originalId;
            var collection = this.assocsColl.filter({source: itemId, type: 'parent'});
            return collection.fetch().then(function (assocsArr) {
                if (assocsArr.length > 1) throw new Error('More than one parent found');
                if (assocsArr.length == 0) return null;//we're at the root
                return self.isA(assocsArr[0].dest, destClassId, originalId);
            });
        },
        followAssocType: function (itemId, type, itemsPromisesArr) {
            var self = this;
            var collection = this.assocsColl.filter({source: itemId, type: type});
            return collection.fetch().then(function (assocsArr) {
                if (assocsArr.length > 1) throw new Error('More than one next found');
                else if (assocsArr.length == 1) {
                    itemsPromisesArr.push(self.itemsColl.get(assocsArr[0].dest));
                    return self.followAssocType(assocsArr[0].dest, type, itemsPromisesArr)
                }
                return itemsPromisesArr;//found the last one
            });
        },
        getCombinedSchemaForView: function(view) {
            var self = this;
            return self.getAttrPropertiesFromAncestors(view.mapsTo).then(function(classAttrObj){
                var schema = {_viewId: view._id};
                for(var attrPropName in view.schema){
                    //if(attrPropName == 'description') debugger;
                    var newProp = {};
                    var attrProp = view.schema[attrPropName];
                    var classAttrProp = null;
                    for(var classAttrName in classAttrObj){
                        //debugger;
                        if(attrPropName == classAttrName){
                            classAttrProp = classAttrProp = classAttrObj[attrPropName];
                            break;
                        }
                    };
                    if(!classAttrProp) {
                        //throw new Error('cant find classAttrProp');
                        console.warn('classAttrProp not found',attrProp);
                        continue;
                    }
                    //set the defaults
                    newProp.type = classAttrProp.type;
                    if(classAttrProp.media) newProp.media = classAttrProp.media;
                    if(classAttrProp.enum){
                        if(attrProp.enum) newProp.enum = attrProp.enum; //TODO assert that the values are permitted
                        else newProp.enum = classAttrProp.enum;
                    }
                    if(attrProp.pattern) newProp.pattern = attrProp.pattern;
                    else if(classAttrProp.pattern) newProp.pattern = classAttrProp.pattern;
                    if(attrProp.invalidMessage) newProp.invalidMessage = attrProp.invalidMessage;
                    else if(classAttrProp.invalidMessage) newProp.invalidMessage = classAttrProp.invalidMessage;
                    if(attrProp['$ref']) newProp['$ref'] = attrProp['$ref'];
                    else if(classAttrProp['$ref']) newProp['$ref'] = classAttrProp['$ref'];

                    newProp.required = attrProp.required?attrProp.required:classAttrProp.required?classAttrProp.required:false;
                    newProp.readOnly = attrProp.readOnly?attrProp.readOnly:classAttrProp.readOnly?classAttrProp.readOnly:true;
                    newProp.hidden = attrProp.hidden?attrProp.hidden:classAttrProp.hidden?classAttrProp.hidden:false;
                    newProp.title = attrProp.title?attrProp.title:classAttrProp.title?classAttrProp.title:'[no title]';
                    newProp.default = attrProp.default?attrProp.default:classAttrProp.default?classAttrProp.default:null;
                    newProp.description = attrProp.description?attrProp.description:classAttrProp.description?classAttrProp.description:'[no description]';
                    newProp.style = attrProp.style?attrProp.style:classAttrProp.style?classAttrProp.style:'width:100%';
                    newProp.nullValue = null;
                    newProp.columnWidth = '10em'
                    if(classAttrProp.media && classAttrProp.media.mediaType == 'text/html'){
                        newProp.nullValue = '<p>[no text]</p>';
                        newProp.columnWidth = attrProp.columnWidth?attrProp.columnWidth:classAttrProp.columnWidth?classAttrProp.columnWidth:'100%';
                        newProp.maxLength = attrProp.maxLength?attrProp.maxLength:classAttrProp.maxLength?classAttrProp.maxLength:1000000;
                    }
                    else if(classAttrProp.enum){
                        newProp.nullValue = -1;
                        newProp.columnWidth = attrProp.columnWidth?attrProp.columnWidth:classAttrProp.columnWidth?classAttrProp.columnWidth:'8em';
                    }
                    else if(classAttrProp.type == 'String'){
                        newProp.nullValue = '[empty]';
                        newProp.columnWidth = attrProp.columnWidth?attrProp.columnWidth:classAttrProp.columnWidth?classAttrProp.columnWidth:'10em';
                        newProp.maxLength = attrProp.maxLength?attrProp.maxLength:classAttrProp.maxLength?classAttrProp.maxLength:1000000;
                        if(attrProp.minLength) newProp.minLength = attrProp.minLength;
                        else if(classAttrProp.minLength) newProp.minLength = classAttrProp.minLength;
                    }
                    else if(classAttrProp.type == 'Number'){
                        newProp.nullValue = '[null]';
                        newProp.columnWidth = attrProp.columnWidth?attrProp.columnWidth:classAttrProp.columnWidth?classAttrProp.columnWidth:'4em';
                        newProp.maximum = attrProp.maximum?attrProp.maximum:classAttrProp.maximum?classAttrProp.maximum:Number.MAX_VALUE;
                        newProp.minimum = attrProp.minimum?attrProp.minimum:classAttrProp.minimum?classAttrProp.minimum:Number.MIN_VALUE;
                        newProp.places = attrProp.places?attrProp.places:classAttrProp.places?classAttrProp.places:0;
                    }
                    else if(classAttrProp.type == 'Date'){
                        newProp.nullValue = null;
                        newProp.columnWidth = attrProp.columnWidth?attrProp.columnWidth:classAttrProp.columnWidth?classAttrProp.columnWidth:'6em';
                    }
                    else if(classAttrProp.type == 'Boolean'){
                        newProp.nullValue = false;
                        newProp.columnWidth = attrProp.columnWidth?attrProp.columnWidth:classAttrProp.columnWidth?classAttrProp.columnWidth:'3em';
                    }
                    schema[attrPropName] = newProp;
                }
                return schema;
            });
        },
        getAllowedAssocClassesForView: function(viewId){
            var self = this;
            return this.getItemsByAssocTypeAndDestClass(viewId, 'manyToMany', VIEW_CLASS_TYPE).then(function (viewsArr) {
                var permittedClassesObj = { parentViewId : viewId };
                var promises = [];
                viewsArr.forEach(function(subView){
                    //TODO allowed classes for class model?
                    if(subView.mapsTo) promises.push(self.collectAllByAssocType(subView.mapsTo, 'subClasses'));
                });
                return all(promises).then(function(subClassesArr){
                    for(var i =0; i<subClassesArr.length;i++){
                        var subClasses = subClassesArr[i];
                        var view = viewsArr[i];
                        permittedClassesObj[view._id] = {assocType: view.toMannyAssociations, allowedClasses:subClasses};
                    }
                    return permittedClassesObj;
                });
            });
        },
        getAttrPropertiesFromAncestors: function(classId){
            var self = this;
            var parentClassesPromises = [];
            parentClassesPromises.push(self.get(classId));// Get the first one
            return self.followAssocType(Number(classId), 'parent', parentClassesPromises).then(function(parentClassesArr){
                return all(parentClassesArr).then(function(classesArr){
                    var classAttrObj = {};
                    classesArr.forEach(function(classItem) {
                        for(classAttr in classItem){
                            //console.log('classAttr', classAttr);
                            if(classAttr.charAt(0)!='_') classAttrObj[classAttr] = classItem[classAttr];
                        }
                    });
                    return classAttrObj;
                });
            });
        },
        collectAllByAssocType: function (itemId, assocType) {
            var self = this;
            return self.get(itemId).then(function(item){
                var type = ASSOCPROPERTIES[assocType].type;
                if(!type || item._type == type){
                    var query  = self.normalizeAssocQuery(itemId, assocType);
                    var collection = self.assocsColl.filter(query);
                    var itemPromises = [];
                    var count = 0;
                    collection.forEach(function (assoc) {
                        count ++;
                        if(!ASSOCPROPERTIES[assocType].pseudo) itemPromises.push(self.itemsColl.get(assoc.dest));
                        else itemPromises.push(self.itemsColl.get(assoc.source));
                    });
                    if(ASSOCPROPERTIES[assocType].cardinality == 'one' && count>1) console.warn('more than one found');
                    return all(itemPromises).then(function(classesArr){
                        //console.log('classesArr',classesArr);
                        var subclassesPromises = [];
                        classesArr.forEach(function(childItem){
                            subclassesPromises.push(self.collectAllByAssocType(childItem._id, assocType));
                        });
                        return all(subclassesPromises).then(function(subclassesArr){
                            var results = [];
                            results.push(item);
                            subclassesArr.forEach(function(subClass){
                                if(subClass) results.push(subClass[0]);
                            });
                            console.log('subclassesArr', results);
                            return results;
                        });
                    });
                }
                else return null;
            });
        },
        normalizeAssocQuery: function (itemId, type) {
            var assocProps = ASSOCPROPERTIES[type];
            if(assocProps.pseudo) {
                return {dest: itemId, type: assocProps.inverse};
            }
            else return {source: itemId, type: type};
        },


        enableTransactionButtons: function () {
            registry.byId('cancelButtonId').set('disabled', false);
            registry.byId('saveButtonId').set('disabled', false);
        },




    });

});
