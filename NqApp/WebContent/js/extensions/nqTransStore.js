define(['dojo/_base/declare', "dojo/_base/lang","dojo/when", "dojo/promise/all", "dojo/store/util/QueryResults", 'dojox/store/transaction', 'dojox/store/LocalDB', "dojo/store/JsonRest" , 'dojo/store/Memory', 'dojo/store/Cache', 'dojo/request', 'dijit/registry', "dojo/_base/array"],
function(declare, lang, when, all, QueryResults, transaction, LocalDB, JsonRest, Memory, Cache, request, registry, array ){

// module:
//		js/nqTransStore
 
	var transactionLogStore = new Memory();
    var masterCellStore = new JsonRest({
        target: '/data/cell',
        name: 'cell'
    });

    var localCellStore = new Memory();
    var cellStore = transaction({
        masterStore: masterCellStore,
        cachingStore: localCellStore,
        transactionLogStore: transactionLogStore
    });
    
    var masterAssocStore = new JsonRest({
        target: '/data/assoc',
        name: 'assoc'
    });
    var localAssocStore = new Memory();
    var assocStore = transaction({
        masterStore: masterAssocStore,
        cachingStore: localAssocStore,
        transactionLogStore: transactionLogStore
    });
	assocStore.query = function(query, directives){
		return localAssocStore.query(query, directives);
	};

    cellStore.transaction();//trun autocommit off
    assocStore.transaction();//trun autocommit off

	return declare("nqTransStore", [], {
		
		getCell: function(id){
			//still used by nqWidgetbase to develop permitted values
			return cellStore.get(id);
		},
		getIdentity: function(object){
			return object.id;
		},
		addCell: function(object, directives){
			object.id = "cid"+Math.floor((Math.random()*1000000)+1);
			return cellStore.add(object, directives);
		},
		addAssoc: function(object, directives){
			object.id = "cid"+Math.floor((Math.random()*1000000)+1);
			return  assocStore.add(object, directives);
		},

		XgetItem: function(objId, viewId){
			// summary:
			//		Returns an item that can be consumed by widgets. 
			//		The item will have an id, a classId, a viewId and name vlaue pairs for the attribute references of the view.
			// sourceId: Number
			//		The identifier of the cell
			// viewId: Number
			//		The identifier of the view that will tell us which attributes to retreive
			// returns: Number 
			//		A prommises. The promise will result in an item.
			
			var ATTRREF_CLASS_TYPE = 63;

			var self = this;
			//viewId is used for things like identifing labels and menus in trees, also getChildren as requested by trees
			var item = {id: objId, viewId: viewId};
			
			var attrPromises = [];
			attrPromises[0] = self.getManyByAssocTypeAndDestClass(viewId, ORDERED_ASSOC, ATTRREF_CLASS_TYPE);
			attrPromises[1] = assocStore.query({sourceFk: objId, type: PARENT_ASSOC});
			return when(all(attrPromises), function(arr){
				var attrRefArr = arr[0];
				if(arr[1].length!=1) throw new Error('Object must have one parent');
				var parentId = arr[1][0].destFk;
				//classId is used to identify icons in trees
				item.classId = parentId;
				var valuePromises = [];
				//TODO hasChildren
				for(var j=0;j<attrRefArr.length;j++){
					var attrRefId = attrRefArr[j];
					valuePromises.push(self.getAttributeValue(item, objId, attrRefId));
				}
				return when(all(valuePromises), function(valueObjArr){return item;});
			});
			
			

		},
		get: function(objId, viewId){			
			var ATTRREF_CLASS_TYPE = 63;

			var self = this;
			return when(self.getManyByAssocTypeAndDestClass(viewId, ORDERED_ASSOC, ATTRREF_CLASS_TYPE), function(attrRefArr){
				return when(self.getItem(objId, attrRefArr, viewId, null));
			});			
		},
		add: function(object, directives){
			var ATTRREF_CLASS_TYPE = 63;
			
			this.enableTransactionButtons();
			
			var self = this;
			if(!object.type) object.type = 1;			
			var obj = this.addCell(object);//create the object
			var classId = object.classId;
			this.addAssoc({sourceFk: obj.id, type: PARENT_ASSOC, destFk: classId});
			if(directives) this.processDirectives(obj, directives);

			//if(viewId==2378) debugger;
			return when(this.getManyByAssocTypeAndDestClass(object.viewId, ORDERED_ASSOC, ATTRREF_CLASS_TYPE), function(attrRefs){
				//console.log('attrRefs', attrRefs);
				var item = {id: obj.id, viewId: obj.viewId, classId:obj.classId};
				var promisses = [];
				for(var i=0;i<attrRefs.length;i++){
					var attrRefId = attrRefs[i];
					promisses.push(self.addItemAttribute(obj.id, attrRefId));
				};
				return when(all(promisses), function(arr) {
					return item;
				});//TODO return item
			});
			//return obj;
		},
		put: function(object, directives){
			this.enableTransactionButtons();
			
			this.updateItem(object);			
			if(directives) this.processDirectives(object, directives);
			return object;
		},
		addItemAttribute: function(sourceId, attrRefId){
			var CLASS_TYPE = 0;
			var PERTMITTEDVALUE_CLASS = 58;
			var TOONEASSOCS_TYPE = 81;
			
			var self = this;
			var attrPromises = [];
			//get the assocication type that this attribute reference has as an attribute
			attrPromises[0] = this.getOneByAssocTypeAndDestClass(attrRefId, ATTRIBUTE_ASSOC, TOONEASSOCS_TYPE);
			//get the attribute class that this attribute reference maps to
			//attrPromises[1] = this.store.getOneByAssocTypeAndDestClass(attrRefId, MAPSTO_ASSOC, ATTRIBUTE);
			attrPromises[1] = this.getOneByAssocType(attrRefId, MAPSTO_ASSOC, CLASS_TYPE, false);
			return when(all(attrPromises), function(propertiesArr){
				if(!propertiesArr[0]) throw new Error('Attribute Reference '+attrRefId+' must have an association type as an attribute ');
				var assocType = propertiesArr[0];
				if(!propertiesArr[1]) throw new Error('Attribute Reference '+attrRefId+' must map to one class ');
				var destClassId = propertiesArr[1];
				var defaultValue = null;
				if(assocType == ATTRIBUTE_ASSOC){
					//find out if the attribute class is a permitted value
					return when(self.isA(destClassId, PERTMITTEDVALUE_CLASS), function(trueFalse){
						if(trueFalse) {
						}
						else {
							var valueObj = self.addCell({type:1, attrRefId:attrRefId});//, name: '[new]' 
							self.addAssoc({sourceFk: valueObj.id, type: PARENT_ASSOC, destFk: destClassId});
							self.addAssoc({sourceFk: sourceId, type: ATTRIBUTE_ASSOC, destFk: valueObj.id});
						}
						return trueFalse;
					});					
				}
				else {
					return false;
				}	
			});	
		},
		updateItem: function(item){
			for(attributeReference in item){
				if(!isNaN(attributeReference)){
					//console.log('cellId'+attributeReference);
					var value  = item[attributeReference];
					if(item['cellId'+attributeReference]) {
						var cellId = item['cellId'+attributeReference];
						if(cellId==null){
							//cretae a new cell and its associations
						}
						else{
							if(value==null){
								//delete the cell and its associations
							}
							else{
								//update the cell value
								when(cellStore.get(cellId), function(cell){
									if(cell.name != value){
										cell.name = value;
										cellStore.put(cell);
									}
								});
							}
						}
					}
					else if(item['assocId'+attributeReference]){
						var assocId = item['assocId'+attributeReference];
						if(assocId==null){
							
						}
						else{
							when(assocStore.get(assocId), function(assoc){
								if(assoc.destFk != value){
									assoc.destFk = value;
									assocStore.put(assoc);
								}
							});
						}
					}
					else throw new Error("Don't know what to update");
				}
			}		
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
			attrPromises[1] = assocStore.query({sourceFk: viewId, type: MAPSTO_ASSOC});
			when(all(attrPromises), function(arr){
				if(!arr[0]) throw new Error('View '+viewId+' must have an association type as an attribute ');
				var assocType = arr[0];
				if(arr[1].length!=1) throw new Error('View '+viewId+' must map to one class ');
				//if(arr[1].length!=1) console.log('View '+viewId+' should map to one class ');
				var destClassId = arr[1][0].destFk;
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
										when(assocStore.query({sourceFk: movingObjectId, type: NEXT_ASSOC, destFk: oldParentChildren[1]}), function(assocArr){
											// update it so that it has the old parent as source
											if(assocArr.length!=1) throw new Error('Expected to find one association');
											var assoc = assocArr[0];
											assoc.sourceFk = oldParentId;
											assoc.type = ORDERED_ASSOC;
											assocStore.put(assoc);
										});					
									}

								}
								else{//the obejct we're moving is NOT the first of the old parent children
									leadingAssocSourceFk = oldParentChildren[idx-1];
									leadingAssoctype = NEXT_ASSOC;
									if(idx < oldParentChildren.length-1){//there is at least one other object following the moving object, find it's assoc  
										when(assocStore.query({sourceFk: movingObjectId, type: NEXT_ASSOC, destFk: oldParentChildren[idx+1]}), function(assocArr){
											//update it so that it has the previous object as source
											if(assocArr.length!=1) throw new Error('Expected to find one association');
											var assoc = assocArr[0];
											assoc.sourceFk = oldParentChildren[idx-1];
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
									when(assocStore.query({sourceFk: newParentFollowingAssocSourceFk, type: newParentFollowingAssoctype, destFk: beforeId}), function(assocArr){
										if(assocArr.length!=1) throw new Error('Expected to find one association');
										var newParentFollowingAssoc = assocArr[0];
										newParentFollowingAssoc.sourceFk = movingObjectId;
										newParentFollowingAssoc.type = NEXT_ASSOC;
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
								when(assocStore.query({sourceFk: leadingAssocSourceFk, type: leadingAssoctype, destFk: movingObjectId}), function(assocArr){
									if(assocArr.length!=1) throw new Error('Expected to find one association');
									var leadingAssoc = assocArr[0];
									leadingAssoc.sourceFk = newParentFollowingAssocSourceFk;
									leadingAssoc.type = newParentFollowingAssoctype;
									assocStore.put(leadingAssoc);										
								});					
							});
						});							
					}
					else{//no oldParent means we're creating a new cell with a new association
						if(newParentId) {
							// get the ordered children as seen from the new parent
							when(self.getManyByAssocTypeAndDestClass(newParentId, ORDERED_ASSOC, destClassId), function(newParentChildren){
								if(newParentChildren.length>0){
									assocStore.add({sourceFk: newParentChildren[newParentChildren.length-1], type: NEXT_ASSOC, destFk: movingObjectId});
								}
								else{
									assocStore.add({sourceFk: newParentId, type: ORDERED_ASSOC, destFk: movingObjectId});									
								}
							});
						}
					}
				}
				else{
					if(oldParentId == newParentId) return;
					//TODO new assoc?
					when(assocStore.query({sourceFk: oldParentId, type: assocType, destFk: movingObjectId}), function(assocArr){
						if(assocArr.length!=1) throw new Error('Expected to find one association');
						var assoc = assocArr[0];
						assoc.sourceFk = newParentId;
						assocStore.put(assoc);
					});					
				}
			});		
		},		
		remove: function(id){			
			this.enableTransactionButtons();
			debugger;
		},		

		query: function(query, options){
			if(query.parentId && query.widgetId && query.join){
				var promise = this.getManyByParentWidgetJoin(query.parentId, query.widgetId);
				return QueryResults(promise);
			}
			else if(query.cellId && query.viewId ){//used by tree to get the first item
				return when(this.get(query.cellId, query.viewId), function(item){
					return QueryResults([item]);
				});
			}
			else if(query.parentId && query.viewId ){//used by getChildren
				var results = this.getManyByParentWidgetOrViewUnion(query.parentId, query.viewId);
				return QueryResults(results);
				//return QueryResults(this.queryEngine(query, options)(results));
			}
			else if(query.sourceFk || query.destFk){
				//return assocStore.query(query, options);
				return localAssocStore.query(query, options);
			}
			//else return JsonRest.prototype.query.call(this, query, options);
			return [];
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
					console.log(data);
					//TODO: Replace IDs
					data.map(function(action){
						//var options = action.options || {};
						var cid = action.cid;
						var store = action.tabel;
						var target = action.data;
						var cachingStore;
						if(store=='cell') cachingStore = localCellStore;
						else cachingStore = localAssocStore;
						cachingStore.remove(cid);
						cachingStore.put(target);
						if(store=='cell') {
							localAssocStore.query({sourceFk:cid}).map(function(assoc){
								assoc.sourceFk = target.id;
								localAssocStore.put(assoc);
							});						
							localAssocStore.query({destFk:cid}).map(function(assoc){
								assoc.destFk = target.id;
								localAssocStore.put(assoc);
							});						
						}
	    			});
					transactionLogStore.query({}).map(function(action){
						transactionLogStore.remove(action.id);
					});
					dojo.fadeIn({ node:"savedDlg", duration: 300, onEnd: function(){dojo.fadeOut({ node:"savedDlg", duration: 300, delay:300 }).play();}}).play();
	    		},
	    		function(error){
			    	//evict from the cache then refresh the page data
	    			transactionLogStore.query({}).map(function(action){
						//var options = action.options || {};
						var method = action.method;
						var store = action.storeId;
						var target = action.target;
						var cachingStore;
						if(store=='cell') cachingStore = localCellStore;
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
					nq.errorDialog(error);
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
				if(store=='cell') cachingStore = localCellStore;
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
		getChildren: function(parent){
			return this.query({parentId: parent.id, viewId: parent.viewId });
			//return this.getManyByParentWidgetOrViewUnion(parent.id, parent.viewId);
			// QueryResults(this.getManyByParentWidgetOrViewUnion(parent.id, parent.viewId));
		},
		getManyByParentWidgetOrViewUnion: function(sourceId, parentWidgetOrViewId){
			// summary:
			//		Returns an array of items that can be consumed by widgets. 
			//		Each Widget or View can have multiple sub-views. 
			//		This method can be thought of as returning a union of getManyByView for each of the sub-views
			//		This is used by the Tree which can have many views displyed as children if a tree node.
			// sourceId: Number
			//		The identifier of the parent cell
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
				return when(all(promisses), function(ArrayOfArrays){
					var resultArr = [];
					for(var i=0;i<ArrayOfArrays.length;i++){
						resultArr = resultArr.concat(ArrayOfArrays[i]);
					}
					return resultArr;
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
			//		The identifier of the parent cell
			// parentWidgetId: Number
			//		The identifier of the widget that will tell us which attributes to retreive
			// returns: Array 
			//		An array of prommises. Each promise will result in an item.
			
			var VIEW_ID = 74;
			
			var self = this;
			return when(this.getManyByAssocTypeAndDestClass(parentWidgetId, MANYTOMANY_ASSOC, VIEW_ID), function(subViewsArr){
				if(subViewsArr.length<1) return [];
				var subViewId = subViewsArr[0];//assume there is only one
				//if(subViewId==2297) debugger;
				return when(self.getManyByView(sourceId, subViewId), function(itemsArr){
					//console.log('itemsArr', itemsArr);
					var promisses = [];
					for(var i=0;i<itemsArr.length;i++){
						item = itemsArr[i];
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
			//		In addition the items contain {objId...: cellId} for each of the attribute reference wich provides the id of the value cell 
			// sourceId: Number
			//		The identifier of the parent cell
			// viewId: Number
			//		The identifier of the view that will tell us which attributes to retreive and by which association type
			// returns: Array 
			//		An array of prommises. Each promise will result in an item.

			var ASSOCS_CLASS_TYPE = 94;
			var ATTRREF_CLASS_TYPE = 63;
			
			var self = this;
			var attrPromises = [];
			//get the assocication type that this view has as an attribute
			attrPromises[0] = self.getOneByAssocTypeAndDestClass(viewId, ATTRIBUTE_ASSOC, ASSOCS_CLASS_TYPE);
			//get the class that this view maps to
			attrPromises[1] = assocStore.query({sourceFk: viewId, type: MAPSTO_ASSOC});
			//get the attribute references that belong to this view
			attrPromises[2] = self.getManyByAssocTypeAndDestClass(viewId, ORDERED_ASSOC, ATTRREF_CLASS_TYPE);
			return when(all(attrPromises), function(arr){
				if(!arr[0]) throw new Error('View '+viewId+' must have an association type as an attribute ');
				var assocType = arr[0];
				var attrRefArr = arr[2];
				//////////////Exception for the Association assocType as used by the Class Model//////////////////////
				if(assocType == ASSOCS_PASSOC) return self.getAssocItems(sourceId, attrRefArr, viewId);
				//////////////Exception for the By Association Type assocType as used by the Class Model//////////////////////
				else if(assocType == BYASSOCTPE_PASSOC) return self.getCellItems(sourceId, attrRefArr, viewId);
				else{
					if(arr[1].length!=1) throw new Error('View '+viewId+' must map to one class ');
					//if(arr[1].length!=1) console.log('View '+viewId+' should map to one class ');
					var destClassId = arr[1][0].destFk;
					//get the objects that result from this source, view
					return when(self.getManyByAssocTypeAndDestClass(sourceId, assocType, destClassId), function(objArr){
						//for each related object 
						var itemsDonePromises = [];
						for(var i=0;i<objArr.length;i++){
							var objId = objArr[i];
							itemsDonePromises.push(self.getItem(objId, attrRefArr, viewId));
						}
						return all(itemsDonePromises);
					});
				}
			});
		},		
		getItem: function(objId, attrRefArr, viewId){
			var self = this;
			return when(assocStore.query({sourceFk: objId, type: PARENT_ASSOC}), function(classIdAssocArr){
				if(classIdAssocArr.length>1) throw new Error(objId+' has more than one parent.');
				var parentId = classIdAssocArr.length==0?0:classIdAssocArr[0].destFk;
				var valuePromises = [];
				//viewId is used for things like identifing labels and menus in trees, also getChildren as requested by trees
				//classId is used to identify icons in trees
				//TODO hasChildren
				var item = {id: objId, viewId: viewId, classId:parentId};
				for(var j=0;j<attrRefArr.length;j++){
					var attrRefId = attrRefArr[j];
					valuePromises.push(self.getAttributeValue(item, objId, attrRefId));
				}
				return when(all(valuePromises), function(valueObjArr){return item;});
				
			});
		},
		getAttributeValue: function(item, objId, attrRefId){			
			var PERTMITTEDVALUE_CLASS = 58;
			var ASSOCS_CLASS_TYPE = 94;
			var CELLNAME_ATTR_CLASS = 101;
			var CELLTYPE_ATTR_CLASS = 102;
			
			var self = this;
			var attrPromises = [];
			//get the assocication type that this attribute reference has as an attribute
			attrPromises[0] = self.getOneByAssocTypeAndDestClass(attrRefId, ATTRIBUTE_ASSOC, ASSOCS_CLASS_TYPE);
			//get the attribute class that this attribute reference maps to
			attrPromises[1] = assocStore.query({sourceFk: attrRefId, type: MAPSTO_ASSOC});
			return when(all(attrPromises), function(arr){
				if(!arr[0]) throw new Error('Attribute Reference '+attrRefId+' must have an association type as an attribute ');
				var assocType = arr[0];
				if(arr[1].length!=1) throw new Error('Attribute Reference '+attrRefId+' must map to one class ');
				var destClassId = arr[1][0].destFk;
				/////// Exception for the cell name attribute, as used by the class model ///////////////////
				if(destClassId == CELLNAME_ATTR_CLASS) return self.getClassModelCellName(item, objId, attrRefId);
				/////// Exception for the cell type attribute, as used by the class model ///////////////////
				else if(destClassId == CELLTYPE_ATTR_CLASS) throw new Error('CELLTYPE_ATTR_CLASS not yet implemented ');
				//get the value for this object, attribute reference
				else return when(self.getOneByAssocTypeAndDestClass(objId, assocType, destClassId), function(valueObjId){
					if(assocType == ATTRIBUTE_ASSOC){
						//if(attrRefId == 760) debugger;
						//find out if the attribute class is a permitted value
						return when(self.isA(destClassId, PERTMITTEDVALUE_CLASS), function(trueFalse){
							if(trueFalse) {
								if(valueObjId){
									return when(assocStore.query({sourceFk: objId, type: assocType, destFk: valueObjId}), function(assocArr){
										item[attrRefId] = valueObjId;//add the identifier to the item
										item['assocId'+attrRefId] = assocArr[0]?assocArr[0].id:null;
										return valueObjId;									
									});								
								}
								else{
									item[attrRefId] = null;
									item['assocId'+attrRefId] = null;
									return null;																		
								}
							}
							else {
								if(valueObjId){
									return when(cellStore.get(valueObjId), function(valueObj){
										//if(!valueObj) return null;
										item[attrRefId] = valueObj?valueObj.name:null;//add the value to the item
										item['cellId'+attrRefId] = valueObjId;
										return valueObjId;
									});
								}
								else{
									item[attrRefId] = null;
									item['cellId'+attrRefId] = null;
									return null;																		
								}
							}
						});
					}
					else {
						if(valueObjId){
							return when(assocStore.query({sourceFk: objId, type: assocType, destFk: valueObjId}), function(assocArr){
								item[attrRefId] = valueObjId;//add the identifier to the item
								item['assocId'+attrRefId] = assocArr[0]?assocArr[0].id:null;
								return valueObjId;									
							});								
						}
						else{
							item[attrRefId] = null;
							item['assocId'+attrRefId] = null;
							return null;																		
						}
					}
				});
			});
		},
		getClassModelCellName: function(item, objId, attrRefId){
			var PROCESSCLASSES_CLASS = 67;
			var PRIMARYNAME_CLASS = 69;
			
			var self = this;
			return when(cellStore.get(objId), function(valueObj){
				if(valueObj.type==0){//is a class
					item['classId'] = 0;//always show class icon (disregard the one we found earlier)
					item[attrRefId] = valueObj.name;//add the cell name
					item['cellId'+attrRefId] = objId;
					return objId;						
				}
				else { //is an object
					//find out if the object is a process class
					return when(self.isA(objId, PROCESSCLASSES_CLASS), function(trueFalse){
						if(trueFalse) {
							//get the primary name of the object
							return when(self.getOneByAssocTypeAndDestClass(objId, ATTRIBUTE_ASSOC, PRIMARYNAME_CLASS), function(valueObjId){
								if(!valueObjId) return null; 
								else return when(cellStore.get(valueObjId), function(valueObj){
									//if(!valueObj) return null;
									item[attrRefId] = valueObj?valueObj.name:null;//add the value to the item
									item['cellId'+attrRefId] = valueObjId;
									return valueObjId;
								});
							});
						}
						else{
							item[attrRefId] = valueObj.name;//add the cell name
							item['cellId'+attrRefId] = objId;
							return objId;						
						}
					});
				}
			});
		},
		getAssocItems: function(sourceId, attrRefArr, viewId){
			var uniqueTypes = {};
			return when(assocStore.query({sourceFk: sourceId}), function(sourceTypesArr){
				for(var i=0;i<sourceTypesArr.length;i++){
					var type = sourceTypesArr[i].type;
					if(type == 3) continue;
					uniqueTypes[type] = true;
				}
				return when(assocStore.query({destFk: sourceId}), function(destypesArr){
					for(var i=0;i<destypesArr.length;i++){					
						var type = (destypesArr[i].type)+12;
						uniqueTypes[type] = true;
					}
					var promises = [];
					for(key in uniqueTypes){
						promises.push(cellStore.get(key));//get the corresponding cell so we can use the name.
					}
					return when(all(promises), function(assocCellsArr){
						items= [];
						for(var j=0;j<assocCellsArr.length;j++){
							var type = assocCellsArr[j].id;
							var item = {id: sourceId+'/'+type, sourceId:sourceId,  viewId: viewId, classId: type};
							item[attrRefArr[0]] = assocCellsArr[j].name;
							items.push(item);
						}
						return items;
					});				
				});
			});
		},
		getCellItems: function(assocId, attrRefArr, viewId){
			var self = this;
			var sourceId = assocId.split('/')[0];
			var assocType = assocId.split('/')[1];
			return when(this.getManyByAssocType(sourceId, assocType, null, false), function(cellIdsArr){
				var promises = [];
				for(var j=0;j<cellIdsArr.length;j++){
					var objId = cellIdsArr[j];
					promises.push(self.getItem(objId, attrRefArr, viewId));
				}
				return all(promises);
			});
		},
		getManyByAssocTypeAndDestClass: function(sourceId, assocType, destClassId){
			// summary:
			//		Given a source cellId, return all the cellIds, by associations of type assocType and destClass.
			//		Used for navigating the network where we have a source object and we're interested in related objects
			//		by a particular association type and of class type 'destination class'.
			//		Used for things like one to many relationships and getAttribute of...
			//		Will autoresolve ordered associations (which are comprised of a linked list) 
			//		Takes pseudo-association types into account by substacting 12 from the type and doing a reverse assoc query.
			// sourceId: Number
			//		The identifier of the parent cell
			// assocType: Number
			//		The association type of the association
			// destClassId: Number
			//		The identifier of the destination class
			// returns: Array 
			//		An array of prommises. Each promise will result an id of a cell that meets the citeria.

			var self = this;
			if(assocType==ORDERED_ASSOC){
				return when(assocStore.query({sourceFk: sourceId, type: assocType}), function(assocs){
					var promisses = [];
					var resultArr = [];
					for(var j=0;j<assocs.length;j++){
						var assoc = assocs[j];
						promisses.push(self.filterCandidates(assoc.destFk, destClassId, resultArr));
					}
					return when(all(promisses), function(results){
						if(resultArr.length==0) return [];
						if(resultArr.length>1) throw new Error('Ordered view has more than one ordered association');
						var firstId  = resultArr[0];
						return when(self.addNextToAssocsArr(firstId, destClassId, resultArr), function(assocs){
							var promisses = [];
							for(var j=0;j<assocs.length;j++){
								var assoc = assocs[j];
								promisses.push(self.filterCandidates(assoc.destFk, destClassId, resultArr));
							}
							return when(all(promisses), function(results){
								return resultArr;
							});
						});
					});
				});
			}
			else if(assocType < SUBCLASSES_PASSOC){//navigate forward
				return when(assocStore.query({sourceFk: sourceId, type: assocType}), function(assocs){
					var promisses = [];
					var resultArr = [];
					for(var j=0;j<assocs.length;j++){
						var assoc = assocs[j];
						promisses.push(self.filterCandidates(assoc.destFk, destClassId, resultArr));
					}
					return when(all(promisses), function(results){
						return resultArr;
					});
				});
			}
			else{//navigate backward
				return when(assocStore.query({destFk: sourceId, type: assocType-12}), function(assocs){
					var promisses = [];
					var resultArr = [];
					for(var j=0;j<assocs.length;j++){
						var assoc = assocs[j];
						promisses.push(self.filterCandidates(assoc.sourceFk, destClassId, resultArr));
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
		getManyByAssocType: function(sourceId, assocType, classOrObjectType, recursive){
			// summary:
			//		Used to navigate the network via particular association type, where we're interested in either in classes or objects.
			//		Can do so recusivly following the data graph via the same association type.
			//		Returns an array of ids of cells that meet the citeria. 
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
			//		An array of prommises. Each promise will result an id of a cell that meets the criteria
			
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
			return when(assocStore.query({sourceFk: sourceId, type: assocType}), function(assocsArr){
				var promisses = [];
				for(var j=0;j<assocsArr.length;j++){
					var destFk = assocsArr[j].destFk;
					if(loopProtectionArr[destFk]) continue;
					loopProtectionArr[destFk] = true;
					promisses.push(when(cellStore.get(destFk), function(destCell){
						if(classOrObjectType!=0 && classOrObjectType!=1 ) resultArr.push(destCell.id);
						else if(classOrObjectType == destCell.type) {
								resultArr.push(destCell.id);
								//loopProtectionArr[childId] = true;
						}
						if(recursive) return self.getManyByAssocTypeRecursive(destCell.id, assocType, classOrObjectType, recursive, resultArr, loopProtectionArr);
						else return destCell;
					}));
				}
				return all(promisses);
			});
		},
		getManyByAssocTypeRecursiveReverse: function(sourceId, assocType, classOrObjectType, recursive, resultArr, loopProtectionArr){
			//console.log('getManyByAssocTypeRecursiveReverse', sourceId, assocType, classOrObjectType, recursive, resultArr, loopProtectionArr);
			var self = this;
			return when(assocStore.query({destFk: sourceId, type: assocType}), function(assocsArr){
				//console.log('assocsArr', assocsArr);
				var promisses = [];
				for(var j=0;j<assocsArr.length;j++){
					var sourceFk = assocsArr[j].sourceFk;
					if(loopProtectionArr[sourceFk]) continue;
					loopProtectionArr[sourceFk] = true;
					promisses.push(when(cellStore.get(sourceFk), function(sourceCell){
						if(classOrObjectType!=0 && classOrObjectType!=1 ) resultArr.push(sourceCell.id);
						else if(classOrObjectType==sourceCell.type) {
								resultArr.push(sourceCell.id);
								//loopProtectionArr[childId] = true;
						}
						if(recursive) return self.getManyByAssocTypeRecursiveReverse(sourceFk, assocType, classOrObjectType, recursive, resultArr, loopProtectionArr);
						else return sourceCell;
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
			//		The identifier of the parent cell
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
			//		Cell type: zero or one. Are we looking for a class or an object
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
			return when(assocStore.query({sourceFk: objectId, type: PARENT_ASSOC}), function(assocs){
				if(assocs.length>1) debugger;
				if(assocs.length>1) throw new Error('More than one parent found');
				if(assocs.length==0) return false;//we're at the root
				//if(assocs[0].destFk==1) return false;//we're at the root
				return self.isA(assocs[0].destFk, destClassId);
			});
		},
		addNextToAssocsArr: function(sourceId, destClassId, assocsArr){
			var self = this;
			return when(assocStore.query({sourceFk: sourceId, type: NEXT_ASSOC}), function(assocs){
				if(assocs.length==0) return true;
				if(assocs.length>1) throw new Error('More than one next found');
				assocsArr.push(assocs[0].destFk);
				return self.addNextToAssocsArr(assocs[0].destFk, destClassId, assocsArr);
			});
		},


		test: function(){
			var self = this;
			var t = transactionalCellStore.transaction();
			var id = "cid"+Math.floor((Math.random()*1000000)+1);
			transactionalCellStore.add({id:id, name:'OneName', type:0});
			var updateObjectId = "cid"+Math.floor((Math.random()*1000000)+1);
			transactionalCellStore.add({id:updateObjectId, name:'TwoName', type:0});
			var removeObjectId = "cid"+Math.floor((Math.random()*1000000)+1);
			transactionalCellStore.add({id:removeObjectId, name:'ThreeName', type:0});
			//obj.name = 'NewTwoName';
			//transactionalCellStore.put(obj);
			transactionalCellStore.remove(removeObjectId);
			//t.commit();	

			var obj = transactionalCellStore.get(updateObjectId);
			when(obj, function(obj){
				obj.name = 'NewThreeName';
				var putPromise = transactionalCellStore.put(obj);
				when(putPromise, function(reesult){ 
//					t.commit();	
				});				
			});
/*			localCellStore.get(updateObjectId).then(function(localObj){
				localObj.name = 'NewThreeNamelocalObj';
				transactionalCellStore.put(localObj);
			});
			t.commit();	

			var updateObjectId = transactionalCellStore.add({name:'ThreeName', type:0});
			var removeObject = transactionalCellStore.add({name:'FourName', type:0});
			//var obj = nqDataStore.getTransactionalCellStore(updateObjectId);
			//obj.name = 'NewThreeName';
			//nqDataStore.putTransactionalCellStore(obj);
			
			object.id = "cid:"+Math.floor((Math.random()*1000000)+1);
			 when(updateObject, function(obj){
				obj.name = 'NewThreeName';
				nqDataStore.putTransactionalCellStore(obj);
				transaction.commit();	
				
			});
			*/
		},

		


		// =======================================================================
		preFetch: function(){
			var self = this;
			if(localCellStore.clear) localCellStore.clear();
			if(localAssocStore.clear) localAssocStore.clear();
//			return true;//disable prefetch
			return request('data/prefetch', {
				headers: {'Content-Type': 'application/json; charset=UTF-8'},
				handleAs: 'json',
			}).then(function(data){
				//console.dir(data);
				if(localCellStore.setData) localCellStore.setData(data.cell);
				else{
					array.forEach(data.cell, function(item, index){
						localCellStore.put(item);
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
