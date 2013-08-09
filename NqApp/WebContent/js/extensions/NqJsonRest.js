define(["dojo/_base/declare", "dojo/store/JsonRest", "dojo/promise/all", "nq/NqSimpleQueryEngine", 'dijit/registry', 'dojo/when', "dojo/store/util/QueryResults",],
	function(declare, JsonRest, all, NqSimpleQueryEngine, registry, when, QueryResults){

	var dirtyObjects = {};
	
	var NqJsonRest = declare(JsonRest, {
		target:"data/",
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
			// add it to the queue of _dirtyObjects
			if(!(object.id in _dirtyObjects)){
				//var originalObject =_nqMemoryStore.get(object.id);
				_dirtyObjects[object.id] = "post";
			}

			//return JsonRest.prototype.put.call(this, object, options); //this will xhr to the server
			//return JsonRest.prototype.put.apply(this, arguments);
			return object;
	    },
		add: function(object, options){
			registry.byId('cancelButtonId').set('disabled',false);
			registry.byId('saveButtonId').set('disabled',false);
			// add it to the queue of _dirtyObjects
			object.id = object.viewId+"/cid:"+Math.floor((Math.random()*1000000)+1);
			_dirtyObjects[object.id] = "put";
			return object;
	    },
		remove: function(id){
			registry.byId('cancelButtonId').set('disabled',false);
			registry.byId('saveButtonId').set('disabled',false);
			// add it to the queue of _dirtyObjects
			if(_dirtyObjects[id]) {
				if(id.indexOf('cid') > -1) _dirtyObjects.splice(id,1);//if its a temp id then remove from _dirtyObjects
				else _dirtyObjects[id] = {action:"delete", originalObject:{}};// delete, but use the original object from put
			}
			else {
				var originalObject =_nqMemoryStore.get(object.id);
				_dirtyObjects[object.id] = {action:"delete", originalObject:{}};
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
		}

	});
	return NqJsonRest;
});

