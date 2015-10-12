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
            if(!object._id || !object._viewId) throw new Error('invalid parms');
            //var collection = this.filter({parentId: object.id, parentViewId: object.viewId });
            //collection.fetch();
            //return onComplete(collection);

            var promise = this.getItemsByParentView(object._id, object._viewId);
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
        getItemsByView: function (parentId, viewId) {
            if(!parentId || !viewId) throw new Error('invalid parms');
            var self = this;
            return self.get(viewId).then(function (view) {
                return self.getItemsByAssocTypeAndDestClass(parentId, view.toMannyAssociations, view.mapsTo)
            });
        },
        getItemsByParentView: function (parentId, parentViewId) {
             /* summary: Used to collect all items pertaining to all the child views of the parent view
             //          Special case: sub-documents
             // parentId: String
             //          The id of the item we're starting with.
             // parentViewId: Number
             //          The id of the parent view.
             // returns: Promise to an array
             //          An array of all the items.
             */
            if(!parentId || !parentViewId) throw new Error('invalid parms');
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
                        //if(parentId == 2016) debugger;
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
            if(!parentId || !assocType || !ASSOCPROPERTIES[assocType]) throw new Error('invalid parms');
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
            if(!_parentId || !assocType || !ASSOCPROPERTIES[assocType]) throw new Error('invalid parms');
            var parentId = Number(_parentId);
            var self = this;
            if (assocType == 'subclasses') {
                var query = {dest: parentId, type: 'parent'};
                var collection = this.assocsColl.filter(query);
                var itemPromises = [];
                collection.forEach(function (assoc) {
                    itemPromises.push(self.itemsColl.get(assoc.source));
                });
                return all(itemPromises).then(function(itemsArr){
                    var results = [];
                    itemsArr.forEach(function (item){
                        if(item._type == 'class') results.push(item);
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
                                objPromises.push(self.get(assoc.source));
                            });
                        });
                        return all(objPromises).then(function(objArr){
                            var results = [];
                            objArr.forEach(function (obj){
                                if(obj._type == 'object') results.push(obj);
                            });
                            return results;
                        });
                    });
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
            else if (assocType == 'byAssociationType') {
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
/*        followAssocType: function (itemId, type, itemsPromisesArr) {
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
        },*/
        getCombinedSchemaForView: function(view) {
            /* summary:  Used to create a JSON schema based on the view schema in combination with class attributes inherited through view.mapsTo.
             //          The same method is used server side to validate updates.
             // view: Object
             //          The starting point for our schema
             // returns: Object
             //          The schema object.
             */
            var self = this;
            if(!view.mapsTo) return view.schema; // hack for the class view
            return self.getAttrPropertiesFromAncestors(view.mapsTo).then(function(classAttrObj){
                var schema = {};
                for(var attrPropName in view.schema){
                    //if(attrPropName == 'description') debugger;
                    var newProp = {};
                    var attrProp = view.schema[attrPropName];
                    var classAttrProp = null;
                    for(var classAttrName in classAttrObj){
                        //debugger;
                        if(attrPropName == classAttrName){
                            classAttrProp = classAttrObj[attrPropName];
                            break;
                        }
                    };
                    if(!classAttrProp) {
                        //throw new Error('cant find classAttrProp');
                        console.warn('classAttrProp not found',attrProp);
                        classAttrProp = attrProp;
                    }
                    //set the references
                    newProp.type = classAttrProp.type;
                    //Exception for class type, they will have no type so we improvise
                    if(!newProp.type){
                        if(attrPropName=='_id') newProp.type = 'Number';
                        if(attrPropName=='_name') newProp.type = 'String';
                        if(attrPropName=='_type') {
                            newProp.type = 'String';
                            newProp.enum = attrProp.enum;
                        }
                    }
                    newProp.className = classAttrObj._name;
                    newProp.classId = classAttrObj._id;
                    newProp.viewId = view._id;
                    newProp.viewMapsTo = view.mapsTo;
                    //set the defaults
                    if(classAttrProp.media) newProp.media = classAttrProp.media;
                    if(classAttrProp.enum){
                        if(attrProp.enum) {
                            var newEnum = [];
                            //assert that the values are permitted
                            attrProp.enum.forEach(function (enumValue){
                                if(classAttrProp.enum[enumValue]) newEnum.push(enumValue);
                                else console.warn('classAttrProp not found', attrProp, enumValue);
                            });
                            //newProp.enum = newEnum;
                            newProp.enum = attrProp.enum;
                        }
                        else newProp.enum = classAttrProp.enum;
                    }
                    if(attrProp.pattern) newProp.pattern = attrProp.pattern;
                    else if(classAttrProp.pattern) newProp.pattern = classAttrProp.pattern;
                    if(attrProp.invalidMessage) newProp.invalidMessage = attrProp.invalidMessage;
                    else if(classAttrProp.invalidMessage) newProp.invalidMessage = classAttrProp.invalidMessage;
                    if(attrProp['#ref']) newProp['#ref'] = attrProp['#ref'];
                    else if(classAttrProp['#ref']) newProp['#ref'] = classAttrProp['#ref'];

                    newProp.required = attrProp.required?attrProp.required:classAttrProp.required?classAttrProp.required:false;
                    newProp.readOnly = attrProp.readOnly?attrProp.readOnly:classAttrProp.readOnly?classAttrProp.readOnly:false;
                    newProp.hidden = attrProp.hidden?attrProp.hidden:classAttrProp.hidden?classAttrProp.hidden:false;
                    newProp.title = attrProp.title?attrProp.title:classAttrProp.title?classAttrProp.title:'[no title]';
                    newProp.default = attrProp.default?attrProp.default:classAttrProp.default?classAttrProp.default:null;
                    newProp.description = attrProp.description?attrProp.description:classAttrProp.description?classAttrProp.description:'<p>[no description <a href="#842.1787.'+view._id+'.538">provided</a>]</p>';
                    newProp.style = attrProp.style?attrProp.style:classAttrProp.style?classAttrProp.style:'width:100%';
                    newProp.nullValue = null;
                    newProp.columnWidth = '10em';
                    if(classAttrProp.media && classAttrProp.media.mediaType == 'text/html'){
                        newProp.columnWidth = attrProp.columnWidth?attrProp.columnWidth:classAttrProp.columnWidth?classAttrProp.columnWidth:'100%';
                        newProp.maxLength = attrProp.maxLength?attrProp.maxLength:classAttrProp.maxLength?classAttrProp.maxLength:100000;
                    }
                    else if(classAttrProp.enum){
                        newProp.columnWidth = attrProp.columnWidth?attrProp.columnWidth:classAttrProp.columnWidth?classAttrProp.columnWidth:'8em';
                    }
                    else if(classAttrProp.type == 'String'){
                        newProp.columnWidth = attrProp.columnWidth?attrProp.columnWidth:classAttrProp.columnWidth?classAttrProp.columnWidth:'10em';
                        newProp.maxLength = attrProp.maxLength?attrProp.maxLength:classAttrProp.maxLength?classAttrProp.maxLength:1000000;
                        if(attrProp.minLength) newProp.minLength = attrProp.minLength;
                        else if(classAttrProp.minLength) newProp.minLength = classAttrProp.minLength;
                    }
                    else if(classAttrProp.type == 'Number'){
                        newProp.columnWidth = attrProp.columnWidth?attrProp.columnWidth:classAttrProp.columnWidth?classAttrProp.columnWidth:'4em';
                        newProp.maximum = attrProp.maximum?attrProp.maximum:classAttrProp.maximum?classAttrProp.maximum:Number.MAX_VALUE;
                        newProp.minimum = attrProp.minimum?attrProp.minimum:classAttrProp.minimum?classAttrProp.minimum:Number.MIN_VALUE;
                        newProp.places = attrProp.places?attrProp.places:classAttrProp.places?classAttrProp.places:0;
                    }
                    else if(classAttrProp.type == 'Date'){
                        newProp.columnWidth = attrProp.columnWidth?attrProp.columnWidth:classAttrProp.columnWidth?classAttrProp.columnWidth:'6em';
                    }
                    else if(classAttrProp.type == 'Boolean'){
                        newProp.columnWidth = attrProp.columnWidth?attrProp.columnWidth:classAttrProp.columnWidth?classAttrProp.columnWidth:'3em';
                    }
                    schema[attrPropName] = newProp;
                }
                return schema;
            });
        },
        getAttrPropertiesFromAncestors: function(classId){
            var self = this;
            //var parentClassesPromises = [];
            //parentClassesPromises.push(self.get(classId));// Get the first one
            return self.collectAllByAssocType(Number(classId), 'parent').then(function(parentClassesArr){
                return all(parentClassesArr).then(function(classesArr){
                    var classAttrObj = {};
                    classesArr.forEach(function(classItem) {
                        for(classAttr in classItem){
                            //console.log('classAttr', classAttr);
                            //if(classAttr.charAt(0)!='_') classAttrObj[classAttr] = classItem[classAttr];
                            classAttrObj[classAttr] = classItem[classAttr];
                        }
                    });
                    return classAttrObj;
                });
            });
        },
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
            if(!itemId || !assocType || !ASSOCPROPERTIES[assocType]) throw new Error('invalid parms');
            var self = this;
            return self.get(itemId).then(function(item){
                var type = ASSOCPROPERTIES[assocType].type;
                if(type && item._type != type) return [];
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
        getTreePath: function(view, itemId, pathArr, level){
            pathArr.unshift(itemId);
            var str = "";
            for(var i = 0; i<level;i++){
                str = str+'  ';
            }
            console.log(str+'VIEW:', view._id, view.name, 'ITEMID:', itemId);
            var self = this;
            var reverseAssocType = ASSOCPROPERTIES[view.toMannyAssociations].inverse;
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
                            console.log(str+'Parent View:', parentView._id, parentView.name);
                            console.log(str+'Parent Item:', parentItem._id, parentItem.name);
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




    });

});
