define(["dojo/_base/declare", "dijit/tree/ObjectStoreModel", "dojo/_base/lang", "dojo/when","dojo/_base/array"],
	function(declare, ObjectStoreModel, lang, when, array){
	
	var nqObjectStoreModel = declare(ObjectStoreModel, {
		mayHaveChildren: function(item){
			return true;
			for(var i=0;i<this.childrenAttr.length;i++){
				var childAttr = this.childrenAttr[i];
				var childrenArr = item[childAttr];
				if(childrenArr && childrenArr.length>0) return true;
			}
			return false;
		},		
		getChildren: function(/*Object*/ parentItem,/*function(items)*/ onComplete, /*function*/ onError){
			var self = this;
			when(this.store.getChildren(parentItem, this.childrenAttr),function(children){
				for(var i=0;i<children.length;i++){
					var childId = children[i].id;
					if(!self.childrenCache[childId]){
						res = _nqMemoryStore.query({'id': childId});
						res.observe(function(obj, removedFrom, insertedInto){
							//console.log("_nqMemoryStore observe of : ", obj);
							self.onChange(obj);
							//Make sure the children of this child are also in sync
							when(self.store.getChildren(obj, self.childrenAttr), function(grandChildren){
								//console.dir(grandChildren);
								self.onChildrenChange(obj, grandChildren);
							});
						}, true);
						self.childrenCache[childId] = true;					
					}
				}
				onComplete(children);
			}, onError);
		},
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
	return nqObjectStoreModel;
});

