define(['dojo/_base/declare', "dojo/_base/lang", "dojo/_base/array", "dojo/when", "dojo/promise/all", 'dstore/Store',
		'dstore/RequestMemory', 'dijit/registry'],
function(declare, lang, array, when, all, Store,
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
        itemsColl: new RequestMemory({ target: '/items', idProperty: '_id'}),


		get: function(itemId){
            //return this.itemsColl.fetch({itemId:itemId});
            return this.itemsColl.get(itemId);
		},
		add: function(item, directives){
            return itemsColl.add(item);
		},		
		put: function(item, directives){
            return itemsColl.put(item);
		},
		remove: function(itemId, directives){
            return itemsColl.remove(itemId);
		},
        filter: function(query){
            console.log('req.query', query);
            var parentViewId = query.parentViewId;
            var viewId = query.viewId;
            var parentId = query.parentId;
            var itemId = query.itemId;
            var destClassId = query.destClassId;
            var type = query.type;
            if(itemId){
                return this.get(itemId);
            }
            else if(viewId && parentId){
                return this.getItemsByParentId(viewId, parentId);
            }
            else if(parentViewId && parentId) {
                return this.getItemsByParentIdAndParentView(parentViewId, parentId);
            }
            else if(parentId && type && destClassId) {
                return this.getItemsByAssocTypeAndDestClass(parentId, type, destClassId);
            }
            else return [];
        },
		getChildren: function(parent){
			//return this.query({parentId: parent.id, viewId: parent.viewId });
			var collection = this.filter({parentId: parent.id, parentViewId: parent.viewId });
			return collection;
		},
        getItemsByAssocTypeAndDestClass: function(_parentId, type, _destClassId){
            var parentId = Number(_parentId);
            var destClassId = Number(_destClassId);
            var self = this;
            if(type == 'ordered'){
                var query = {source: parentId, type:'ordered'};
                var collection = this.assocsColl.filter(query);
                var isAPromises = [];
                collection.forEach(function(assoc){
                    isAPromises.push(self.isA(assoc.dest, destClassId));
                });
                return all(isAPromises).then(function(isADestClassArr){
                    //console.log('isADestClassArr', isADestClassArr);
                    var count = 0;
                    var firstId = null;
                    for(var i=0;i<isADestClassArr.length;i++) {
                        if(isADestClassArr[i]) {
                            firstId = isADestClassArr[i];
                            count += 1;
                        }
                    }
                    if(count>1) throw new Error(new Error("More than one 'ordered' found"));
                    else if(count==1){
                        var itemsPromisesArr = [];
                        itemsPromisesArr.push(self.itemsColl.get(firstId));//add the first one
                        return self.followAssocType(firstId, 'next', itemsPromisesArr).then(function(itemsPromisesArrResults){
                            return all(itemsPromisesArrResults);
                        });
                    }
                    else return([]);
                });
                /*var assocsArr = collection.fetch();
                assocsArr.forEach(function(child){
                    console.log('assocsArr', child);
                });
                collection.fetch().then(function(assocsArr) {
                    var isAPromises = [];
                    for(var i=0;i<assocsArr.length;i++){
                        var assoc = assocsArr[i];
                        isAPromises.push(self.isA(assoc.dest, destClassId));
                    }
                    return all(isAPromises).then(function(isADestClassArr){
                        //console.log('isADestClassArr', isADestClassArr);
                        var count = 0;
                        var firstId = null;
                        for(var i=0;i<isADestClassArr.length;i++) {
                            if(isADestClassArr[i]) {
                                firstId = isADestClassArr[i];
                                count += 1;
                            }
                        }
                        if(count>1) throw new Error(new Error("More than one 'ordered' found"));
                        else if(count==1){
                            var itemsArr = [];
                            this.itemsColl.get({_id:firstId}.then(function(item) {
                                itemsArr.push(item);
                                return this.followAssocType(firstId, 'next', itemsArr);
                            }));
                        }
                        else return([]);
                    });
                })*/
            }
            else if(type == 'instantiations'){
                var query = {dest: destClassId,type:'parent'};
                var collection = this.assocsColl.filter(query);
                var itemPromises = [];
                collection.forEach(function(assoc){
                    itemPromises.push(self.itemsColl.get(assoc.source));
                });
            }
            else{
                var query = {source: parentId,type:type};
                var collection = this.assocsColl.filter(query);
                var isAPromises = [];
                collection.forEach(function(assoc){
                    isAPromises.push(self.isA(assoc.dest, destClassId));
                });
                return all(isAPromises).then(function(isADestClassArr){
                    var itemPromises = [];
                    isADestClassArr.forEach(function(isA){
                        if(isA)itemPromises.push(self.get(isA));
                    });
                    /*/console.log('isADestClassArr', isADestClassArr);
                    var itemPromises = [];
                    for(var i=0;i<isADestClassArr.length;i++){
                        var isA = isADestClassArr[i];
                        if(isA)itemPromises.push(self.get(isA));
                    }*/
                    return all(itemPromises);
                });
            }
        },
		getManyByParentWidgetOrViewUnion: function(sourceId, parentWidgetOrViewId){

		},
		getManyByParentWidgetJoin: function(sourceId, parentWidgetId){

		},
		getManyByView: function(sourceId, viewId){

		},
		getManyByAssocTypeAndDestClass: function(sourceId, assocType, destClassId) {
        },
		isA: function(itemId, destClassId, originalId){
            var self = this;
            if(!originalId) originalId = itemId;
			if(itemId == destClassId) return originalId;
            var collection = this.assocsColl.filter({source: itemId, type:'parent'});
            return collection.fetch().then(function(assocsArr){
                if(assocsArr.length>1) throw new Error('More than one parent found');
                if(assocsArr.length==0) return null;//we're at the root
                return self.isA(assocsArr[0].dest, destClassId, originalId);
            });
		},
        followAssocType: function(itemId, type, itemsPromisesArr){
            var self = this;
            var collection = this.assocsColl.filter({source: itemId, type:type});
            return collection.fetch().then(function(assocsArr){
                if(assocsArr.length>1) throw new Error('More than one next found');
                else if(assocsArr.length==1){
                    itemsPromisesArr.push(self.itemsColl.get(assocsArr[0].dest));
                    return self.followAssocType(assocsArr[0].dest, type, itemsPromisesArr)
                }
                return itemsPromisesArr;//found the last one
            });
        },
		enableTransactionButtons: function(){
			registry.byId('cancelButtonId').set('disabled',false);
			registry.byId('saveButtonId').set('disabled',false);		
		}


	});
});
