define(['dojo/_base/declare', "dojo/_base/lang", "dojo/_base/array", "dojo/when", "dojo/promise/all", 'dstore/Store', 'dstore/QueryResults',
		'dstore/RequestMemory', 'dijit/registry', 'dojo/aspect','dstore/SimpleQuery', 'dojo/request'],
function(declare, lang, array, when, all, Store, QueryResults,
		 RequestMemory, registry, aspect, SimpleQuery, request){

    return declare("nqStore", [Store, SimpleQuery], {
        autoEmitEvents: false,
        transactionIds: {assocsColl:{add:{}, update:{}, delete:{}}, itemsColl:{add:{}, update:{}, delete:{}}},
        constructor: function (options) {
            var self = this;
            // perform the mixin
            options && declare.safeMixin(this, options);
            this.assocsColl = new RequestMemory({target: '/assocs', idProperty: '_id'});
            this.itemsColl = new RequestMemory({target: '/items', idProperty: '_id'});

            aspect.after(this.itemsColl, 'add', function (result, args) {
                var itemId = args[0]._id;
                self.transactionIds.itemsColl.add[itemId] = true;
                return result;
            });
            aspect.after(this.itemsColl, 'put', function (result, args) {
                var itemId = args[0]._id;
                if(!self.transactionIds.itemsColl.add[itemId])
                    self.transactionIds.itemsColl.update[itemId] = true;
                return result;
            });
            aspect.after(this.itemsColl, 'delete', function (result, args) {
                var itemId = args[0]._id;
                if(self.transactionIds.itemsColl.add[itemId]){
                    delete self.transactionIds.itemsColl.add[itemId];
                }
                else self.transactionIds.itemsColl.delete[itemId] = true;
                delete self.transactionIds.itemsColl.update[itemId];
                return result;
            });
            aspect.after(this.assocsColl, 'add', function (result, args) {
                var itemId = args[0]._id;
                self.transactionIds.assocsColl.add[itemId] = true;
                return result;
            });
            aspect.after(this.assocsColl, 'put', function (result, args) {
                var itemId = args[0]._id;
                if(!self.transactionIds.assocsColl.add[itemId])
                    self.transactionIds.assocsColl.update[itemId] = true;
                return result;
            });
            aspect.after(this.assocsColl, 'delete', function (result, args) {
                var itemId = args[0]._id;
                if(self.transactionIds.assocsColl.add[itemId]){
                    delete self.transactionIds.assocsColl.add[itemId];
                }
                else self.transactionIds.assocsColl.delete[itemId] = true;
                delete self.transactionIds.assocsColl.update[itemId];
                return result;
            });
        },
        get: function (_itemId) {
            var itemId = Number(_itemId);
            return this.itemsColl.get(itemId);
        },
        add: function (item, directives) {
            this.enableTransactionButtons();
            var id = Math.floor((Math.random()*1000000)+1);
            //item._id = id;
            this.itemsColl.add(item);// not async??
            this.assocsColl.add({source: item._id, type: 'parent', dest: item._icon});
            if(directives) this.processDirectives(item, directives);
            this.emit('add', {target:item, directives:directives});
        },
        put: function (item, directives) {
            this.enableTransactionButtons();
            var updatedItem =  this.itemsColl.put(item);
            if(directives) this.processDirectives(updatedItem, directives);
            this.emit('update', {target:item, directives:directives});
        },
        remove: function (itemId, directives) {
            if(directives) this.processDirectives(itemId, directives);
            this.itemsColl.remove(itemId);
            this.emit('delete', {target:itemId, directives:directives});
        },
        getChildren: function (object, onComplete) {
            if(!object._id || !object._viewId) throw (new Error('Invalid parameters'));
            //var collection = this.filter({parentId: object.id, parentViewId: object.viewId });
            //collection.fetch();
            //return onComplete(collection);

            var promise = this.getItemsByParentIdParentViewId(object._id, object._viewId);
            return promise.then(function (results) {
                return onComplete(results);
            });
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
        processDirectives: function(object, directives){
            var self = this;
            var viewId = object._viewId;
            var movingObjectId = object._id;
            var oldParentId = directives.oldParent?directives.oldParent._id:undefined;
            var newParentId = directives.parent?directives.parent._id:undefined;
            //var newParentId = directives.parent.id;
            var beforeId = directives.before?directives.before._id:undefined;

            return this.get(viewId).then(function(view){
                //TODO must merge
                var assocType = view.toManyAssociations;
                if(!assocType) assocType = view.toOneAssociations;
                var destClassId = view.mapsTo;
                if(assocType == 'ordered'){
                    if(oldParentId){
                        // The leading Assoc will remain attached to the Object that's being moved
                        // First make sure the old parent/preceding object is attached to the object that comes after the moving object
                        // get the ordered children as seen from the old parent
                        when(self.getItemsByAssocTypeAndDestClass(oldParentId, 'ordered', destClassId), function(oldParentChildren){
                            // get the ordered children as seen from the new parent (could be the same)
                            when(self.getItemsByAssocTypeAndDestClass(newParentId, 'ordered', destClassId), function(newParentChildren){
                                var leadingAssocSourceFk = 0;
                                var leadingAssoctype = '';
                                var idx = oldParentChildren.indexOf(movingObjectId);
                                if(idx==0){//the object we're moving is the first of the old parent children
                                    leadingAssocSourceFk = oldParentId;
                                    leadingAssoctype = 'ordered';
                                    if(oldParentChildren.length>1){//there is at least one other object following the moving object, find it's assoc
                                        when(self.assocsColl.filter({source: movingObjectId, type: 'next', dest: oldParentChildren[1]}), function(assocArr){
                                            // update it so that it has the old parent as source
                                            if(assocArr.length!=1) throw (new Error('Expected to find one association'));
                                            var assoc = assocArr[0];
                                            assoc.source = oldParentId;
                                            assoc.type = 'ordered';
                                            assoc.parentId = oldParentId;//needed for server side validation
                                            self.assocsColl.put(assoc);
                                        });
                                    }
                                }
                                else{//the object we're moving is NOT the first of the old parent children
                                    leadingAssocSourceFk = oldParentChildren[idx-1];
                                    leadingAssoctype = 'next';
                                    if(idx < oldParentChildren.length-1){//there is at least one other object following the moving object, find it's assoc
                                        when(self.assocsColl.filter({source: movingObjectId, type: 'next', dest: oldParentChildren[idx+1]}), function(assocArr){
                                            //update it so that it has the previous object as source
                                            if(assocArr.length!=1) throw (new Error('Expected to find one association'));
                                            var assoc = assocArr[0];
                                            assoc.source = oldParentChildren[idx-1];
                                            assoc.parentId = oldParentId;//needed for server side validation
                                            self.assocsColl.put(assoc);
                                        });
                                    }
                                }

                                //Next make sure the new parent/following object is attached to the moving object
                                var newParentFollowingAssocSourceFk = 0;
                                var newParentFollowingAssoctype = 0;
                                if(beforeId){
                                    var idx = newParentChildren.indexOf(beforeId);
                                    if(idx==0){//the to be following object is the first one of the new parent children
                                        newParentFollowingAssocSourceFk = newParentId;
                                        newParentFollowingAssoctype = 'ordered';
                                    }
                                    else{//the to be following object is NOT the first one of the new parent children
                                        newParentFollowingAssocSourceFk = newParentChildren[idx-1];
                                        newParentFollowingAssoctype = 'next';
                                    }
                                    //get the following assoc and update it so that it has the moving object as source
                                    when(self.assocsColl.filter({source: newParentFollowingAssocSourceFk, type: newParentFollowingAssoctype, dest: beforeId}), function(assocArr){
                                        if(assocArr.length!=1) throw (new Error('Expected to find one association'));
                                        var newParentFollowingAssoc = assocArr[0];
                                        newParentFollowingAssoc.source = movingObjectId;
                                        newParentFollowingAssoc.type = 'next';
                                        newParentFollowingAssoc.parentId = newParentId;//needed for serverside validation
                                        self.assocsColl.put(newParentFollowingAssoc);
                                    });
                                }
                                else{// No before: add it to the last one or the parent if the new parent has no children
                                    if(newParentChildren.length==0){//ours will be the only one
                                        newParentFollowingAssocSourceFk = newParentId;
                                        newParentFollowingAssoctype = 'ordered';
                                    }
                                    else{//ours will be the last one
                                        newParentFollowingAssocSourceFk = newParentChildren[newParentChildren.length-1];
                                        newParentFollowingAssoctype = 'next';
                                    }
                                }
                                //Fianly attach the new parent/preceding object to the moving object
                                when(self.assocsColl.filter({source: leadingAssocSourceFk, type: leadingAssoctype, dest: movingObjectId}), function(assocArr){
                                    if(assocArr.length!=1) throw (new Error('Expected to find one association'));
                                    var leadingAssoc = assocArr[0];
                                    leadingAssoc.source = newParentFollowingAssocSourceFk;
                                    leadingAssoc.type = newParentFollowingAssoctype;
                                    leadingAssoc.parentId = newParentId;//needed for serverside validation
                                    self.assocsColl.put(leadingAssoc);
                                });
                            });
                        });
                    }
                    else{//no oldParent means we're creating a new cell with a new association
                        if(newParentId) {
                            // get the ordered children as seen from the new parent
                            when(self.getItemsByAssocTypeAndDestClass(newParentId, 'ordered', destClassId), function(newParentChildren){
                                if(newParentChildren.length>0){
                                    self.assocsColl.add({source: newParentChildren[newParentChildren.length-1]._id, type: 'next', dest: movingObjectId, parentId:newParentId});
                                }
                                else{
                                    self.assocsColl.add({source: newParentId, type: 'ordered', dest: movingObjectId});
                                }
                            });
                        }
                    }
                }
                else{
                    if(oldParentId == newParentId) return;
                    if(oldParentId){
                        if(ASSOCPROPERTIES[assocType].pseudo){
                            when(self.assocsColl.filter({source:movingObjectId , type: ASSOCPROPERTIES[type].inverse, dest: oldParentId}), function(assocArr){
                                if(assocArr.length!=1) throw (new Error('Expected to find one association'));
                                var assoc = assocArr[0];
                                assoc.dest = newParentId;
                                self.assocsColl.put(assoc);
                            });
                        }
                        else {
                            when(self.assocsColl.filter({source: oldParentId, type: assocType, dest: movingObjectId}), function(assocArr){
                                if(assocArr.length!=1) throw (new Error('Expected to find one association'));
                                var assoc = assocArr[0];
                                assoc.source = newParentId;
                                self.assocsColl.put(assoc);
                            });
                        }
                    }
                    else{//new assoc
                        if(ASSOCPROPERTIES[assocType].pseudo){
                            self.assocsColl.add({source: movingObjectId, type: ASSOCPROPERTIES[type].inverse, dest: newParentId});
                        }
                        else {
                            self.assocsColl.add({source: newParentId, type: assocType, dest: movingObjectId});
                        }
                    }
                }
            });
        },
        getItemsByParentIdParentViewId: function (parentId, parentViewId) {
             /* summary: Used to collect all items pertaining to all the child views of the parent view
             //          Special case: sub-documents
             // parentId: String
             //          The id of the item we're starting with.
             // parentViewId: Number
             //          The id of the parent view.
             // returns: Promise to an array
             //          An array of all the items.
             */
            if(!parentId || !parentViewId) throw (new Error('Invalid parameters'));
            var self = this;
            return self.getItemsByAssocTypeAndDestClass(parentViewId, 'manyToMany', VIEW_CLASS_TYPE).then(function (viewsArr) {
                var promises = [];
                viewsArr.forEach(function (view) {
                    promises.push(self.getItemsByParentIdViewId(parentId, view._id));
                });
                return all(promises).then(function(itemsArrArr){
                    var results = [];
                    itemsArrArr.forEach(function (itemsArr) {
                        itemsArr.forEach(function (item) {
                            results.push(item);
                        });
                    });
                    return results;
                });
            });
        },
        getItemsByParentIdViewId: function (parentId, viewId) {
            if(!parentId || !viewId) throw (new Error('Invalid parameters'));
            var self = this;
            return self.get(viewId).then(function (view) {
                var promise = null;
                if(view.subDocument) return self.get(parentId).then(function (item) {
                    var results = [];
                    var doc = item[view.subDocument];
                    for(var attrName in doc) {
                        var subDocItem = doc[attrName];
                        subDocItem.name = attrName;
                        subDocItem.id = parentId+':'+attrName;
                        results.push(subDocItem);
                    }
                    return results;
                    //TODO promise = [item];
                });
                else if(view.onlyIfParentEquals){
                    //TODO must merge
                    var assocType = view.toManyAssociations;
                    if(!assocType) assocType = view.toOneAssociations;
                    if(view.mapsTo && parentId == Number(view.onlyIfParentEquals)) promise = self.getItemsByAssocTypeAndDestClass(view.mapsTo, assocType);
                    else promise = [];
                }
                else promise = self.getItemsByAssocTypeAndDestClass(parentId, view.toManyAssociations, view.mapsTo);
                return when(promise, function(itemsArr){
                    // Here we add and _icon to the item by searching for the parent
                    // _icon is user by the tree to display icons, and by DnD checkItemAcceptance.
                    var iconPromises = [];
                    itemsArr.forEach(function (item) {
                        var query = {source: item._id, type: 'parent'};
                        iconPromises.push(self.assocsColl.filter(query));
                    });
                    return all(iconPromises).then(function(itemParentAssocArrArr){
                        var results = [];
                        var counter = 0;
                        itemParentAssocArrArr.forEach(function(itemParentAssocArr) {
                            var item = itemsArr[counter];
                            item._viewId = viewId;
                            itemParentAssocArr.forEach(function(itemParentAssoc) {
                                item._icon = itemParentAssoc.dest;//assume only one
                            });
                            results.push(item);
                            counter ++;
                        });
                        return results;
                    });
                });
            });
        },
        getItemByItemIdViewId: function (itemId, viewId) {
            if(!itemId || !viewId) throw (new Error('Invalid parameters'));
            var self = this;
            return self.get(viewId).then(function (view) {
                if(view.subDocument) {
                    var itemIdArr = itemId.split(':');
                    return self.get(itemIdArr[0]).then(function (item) {
                        return item[view.subDocument][itemIdArr[1]];
                    });
                }
                else return self.get(itemId);
            });
        },
        getItemsByAssocTypeAndDestClass: function (parentId, assocType, destClassId) {
             /* summary: Use to collect all items by association type ‘type’, that are of class type ‘destClassId’.
             //          If no destClassId is provided then then all items are returned, regardless of their class type.
             // parentId: String
             //          The id of the item we're starting with.
             // assocType: String
             //          The association type to be followed.
             // destClassId Number, Optional
             //          Id of the (ancestor) class that the items must belong to
             // returns: Promise
             //          An array of all the items found
             */
            if(!parentId || !assocType || !ASSOCPROPERTIES[assocType]) throw (new Error('Invalid parameters'));
            var self = this;
            if(assocType != 'orderedParent'){
                return when(self.getItemsByAssocType(parentId, assocType), function(itemsArr){//use when here because getItemsByAssocType sometimes returns a completed array
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
                        if(results.length == 1 && assocType == 'ordered') {
                            return self.collectAllByAssocType(results[0]._id, 'next').then(function (itemsPromisesArrResults) {
                                return all(itemsPromisesArrResults);
                            });
                        }
                        return results;
                    });
                });
            }
            else{
                return self.getItemsByAssocType(parentId, 'previous').then(function (itemsPromisesArr) {
                    var firstChildId = null;
                    if(itemsPromisesArr.length == 0) firstChildId = parentId;
                    else firstChildId = itemsPromisesArr[itemsPromisesArr.length-1]._id;
                    return self.getItemsByAssocType(firstChildId, 'orderedParent');
                });
            }
        },
        getItemsByAssocType: function(_parentId, assocType){
            /* summary: Use to gather all items on the next level according to association type.
            //          It can deal with all types of associations and will automatically invert them according to ASSOCPROPERTIES.pseudo.
            // _parentId: String
            //          Usually contains a number. In the case of ‘byAssociationType’ it will also contain ‘semicolon+assocType’
            // assocType: String
            //          The association type to be followed.
            // returns: Promise to an array (sometimes an Array)
            //          An array of all the items.
            */
            if(!_parentId || !assocType || !ASSOCPROPERTIES[assocType]) throw (new Error('Invalid parameters'));
            var parentId = Number(_parentId);
            var self = this;
            if (assocType == 'subclasses') {
                //TODO replace with default behaviour after we take item type into account
                var query = {dest: parentId, type: 'parent'};
                var collection = this.assocsColl.filter(query);
                var itemPromises = [];
                collection.forEach(function (assoc) {
                    itemPromises.push(self.itemsColl.get(assoc.source));
                });
                return all(itemPromises).then(function(itemsArr){
                    var results = [];
                    itemsArr.forEach(function (item){
                        if(item.type == 'class') results.push(item);
                    });
                    return results;
                });
            }
            else if (assocType == 'allSubclasses') {
                return self.collectAllByAssocType(parentId, 'subclasses');
            }
            else if (assocType == 'instantiations') {
                var self = this;
                return when(self.collectAllByAssocType(parentId, 'subclasses'), function (allClassesArr){
                    var assocPromises = [];
                    allClassesArr.forEach(function(classItem){
                        var query = {dest: classItem._id, type: 'parent'};
                        assocPromises.push(self.assocsColl.filter(query));
                    });
                    return all(assocPromises).then(function(classesArr){
                        var objPromises = [];
                        classesArr.forEach(function(assocsArr){
                            assocsArr.forEach(function(assoc){
                                //TODO replace with default behaviour after we take item type into account
                                objPromises.push(self.get(assoc.source));
                            });
                        });
                        return all(objPromises).then(function(objArr){
                            var results = [];
                            objArr.forEach(function (obj){
                                if(obj.type == 'object') results.push(obj);
                            });
                            return results;
                        });
                    });
                });
            }
            else if (assocType == 'associations') {
                // Special case for class model details tree
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
                    assocs.push({_id:parentId+':'+type, name:type, type:'assoc', _icon:ASSOCPROPERTIES[type].icon});
                }
                return assocs;
            }
            else if (assocType == 'byAssociationType') {
                // Special case for class model details tree
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
                //TODO take item type into account
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
                            //Not used anymore
                            //still use by enrich schema, should be replaced
                            //debugger;
                            var promise = this.getItemsByAssocType(query.itemId, query.assocType);
                            promise.then(function (res) {
                                data = res;
                            });
                        }
                        else if(query.itemId && query.viewId) {
                            // used by form to get an array with a single object
                            // used by tree and document to get the root
                            var promise = this.getItemByItemIdViewId(query.itemId, query.viewId);
                            promise.then(function (res) {
                                data = res;
                            });
                        }
                        else if(query.itemId) {
                            //Not used anymore
                            debugger;
                            this.get(query.itemId).then(function(res){
                                data = [res];
                            });
                        }
                        else if (query.parentId && query.viewId) {
                            var promise = this.getItemsByParentIdViewId(query.parentId, query.viewId);
                            promise.then(function (res) {
                                data = res;
                            });
                        }
                        else if(query.parentId && query.parentViewId) {
                            // used by table to populate the grid
                            this.getItemsByParentIdParentViewId(query.parentId, query.parentViewId).then(function(res){
                                data = res;
                            });
                        }
                        else if(query.parentId && query.type && query.destClassId) {
                            //Not used anymore
                            debugger;
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
            // TODO replace with collectAllByAssocType
            var self = this;
            if (!originalId) originalId = itemId;
            if (itemId == destClassId) return originalId;
            var collection = this.assocsColl.filter({source: itemId, type: 'parent'});
            return collection.fetch().then(function (assocsArr) {
                if (assocsArr.length > 1) throw (new Error('More than one parent found'));
                if (assocsArr.length == 0) return null;//we're at the root
                return self.isA(assocsArr[0].dest, destClassId, originalId);
            });
        },
        getCombinedSchemaForView: function(view) {
            /* summary:  Used to create a JSON schema based on the view schema in combination with class attributes inherited through view.mapsTo.
             //          The same method is used server side to validate updates.
             // view: Object
             //          The starting point for our schema
             // returns: Object
             //          The schema object.
             */
            var classSchemaPromise = null;
            if(view.mapsTo) classSchemaPromise = this.getAttrPropertiesFromAncestors(view.mapsTo);
            else classSchemaPromise = CLASSSCHEMA;//No mapsTo means we're asking for a class (meta schema)

            return when(classSchemaPromise, function(classSchema){
                var schema = {
                    $schema: "http://json-schema.org/draft-04/schema#",
                    type: 'object',
                    properties: {
                        //Only for server side schemas
                        //_id: classSchema.properties._id,
                        //type: classSchema.properties.type
                    },
                    required: classSchema.required,
                    additionalProperties: false,
                    id: view._id,
                    mapsTo: view.mapsTo,
                    title: view.name
                };
                for(var attrPropName in view.schema){
                    var viewAttrProp = view.schema[attrPropName];
                    var newProp = classSchema.properties[attrPropName];
                    if(!newProp) {
                        //throw new Error('cant find classAttrProp');
                        console.warn('classAttrProp not found',viewAttrProp);
                        newProp = viewAttrProp;
                    }

                    //assert that the values are permitted
                    if(newProp.enum && viewAttrProp.enum){
                        var newEnum = [];
                        viewAttrProp.enum.forEach(function (enumValue){
                            var index = newProp.enum.indexOf(enumValue);
                            if(index != -1) newEnum.push(enumValue)
                        });
                        newProp.enum = newEnum;
                    }

                    //Only for client side schemas
                    if(viewAttrProp.invalidMessage) newProp.invalidMessage = viewAttrProp.invalidMessage;
                    if(viewAttrProp.hidden) newProp.hidden = true;
                    if(viewAttrProp.title) newProp.title = viewAttrProp.title;
                    if(viewAttrProp.description) newProp.description = viewAttrProp.description;
                    if(viewAttrProp.style) newProp.default = viewAttrProp.style;
                    if(viewAttrProp.columnWidth) newProp.columnWidth = viewAttrProp.columnWidth;

                    // Provide string representation for null value
                    if(newProp.media && newProp.media.mediaType == 'text/html') newProp.nullValue = '<p>[no text]</p>';
                    else if(newProp.enum) newProp.nullValue = '[not selected]';
                    else if(newProp['#ref']) newProp.nullValue = '[not selected]';
                    else if(newProp.type == 'string') newProp.nullValue = '[null]';
                    else if(newProp.type == 'number') newProp.nullValue = '[null]';
                    else if(newProp.type == 'date') newProp.nullValue = '[no date selected]';
                    else if(newProp.type == 'boolean') newProp.nullValue = 'false';
                    else if(newProp.type == 'object') newProp.nullValue = '{}';
                    else newProp.nullValue = '[null]';

                    schema.properties[attrPropName] = newProp;

                    //TODO
                    /*
                    if(view.schema.required){
                        view.schema.required.forEach(function(requiredAttr){
                            var index = schema.required.indexOf(requiredAttr);
                            if(index == -1) schema.required.push(requiredAttr);
                        });
                    }*/
                }
                return schema;
            });
        },
        getAttrPropertiesFromAncestors: function (classId) {
            return this.collectAllByAssocType(Number(classId), 'parent').then(function (parentClassesArr) {
                var schema = {
                    $schema: "http://json-schema.org/draft-04/schema#",
                    type: 'object',
                    properties: {},
                    additionalProperties: false
                };
                var required = [];
                parentClassesArr.forEach(function (classItem) {
                    if (classItem.schema) {
                        if (classItem.schema.properties) {
                            for (var classAttr in classItem.schema.properties) {
                                schema.properties[classAttr] = classItem.schema.properties[classAttr];
                            }
                        }
                        if (classItem.schema.required) required = required.concat(classItem.schema.required)
                    }
                });
                if (required.length > 0) schema.required = required;
                return schema;
            });
        },
        /*getAttrPropertiesFromAncestors: function(classId){
            var self = this;
            return self.collectAllByAssocType(Number(classId), 'parent').then(function(parentClassesArr){
                var classAttrObj = {};
                parentClassesArr.forEach(function(classItem) {
                    for(var classAttr in classItem){
                        if(classAttr.charAt(0)!='_') classAttrObj[classAttr] = classItem[classAttr];
                    }
                });
                return classAttrObj;
            });
        },*/
        collectAllByAssocType: function (itemId, assocType) {
             /* summary: Use to navigate the data graph following the given association type, gathering all items along the way.
             //          If ASSOCPROPERTIES specifies that an association type should return one particular item type, other types will be ignored.(e.g. subclasses, instantiations)
             //          Will write an error if it finds more than one occurrence when ASSOCPROPERTIES specifies that only one is allowed.
             //          Returns an array of items, starting with the first one (get(itemId)).
             //          Will preserve the order in the case of a linked list.
             //          Examples: Get all objects in a linked list by 'next', get all ancestor classes by 'parent', get all subclasses by 'subclass'.
             // itemId: Number
             //          The id of the item we're starting with.
             // assocType: String
             //          The association type to be followed.
             // returns: Array
             //          An array of all the items found along the way.
             */
            //TODO loop protection
            if(!itemId || !assocType || !ASSOCPROPERTIES[assocType]) throw (new Error('Invalid parameters'));
            var self = this;
            return self.get(itemId).then(function(item){
                var type = ASSOCPROPERTIES[assocType].type;
                if(type && item.type != type) return [];
                //console.log('item', item);
                var query  = self.normalizeAssocQuery(itemId, assocType);
                var collection = self.assocsColl.filter(query);
                var itemPromises = [];
                var count = 0;
                collection.forEach(function (assoc) {
                    count ++;
                    if(!ASSOCPROPERTIES[assocType].pseudo) itemPromises.push(self.itemsColl.get(assoc.dest));
                    else itemPromises.push(self.itemsColl.get(assoc.source));
                });
                if(ASSOCPROPERTIES[assocType].cardinality == 'one' && count>1) console.error('more than one found');
                return all(itemPromises).then(function(classesArr){
                    //console.log('classesArr',classesArr);
                    var subclassesPromises = [];
                    classesArr.forEach(function(childItem){
                        subclassesPromises.push(self.collectAllByAssocType(childItem._id, assocType));
                    });
                    return all(subclassesPromises).then(function(subclassesArr){
                        var results = [];
                        results.push(item);
                        subclassesArr.forEach(function(subArr){
                            subArr.forEach(function(subClass){
                                results.push(subClass);
                            });
                        });
                        //console.log('results', results);
                        return results;
                    });
                });
            });
        },
        getUniqueViewsForWidget: function(parentViewId, viewsArr){
            var self = this;
            return this.getItemsByAssocTypeAndDestClass(parentViewId, 'manyToMany', VIEW_CLASS_TYPE).then(function (subViewsArr) {
                var promises = [];
                subViewsArr.forEach(function(subView){
                    var found = false;
                    viewsArr.forEach(function(view){
                        if(view._id == subView._id) found = true;
                    });
                    if(!found) {
                        viewsArr.push(subView);
                        promises.push(self.getUniqueViewsForWidget(subView._id, viewsArr));
                    }
                });
                return all(promises);
            });
        },
        getTreePath: function(view, itemId, pathArr, level){//TODO level is only used for debugging
            pathArr.unshift(itemId);
            var str = "";
            for(var i = 0; i<level;i++){
                str = str+'  ';
            }
            //console.log(str+'VIEW:', view._id, view.name, 'ITEMID:', itemId);
            var self = this;
            var reverseAssocType = ASSOCPROPERTIES[view.toManyAssociations].inverse;
            // Find the parent views, as seen from the current view
            return self.getItemsByAssocTypeAndDestClass(view._id, 'manyToManyReverse', VIEW_CLASS_TYPE).then(function(parentViewsArr){
                var parentItemsPromises = [];
                // Find the parents of the current item, based on the reverse association of the current view and the mapsTo if the parent views.
                parentViewsArr.forEach(function(parentView){
                    parentItemsPromises.push(self.getItemsByAssocTypeAndDestClass(itemId, reverseAssocType, parentView.mapsTo));
                });
                return all(parentItemsPromises).then(function(parentItemsArrArr){
                    var count = 0;
                    var treePathPromises = [];
                    // For each parent view.
                    parentItemsArrArr.forEach(function(parentItemsArr){
                        var parentView = parentViewsArr[count];
                        var str = "";
                        for(var i = 0; i<=level;i++){
                            str = str+'  ';
                        }
                        // For each parent item
                        parentItemsArr.forEach(function(parentItem){
                            //console.log(str+'Parent View:', parentView._id, parentView.name);
                            //console.log(str+'Parent Item:', parentItem._id, parentItem.name);
                            var found = false;
                            pathArr.forEach(function(pathArrItemId){
                                if(parentItem._id == pathArrItemId) found = true;
                            });
                            if(!found) parentItemsArr.push(self.getTreePath(parentView, parentItem._id, pathArr, level+1));
                        });
                        count++;
                    });
                    return all(treePathPromises).then(function(resultsArr){
                        resultsArr.push([itemId]);
                        return resultsArr;
                    });
                });
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
        commit: function(){
            var self = this;
            registry.byId('cancelButtonId').set('disabled',true);
            registry.byId('saveButtonId').set('disabled',true);

            //var transactionIds = {assocsColl:{add:{}, update:{}, delete:{}}, itemsColl:{add:{}, update:{}, delete:{}}},

            var tansactionObj = {assocsColl:{},itemsColl:{}};
            for(var coll in self.transactionIds){
                var actionObj = self.transactionIds[coll];
                for(var action in actionObj){
                    var idsObj = actionObj[action];
                    var transObjArr = [];
                    for(var id in idsObj){
                        if(coll == 'itemsColl') self.itemsColl.get(id).then(function(obj){
                            transObjArr.push(obj);
                        });
                        if(coll == 'assocsColl') self.assocsColl.get(id).then(function(obj){
                            transObjArr.push(obj);
                        });
                    }
                    if(transObjArr.length>0) tansactionObj[coll][action] = transObjArr;
                }
            }
            request.post('/data', {
                // send all the operations in the body
                headers: {'Content-Type': 'application/json; charset=UTF-8'},//This is not the default!!
                data: JSON.stringify(tansactionObj)
            }).then(function(data){
                    console.log('data', data);
                    dojo.fadeIn({ node:"savedDlg", duration: 300, onEnd: function(){dojo.fadeOut({ node:"savedDlg", duration: 300, delay:300 }).play();}}).play();
                    self.transactionIds = {};
                },function(error){
                    self.transactionIds = {};
                    nq.errorDialog(error);
            });
        },
        abort: function(){
            registry.byId('cancelButtonId').set('disabled',true);
            registry.byId('saveButtonId').set('disabled',true);
            self.transactionIds = {};
        }
    });

});
