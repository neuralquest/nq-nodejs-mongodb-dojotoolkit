define([
	"dojo/_base/lang", "dojo/_base/declare", "dojo/Deferred", "dojo/_base/array","dojo/request",
	"./util/QueryResults", "dojox/mvc/StatefulArray", 'dijit/registry'
], function(lang, declare, Deferred, array, request, QueryResults, StatefulArray, registry){

	return declare("nqStore", null, {
		objectStore: new StatefulArray([]),
		
		constructor: function(options){
			this.objectStore.watchElements(function(index, removals, adds){				
		        alert("Adds: " + adds + "Removed: " + removals + " At: " + index);
		    });
			this.objectStore.watch(function(name, oldValue, value){				
		        alert("name: " + name + "oldValue: " + oldValue + " value: " + value);
				registry.byId('cancelButtonId').set('disabled',false);
				registry.byId('saveButtonId').set('disabled',false);
		    });
		},
		get: function(id, options){
			var deferred = new Deferred();
			var obj = objectStore[i];
			if(obj) deferred.resolve(obj.object);
			else{
				request.get('data', {
					//headers: {'Content-Type': 'application/json; charset=UTF-8'},
					handleAs: "json",
					data: dojo.toJson(postOperations)//JSON.stringify(postOperations)
				}).then( 
					function(object){
						objectStore.set(object.id, {state:'', object:object});
						deferred.resolve(object);
		    		},
		    		function(error){
						deferred.reject(error);
						throw error;
		    		}
		    	);				
			}
			return deferred.promise;
		},
		put: function(object, options){
			objectStore.set(object.id, {state:'put', object:object});
			return object;
	    },
		add: function(object, options){
			objectStore.set(object.id, {state:'put', object:object});
			return object;
	    },
		save: function(){
			var updates = [];
			request.post('data', {
				// send all the operations in the body
				headers: {'Content-Type': 'application/json; charset=UTF-8'},
				data: updates
			}).then( 
				function(data){
					dojo.fadeIn({ node:"savedDlg", duration: 300, onEnd: function(){dojo.fadeOut({ node:"savedDlg", duration: 300, delay:300 }).play();}}).play();
					//TODO: Replace IDs, clear states, stop refresh?
					console.log(data);
	    		},
	    		function(error){
	    			nq.errorDialog(error);
	    			//TODO evict, refresh page data
	    		}
	    	);		    	
	    },
	    cancel: function(){
			//TODO evict, refresh page data
	    	window.location.reload(true);
	    },
		getChildren: function(object, childViewAttributes){
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
				return results;
			});
		},		
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
			});
		}
	});
});

