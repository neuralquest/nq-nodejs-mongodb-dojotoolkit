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
        query: function(query){
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
			//var collection = this.filter({parentId: parent.id, viewId: parent.viewId });
			//return collection;
		},
        getItemsByAssocTypeAndDestClass: function(parentId, type, destClassId){
            if(type == 'ordered'){
                var collection = this.itemsColl.filter({source: parentId, type:'ordered'});
                var assocsArr = collection.fetch();
                collection.forEach(function(child){
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
                                return this.getNextAssocs(firstId, itemsArr);
                            }));
                        }
                        else return([]);
                    });
                })
            }
            else if(type == 'instantiations'){
                this.assocsColl.query({dest: destClassId,type:'parent'}.then(function(assocsArr) {
                    var itemPromises = [];
                    for (var i = 0; i < assocsArr.length; i++) {
                        var assoc = assocsArr[i];
                        itemPromises.push(this.itemsColl.get(assoc.source));
                    }
                    return all(itemPromises);
                }));
            }
            else{
                this.assocsColl.query({source: parentId,type:type}.then(function(assocsArr) {
                    var isAPromises = [];
                    for(var i=0;i<assocsArr.length;i++){
                        var assoc = assocsArr[i];
                        isAPromises.push(self.isA(assoc.dest, destClassId));
                    }
                    return all(isAPromises).then(function(isADestClassArr){
                        //console.log('isADestClassArr', isADestClassArr);
                        var itemPromises = [];
                        for(var i=0;i<isADestClassArr.length;i++){
                            var isA = isADestClassArr[i];
                            if(isA)itemPromises.push(self.get(isA));
                        }
                        return all(itemPromises);
                    });
                }));
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
			if(itemId == destClassId) return itemId;
            if(!originalId) originalId = itemId;
			return self.assocsColl.query({source: itemId, type: 'parent'}).then(function(assocs){
				if(assocs.length>1) throw new Error('More than one parent found');
				if(assocs.length==0) return null;//we're at the root
				return self.isA(assocs[0].dest, destClassId , originalId);
			});
		},
        getNextAssocs: function(itemId, itemsArr){
            return self.assocsColl.query({source: itemId, type:'next'}.then(function(assocsArr){
                if(assocsArr.length>1) throw new Error('More than one next found');
                else if(assocsArr.length==1){
                    self.get(assocsArr[0].dest).then(function(err, item) {
                        itemsArr.push(item);
                        self.getNextAssocs(assocsArr[0].dest, itemsArr)
                    });
                }
                else return itemsArr;
            }));
        },
		enableTransactionButtons: function(){
			registry.byId('cancelButtonId').set('disabled',false);
			registry.byId('saveButtonId').set('disabled',false);		
		}


	});
});
