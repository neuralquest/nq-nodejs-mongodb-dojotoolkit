define([
	"dojo/_base/array", // array.filter array.forEach array.indexOf array.some
	"dojo/aspect", // aspect.before, aspect.after
	"dojo/_base/declare", // declare
	"dojo/Deferred",
	"dojo/_base/lang", // lang.hitch
	"dojo/when",
    "dojo/promise/all",
	"dijit/Destroyable"
], function(array, aspect, declare, Deferred, lang, when, all, Destroyable){

	// module:
	//		dijit/tree/ObjectStoreModel

	return declare("nqObjectStoreModel", Destroyable, {
		// summary:
		//		Implements dijit/tree/model connecting dijit/Tree to a dojo/store/api/Store that implements
		//		getChildren().
		//
		//		If getChildren() returns an array with an observe() method, then it will be leveraged to reflect
		//		store updates to the tree.   So, this class will work best when:
		//
		//			1. the store implements dojo/store/Observable
		//			2. getChildren() is implemented as a query to the server (i.e. it calls store.query())
		//
		//		Drag and Drop: To support drag and drop, besides implementing getChildren()
		//		and dojo/store/Observable, the store must support the parent option to put().
		//		And in order to have child elements ordered according to how the user dropped them,
		//		put() must support the before option.

		// store: dojo/store/api/Store
		//		Underlying store
		store: null,

		// labelAttr: String
		//		Get label for tree node from this attribute
		labelAttr: "name",

		// labelType: [const] String
		//		Specifies how to interpret the labelAttr in the data store items.
		//		Can be "html" or "text".
		labelType: "text",

		// root: [readonly] Object
		//		Pointer to the root item from the dojo/store/api/Store (read only, not a parameter)
		root: null,

		// query: anything
		//		Specifies datastore query to return the root item for the tree.
		//		Must only return a single item.   Alternately can just pass in pointer
		//		to root item.
		// example:
		//	|	{id:'ROOT'}
		query: null,

		constructor: function(/* Object */ args){
			// summary:
			//		Passed the arguments listed above (store, etc)
			// tags:
			//		private

			lang.mixin(this, args);

			// Map from id of each parent node to array of its children, or to Promise for that array of children.
			this.childrenCache = {};
		},

		// =======================================================================
		// Methods for traversing hierarchy

		getRoot: function(onItem, onError){
            var self = this;
            var collection = null;
            var query = self.schema.rootQuery;
            if(query) {
                var parentItem = this.store.cachingStore.getSync(this.docId);
                if(query.where) {
                    var where = query.where;
                    var qualifier = Object.keys(where)[0];
                    var key = Object.keys(where[qualifier])[0];
                    var value = where[qualifier][key];
                    if(value == '$docId') {
                        query = lang.clone(query);
                        query.where[qualifier][key] = self.docId;
                    }
                }
                var childrenFilter = self.store.buildFilterFromQueryNew(query, parentItem);
                collection = self.store.filter(childrenFilter);
            }
            else collection = this.store.filter(this.query);
			/*collection.on('remove, add', function(event){
				var parent = event.target;
				var collection = self.childrenCache[parent.id];
				if(collection){
					var children = collection.fetch();
					self.onChildrenChange(parent, children);
				}
			});*/
			collection.on('update', function(event){
                //TODO the tree cookie screws hasChildren so we dont get auto expand
				var obj = event.target;
				self.onChange(obj);
			});
			collection.fetch().then(function(children){
                var newChild = lang.clone(children[0]);
                newChild.$query = query;
                onItem(newChild);//we expect only one
            });
		},
		mayHaveChildren: function(item){
			return item.hasChildren;
		},
        getChildren: function(/*Object*/ parentItem, /*function(items)*/ onComplete, /*function*/ onError) {
			var self = this;
			if(self.schema.query){
				var query;
				if('$query' in parentItem){
					var prevQuery = parentItem.$query;
					if('recursive' in prevQuery){
						if(prevQuery.recursive == 'schema') query = self.schema.query;
						else if(prevQuery.recursive == 'same') query = prevQuery;
					}
					else if('join' in prevQuery) query = prevQuery.join;
				}
				else query = self.schema.query;
				if(!query) {
					var childrenArr = [];
					onComplete(childrenArr);
					return;
				}

				var childrenPromises = [];

				if(Array.isArray(query)){
					query.forEach(function (subQuery) {
						childrenPromises.push(self.getChildrenArrayNew(parentItem, subQuery));
					});
				}
				else childrenPromises.push(self.getChildrenArrayNew(parentItem, query));

				all(childrenPromises).then(function(childrenArrs){
					var resultingChildren = [];
					childrenArrs.forEach(function(childrenArr){
						resultingChildren = resultingChildren.concat(childrenArr);
					});
					onComplete(resultingChildren);
				});

			}
			else {
				var childrenPromises = [];
				var viewId = parentItem.viewId;
				if (viewId) {
					this.store.get(viewId).then(function (viewObj) {
						if (viewObj.childrenQuery) {
							childrenPromises.push(self.getChildrenArray(parentItem, viewObj.childrenQuery, viewObj));
						}
						if (viewObj.childrenView) {
							var subView = self.store.cachingStore.getSync(viewObj.childrenView);
							if (subView) {
								childrenPromises.push(self.getChildrenArray(parentItem, subView.query, subView));
							}
						}
						if (viewObj.subDocView) {
							childrenPromises.push(parentItem[viewObj.subDocView]);
						}
					});
				}
				all(childrenPromises).then(function (childrenArrs) {
					var resultingChildren = [];
					childrenArrs.forEach(function (childrenArr) {
						resultingChildren = resultingChildren.concat(childrenArr);
					});
					onComplete(resultingChildren);
				});
			}
        },
        getChildrenArray: function(parentItem, query, viewObj) {
            var self = this;
			var childrenFilter = self.store.buildFilterFromQuery(query, parentItem, viewObj.isA);

            if(childrenFilter) {
                var childrenCollection = self.store.filter(childrenFilter);
                return childrenCollection.fetch().then(function (childObjects) {
                    var hasChildrenPromises = [];
                    childObjects.forEach(function (childObj) {
                        childObj.viewId = viewObj._id;
                        //hasChildrenPromises.push(true);
                        //See if there are any grandchildren
                        hasChildrenPromises.push(self.hasGrandChildren(childObj, viewObj));
                    });
                    return all(hasChildrenPromises).then(function(hasChildrenPromisesArr){
                        var counter = 0;
                        hasChildrenPromisesArr.forEach(function(hasChildrenPromise){
                            childObjects[counter].hasChildren = hasChildrenPromise;
                            counter ++;
                        });
                        return childObjects;
                    });
                });
            }
            else return [];
        },
		getChildrenArrayNew: function(parentItem, query) {
			var self = this;
			if('subDoc' in query) {
				var childObjects = parentItem[query.subDoc];
				if(!childObjects) return [];
				var newChildObjs = [];
				var num = 0;
				childObjects.forEach(function (childObj) {
					var newChildObj = lang.clone(childObj);
					newChildObj.$query = query;
					newChildObj.hasChildren = true;
					newChildObj.name = childObj.name?childObj.name:query.subDoc+' '+num;
					//See if there are any grandchildren
					//hasChildrenPromises.push(self.hasGrandChildren(childObj, viewObj));
					newChildObjs.push(newChildObj);
					num ++;
				});
				return newChildObjs;
			}
			else if('where' in query) {
				var childrenFilter = self.store.buildFilterFromQueryNew(query, parentItem);
				var childrenCollection = self.store.filter(childrenFilter);
				return childrenCollection.fetch().then(function (childObjects) {
					var hasChildrenPromises = [];
					childObjects.forEach(function (childObj) {
						//See if there are any grandchildren
						//hasChildrenPromises.push(self.hasGrandChildren(childObj, viewObj));
						hasChildrenPromises.push(true);
					});
					return all(hasChildrenPromises).then(function(hasChildrenPromisesArr){
						var counter = 0;
						var newChildObjs = [];
						hasChildrenPromisesArr.forEach(function(hasChildrenPromise){
							var newChildObj = lang.clone(childObjects[counter]);
                            newChildObj.$query = query;
							newChildObj.hasChildren = hasChildrenPromise;
							newChildObjs.push(newChildObj);
							counter ++;
						});
						return newChildObjs;
					});
				});
			}
			else return [];
		},
        hasGrandChildren: function(parentItem, viewObj) {
            //return true;
            var self = this;
            var grandChildrenPromises = [];
            if(viewObj.childrenQuery) {
				var grandChildrenFilter = self.store.buildFilterFromQuery(viewObj.childrenQuery, parentItem, viewObj.isA);

				//var grandChildrenFilter = self.store.buildFilterFromQuery(parentItem, viewObj.childrenQuery);
                if(grandChildrenFilter) {
                    var grandChildrenCollection = self.store.filter(grandChildrenFilter);
                    grandChildrenPromises.push(grandChildrenCollection.fetch())
                }
            }
            if(viewObj.childrenView) {
                var subView = self.store.cachingStore.getSync(viewObj.childrenView);
                if(subView){
					var grandChildrenFilter = self.store.buildFilterFromQuery(subView.query, parentItem, subView.isA);

					//var grandChildrenFilter = self.store.buildFilterFromQuery(parentItem, subView.query);
                    if(grandChildrenFilter) {
                        var grandChildrenCollection = self.store.filter(grandChildrenFilter);
                        grandChildrenPromises.push(grandChildrenCollection.fetch())
                    }
                }
            }
            return all(grandChildrenPromises).then(function(grandChildrenArrs){
                var grandChildren = false;
                grandChildrenArrs.forEach(function(grandChildrenArr){
                    if(grandChildrenArr.length > 0) grandChildren = true;
                });
                return grandChildren;
            });
        },
		// =======================================================================
		// Inspecting items

		isItem: function(/*===== something =====*/){
			return true;	// Boolean
		},

		getIdentity: function(/* item */ item){
			return this.store.getIdentity(item);	// Object
		},

		getLabel: function(/*dojo/data/Item*/ item){
			// summary:
			//		Get the label for an item
			return item[this.labelAttr];	// String
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
			//		Used in drag & drop.


			var d = new Deferred();

			if(oldParentItem === newParentItem && !bCopy && !before){
				// Avoid problem when items visually disappear when dropped onto their parent.
				// Happens because the (no-op) store.put() call doesn't generate any notification
				// that the childItem was added/moved.
				d.resolve(true);
				return d;
			}

			if(oldParentItem && !bCopy){
				// In order for DnD moves to work correctly, childItem needs to be orphaned from oldParentItem
				// before being adopted by newParentItem.   That way, the TreeNode is moved rather than
				// an additional TreeNode being created, and the old TreeNode subsequently being deleted.
				// The latter loses information such as selection and opened/closed children TreeNodes.
				// Unfortunately simply calling this.store.put() will send notifications in a random order, based
				// on when the TreeNodes in question originally appeared, and not based on the drag-from
				// TreeNode vs. the drop-onto TreeNode.

				this.getChildren(oldParentItem, lang.hitch(this, function(oldParentChildren){
					oldParentChildren = [].concat(oldParentChildren); // concat to make copy
					var index = array.indexOf(oldParentChildren, childItem);
					oldParentChildren.splice(index, 1);
					this.onChildrenChange(oldParentItem, oldParentChildren);

					d.resolve(this.store.processDirectives(childItem, {
						overwrite: true,
						parent: newParentItem,
						oldParent: oldParentItem,
						before: before
					}));
				}));
			}else{
				d.resolve(this.store.processDirectives(childItem, {
					overwrite: true,
					parent: newParentItem,
					oldParent: oldParentItem,
					before: before
				}));
			}

			return d;
		},

		// =======================================================================
		// Callbacks

		onChange: function(/*dojo/data/Item*/ /*===== item =====*/){
			// summary:
			//		Callback whenever an item has changed, so that Tree
			//		can update the label, icon, etc.   Note that changes
			//		to an item's children or parent(s) will trigger an
			//		onChildrenChange() so you can ignore those changes here.
			// tags:
			//		callback
		},

		onChildrenChange: function(/*===== parent, newChildrenList =====*/){
			// summary:
			//		Callback to do notifications about new, updated, or deleted items.
			// parent: dojo/data/Item
			// newChildrenList: Object[]
			//		Items from the store
			// tags:
			//		callback
		},

		onDelete: function(/*dojo/data/Item*/ /*===== item =====*/){
			// summary:
			//		Callback when an item has been deleted.
			//		Actually we have no way of knowing this with the new dojo.store API,
			//		so this method is never called (but it's left here since Tree connects
			//		to it).
			// tags:
			//		callback
		}
	});
});
