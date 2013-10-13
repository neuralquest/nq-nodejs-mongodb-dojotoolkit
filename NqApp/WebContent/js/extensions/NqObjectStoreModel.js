define(["dojo/_base/declare", "dijit/tree/ObjectStoreModel", "dojo/_base/lang", "dojo/when","dojo/_base/array"],
	function(declare, ObjectStoreModel, lang, when, array){
	
	var NqObjectStoreModel = declare(ObjectStoreModel, {
		mayHaveChildren: function(item){
			for(var i=0;i<this.childViewAttributes.length;i++){
				var childAttr = this.childViewAttributes[i];
				var childrenArr = item[childAttr];
				if(childrenArr && childrenArr.length>0) return true;
			}
			return false;
		},
		
		getChildren: function(/*Object*/ parentItem,/*function(items)*/ onComplete, /*function*/ onError){
			var id = this.store.getIdentity(parentItem);
			if(!this.childrenCache[id]){
				res = _nqMemoryStore.query({'id': id});
				res.observe(lang.hitch(this, function(obj, removedFrom, insertedInto){
					console.log("_nqMemoryStore observe of : ", obj);
					this.onChange(obj);
					when(this.store.getChildren(obj, this.childViewAttributes),lang.hitch(this, function(results){
						console.dir(results);
						this.onChildrenChange(obj, results);
					}));
				}), true);
				this.childrenCache[id] = true;
			}
			
			when(this.store.getChildren(parentItem, this.childViewAttributes),lang.hitch(this, function(children){
				onComplete(children);
			}),	onError);
		},/*
		getChildren: function(/*Object* / parentItem, /*function(items)* / onComplete, /*function* / onError){
			// summary:
			//		Calls onComplete() with array of child items of given parent item.
			// parentItem:
			//		Item from the dojo/store

			var id = this.store.getIdentity(parentItem);
			if(this.childrenCache[id]){
				when(this.childrenCache[id], onComplete, onError);
				return;
			}

			var res = this.childrenCache[id] = this.store.getChildren(parentItem, /*extension* /this.childViewAttributes);

			// User callback
			when(res, onComplete, onError);

			// Setup listener in case children list changes, or the item(s) in the children list are
			// updated in some way.
			if(res.observe){
				res.observe(lang.hitch(this, function(obj, removedFrom, insertedInto){
					console.log("observe on children of ", id, ": ", obj, removedFrom, insertedInto);

					// If removedFrom == insertedInto, this call indicates that the item has changed.
					// Even if removedFrom != insertedInto, the item may have changed.
					this.onChange(obj);

					if(removedFrom != insertedInto){
						// Indicates an item was added, removed, or re-parented.  The children[] array (returned from
						// res.then(...)) has already been updated (like a live collection), so just use it.
						console.dir(res);
						when(res, lang.hitch(this, "onChildrenChange", parentItem));
					}
				}), true);	// true means to notify on item changes
			}
		},
		*/
		pasteItem: function(/*Item*/ childItem, /*Item*/ oldParentItem, /*Item*/ newParentItem,
					/*Boolean*/ bCopy, /*int?*/ insertIndex, /*Item*/ before){
			// summary:
			//		Move or copy an item from one parent item to another.
			//		Used in drag & drop

			//extension
			bCopy = false;//only move for now
			
			//extension
			var viewAttr = childItem.viewId;
			
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
				//this.onChildrenChange(oldParentItem, oldParentChildren);//We dont seam to need this
				
				//extension
				index = array.indexOf(oldParentItem[viewAttr], childItem.id);
				oldParentItem[viewAttr].splice(index, 1);
				if(oldParentItem != newParentItem){
					this.store.put(oldParentItem, {
						overwrite: true
					});
				}
			}

			/*return this.store.put(childItem, {
				overwrite: true,
				parent: newParentItem,
				before: before
			});*/
			//extension
			if(before){
				var insertIndex = array.indexOf(newParentItem[viewAttr], before.id);
				var lastPart = newParentItem[viewAttr].splice(insertIndex);
				newParentItem[viewAttr] = newParentItem[viewAttr].concat(childItem.id,lastPart);
			}
			else{
				newParentItem[viewAttr].push(childItem.id);
			}
			return this.store.put(newParentItem, {
				overwrite: true
			});			
		}

	});
	return NqObjectStoreModel;
});

