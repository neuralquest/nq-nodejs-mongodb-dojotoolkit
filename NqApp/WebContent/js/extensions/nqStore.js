define(['dojo/_base/declare', "dojo/_base/lang","dojo/when", "dojo/promise/all", "dojo/store/util/QueryResults", "dojo/store/JsonRest" , 'dojo/store/Memory', 'dojo/store/Cache', 'dojo/request', 'dijit/registry', "dojo/_base/array"],
function(declare, lang, when, all, QueryResults, JsonRest, Memory, Cache, request, registry, array ){

// module:
//		js/nqStore
	var dirtyCells = [];
	var dirtyAssocs = [];
	var queryCacheForward = [];
	var queryCacheBackward = [];
	var cellMasterStore = new JsonRest({target:"data/cell/"});
	var cellMemmoryStore = new Memory({});
	var cellStore = new Cache(cellMasterStore, cellMemmoryStore);
	var assocMasterStore = new JsonRest({target:"data/assoc/"});
	var assocMemmoryStore = new Memory({});
	var assocStore = new Cache(assocMasterStore, assocMemmoryStore);
	assocStore.query = function(query, directives){
		//have we seen this query before?
		if(query.sourceFk && query.type){
			//if(query.sourceFk==754 && query.type==4) debugger;
			if(queryCacheForward[query.sourceFk]&&queryCacheForward[query.sourceFk][query.type]) {
				return queryCacheForward[query.sourceFk][query.type];//return the cached query results
			}
			else{
				var results = assocMasterStore.query(query, directives);
				if(!queryCacheForward[query.sourceFk]){
					queryCacheForward[query.sourceFk] = [];
				}
				queryCacheForward[query.sourceFk][query.type] = results;//store the query results
				//console.log('rest', query);
				results.forEach(function(object){
					assocMemmoryStore.put(object);
				});
				return results;
			}
		}
		else if(query.destFk && query.type){
			if(queryCacheBackward[query.destFk]&&queryCacheBackward[query.destFk][query.type]) {
				return queryCacheBackward[query.destFk][query.type];//return the cached query results
			}
			else {
				var results = assocMasterStore.query(query, directives);
				if(!queryCacheBackward[query.destFk]){
					queryCacheBackward[query.destFk] = [];
				}
				queryCacheBackward[query.destFk][query.type] = results;//store the query results
				//console.log('rest', query);
				results.forEach(function(object){
					assocMemmoryStore.put(object);
				});
				return results;
			}
		}
		else return JsonRest.prototype.query.call(this, query, directives);
		//return [];
	};

	return declare("nqStore", [], {

		
		get: function(id){//get rid of
			//if(!id) debugger;
			return cellStore.get(id);
		},
		getCell: function(id){
			// summary:
			//		Retrieves an object by its identity
			// id: Number
			//		The identity to use to lookup the object
			// returns: Object
			//		The object in the store that matches the given id.
			//if(!id) debugger;
			return cellStore.get(id);
		},
		getIdentity: function(object){
			// summary:
			//		Returns an object's identity
			// object: Object
			//		The object to get the identity from
			// returns: String|Number
			return object.id;
		},
		getAssoc: function(id){
			// summary:
			//		Retrieves an object by its identity
			// id: Number
			//		The identity to use to lookup the object
			// returns: Object
			//		The object in the store that matches the given id.
			return assocStore.get(id);
		},
		putCell: function(object, directives){
			// summary:
			//		Stores an object
			// object: Object
			//		The object to store.
			// directives: dojo/store/api/Store.PutDirectives?
			//		Additional directives for storing objects.
			// returns: Number|String

			this.enableTransactionButtons();
			
			if(array.indexOf(dirtyCells, object.id)>=0) dirtyCells.push(object.id);
			cellMemmoryStore.put(object, directives);
			return object.id;
		},
		addCell: function(object, directives){
			// summary:
			//		Creates an object, throws an error if the object already exists
			// object: Object
			//		The object to store.
			// directives: dojo/store/api/Store.PutDirectives?
			//		Additional directives for creating objects.
			// returns: Number|String

			this.enableTransactionButtons();
			
			object.id = "cid:"+Math.floor((Math.random()*1000000)+1);
			dirtyCells.push(object.id);
			cellMemmoryStore.add(object, directives);
			return object.id;
		},
		removeCell: function(id){
			// summary:
			//		Deletes an object by its identity
			// id: Number
			//		The identity to use to delete the object

			this.enableTransactionButtons();
			
			var i = array.indexOf(dirtyCells, object.id);
			if(i>=0) dirtyCells.splice(i,0);
			else dirtyCells.push(object.id);
			cellMemmoryStore.remove(id);
		},
		putAssoc: function(object, directives){
			// summary:
			//		Stores an object
			// object: Object
			//		The object to store.
			// directives: dojo/store/api/Store.PutDirectives?
			//		Additional directives for storing objects.
			// returns: Number|String

			this.enableTransactionButtons();
			
			if(array.indexOf(dirtyAssocs, object.id)>=0) dirtyAssocs.push(object.id);
			assocMemmoryStore.put(object, directives);
			return object.id;
		},
		addAssoc: function(object, directives){
			// summary:
			//		Creates an object, throws an error if the object already exists
			// object: Object
			//		The object to store.
			// directives: dojo/store/api/Store.PutDirectives?
			//		Additional directives for creating objects.
			// returns: Number|String

			this.enableTransactionButtons();
			
			object.id = "cid:"+Math.floor((Math.random()*1000000)+1);
			dirtyAssocs.push(object.id);
			assocMemmoryStore.add(object, directives);
			return object.id;
		},
		removeAssoc: function(id){
			// summary:
			//		Deletes an object by its identity
			// id: Number
			//		The identity to use to delete the object

			this.enableTransactionButtons();
			
			var i = array.indexOf(dirtyAssocs, object.id);
			if(i>=0) dirtyAssocs.splice(i,0);
			else dirtyAssocs.push(object.id);
			assocMemmoryStore.remove(id);
		},		
		put: function(object, directives){
			// summary:
			//		Stores an object
			// object: Object
			//		The object to store.
			// directives: dojo/store/api/Store.PutDirectives?
			//		Additional directives for storing objects.
			// returns: Number|String

			var ASSOCS_CLASS_TYPE = 94;

			console.log('put', object, directives);
			debugger;
			var self = this;
			var viewId = object.viewId;
			var objectId = object.id;
			var parentId = directives.parent.id;
			var beforeId = directives.before?directives.before.id:undefined;
			//get the assocication type that this view has as an attribute
			when(this.getOneByAssocTypeAndDestClass(viewId, ATTRIBUTE_ASSOC, ASSOCS_CLASS_TYPE), function(assocType){
				if(assocType==ORDERED_ASSOC){
					//remove object from the linkedlist
					
					if(beforeId)
					//get the current assoc
				}
				when(assocStore.query({sourceFk: parentId, type: assocType, destFk: objectId}), function(assocArr){
					console.log(assocArr);
					
				});
			});
		},
		query: function(query, options){
			// summary:
			//		Queries the store for objects. This does not alter the store, but returns a
			//		set of data from the store.
			// query: String|Object|Function
			//		The query to use for retrieving objects from the store.
			// options: dojo/store/api/Store.QueryOptions
			//		The optional arguments to apply to the resultset.
			// returns: dojo/store/api/Store.QueryResults
			//		The results of the query, extended with iterative methods.
			//
			// example:
			//		Given the following store:
			//
			//	...find all items where "prime" is true:
			//
			//	|	store.query({ prime: true }).forEach(function(object){
			//	|		// handle each object
			//	|	});
			if(query.parentId && query.widgetId && query.join){
				var promise = this.getManyByParentWidgetJoin(query.parentId, query.widgetId);
				return QueryResults(promise);
			}
			else if(query.cellId && query.viewId ){//used by tree to get the first item
				return when(this.getItemByView(query.cellId, query.viewId), function(item){
					return QueryResults([item]);
				});
			}
			else if(query.sourceFk || query.destFk){
				return assocStore.query(query, options);
			}
			//else return JsonRest.prototype.query.call(this, query, options);
			return [];
		},
		transaction: function(){
			// summary:
			//		Starts a new transaction.
			//		Note that a store user might not call transaction() prior to using put,
			//		delete, etc. in which case these operations effectively could be thought of
			//		as "auto-commit" style actions.
			// returns: dojo/store/api/Store.Transaction
			//		This represents the new current transaction.
	    	return {
		    	commit: lang.hitch(this, function(){
					registry.byId('cancelButtonId').set('disabled',true);
					registry.byId('saveButtonId').set('disabled',true);					
					
					var cellOperations = [];
					for(var j=0;j<dirtyCells.length;j++){
						var cellId = dirtyCells[j];
						cellOperations.push(cellMemmoryStore.get(cellId));
					}
					var dataOperations = {cellOperations:cellOperations};
					var assocOperations = [];
					for(var j=0;j<dirtyAssocs.length;j++){
						var assocId = dirtyAssocs[j];
						assocOperations.push(assocMemmoryStore.get(assocId));
					}
					dataOperations.assocOperations = assocOperations;
					request.post(this.target, {
						// send all the operations in the body
						headers: {'Content-Type': 'application/json; charset=UTF-8'},
						data: dojo.toJson(dataOperations)//JSON.stringify(dataOperations)
					}).then( 
						function(data){
							console.log(data);//TODO: Replace IDs
							dirtyCells = [];
							dojo.fadeIn({ node:"savedDlg", duration: 300, onEnd: function(){dojo.fadeOut({ node:"savedDlg", duration: 300, delay:300 }).play();}}).play();
			    		},
			    		function(error){
					    	//TODO evict from the cache then refresh the page data
							dirtyCells = [];
							nq.errorDialog(error);
			    		}
			    	);		    	
				}),
			    abort: function(){
			    	window.location.reload(true);
			    	//TODO evict from the cache then refresh the page data
					dirtyCells = [];
					nq.errorDialog(error);
		    	}
	    	};
		},
		getChildren: function(parent){
			// summary:
			//		Retrieves the children of an object.
			// parent: Object
			//		The object to find the children of.
			// options: dojo/store/api/Store.QueryOptions?
			//		Additional options to apply to the retrieval of the children.
			// returns: dojo/store/api/Store.QueryResults
			//		A result set of the children of the parent object.
			return when(this.getManyByParentWidgetOrViewUnion(parent.id, parent.viewId));
		},
		getMetadata: function(object){
			// summary:
			//		Returns any metadata about the object. This may include attribution,
			//		cache directives, history, or version information.
			// object: Object
			//		The object to return metadata for.
			// returns: Object
			//		An object containing metadata.
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
							itemsDonePromises.push(self.createItem(objId, attrRefArr, viewId));
						}
						return all(itemsDonePromises);
					});
				}
			});
		},		
		createItem: function(objId, attrRefArr, viewId){
			var self = this;
			return when(assocStore.query({sourceFk: objId, type: PARENT_ASSOC}), function(classIdAssocArr){
				if(classIdAssocArr.length>1) throw new Error(objId+' has more than oneparent.');
				var parentId = classIdAssocArr.length==0?0:classIdAssocArr[0].destFk;
				var valuePromises = [];
				//viewId is used for things like identifing labels and menus in trees, also getChildren as requested by trees
				//classId is used to identify icons in trees
				//TODO hasChildren
				var item = {id: objId, viewId: viewId, classId:parentId};
				for(var j=0;j<attrRefArr.length;j++){
					var attrRefId = attrRefArr[j];
					valuePromises.push(self.addValueToItem(item, objId, attrRefId));
				}
				return when(all(valuePromises), function(valueObjArr){return item;});
				
			});
		},
		addValueToItem: function(item, objId, attrRefId){			
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
					if(!valueObjId) return null; 
					if(assocType == ATTRIBUTE_ASSOC){
						//find out if the attribute class is a permitted value
						return when(self.isA(destClassId, PERTMITTEDVALUE_CLASS), function(trueFalse){
							if(trueFalse) {
								item[attrRefId] = valueObjId;//add the identifier to the item
								//item['assocId'+attrRefId] = attrPromises[1].id;
								return valueObjId;
							}
							else return when(cellStore.get(valueObjId), function(valueObj){
								//if(!valueObj) return null;
								item[attrRefId] = valueObj?valueObj.name:null;//add the value to the item
								item['cellId'+attrRefId] = valueObjId;
								return valueObjId;
							});
						});
					}
					else {
						item[attrRefId] = valueObjId;//add the identifier to the item
						//item['assocId'+attrRefId] = attrPromises[1].id;
					}
					return valueObjId;
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
			return when(assocStore.query({sourceFk: sourceId, uniqueTypes:true}), function(typesArr){
				var promises = [];
				for(var j=0;j<typesArr.length;j++){
					var type = typesArr[j];
					promises.push(cellStore.get(type));//get the corresponding cell so we can use the name.
				}
				return when(all(promises), function(assocCellsArr){
					items= [];
					for(var j=0;j<typesArr.length;j++){
						var type = typesArr[j];
						var item = {id: sourceId+'/'+type, sourceId:sourceId,  viewId: viewId, classId: type};
						item[attrRefArr[0]] = assocCellsArr[j].name;
						items.push(item);
					}
					return items;
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
					promises.push(self.createItem(objId, attrRefArr, viewId));
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
					promisses.push(when(self.get(destFk), function(destCell){
						if(!classOrObjectType) resultArr.push(destCell.id);
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
					promisses.push(when(self.get(sourceFk), function(sourceCell){
						if(!classOrObjectType) resultArr.push(sourceCell.id);
						if(classOrObjectType==sourceCell.type) {
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
		getItemByView: function(objId, viewId){
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
			return when(self.getManyByAssocTypeAndDestClass(viewId, ORDERED_ASSOC, ATTRREF_CLASS_TYPE), function(attrRefArr){
				return when(self.createItem(objId, attrRefArr, viewId, null));
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


		// =======================================================================
		preFetch: function(){
			var self = this;
			return true;//disable prefetch
			return request('data/prefetch', {
				headers: {'Content-Type': 'application/json; charset=UTF-8'},
				handleAs: 'json',
			}).then(function(data){
				console.dir(data);
				if(data.cell) cellMemmoryStore.setData(data.cell);
				if(data.assoc) assocMemmoryStore.setData(data.assoc);
				if(data.queryCacheForward) {
					for(var i=0;i<data.queryCacheForward.length;i++){
						var query = data.queryCacheForward[i]
						var results = assocMemmoryStore.query(query);
						if(!queryCacheForward[query.sourceFk]){
							queryCacheForward[query.sourceFk] = [];
						}
						queryCacheForward[query.sourceFk][query.type] = results;//store the query results
					}
				}
				if(data.queryCacheBackward) queryCacheBackward = data.queryCacheBackward;
				return true;
	    	});		    	
		}, 
		enableTransactionButtons: function(){
			registry.byId('cancelButtonId').set('disabled',false);
			registry.byId('saveButtonId').set('disabled',false);		
		}


	});
});
