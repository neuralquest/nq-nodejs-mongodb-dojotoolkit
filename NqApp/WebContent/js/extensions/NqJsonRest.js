define(["dojo/_base/declare", "dojo/store/JsonRest", "dojo/promise/all", "nq/NqSimpleQueryEngine", 'dijit/registry', 'dojo/when', "dojo/store/util/QueryResults",
        "dojo/request", "dojo/store/JsonRest", "dojo/json"],
	function(declare, JsonRest, all, NqSimpleQueryEngine, registry, when, QueryResults, request, JsonRest, JSON){

	return declare(JsonRest, {
		target: "data/",
		addObjects: {},
		putObjects: {},
		removeObjects: {},
		//queryEngine: NqSimpleQueryEngine,
		//See http://dojotoolkit.org/documentation/tutorials/1.6/data_modeling/
		// Since dojo.store.Memory doesn't have various store methods we need, we have to add them manually
		/*
		getChildren: function(object, childrenAttr){
			var childrenQuery = {parentId: object.id, childrenAttr: childrenAttr};
			return this.query(childrenQuery);
		},
		*/
		getChildren: function(object, childrenAttr){
			var promisses = [];
			for(var i=0;i<childrenAttr.length;i++){
				var childAttr = childrenAttr[i];
				var childrenIds = object[childAttr];
				if(!childrenIds) continue;
				for(var j=0;j<childrenIds.length;j++){
					var childId = childrenIds[j];
					promisses.push(this.get(childId));
				}
			}
			return all(promisses);
		},		
		put: function(object, options){
			registry.byId('cancelButtonId').set('disabled',false);
			registry.byId('saveButtonId').set('disabled',false);
			// add it to the queue of put Objects
			// skip if it was updated previously or its been added by ourselves 
			if(!(object.id in this.putObjects) && !(object.id in this.addObjects)){
				var originalObject =_nqMemoryStore.get(object.id);
				this.putObjects[object.id] = originalObject;
			}

			//return JsonRest.prototype.put.call(this, object, options); //this will xhr to the server
			//return JsonRest.prototype.put.apply(this, arguments);
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
			if(object.id in this.addObjects){
				this.addObjects.splice(id,1);
			}
			else {
				var originalObject =_nqMemoryStore.get(object.id);
				if(object.id in this.putObjects){
					originalObject = this.putObjects[object.id];
					this.putObjects.splice(id,1);
				}
				// add it to the queue of removed Objects
				this.removeObjects[object.id] = originalObject;
			}
	    },
		query: function(query, options){
			if(query.parentId && query.childrenAttr){				
				var promisses = [];
				when(_nqDataStore.get(query.parentId), function(parent){
					for(var i=0;i<query.childrenAttr.length;i++){
						var viewAttr = query.childrenAttr[i];
						var childrenIds = parent[viewAttr];
						if(!childrenIds) continue;
						for(var j=0;j<childrenIds.length;j++){
							var childId = childrenIds[j];
							promisses.push(_nqDataStore.get(childId));
						}
					}
				});
				return QueryResults(all(promisses));
			}
			else return JsonRest.prototype.query.call(this, query, options);
		},
	    save: function(){
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
			request(this.target, {
				// send all the operations in the body
				data: JSON.stringify(postOperations),
				handleAs: "json",
				headers: {"Content-Type": "application/json"}
			}).then( 
				function(data){
					dojo.fadeIn({ node:"savedDlg", duration: 300,
						onEnd:function(){
							dojo.fadeOut({ node:"savedDlg", duration: 300, delay:300 }).play();	
						}
					}).play();
					this.removeObjects = {};
					this.addObjects = {};
					this.putObjects = {};
	    		},
	    		function(error){
	    	    	new dijit.Dialog({title: "Rollback",content: error.message,style: "width: 500px"}).show();
	    	    	//rollBackClient(); //TODO
					this.removeObjects = {};
					this.addObjects = {};
					this.putObjects = {};
	    		} 
	    	);
		
	    },
	    cancel: function(){
			registry.byId('cancelButtonId').set('disabled',true);
			registry.byId('saveButtonId').set('disabled',true);

			//registry.byId('saveUpdatesDlg').hide()//in case it came from the dialoge
			registry.byClass("dojox.grid.EnhancedGrid").forEach( function(grid) {
				grid.edit.cancel();
			});
			registry.byClass("dijit.form.TextBox",'placeholder').forEach(function(textBox){
				textBox.undo(); 
			});
			registry.byClass("dijit.Editor",'placeholder').forEach(function(editor){
				//editor.close(false);
			});
	    	//rollBackClient(); //TODO
			this.removeObjects = {};
			this.addObjects = {};
			this.putObjects = {};
	    }

	});
});

