define(['dojo/_base/declare', "dojo/_base/lang","dojo/when", "dojo/promise/all", "dojo/store/util/QueryResults", "dojo/store/JsonRest" , 'dojo/store/Memory', 'dojo/store/Cache', 'dojo/request'],
function(declare, lang, when, all, QueryResults, JsonRest, Memory, Cache, request ){

// module:
//		js/nqStore
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
		if(query.destFk && query.type){
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
		return [];
		var assocResults = assocMemmoryStore.query(query, directives);
		if(assocResults.length>0) return assocResults;
		//console.log(query, assocResults);
		var results = assocMasterStore.query(query, directives);
		//console.log('rest', query);
		results.forEach(function(object){
			assocMemmoryStore.put(object);
		});
		return results;
	};

	return declare("nqStore", [], {

		
		get: function(id){
			// summary:
			//		Retrieves an object by its identity
			// id: Number
			//		The identity to use to lookup the object
			// returns: Object
			//		The object in the store that matches the given id.
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
		put: function(object, directives){
			// summary:
			//		Stores an object
			// object: Object
			//		The object to store.
			// directives: dojo/store/api/Store.PutDirectives?
			//		Additional directives for storing objects.
			// returns: Number|String
		},
		add: function(object, directives){
			// summary:
			//		Creates an object, throws an error if the object already exists
			// object: Object
			//		The object to store.
			// directives: dojo/store/api/Store.PutDirectives?
			//		Additional directives for creating objects.
			// returns: Number|String
		},
		remove: function(id){
			// summary:
			//		Deletes an object by its identity
			// id: Number
			//		The identity to use to delete the object
			delete this.index[id];
			var data = this.data,
				idProperty = this.idProperty;
			for(var i = 0, l = data.length; i < l; i++){
				if(data[i][idProperty] == id){
					data.splice(i, 1);
					return;
				}
			}
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
			if(query.parentId && query.viewIdsArr && query.join){
				var self = this;
				var resultUntilNow = {};
				var resultsArr = [];
				var promise = this.getManyByView(query.parentId, query.viewIdsArr[0]);
				/*var promise = when(_nqDataStore.get(query.parentId), function(parent){
					return when(self.join(parent, query.viewIdsArr, 0, resultUntilNow, resultsArr), function(res){
						return resultsArr;
					});

				});*/
				return QueryResults(promise);
			}
			else if(query.cellId && query.viewId ){
				return when(this.getItemByView(query.cellId, query.viewId), function(item){
					return QueryResults([item]);
				});
				
				//var promise = this.getItemByView(query.cellId, query.viewIdsArr[0]);
				//return QueryResults([promise]);
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
		},
		getChildren: function(parent, parentWidgetOrViewId){
			// summary:
			//		Retrieves the children of an object.
			// parent: Object
			//		The object to find the children of.
			// options: dojo/store/api/Store.QueryOptions?
			//		Additional options to apply to the retrieval of the children.
			// returns: dojo/store/api/Store.QueryResults
			//		A result set of the children of the parent object.
			//return when(this.getManyByParentWidgetOrView(parent.id, parentWidgetOrViewId));
			return when(this.getManyByParentWidgetOrView(parent.id, parentWidgetOrViewId[0]));
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
		getManyByParentWidgetOrView: function(_sourceId, _parentWidgetOrViewId){
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
			
			//remove when we're done with the transformation
			var sourceId = (typeof _sourceId == 'string' && _sourceId.indexOf('/')>0)?_sourceId.split('/')[1]:_sourceId;
			var parentWidgetOrViewId = (typeof _parentWidgetOrViewId == 'string' && _parentWidgetOrViewId.indexOf('/')>0)?_parentWidgetOrViewId.split('/')[1]:_parentWidgetOrViewId;

			var MANYTOMANY_ASSOC = 10;	//TO MANY
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
		getManyByView: function(_sourceId, _viewId){
			// summary:
			//		Returns an array of items that can be consumed by widgets. 
			//		Each item will have an id, a classId, a viewId and name vlaue pairs for the attribute references of the view.
			// sourceId: Number
			//		The identifier of the parent cell
			// viewId: Number
			//		The identifier of the view that will tell us which attributes to retreive
			// returns: Array 
			//		An array of prommises. Each promise will result in an item.
			
			//remove when we're done with the transformation
			var sourceId = (typeof _sourceId == 'string' && _sourceId.indexOf('/')>0)?_sourceId.split('/')[1]:_sourceId;
			var viewId = (typeof _viewId == 'string' && _viewId.indexOf('/')>0)?_viewId.split('/')[1]:_viewId;
			
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
				if(arr[1].length!=1) throw new Error('View '+viewId+' must map to one class ');
				var destClassId = arr[1][0].destFk;
				var attrRefArr = arr[2];
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
			});
		},		
		createItem: function(objId, attrRefArr, viewId){
			var self = this;
			return when(assocStore.query({sourceFk: objId, type: PARENT_ASSOC}), function(classIdAssocArr){
				if(classIdAssocArr.length>1) throw new Error(objId+' has more than oneparent.');
				var parentId = classIdAssocArr.length==0?0:classIdAssocArr[0].destFk;
				var valuePromises = [];
				var item = {id: objId, viewId: viewId, classId:parentId};
				for(var j=0;j<attrRefArr.length;j++){
					var attrRefId = attrRefArr[j];
					valuePromises.push(self.addValueToItem(item, objId, attrRefId));
				}
				return when(all(valuePromises), function(valueObjArr){return item;});
				
			});
		},
		addValueToItem: function(item, objId, attrRefId){
			var PROCESSCLASSES_CLASS = 67;
			var PRIMARYNAME_CLASS = 69;
			var PERTMITTEDVALUE_CLASS = 58;
			var ASSOCS_CLASS_TYPE = 94;
			var CELLNAME_ATTR_CLASS = 2057;
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
				//The cell name attribute does not have value objects, instead add the cell name to the item
				if(destClassId == CELLNAME_ATTR_CLASS){
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
				}
				/////// End of exception ////////////////////////////////
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
		getManyByAssocTypeAndDestClass: function(sourceId, assocType, destClassId){
			// summary:
			//		Given a source cell, return all the cells, by associations of type assocType and that are a destClass.
			//		Used for navigating the network where we have a source object and we're interested in related objects 
			//		by a particular association type and of class type 'destination class'.
			//		Used for things like one to many relationships and getAttribute of...
			//		Will autoresolve ordered associations (which are comprised of a linked list) 
			// sourceId: Number
			//		The identifier of the parent cell
			// assocType: Number
			//		The association type of the association
			// destClassId: Number
			//		The identifier of the destination class
			// returns: Array 
			//		An array of prommises. Each promise will result an id of a valid object.
			var ORDERED_ASSOC = 8;		//TO MANY
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
			//		Used to navigate the network.
			//		Returns an array of ids of cells that are a class/object via a particular association type. 
			//		Can be used to find all the instances of a particular class, for instance permitted values or,
			//		get the class mapped to by a view or attribute reference 
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
						if(destCell.type==classOrObjectType) {
								resultArr.push(destCell.id);
								//loopProtectionArr[childId] = true;
						}
						if(recursive) return self.getManyByAssocTypeRecursive(destFk, assocType, classOrObjectType, recursive, resultArr, loopProtectionArr);
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
						if(sourceCell.type==classOrObjectType) {
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
		getItemByView: function(_objId, _viewId){
			// summary:
			//		Returns an item that can be consumed by widgets. 
			//		The item will have an id, a classId, a viewId and name vlaue pairs for the attribute references of the view.
			// sourceId: Number
			//		The identifier of the cell
			// viewId: Number
			//		The identifier of the view that will tell us which attributes to retreive
			// returns: Number 
			//		A prommises. The promise will result in an item.
			
			//remove when we're done with the transformation
			var objId = (typeof _objId == 'string' && _objId.indexOf('/')>0)?_objId.split('/')[1]:_objId;
			var viewId = (typeof _viewId == 'string' && _viewId.indexOf('/')>0)?_viewId.split('/')[1]:_viewId;

			var ORDERED_ASSOC = 8;		//TO MANY
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
			// returns: Number 
			//		A prommises. The promise will result an id of a valid object or undefined if it is not found.
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
			//		Zero or One. Are we looking for a class or an object
			// returns: Number 
			//		A prommises. The promise will result an id of a valid object or undefined if it is not found.
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
			var PARENT_ASSOC = 3;
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
			var NEXT_ASSOC = 9;			//TO ONE Only used internaly
			var self = this;
			return when(assocStore.query({sourceFk: sourceId, type: NEXT_ASSOC}), function(assocs){
				if(assocs.length==0) return true;
				if(assocs.length>1) throw new Error('More than one next found');
				assocsArr.push(assocs[0].destFk);
				return self.addNextToAssocsArr(assocs[0].destFk, destClassId, assocsArr);
			});
		},
		// =======================================================================
		// Write interface, for DnD

		newItem: function(/* dijit/tree/dndSource.__Item */ args, /*Item*/ parent, /*int?*/ insertIndex, /*Item*/ before){
			// summary:
			//		Creates a new item.   See `dojo/data/api/Write` for details on args.
			//		Used in drag & drop when item from external source dropped onto tree.

			return this.store.put(args, {
				parent: parent,
				before: before
			});
		},

		pasteItem: function(/*Item*/ childItem, /*Item*/ oldParentItem, /*Item*/ newParentItem,
					/*Boolean*/ bCopy, /*int?*/ insertIndex, /*Item*/ before){
			// summary:
			//		Move or copy an item from one parent item to another.
			//		Used in drag & drop

			if(!bCopy){
				// In order for DnD moves to work correctly, childItem needs to be orphaned from oldParentItem
				// before being adopted by newParentItem.   That way, the TreeNode is moved rather than
				// an additional TreeNode being created, and the old TreeNode subsequently being deleted.
				// The latter loses information such as selection and opened/closed children TreeNodes.
				// Unfortunately simply calling this.store.put() will send notifications in a random order, based
				// on when the TreeNodes in question originally appeared, and not based on the drag-from
				// TreeNode vs. the drop-onto TreeNode.

				var oldParentChildren = [].concat(this.childrenCache[this.getIdentity(oldParentItem)]), // concat to make copy
					index = array.indexOf(oldParentChildren, childItem);
				oldParentChildren.splice(index, 1);
				this.onChildrenChange(oldParentItem, oldParentChildren);
			}

			return this.store.put(childItem, {
				overwrite: true,
				parent: newParentItem,
				before: before
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
		}


	});
});
