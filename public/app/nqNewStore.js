define(['dojo/_base/declare', "dojo/_base/lang","dojo/when", "dojo/promise/all", "dstore/QueryResults", 'app/Store'/*'dstore/Store', 'dstore/Trackable'*/,'dojox/store/transaction', 'dojox/store/LocalDB', "dojo/store/JsonRest" , 'dojo/store/Memory', 'dojo/store/Cache', 'dojo/request', 'dijit/registry', "dojo/_base/array", 'dstore/SimpleQuery', 'dstore/QueryMethod', 'dstore/Filter'],
function(declare, lang, when, all, QueryResults, Store, /*Trackable,*/ transaction, LocalDB, JsonRest, Memory, Cache, request, registry, array, SimpleQuery, QueryMethod, Filter ){

// module:
//		js/nqStore
 
	var transactionLogStore = new Memory();
    var masterItemStore = new JsonRest({
        target: '/item',
        name: 'item'
    });

    var localItemStore = new Memory();
    var itemStore = transaction({
        masterStore: masterItemStore,
        cachingStore: localItemStore,
        transactionLogStore: transactionLogStore
    });
    
    var masterAssocStore = new JsonRest({
        target: '/assoc',
        name: 'assoc'
    });
    var localAssocStore = new Memory();
    var assocStore = transaction({
        masterStore: masterAssocStore,
        cachingStore: localAssocStore,
        transactionLogStore: transactionLogStore
    });

    itemStore.transaction();//turn autocommit off
    assocStore.transaction();//turn autocommit off

	//return declare('nqStore',[Store],{
	return declare(Store,{
	//return declare(Store,{
		_createSortQuerier: SimpleQuery.prototype._createSortQuerier,
		getIdentity: function(object){
			return object.id;
		},

		get: function(itemId){
			// summary:
			//		Returns an item that can be consumed by widgets. 
			//		The item will have an id, a classId, a viewId and name vlaue pairs for the attribute references of the view.
			// itemId: Number
			//		The identifier of the item
			// viewId: Number
			//		The identifier of the view that will tell us which attributes to retreive
			//		viewId is used for things like identifing labels and menus in trees, also getChildren as requested by trees
			// returns: object 
			//		A promises. The promise will result in an item.			
			return itemStore.get(itemId);
		},
		add: function(item, directives){
			// summary:
			//		Create an Item with default values. 
			// item: object
			//		An item with atleast a viewId and optionally a classId
			//		The classId points the class type of the newly created item, will default to the class the view maps to.
			//		The viewId is used to determine the attribute references
			// directives: object
			//		Must contain a parent object with atleast an id
			// returns: Array 
			//		The new Item with a client id
			//
		},
		put: function(item, directives){

		},
		processDirectives: function(object, directives){
			var ASSOCS_CLASS_TYPE = 94;

			var self = this;
			var viewId = object.viewId;
			var movingObjectId = object.id;
			var oldParentId = directives.oldParent?directives.oldParent.id:undefined;
			var newParentId = directives.parent?directives.parent.id:undefined;
			//var newParentId = directives.parent.id;
			var beforeId = directives.before?directives.before.id:undefined;
			var attrPromises = [];
			//get the assocication type that this view has as an attribute
			attrPromises[0] = self.getOneByAssocTypeAndDestClass(viewId, ATTRIBUTE_ASSOC, ASSOCS_CLASS_TYPE);
			//get the class that this view maps to
			attrPromises[1] = assocStore.query({fk_source: viewId, type: MAPSTO_ASSOC});
			when(all(attrPromises), function(arr){
				if(!arr[0]) throw new Error('View '+viewId+' must have an association type as an attribute ');
				var assocType = arr[0];
				if(arr[1].length!=1) throw new Error('View '+viewId+' must map to one class ');
				//if(arr[1].length!=1) console.log('View '+viewId+' should map to one class ');
				var destClassId = arr[1][0].fk_dest;
				if(assocType==ORDERED_ASSOC){
					if(oldParentId){
						// The leading Assoc will remain attached to the Object that's being moved
						// First make sure the old parent/preceding object is attached to the object that comes after the moving object
						// get the ordered children as seen from the old parent
						when(self.getManyByAssocTypeAndDestClass(oldParentId, ORDERED_ASSOC, destClassId), function(oldParentChildren){
							// get the ordered children as seen from the new parent (could be the same)
							when(self.getManyByAssocTypeAndDestClass(newParentId, ORDERED_ASSOC, destClassId), function(newParentChildren){
								var leadingAssocSourceFk = 0;
								var leadingAssoctype = 0;
								var idx = oldParentChildren.indexOf(movingObjectId);
								if(idx==0){//the obejct we're moving is the first of the old parent children
									leadingAssocSourceFk = oldParentId;
									leadingAssoctype = ORDERED_ASSOC;
									if(oldParentChildren.length>1){//there is at least one other object following the moving object, find it's assoc
										when(assocStore.query({fk_source: movingObjectId, type: NEXT_ASSOC, fk_dest: oldParentChildren[1]}), function(assocArr){
											// update it so that it has the old parent as source
											if(assocArr.length!=1) throw new Error('Expected to find one association');
											var assoc = assocArr[0];
											assoc.fk_source = oldParentId;
											assoc.type = ORDERED_ASSOC;
											assoc.parentId = oldParentId;//needed for serverside validation
											assocStore.put(assoc);
										});
									}

								}
								else{//the obejct we're moving is NOT the first of the old parent children
									leadingAssocSourceFk = oldParentChildren[idx-1];
									leadingAssoctype = NEXT_ASSOC;
									if(idx < oldParentChildren.length-1){//there is at least one other object following the moving object, find it's assoc
										when(assocStore.query({fk_source: movingObjectId, type: NEXT_ASSOC, fk_dest: oldParentChildren[idx+1]}), function(assocArr){
											//update it so that it has the previous object as source
											if(assocArr.length!=1) throw new Error('Expected to find one association');
											var assoc = assocArr[0];
											assoc.fk_source = oldParentChildren[idx-1];
											assoc.parentId = oldParentId;//needed for serverside validation
											assocStore.put(assoc);
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
										newParentFollowingAssoctype = ORDERED_ASSOC;
									}
									else{//the to be following object is NOT the first one of the new parent children
										newParentFollowingAssocSourceFk = newParentChildren[idx-1];
										newParentFollowingAssoctype = NEXT_ASSOC;
									}
									//get the following assoc and update it so that it has the moving object as source
									when(assocStore.query({fk_source: newParentFollowingAssocSourceFk, type: newParentFollowingAssoctype, fk_dest: beforeId}), function(assocArr){
										if(assocArr.length!=1) throw new Error('Expected to find one association');
										var newParentFollowingAssoc = assocArr[0];
										newParentFollowingAssoc.fk_source = movingObjectId;
										newParentFollowingAssoc.type = NEXT_ASSOC;
										newParentFollowingAssoc.parentId = newParentId;//needed for serverside validation
										assocStore.put(newParentFollowingAssoc);
									});
								}
								else{// No before: add it to the last one or the parent if the new parent has no children
									if(newParentChildren.length==0){//ours will be the only one
										newParentFollowingAssocSourceFk = newParentId;
										newParentFollowingAssoctype = ORDERED_ASSOC;
									}
									else{//ours will be the last one
										newParentFollowingAssocSourceFk = newParentChildren[newParentChildren.length-1];
										newParentFollowingAssoctype = NEXT_ASSOC;
									}
								}
								//Fianlly attach the new parent/preceding object to the moving object
								when(assocStore.query({fk_source: leadingAssocSourceFk, type: leadingAssoctype, fk_dest: movingObjectId}), function(assocArr){
									if(assocArr.length!=1) throw new Error('Expected to find one association');
									var leadingAssoc = assocArr[0];
									leadingAssoc.fk_source = newParentFollowingAssocSourceFk;
									leadingAssoc.type = newParentFollowingAssoctype;
									leadingAssoc.parentId = newParentId;//needed for serverside validation
									assocStore.put(leadingAssoc);
								});
							});
						});
					}
					else{//no oldParent means we're creating a new item with a new association
						if(newParentId) {
							// get the ordered children as seen from the new parent
							when(self.getManyByAssocTypeAndDestClass(newParentId, ORDERED_ASSOC, destClassId), function(newParentChildren){
								if(newParentChildren.length>0){
									self.addAssoc({fk_source: newParentChildren[newParentChildren.length-1], type: NEXT_ASSOC, fk_dest: movingObjectId, parentId:newParentId});
								}
								else{
									self.addAssoc({fk_source: newParentId, type: ORDERED_ASSOC, fk_dest: movingObjectId});
								}
							});
						}
					}
				}
				else{
					if(oldParentId == newParentId) return;
					if(oldParentId){
						if(assocType<SUBCLASSES_PASSOC){
							when(assocStore.query({fk_source: oldParentId, type: assocType, fk_dest: movingObjectId}), function(assocArr){
								if(assocArr.length!=1) throw new Error('Expected to find one association');
								var assoc = assocArr[0];
								assoc.fk_source = newParentId;
								assocStore.put(assoc);
							});
						}
						else {
							when(assocStore.query({fk_source:movingObjectId , type: assocType-12, fk_dest: oldParentId}), function(assocArr){
								if(assocArr.length!=1) throw new Error('Expected to find one association');
								var assoc = assocArr[0];
								assoc.fk_dest = newParentId;
								assocStore.put(assoc);
							});
						}
					}
					else{//new assoc
						if(assocType<SUBCLASSES_PASSOC){
							self.addAssoc({fk_source: newParentId, type: assocType, fk_dest: movingObjectId});
						}
						else {
							self.addAssoc({fk_source: movingObjectId, type: assocType-12, fk_dest: newParentId});
						}
					}
				}
			});
		},
		remove: function(itemId, viewId, directives){
		},
		fetchRange: function (kwArgs) {
			var data = this.fetch(),
				start = kwArgs.start,
				end = kwArgs.end;
			return new QueryResults(data.slice(start, end), {
				totalLength: data.length
			});
		},
		getChildren: function(parent){
			//return this.query({parentId: parent.id, viewId: parent.viewId });
			var collection = this.filter({parentId: parent.id, viewId: parent.viewId });
			return collection;
		},

		getManyByParentWidgetOrViewUnion: function(sourceId, parentWidgetOrViewId){
			// summary:
			//		Returns an array of items that can be consumed by widgets.
			//		Each Widget or View can have multiple sub-views.
			//		This method can be thought of as returning a union of getManyByView for each of the sub-views
			//		This is used by the Tree which can have many views displyed as children if a tree node.
			// sourceId: Number
			//		The identifier of the parent item
			// parentWidgetOrViewId: Number
			//		The identifier of the view that will tell us which attributes to retreive
			// returns: Array
			//		An array of prommises. Each promise will result in an item.

			var VIEW_ID = 74;
			var self = this;
			return when(this.getManyByAssocTypeAndDestClass(parentWidgetOrViewId, MANYTOMANY_ASSOC, VIEW_ID), function(subViewsArr){
				var promisses = [];
				for(var j=0;j<subViewsArr.length;j++){
					var viewId = subViewsArr[j];
					promisses.push(self.getManyByView(sourceId, viewId));
				}
				return when(all(promisses), function(arrayOfArrays){
					var merged = [];
					return merged.concat.apply(merged, arrayOfArrays);
				});
			});
		},
		getManyByParentWidgetJoin: function(sourceId, parentWidgetId){
			// summary:
			//		Returns an array of items that can be consumed by widgets.
			//		Each Widget can have multiple joined views.
			//		This method can be thought of as returning a join of getManyByView for each of the sub-views
			//		This is used by the Table which can have many views joined to represent a record.
			// sourceId: Number
			//		The identifier of the parent item
			// parentWidgetId: Number
			//		The identifier of the widget that will tell us which attributes to retreive
			// returns: Array
			//		An array of prommises. Each promise will result in an item.

			var VIEW_ID = 74;

			var self = this;
			return when(this.getManyByAssocTypeAndDestClass(parentWidgetId, MANYTOMANY_ASSOC, VIEW_ID), function(subViewsArr){
				if(subViewsArr.length<1) return [];
				var subViewId = subViewsArr[0];//assume there is only one TODO can we merge this with union?
				//if(subViewId==2297) debugger;
				return when(self.getManyByView(sourceId, subViewId), function(itemsArr){
					//console.log('itemsArr', itemsArr);
					var promisses = [];
					for(var i=0;i<itemsArr.length;i++){
						var item = itemsArr[i];
						promisses.push(self.getManyByParentWidgetJoin(item.id, item.viewId));
					}
					return when(all(promisses), function(arrayOfItemsArr){
						//console.dir(ArrayOfArrays);
						var resultArr = [];
						for(var i=0;i<itemsArr.length;i++){
							var ourItem = itemsArr[i];
							if(arrayOfItemsArr[i].length==0) resultArr.push(ourItem);
							else {
								for(var j=0;j<arrayOfItemsArr[i].length;j++){
									var lowerItem = arrayOfItemsArr[i][j];
									resultArr.push(lang.mixin(lang.clone(ourItem), lowerItem));
								}
							}
						}
						//console.dir(resultArr);
						return resultArr;
					});
				});
			});
		},
		getManyByView: function(sourceId, viewId){
			// summary:
			//		Returns an array of items that can be consumed by widgets.
			//		Each item will have an id, a classId (used for icons), a viewId(used for labels and popup menues) and
			//		name value pairs for the attribute references of the view.
			//		In addition the items contain {objId...: itemId} for each of the attribute reference wich provides the id of the value item
			// sourceId: Number
			//		The identifier of the parent item
			// viewId: Number
			//		The identifier of the view that will tell us which attributes to retreive and by which association type
			// returns: Array
			//		An array of prommises. Each promise will result in an item.

		},
		getManyByAssocTypeAndDestClass: function(sourceId, assocType, destClassId){
			// summary:
			//		Given a source itemId, return all the itemIds, by associations of type assocType and destClass.
			//		Used for navigating the network where we have a source object and we're interested in related objects
			//		by a particular association type and of class type 'destination class'.
			//		Used for things like one to many relationships and getAttribute of...
			//		Will autoresolve ordered associations (which are comprised of a linked list)
			//		Takes pseudo-association types into account by substacting 12 from the type and doing a reverse assoc query.
			// sourceId: Number
			//		The identifier of the parent item
			// assocType: Number
			//		The association type of the association
			// destClassId: Number
			//		The identifier of the destination class
			// returns: Array
			//		An array of prommises. Each promise will result an id of a item that meets the citeria.

			var self = this;
			if(assocType=='ordered'){
				return when(assocStore.query({source: sourceId, type: assocType, destClass: destClassId}), function(assocs){
					var promisses = [];
					var resultArr = [];
					for(var j=0;j<assocs.length;j++){
						var assoc = assocs[j];
						promisses.push(self.filterCandidates(assoc.fk_dest, destClassId, resultArr));
					}
					return when(all(promisses), function(results){
						if(resultArr.length==0) return [];
						if(resultArr.length>1) throw new Error('Ordered view has more than one ordered association');
						var firstId  = resultArr[0];
						return when(self.addNextToAssocsArr(firstId, destClassId, resultArr), function(assocs){
							var promisses = [];
							for(var j=0;j<assocs.length;j++){
								var assoc = assocs[j];
								promisses.push(self.filterCandidates(assoc.fk_dest, destClassId, resultArr));
							}
							return when(all(promisses), function(results){
								return resultArr;
							});
						});
					});
				});
			}
			else if(assocType < SUBCLASSES_PASSOC){//navigate forward
				return when(assocStore.query({fk_source: sourceId, type: assocType}), function(assocs){
					var promisses = [];
					var resultArr = [];
					for(var j=0;j<assocs.length;j++){
						var assoc = assocs[j];
						promisses.push(self.filterCandidates(assoc.fk_dest, destClassId, resultArr));
					}
					return when(all(promisses), function(results){
						return resultArr;
					});
				});
			}
			else{//navigate backward
				return when(assocStore.query({fk_dest: sourceId, type: assocType-12}), function(assocs){
					var promisses = [];
					var resultArr = [];
					for(var j=0;j<assocs.length;j++){
						var assoc = assocs[j];
						promisses.push(self.filterCandidates(assoc.fk_source, destClassId, resultArr));
					}
					return when(all(promisses), function(results){
						return resultArr;
					});
				});
			}
		},
		filterCandidates: function(destFk, destClassId, resultArr){
			return when(this.isA(destFk, destClassId), function(trueFalse){
				if(trueFalse) resultArr.push(destFk);
				return trueFalse;
			});
		},
		getManyItemsByAssocType: function(sourceId, assocType, classOrObjectType, recursive){
			return when(this.getManyByAssocType(sourceId, assocType, classOrObjectType, recursive), function(itemIdsArr){
				var promisses = [];
				for(var j=0;j<itemIdsArr.length;j++){
					var itemId = itemIdsArr[j];
					promisses.push(itemStore.get(itemId));
				}
				return all(promisses);
			});
		},
		getManyByAssocType: function(sourceId, assocType, classOrObjectType, recursive){
			// summary:
			//		Used to navigate the network via particular association type, where we're interested in either in classes or objects.
			//		Can do so recusivly following the data graph via the same association type.
			//		Returns an array of ids of items that meet the citeria.
			//		Can be used to find all the instances of a particular class, to populate permitted values or,
			//		get all the attribute references in a set of joined views so that we can display them as colum headers in a table.
			//		Takes pseudo-association types into account by substacting 12 from the type and doing a reverse assoc query.
			// sourceId: Number
			//		The identifier of the starting point
			// assocType: Number
			//		The association type that we're following down the data graph
			// classOrObjectType: Number
			//		Zero or One. Are we looking for a class or an object
			// recursive: Boolean
			//		Do we stop at the first level or continue indefinitly?
			// returns: Array
			//		An array of prommises. Each promise will result an id of a item that meets the criteria

			//console.log('getManyByAssocType', sourceId, assocType, classOrObjectType, recursive);
			var self = this;
			var resultArr = [];
			var loopProtectionArr = [];
			var promise;
			if(assocType<15) promise = self.getManyByAssocTypeRecursive(sourceId, assocType, classOrObjectType, recursive, resultArr, loopProtectionArr);
			else promise = self.getManyByAssocTypeRecursiveReverse(sourceId, assocType-12, classOrObjectType, recursive, resultArr, loopProtectionArr);
			return when((promise), function(arrayOfArrays){
				//console.log('resultArr', resultArr);
				return resultArr;
			});
		},
		getManyByAssocTypeRecursive: function(sourceId, assocType, classOrObjectType, recursive, resultArr, loopProtectionArr){
			var self = this;
			return when(assocStore.query({fk_source: sourceId, type: assocType}), function(assocsArr){
				var promisses = [];
				for(var j=0;j<assocsArr.length;j++){
					var destFk = assocsArr[j].fk_dest;
					if(loopProtectionArr[destFk]) continue;
					loopProtectionArr[destFk] = true;
					promisses.push(when(itemStore.get(destFk), function(destItem){
						if(classOrObjectType!=0 && classOrObjectType!=1 ) resultArr.push(destItem.id);
						else if(classOrObjectType == destItem.type) {
								resultArr.push(destItem.id);
								//loopProtectionArr[childId] = true;
						}
						if(recursive) return self.getManyByAssocTypeRecursive(destItem.id, assocType, classOrObjectType, recursive, resultArr, loopProtectionArr);
						else return destItem;
					}));
				}
				return all(promisses);
			});
		},
		getManyByAssocTypeRecursiveReverse: function(sourceId, assocType, classOrObjectType, recursive, resultArr, loopProtectionArr){
			//console.log('getManyByAssocTypeRecursiveReverse', sourceId, assocType, classOrObjectType, recursive, resultArr, loopProtectionArr);
			var self = this;
			return when(assocStore.query({fk_dest: sourceId, type: assocType}), function(assocsArr){
				//console.log('assocsArr', assocsArr);
				var promisses = [];
				for(var j=0;j<assocsArr.length;j++){
					var sourceFk = assocsArr[j].fk_source;
					if(loopProtectionArr[sourceFk]) continue;
					loopProtectionArr[sourceFk] = true;
					promisses.push(when(itemStore.get(sourceFk), function(sourceItem){
						if(classOrObjectType!=0 && classOrObjectType!=1 ) resultArr.push(sourceItem.id);
						else if(classOrObjectType==sourceItem.type) {
								resultArr.push(sourceItem.id);
								//loopProtectionArr[childId] = true;
						}
						if(recursive) return self.getManyByAssocTypeRecursiveReverse(sourceFk, assocType, classOrObjectType, recursive, resultArr, loopProtectionArr);
						else return sourceItem;
					}));
				}
				return all(promisses);
			});
		},
		getOneByAssocTypeAndDestClass: function(source, assocType, destClass){
			// summary:
			//		Calls getManyByAssocTypeAndDestClass, throws an exception if there is more than one result
			//		Used for things like getAttribute of...
			// sourceId: Number
			//		The identifier of the parent item
			// assocType: Number
			//		The association type of the association
			// destClassId: Number
			//		The identifier of the destination class
			// returns: Promise
			//		The promise will result an id of a valid object or undefined if it is not found.
			return when(this.getManyByAssocTypeAndDestClass(source, assocType, destClass), function(objects){
				if(objects.length>1) throw new Error('getOneByAssocTypeAndDestClass returns more than one object');
				return objects[0];
			});
		},
		getOneByAssocType: function(source, assocType, classOrObjectType){
			// summary:
			//		Calls getOneByAssocType, throws an exception if there is more than one result
			// sourceId: Number
			//		The identifier of the starting point
			// assocType: Number
			//		The association type that we're following down the data graph
			// classOrObjectType: Number
			//		Item type: zero or one. Are we looking for a class or an object
			// returns: Promise
			//		The promise will result an id of a valid object or undefined if it is not found.
			return when(this.getManyByAssocType(source, assocType, classOrObjectType, false, false), function(objects){
				if(objects.length>1) throw new Error('getOneByAssocType returns more than one object');
				return objects[0];
			});
		},
		/*resolveObjectOrId: function(objectOrId){
			if(lang.isObject(objectOrId)) return objectOrId;
			return when(this.get(objectOrId));
		},*/
		isA: function(objectId, destClassId){
//			if(objectId==556) debugger;
			if(objectId == destClassId) return true;//found it
			var self = this;
			return when(assocStore.query({fk_source: objectId, type: PARENT_ASSOC}), function(assocs){
				if(assocs.length>1) debugger;
				if(assocs.length>1) throw new Error('More than one parent found');
				if(assocs.length==0) return false;//we're at the root
				//if(assocs[0].fk_dest==1) return false;//we're at the root
				return self.isA(assocs[0].fk_dest, destClassId);
			});
		},
		addNextToAssocsArr: function(sourceId, destClassId, assocsArr){
			var self = this;
			return when(assocStore.query({fk_source: sourceId, type: NEXT_ASSOC}), function(assocs){
				if(assocs.length==0) return true;
				if(assocs.length>1) throw new Error('More than one next found');
				assocsArr.push(assocs[0].fk_dest);
				return self.addNextToAssocsArr(assocs[0].fk_dest, destClassId, assocsArr);
			});
		},
		putClassModelItemName: function(item, attrRefId){
			var PROCESSCLASSES_CLASS = 67;
			var PRIMARYNAME_CLASS = 69;

			var self = this;
			return when(itemStore.get(item.id), function(valueObj){
				if(valueObj.type==0){//is a class
					var item = itemStore.get(item.id);//TODO can this file in async mode?
					if(item.name != item[attrRefId]){
						item.name = item[attrRefId];
						itemStore.put(item);
					}
					return item;
				}
				else { //is an object
					//find out if the object is a process class
					return when(self.isA(objId, PROCESSCLASSES_CLASS), function(trueFalse){//TODO should be asking for attribute class type
						if(trueFalse) {
							//get the primary name of the object
							return when(self.getOneByAssocTypeAndDestClass(objId, ATTRIBUTE_ASSOC, PRIMARYNAME_CLASS), function(valueObjId){
								if(!valueObjId) return null;
								var item = itemStore.get(valueObjId);//TODO can this file in async mode?
								if(item.name != item[attrRefId]){
									item.name = item[attrRefId];
									itemStore.put(item);
								}
								return item;
							});
						}
						else{
							var item = itemStore.get(item.id);//TODO can this file in async mode?
							if(item.name != item[attrRefId]){
								item.name = item[attrRefId];
								itemStore.put(item);
							}
							return item;
						}
					});
				}
			});
		},
		getClassModelAssocItems: function(sourceId, attrRefArr, viewId){
			var uniqueTypes = {};
			return when(assocStore.query({fk_source: sourceId}), function(sourceTypesArr){
				for(var i=0;i<sourceTypesArr.length;i++){
					var type = sourceTypesArr[i].type;
					if(type == 3) continue;
					uniqueTypes[type] = true;
				}
				return when(assocStore.query({fk_dest: sourceId}), function(destypesArr){
					for(var i=0;i<destypesArr.length;i++){
						var type = (destypesArr[i].type)+12;
						uniqueTypes[type] = true;
					}
					var promises = [];
					for(key in uniqueTypes){
						promises.push(itemStore.get(key));//get the corresponding item so we can use the name.
					}
					return when(all(promises), function(assocItemsArr){
						var items= [];
						for(var j=0;j<assocItemsArr.length;j++){
							var type = assocItemsArr[j].id;
							var item = {id: sourceId+'/'+type, sourceId:sourceId,  viewId: viewId, classId: type};
							item[attrRefArr[0]] = assocItemsArr[j].name;
							items.push(item);
						}
						return items;
					});
				});
			});
		},
		commit: function(){
			registry.byId('cancelButtonId').set('disabled',true);
			registry.byId('saveButtonId').set('disabled',true);
			// commit everything in the transaction log
//			autoCommit = true;
			// query for everything in the log
			var operations = transactionLogStore.query({}).map(function(action){
				return {method:action.method, table: action.storeId, target: action.target};
			});
			console.log(operations);
			return request.post('data/', {
					// send all the operations in the body
					headers: {'Content-Type': 'application/json; charset=UTF-8'},
					data: dojo.toJson(operations)//JSON.stringify(dataOperations)
			}).then(function(data){
					dojo.fadeIn({ node:"savedDlg", duration: 300, onEnd: function(){dojo.fadeOut({ node:"savedDlg", duration: 300, delay:300 }).play();}}).play();
					console.log(data);
					//TODO: Replace IDs
					/*data.map(function(action){
						//var options = action.options || {};
						var cid = action.cid;
						var store = action.tabel;
						var target = action.data;
						var cachingStore;
						if(store=='item') cachingStore = localItemStore;
						else cachingStore = localAssocStore;
						cachingStore.remove(cid);
						cachingStore.put(target);
						if(store=='item') {
							localAssocStore.query({fk_source:cid}).map(function(assoc){
								assoc.fk_source = target.id;
								localAssocStore.put(assoc);
							});
							localAssocStore.query({fk_dest:cid}).map(function(assoc){
								assoc.fk_dest = target.id;
								localAssocStore.put(assoc);
							});						
						}
	    			});*/
					transactionLogStore.query({}).map(function(action){
						transactionLogStore.remove(action.id);
					});
	    		},
	    		function(error){
	    			nq.errorDialog(error);
			    	//evict from the cache then refresh the page data
	    			/*transactionLogStore.query({}).map(function(action){
						//var options = action.options || {};
						var method = action.method;
						var store = action.storeId;
						var target = action.target;
						var cachingStore;
						if(store=='item') cachingStore = localItemStore;
						else cachingStore = localAssocStore;
						// revert, by sending out a notification and updating the caching store
						if(method === 'add'){
							cachingStore.remove(action.objectId);
						}else{
							cachingStore.put(target);
						}
						store.notify && store.notify(method === 'add' ? null : action.previous,
							method === 'remove' ? undefined : action.objectId);
	    			});
					transactionLogStore.query({}).map(function(action){
						transactionLogStore.remove(action.id);
					});
					nq.errorDialog(error);*/
	    		}
	    	);		    	
//			return result;
		},
		abort: function(){
			registry.byId('cancelButtonId').set('disabled',true);
			registry.byId('saveButtonId').set('disabled',true);					
			transactionLogStore.query({}).map(function(action){
				//var options = action.options || {};
				var method = action.method;
				var store = action.storeId;
				var target = action.target;
				var cachingStore;
				if(store=='item') cachingStore = localItemStore;
				else cachingStore = localAssocStore;
				// revert, by sending out a notification and updating the caching store
				if(method === 'add'){
					cachingStore.remove(action.objectId);
				}else{
					cachingStore.put(target);
				}
				store.notify && store.notify(method === 'add' ? null : action.previous,
					method === 'remove' ? undefined : action.objectId);
			});
			transactionLogStore.query({}).map(function(action){
				transactionLogStore.remove(action.id);
			});
    	},

		test: function(){
			var self = this;
			var t = transactionalItemStore.transaction();
			var id = "cid"+Math.floor((Math.random()*1000000)+1);
			transactionalItemStore.add({id:id, name:'OneName', type:0});
			var updateObjectId = "cid"+Math.floor((Math.random()*1000000)+1);
			transactionalItemStore.add({id:updateObjectId, name:'TwoName', type:0});
			var removeObjectId = "cid"+Math.floor((Math.random()*1000000)+1);
			transactionalItemStore.add({id:removeObjectId, name:'ThreeName', type:0});
			//obj.name = 'NewTwoName';
			//transactionalItemStore.put(obj);
			transactionalItemStore.remove(removeObjectId);
			//t.commit();	

			var obj = transactionalItemStore.get(updateObjectId);
			when(obj, function(obj){
				obj.name = 'NewThreeName';
				var putPromise = transactionalItemStore.put(obj);
				when(putPromise, function(reesult){ 
//					t.commit();	
				});				
			});
/*			localItemStore.get(updateObjectId).then(function(localObj){
				localObj.name = 'NewThreeNamelocalObj';
				transactionalItemStore.put(localObj);
			});
			t.commit();	

			var updateObjectId = transactionalItemStore.add({name:'ThreeName', type:0});
			var removeObject = transactionalItemStore.add({name:'FourName', type:0});
			//var obj = nqDataStore.getTransactionalItemStore(updateObjectId);
			//obj.name = 'NewThreeName';
			//nqDataStore.putTransactionalItemStore(obj);
			
			object.id = "cid:"+Math.floor((Math.random()*1000000)+1);
			 when(updateObject, function(obj){
				obj.name = 'NewThreeName';
				nqDataStore.putTransactionalItemStore(obj);
				transaction.commit();	
				
			});
			*/
		},

		


		// =======================================================================
		preFetch: function(){
			var self = this;
			if(localItemStore.clear) localItemStore.clear();
			if(localAssocStore.clear) localAssocStore.clear();
			return true;//disable prefetch
			return request('prefetch', {
				headers: {'Content-Type': 'application/json; charset=UTF-8'},
				handleAs: 'json'
			}).then(function(data){
				//console.dir(data);
				if(localItemStore.setData) localItemStore.setData(data.item);
				else{
					array.forEach(data.item, function(item, index){
						localItemStore.put(item);
					});
				}
				if(localAssocStore.setData) localAssocStore.setData(data.assoc);
				else{
					array.forEach(data.assoc, function(item, index){
						localAssocStore.put(item);
					});
				}
				return true;
	    	});		    	
		}, 
		enableTransactionButtons: function(){
			registry.byId('cancelButtonId').set('disabled',false);
			registry.byId('saveButtonId').set('disabled',false);		
		}


	});
});
