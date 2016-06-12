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
			// summary:
			//
			var collection = this.store.filter(this.query);
			collection.on('remove, add', function(event){
				var parent = event.parent;
				var collection = self.childrenCache[parent.id];
				if(collection){
					var children = collection.fetch();
					self.onChildrenChange(parent, children);
				}
			});
			collection.on('update', function(event){
				var obj = event.target;
				self.onChange(obj);
			});
			var children = collection.fetch();
            var root = null;
            children.forEach(function (item) {
                root = item;//we expect only one
            });
			onItem(root);
		},

		mayHaveChildren: function(item){
			return item.hasChildren;
		},

		getChildren: function(/*Object*/ parentItem, /*function(items)*/ onComplete, /*function*/ onError){
			// summary:
			//		Calls onComplete() with array of child items of given parent item.
			// parentItem:
			//		Item from the dojo/store
            var self = this;

            if(this.schema && this.schema.childrenQuery){
                var docFilter = this.schema.childrenQuery;
                var childrenFilter = this.store.buildFilterFromQuery(parentItem, docFilter);
                var childrenCollection = this.store.filter(childrenFilter);
                /*childrenCollection.fetch().then(function(childObjects){
                    //onComplete(childObjects);
                    console.log('NEW of', parentItem.title ? parentItem.title : parentItem.name, childrenFilter);
                    console.dir(childObjects);
                });*/
                childrenCollection.on('remove, add', function(event){
                    var parent = event.parent;
                    var collection = self.childrenCache[parent.id];
                    if(collection){
                        var children = collection.fetch();
                        self.onChildrenChange(parent, children);
                    }
                });
                childrenCollection.on('update', function(event){
                    var obj = event.target;
                    self.onChange(obj);
                });
                childrenCollection.fetch().then(function(childObjects){
                    var grandChildrenPromises = [];
                    childObjects.forEach(function(childObj){
                        var grandChildrenFilter = self.store.buildFilterFromQuery(childObj, docFilter);
                        var grandChildrenCollection = self.store.filter(grandChildrenFilter);
                        grandChildrenPromises.push(grandChildrenCollection.fetch().then(function(grandChildrenObjects){
                            if(grandChildrenObjects.length>0) childObj.hasChildren = true;
                            return true;
                        }));
                    });
                    all(grandChildrenPromises).then(function(res){
                        onComplete(childObjects);
                    });
                });
            }

/*
            if(this.schema && this.schema.childrenFilter){
                var docFilter = this.schema.childrenFilter;
                var childrenFilter = this.store.buildFilter(parentItem, docFilter);
                var childrenCollection = this.store.filter(childrenFilter);
                childrenCollection.fetch().then(function(childObjects){
                    //onComplete(childObjects);
                    console.log('OLD of', parentItem.title ? parentItem.title : parentItem.name, childrenFilter);
                    console.dir(childObjects);
                });
                childrenCollection.on('remove, add', function(event){
                    var parent = event.parent;
                    var collection = self.childrenCache[parent.id];
                    if(collection){
                        var children = collection.fetch();
                        self.onChildrenChange(parent, children);
                    }
                });
                childrenCollection.on('update', function(event){
                    var obj = event.target;
                    self.onChange(obj);
                });
                childrenCollection.fetch().then(function(childObjects){
                    childObjects.forEach(function(childObj){
                        childObj.viewId = self.schema._id;
                    });
                    onComplete(childObjects);
                });
            }
*/
            /*
             recordStoreFilter= new recordStore.Filter()
             name1Filter= recordStoreFilter.eq({'name': 'Name1'})
             age25Filter= recordStoreFilter.eq({'age', 25})
             unionFilter= recordStoreFilter.or(name1Filter, age25Filter)
             unionData= recordStore.filter(unionFilter)
             //Set using the following
             recordGrid.set('collection', unionData) //or intersectionData
             */
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

					d.resolve(this.store.put(childItem, {
						overwrite: true,
						parent: newParentItem,
						oldParent: oldParentItem,
						before: before
					}));
				}));
			}else{
				d.resolve(this.store.put(childItem, {
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
