define(["dojo/_base/lang","dojo/when", "dojo/promise/all", "dojo/store/util/QueryResults", 'dojo/promise/instrumentation' /*=====, "../_base/declare", "./api/Store" =====*/],
function(lang, when, all, QueryResults, instrumentation /*=====, declare, Store =====*/){

// module:
//		dojo/store/Cache

var nqCache = function(masterStore, cachingStore, options){
	options = options || {};
	return lang.delegate(masterStore, {
		/*query: function(query, directives){
			var results = masterStore.query(query, directives);
			results.forEach(function(object){
				if(!options.isLoaded || options.isLoaded(object)){
					cachingStore.put(object);
				}
			});
			return results;
		},*/
		// look for a queryEngine in either store
		queryEngine: masterStore.queryEngine || cachingStore.queryEngine,
		get: function(id, directives){
			return when(cachingStore.get(id), function(result){
				return result || when(masterStore.get(id, directives), function(result){
					if(result){
						cachingStore.put(result, {id: id});
					}
					return result;
				});
			}, nq.errorDialog);
		},
		add: function(object, directives){
			return when(masterStore.add(object, directives), function(result){
				// now put result in cache
				cachingStore.add(object && typeof result == "object" ? result : object, directives);
				return result; // the result from the add should be dictated by the masterStore and be unaffected by the cachingStore
			});
		},
		put: function(object, directives){
			// first remove from the cache, so it is empty until we get a response from the master store
			cachingStore.remove((directives && directives.id) || this.getIdentity(object));
			return when(masterStore.put(object, directives), function(result){
				// now put result in cache
				cachingStore.put(object && typeof result == "object" ? result : object, directives);
				return result; // the result from the put should be dictated by the masterStore and be unaffected by the cachingStore
			});
		},
		remove: function(id, directives){
			return when(masterStore.remove(id, directives), function(result){
				return cachingStore.remove(id, directives);
			});
		},
		evict: function(id){
			return cachingStore.remove(id);
		},
		//Our extention
		query: function(query, directives){
			if(query.parentId && query.childViewAttributes){
				var results = when(_nqDataStore.get(query.parentId), lang.hitch(this, function(parent){
					return this.getChildren(parent, this.query.childViewAttributes);
				}));
				return QueryResults(results);
			}
			else if(query.parentId && query.joinViewAttributes){
				var self = this;
				var resultUntilNow = {};
				var resultsArr = [];
				var promise = when(_nqDataStore.get(query.parentId), function(parent){
					return when(self.join(parent, query.joinViewAttributes, 0, resultUntilNow, resultsArr), function(res){
						return resultsArr;
					});

				});
				return QueryResults(promise);
			}
//			else return JsonRest.prototype.query.call(this, query, options);			
			else{
				var results = masterStore.query(query, directives);
				results.forEach(function(object){
					if(!options.isLoaded || options.isLoaded(object)){
						cachingStore.put(object);
					}
				});
				return results;
			}
		},
		join: function(parent, joinViewAttributes, idx, resultUntilNow, resultsArr){
			var self = this;
			return when(self.getChildren(parent, [joinViewAttributes[idx]]), function(children){
				//console.log(idx, children);
				if(idx == joinViewAttributes.length - 1) {
					for(var i=0;i<children.length;i++){
						var child = children[i];
						var newObject = lang.mixin(lang.clone(resultUntilNow), child);
						resultsArr.push(newObject);
					}
					//console.log(idx, results);
					return children;
				}
				else {
					var promisses = [];
					for(var i=0;i<children.length;i++){
						var child = children[i];
						var newObject = lang.mixin(lang.clone(resultUntilNow), child);
						promisses.push(self.join(child, joinViewAttributes, idx+1, newObject, resultsArr));
					}
					return all(promisses);
					/*
					return when(all(promisses), function(results){
						var newArr = [];
						for(var i=0;i<results.length;i++){
							var result = results[i];
							for(var i=0;i<result.length;i++){
								var child = result[i];
								var newObject = lang.mixin(lang.clone(result), child);
								newArr.push(newObject);
							}
						}
						return newArr;
					});*/
				}
			}, nq.errorDialog);
		},		
		getChildren: function(object, childViewAttributes){
			var self = this;
			var promisses = [];
			for(var i=0;i<childViewAttributes.length;i++){
				var childAttr = childViewAttributes[i];
				var childrenIds = object[childAttr];
				if(!childrenIds) continue;
				for(var j=0;j<childrenIds.length;j++){
					var childId = childrenIds[j];
					promisses.push(this.get(childId));
				}
			}
			//return all(promisses);
			return when(all(promisses), function(results){
				results.sort(function(a, b){
					//Presort by view name
					var titleA = _nqSchemaMemoryStore.get(a.viewId).title;
					var titleB = _nqSchemaMemoryStore.get(b.viewId).title;
					if(titleA > titleB) return 1;
					if(titleA < titleB) return -1;
					//the views are the same
					var viewDef = _nqSchemaMemoryStore.get(a.viewId);
					if(viewDef.relationship == 'ordered') return 0;//we're dealing with an ordered view so leave the order alone
					//Sort by label
					var aLabel = a[viewDef.label].toLowerCase();
					var bLabel = b[viewDef.label].toLowerCase();
					if(aLabel > bLabel) return 1;
					if(aLabel < bLabel) return -1;
					return 0;
				});
				console.log('getChildren',results);
				return results;
			}, nq.errorDialog);
		},
		getManyByParentWidgetOrView: function(source, parentWidgetOrView){
			var CLASS_MODEL_VIEW_ID = 844;
			var MANYTOMANY_ASSOC = 10;	//TO MANY
			var VIEW_ID = CLASS_MODEL_VIEW_ID+'/'+74;
			var self = this;
			return when(this.getManyByAssocTypeAndDestClass(parentWidgetOrView, MANYTOMANY_ASSOC, VIEW_ID), function(subViewsArr){
				var promisses = [];
				for(var j=0;j<subViewsArr.length;j++){
					var viewObj = subViewsArr[j];
					promisses.push(getManyByView(source, viewObj));
				}
				return when(all(promisses), function(ArrayOfArrays){
					var resultArr = [];
					for(var i=0;i<ArrayOfArrays.length;i++){
						var objArr = ArrayOfArrays[i];
						for(var j=0;j<objArr.length;j++){
							resultArr.push(objArr[j]);
						}
					}
					return resultArr;
				});
			});
		},
		getManyByView: function(source, view){
			var MAPSTO_ASSOC = 5;			//TO ONE
			var ATTRIBUTE_ASSOC = 4;		//TO ONE
			var CLASS_TYPE = 0;
			var ASSOCS_CLASS_TYPE = 87;//94;
			var self = this;
			return when(this.resolveObjectOrId(view), function(viewObj){
				var attrPromises = [];
				attrPromises.push(self.getOneByAssocType(viewObj, MAPSTO_ASSOC, CLASS_TYPE));
				attrPromises.push(self.getOneByAssocTypeAndDestClass(viewObj, ATTRIBUTE_ASSOC, ASSOCS_CLASS_TYPE));
				return when(all(attrPromises), function(attrArr){
					var destClass = attrArr[0];
					var assocType = attrArr[1].id.split('/')[1];
					return self.getManyByAssocTypeAndDestClass(source, assocType, destClass);
				});
			});
		},
		//used for navigating the object model where the source is an object and we're interested in a paricular type of object 
		getManyByAssocTypeAndDestClass: function(source, assocType, destClass){
			var ASSOCS_ATTR_ID = 1613;
			var self = this;
			var destClassId = lang.isObject(destClass)?destClass.id:destClass;
			return when(this.resolveObjectOrId(source), function(object){
				var childrenIds = object[ASSOCS_ATTR_ID][assocType];
				if(!childrenIds) return [];
				var promisses = [];
				var resultArr = [];
				for(var j=0;j<childrenIds.length;j++){
					var childId = childrenIds[j];
					promisses.push(when(self.get(childId), function(destObj){
						return when(self.isA(destObj, destClassId), function(trueFalse){
							if(trueFalse) resultArr.push(destObj);
							return trueFalse;
						});
					}));
				}
				return when(all(promisses), function(results){
					return resultArr;
				});
			});
		},
		//used for navigating the classmodel where the source is a class and we're looking for either classes or objects
		getManyByAssocType: function(source, assocType, classOrObjectType, recursive){
			var self = this;
			var _classOrObjectType = classOrObjectType==null?1:classOrObjectType;//default object type
			var _recursive = recursive==null?false:recursive;//default non recursive
			var resultArr = [];
			return when(this.resolveObjectOrId(source), function(sourceObj){
				return when(self.getManyByAssocTypeRecursive(sourceObj, assocType, _classOrObjectType, _recursive, resultArr), function(arrayOfArrays){
					return resultArr;
				});
			});
		},
		getManyByAssocTypeRecursive: function(sourceObj, assocType, classOrObjectType, recursive, resultArr){
			var ASSOCS_ATTR_ID = 1613;
			var self = this;
			var childrenIds = sourceObj[ASSOCS_ATTR_ID][assocType];
			if(!childrenIds) return [];
			var promisses = [];
			for(var j=0;j<childrenIds.length;j++){
				var childId = childrenIds[j];
				promisses.push(when(this.get(childId), function(childObject){
					if(childObject.classId==classOrObjectType) resultArr.push(childObject);
					if(recursive) return self.getManyByAssocTypeRecursive(childObject, assocType, classOrObjectType, recursive, resultArr);
					else return childObject;
				}));
			}
			return all(promisses);
		},
		getOneByAssocTypeAndDestClass: function(source, assocType, destClass){
			return when(this.getManyByAssocTypeAndDestClass(source, assocType, destClass), function(objects){
				//return 'ccc';
				return objects[0];
			});
		},
		getOneByAssocType: function(source, assocType, classOrObjectType){
			return when(this.getManyByAssocType(source, assocType, classOrObjectType, false, false), function(objects){
				return objects[0];
			});
		},
		resolveObjectOrId: function(objectOrId){
			var CLASS_MODEL_VIEW_ID = 844;
			if(lang.isObject(objectOrId)) return objectOrId;
			return when(this.get(CLASS_MODEL_VIEW_ID+'/'+objectOrId));
		},
		isA: function(object, destClassId){
			var ASSOCS_ATTR_ID = 1613;
			var PARENT_ASSOC = 3;
			if(object.id.split('/')[1] == destClassId) return true;
			if(!object[ASSOCS_ATTR_ID]) return false;
			if(!object[ASSOCS_ATTR_ID][PARENT_ASSOC]) return false;
			if(object[ASSOCS_ATTR_ID][PARENT_ASSOC].length<1) return false;
			var parentId = object[ASSOCS_ATTR_ID][PARENT_ASSOC][0];
			var self = this;
			return when(this.get(parentId), function(parent){
				return self.isA(parent, destClassId);
			});
		},
		
		
	});
	// Primitive Assoc types (used by the Assoc table)
	var PARENT_ASSOC = 3;			//TO ONE
	var ATTRIBUTE_ASSOC = 4;		//TO ONE
	var MAPSTO_ASSOC = 5;			//TO ONE
	var DEFAULT_ASSOC = 6;		//TO ONE
	var ONETOONE_ASSOC = 7;		//TO ONE
	var ORDERED_ASSOC = 8;		//TO MANY
	var NEXT_ASSOC = 9;			//TO ONE Only used internaly
	var MANYTOMANY_ASSOC = 10;	//TO MANY
	var ONETOMANY_ASSOC = 11;		//TO MANY
	var OWNS_ASSOC = 12;			//TO MANY
	// Pseudo Assoc tppes (reverse of the real assocs)
	var SUBCLASSES_PASSOC = 15;		//TO MANY
	var ATTRIBUTE_OF_PASSOC = 16;	//TO MANY
	var MAPPED_TO_BY_PASSOC = 17;	//TO MANY
	var DEFAULT_OF_PASSOC = 18;	//TO MANY
	var ONETOONE_REVERSE_PASSOC = 19;	//TO ONE
	var ORDERED_PARENT_PASSOC = 20;//TO ONE
	//var PREVIOUS_PASSOC = 21;	//TO ONE Not implemented
	var MANYTOMANY_REVERSE_PASSOC = 22;	//TO MANY
	var MANYTOONE_PASSOC = 23;	//TO ONE
	var OWNED_BY_PASSOC = 24;		//TO ONE
	//Special
	var INSTANTIATIONS_PASSOC = 27;	//TO MANY
	var THE_USER_PASSOC = 28;					//TO MANY
	var ASSOCS_PASSOC = 31; 			//TO MANY		
};
lang.setObject("dojo.store.Cache", nqCache);

/*=====
var __CacheArgs = {
	// summary:
	//		These are additional options for how caching is handled.
	// isLoaded: Function?
	//		This is a function that will be called for each item in a query response to determine
	//		if it is cacheable. If isLoaded returns true, the item will be cached, otherwise it
	//		will not be cached. If isLoaded is not provided, all items will be cached.
};

Cache = declare(Store, {
	// summary:
	//		The Cache store wrapper takes a master store and a caching store,
	//		caches data from the master into the caching store for faster
	//		lookup. Normally one would use a memory store for the caching
	//		store and a server store like JsonRest for the master store.
	// example:
	//	|	var master = new Memory(data);
	//	|	var cacher = new Memory();
	//	|	var store = new Cache(master, cacher);
	//
	constructor: function(masterStore, cachingStore, options){
		// masterStore:
		//		This is the authoritative store, all uncached requests or non-safe requests will
		//		be made against this store.
		// cachingStore:
		//		This is the caching store that will be used to store responses for quick access.
		//		Typically this should be a local store.
		// options: __CacheArgs?
		//		These are additional options for how caching is handled.
	},
	query: function(query, directives){
		// summary:
		//		Query the underlying master store and cache any results.
		// query: Object|String
		//		The object or string containing query information. Dependent on the query engine used.
		// directives: dojo/store/api/Store.QueryOptions?
		//		An optional keyword arguments object with additional parameters describing the query.
		// returns: dojo/store/api/Store.QueryResults
		//		A QueryResults object that can be used to iterate over.
	},
	get: function(id, directives){
		// summary:
		//		Get the object with the specific id.
		// id: Number
		//		The identifier for the object in question.
		// directives: Object?
		//		Any additional parameters needed to describe how the get should be performed.
		// returns: dojo/store/api/Store.QueryResults
		//		A QueryResults object.
	},
	add: function(object, directives){
		// summary:
		//		Add the given object to the store.
		// object: Object
		//		The object to add to the store.
		// directives: dojo/store/api/Store.AddOptions?
		//		Any additional parameters needed to describe how the add should be performed.
		// returns: Number
		//		The new id for the object.
	},
	put: function(object, directives){
		// summary:
		//		Put the object into the store (similar to an HTTP PUT).
		// object: Object
		//		The object to put to the store.
		// directives: dojo/store/api/Store.PutDirectives?
		//		Any additional parameters needed to describe how the put should be performed.
		// returns: Number
		//		The new id for the object.
	},
	remove: function(id){
		// summary:
		//		Remove the object with the specific id.
		// id: Number
		//		The identifier for the object in question.
	},
	evict: function(id){
		// summary:
		//		Remove the object with the given id from the underlying caching store.
		// id: Number
		//		The identifier for the object in question.
	}
});
=====*/

return nqCache;
});
