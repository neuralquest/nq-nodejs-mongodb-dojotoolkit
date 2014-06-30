define(["dojo/_base/declare", "dojo/store/JsonRest", "dojo/promise/all", "nq/nqSimpleQueryEngine", 'dijit/registry', 'dojo/when', "dojo/store/util/QueryResults",
        "dojo/request", "dojo/store/JsonRest", "dojo/_base/lang"],
	function(declare, JsonRest, all, nqSimpleQueryEngine, registry, when, QueryResults, request, JsonRest, lang){

	return declare("nqJsonRest", [JsonRest], {
		target:"",
		addObjects: {},
		putObjects: {},
		removeObjects: {},
		queryEngine: nqSimpleQueryEngine,

		/*getChildren: function(object, childViewAttributes, options){
			var genQuery ={parentId: object.id, childViewAttributes: childViewAttributes};
			return this.query(genQuery, options);
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
				return results;
			});
		},	*/	
		put: function(object, options){
			registry.byId('cancelButtonId').set('disabled',false);
			registry.byId('saveButtonId').set('disabled',false);
			// skip if it was updated previously or its been added by ourselves 
			if(!(object.id in this.putObjects) && !(object.id in this.addObjects)){
				// add it to the queue of put Objects
				var originalObject =_nqMemoryStore.get(object.id);
				this.putObjects[object.id] = originalObject;
			}
			return object;
	    },
		add: function(object, options){
			registry.byId('cancelButtonId').set('disabled',false);
			registry.byId('saveButtonId').set('disabled',false);
			// add it to the queue of added Objects
			object.id = object.viewId+"/cid:"+Math.floor((Math.random()*1000000)+1);
			this.addObjects[object.id] = "put";
			return object;
	    },
		remove: function(id){
			registry.byId('cancelButtonId').set('disabled',false);
			registry.byId('saveButtonId').set('disabled',false);
			if(id in this.addObjects){
				delete this.addObjects[id];
			}
			else {
				var originalObject =_nqMemoryStore.get(id);
				if(id in this.putObjects){
					originalObject = this.putObjects[id];
					delete this.putObjects[id];
				}
				// add it to the queue of removed Objects
				this.removeObjects[id] = originalObject;
			}
	    },/*
		query: function(query, options){
			if(query.parentId && query.childViewAttributes){				
				var promisses = [];
				when(_nqDataStore.get(query.parentId), function(parent){
					for(var i=0;i<query.childViewAttributes.length;i++){
						var viewAttr = query.childViewAttributes[i];
						var childrenIds = parent[viewAttr];
						if(!childrenIds) continue;
						for(var j=0;j<childrenIds.length;j++){
							var childId = childrenIds[j];
							promisses.push(_nqDataStore.get(childId));
						}
					}
				});
				return QueryResults(all(promisses));
				//return QueryResults(this.queryEngine(query, options)(all(promisses)));
				//when(all(promisses), function(results){
				//	return QueryResults(this.queryEngine(query, options)(results));
				//});
				/*
				Still needs to be tested
				var results = when(_nqDataStore.get(query.parentId), lang.hitch(this, function(parent){
					return this.getChildren(parent, this.query.childViewAttributes);
				}));
				return QueryResults(results);
				* /
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
			else return JsonRest.prototype.query.call(this, query, options);
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
					});* /
				}
			});
		},	*/	
	    transaction: function(){
	    	return {
		    	commit: lang.hitch(this, function(){
					registry.byId('cancelButtonId').set('disabled',true);
					registry.byId('saveButtonId').set('disabled',true);
					/*
					//registry.byId('saveUpdatesDlg').hide()//in case it came from the dialoge
					registry.byClass("dojox.grid.EnhancedGrid").forEach( function(grid) {
						grid.edit.apply();
					});
					registry.byClass("dijit.form.TextBox",'placeholder').forEach(function(tb){
						//only destroy if it is not part of a form
						//tb.destroy();
					});
					registry.byClass("dijit.Editor",'placeholder').forEach(function(editor){
						//editor.close(true);
					});
					*/
					var postOperations = [];
					for(key in this.removeObjects){
						postOperations.push({action: "delete", data: key});
					};
					for(key in this.addObjects){
						var newObject =_nqMemoryStore.get(key);
						postOperations.push({action: "put", data: newObject});
					};
					for(key in this.putObjects){
						var updatedObject =_nqMemoryStore.get(key);
						postOperations.push({action: "post", data: updatedObject});
					};
					// commit the transaction, sending all the operations in a single request
					request.post(this.target, {
						// send all the operations in the body
						headers: {'Content-Type': 'application/json; charset=UTF-8'},
//						handleAs: "json",
						data: dojo.toJson(postOperations)//JSON.stringify(postOperations)
					}).then( 
						function(data){
							console.log(data);//TODO: Replace IDs
							this.removeObjects = {};
							this.addObjects = {};
							this.putObjects = {};
							dojo.fadeIn({ node:"savedDlg", duration: 300, onEnd: function(){dojo.fadeOut({ node:"savedDlg", duration: 300, delay:300 }).play();}}).play();
			    		},
			    		function(error){
			    			var message = error.response.data;
			    			if(!message) message = error.message;
			    	    	new dijit.Dialog({title: "Rollback", extractContent: true, content: message}).show();
							this.removeObjects = {};
							this.addObjects = {};
							this.putObjects = {};
					    	//TODO evict from the cache then refresh the page data
					    	//window.location.reload(true);
			    		}
			    	);		    	
				}),
			    abort: function(){
			    	window.location.reload(true);
			    	//window.location.href = window.location.href;
			    	/*
			    	TODO evict from the cache then refresh the page data
					this.removeObjects = {};
					this.addObjects = {};
					this.putObjects = {};
					*/
		    	}
	    	};
	    }
	});
});

