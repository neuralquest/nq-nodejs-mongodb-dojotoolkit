define(['dojo/_base/declare', "dojo/_base/lang", "dojo/_base/array", "dojo/when", "dojo/promise/all", 'dstore/Store', 'dstore/QueryResults',
		'dstore/RequestMemory', 'dijit/registry'],
function(declare, lang, array, when, all, Store, QueryResults,
		 RequestMemory, registry){


    //itemsColl = new RequestMemory({ target: '/items', idProperty: '_id'});
    //assocsColl = new RequestMemory({ target: '/assocs', idProperty: '_id'});

    return declare("nqStore", [Store], {
        //   itemsColl:null,
        //    assocsColl:null,
        //return declare(Store,{
        /*constructor: function (options) {
         // perform the mixin
         options && declare.safeMixin(this, options);
         itemsColl = new RequestMemory({
         target: '/items'
         });
         },*/
        assocsColl: new RequestMemory({target: '/assocs', idProperty: '_id'}),
        itemsColl: new RequestMemory({target: '/items', idProperty: '_id'}),


        get: function (_itemId) {
            var itemId = Number(_itemId);
            //return this.itemsColl.fetch({itemId:itemId});
            return this.itemsColl.get(itemId);
        },
        add: function (item, directives) {
            return itemsColl.add(item);
        },
        put: function (item, directives) {
            return itemsColl.put(item);
        },
        remove: function (itemId, directives) {
            return itemsColl.remove(itemId);
        },
        filter: function (query) {
            console.log('req.query', query);
            var parentViewId = query.parentViewId;
            var viewId = query.viewId;
            var parentId = query.parentId;
            var itemId = query.itemId;
            var destClassId = query.destClassId;
            var type = query.type;
            if (itemId) {
                return this.get(itemId);
            }
            else if (viewId && parentId) {
                return this.getItemsByView(viewId, parentId);
            }
            else if (parentViewId && parentId) {
                return this.getItemsByParentView(parentViewId, parentId);
            }
            else if (parentId && type && destClassId) {
                return this.getItemsByAssocTypeAndDestClass(parentId, type, destClassId);
            }
            else return [];
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
            return self.store.get(viewId).then(function (view) {
                return self.getItemsByAssocTypeAndDestClass(parentId, view.toMannyAssociations, view.mapsTo)
            });
        },
        getItemsByParentView: function (parentId, parentViewId) {
            var self = this;
            var VIEW_CLASS_TYPE = 74;
            return self.getItemsByAssocTypeAndDestClass(parentViewId, 'manyToMany', VIEW_CLASS_TYPE).then(function (viewsArr) {
                //console.log('viewsArr',viewsArr);
                var promises = [];
                viewsArr.forEach(function (view) {
                    promises.push(self.getItemsByAssocTypeAndDestClass(parentId, view.toMannyAssociations, view.mapsTo));
                });
                return when(all(promises), function (viewResArr) {
                    var results = [];
                    var count = 0;
                    //console.log('viewResArr', viewResArr);
                    viewResArr.forEach(function (itemsArr) {
                        if (itemsArr) {
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
        getItemsByAssocTypeAndDestClass: function (_parentId, type, _destClassId) {
            var parentId = Number(_parentId);
            var destClassId = Number(_destClassId);
            var self = this;
            if (type == 'ordered') {
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
            }
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
        XfollowAssocType: function (itemId, type, itemsPromisesArr) {
            var self = this;
            var query = self.normalizeAssocQuery(itemId, type);
            console.log('query', query);
            var collection = this.assocsColl.filter(query);
            var promises = [];
            collection.forEach(function(assoc){
                itemsPromisesArr.push(self.itemsColl.get(assoc.dest));
                return promises.push(self.followAssocType(assoc.dest, type, itemsPromisesArr));
            });
            return all(promises);
        },
        XfollowAssocType: function (itemId, type) {
            var self = this;
            var query = self.normalizeAssocQuery(itemId, type);
            console.log('query', query);
            var collection = this.assocsColl.filter(query);
            var promises = [];
            collection.forEach(function(assoc){
                return promises.push(self.followAssocType(assoc.dest, type).then(function(assocsArr){
                    var itemPromises = [];
                    assocsArr.forEach(function(assoc) {
                        itemPromises.push(self.itemsColl.get(assoc.dest));
                    });
                    return itemPromises;
                }));
            });
            return all(promises).then(function(arrs){
                console.log('arrs',arrs);
                var results = [];
                arrs.forEach(function(itemPromise){
                    results.push(itemPromise);
                });
                return results;
            });
        },
        normalizeAssocQuery: function (itemId, type) {
            var reveseAssoc = {
                subClasses:'parent',
                instantiations:'parent',
                orderedParent:'ordered',
                previous:'next',
                manyToManyReverse:'manyToMany',
                manyToOne:'oneToMany',
                ownedBy:'owns'
            };
            if(reveseAssoc[type]) {
                return {dest: itemId, type: reveseAssoc[type]};
            }
            else return {source: itemId, type: type};
        },


        enableTransactionButtons: function () {
            registry.byId('cancelButtonId').set('disabled', false);
            registry.byId('saveButtonId').set('disabled', false);
        },




    });
    /*

    var cardinality = {
        //to many
        subClasses:'many',
        manyToMany:'many',
        ordered:'many',
        instantiations:'many',
        oneToMany:'many',
        manyToManyReverse:'many',
        attributeOf:'many',
        mappedToBy:'many',
        owns:'many',
        associations:'many',
        defaultOf:'many',
        byAssociationType:'many',
        //to one
        parent: 'one',
        theUser: 'one',
        attribute: 'one',
        mapsTo: 'one',
        default: 'one',
        oneToOne: 'one',
        next: 'one',
        orderedParent: 'one',
        ownedBy: 'one',
        oneToOneReverse: 'one',
        manyToOne: 'one'
    };*/
});
