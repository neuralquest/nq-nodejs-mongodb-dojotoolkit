define(["dojo/_base/declare", "app/nqWidgetBase", "dijit/Tree", 'dojo/_base/lang', "dijit/registry",/* 'app/nqObjectStoreModel',*/"dijit/tree/ObjectStoreModel", "dojo/hash","dojo/when", "dojo/promise/all",
        'dojo/dom-construct', 'dijit/tree/dndSource', 'dijit/Menu', 'dijit/MenuItem', 'dijit/PopupMenuItem', "dojo/_base/array", 
        'dojo/query!css2'],
	function(declare, nqWidgetBase, Tree, lang, registry, ObjectStoreModel, hash, when, all,
			domConstruct, dndSource, Menu, MenuItem, PopupMenuItem, array){

	return declare("nqTree", [nqWidgetBase], {
		allowedClassesObj: {},//Check Item Acceptance needs this
		labelAttrIdArr: [], //get Label needs this
		permittedClassesByViewArr: [],
		attrRefByViewArr: [],
		parentId: null,
		
		postCreate: function(){
			this.inherited(arguments);
			var self = this;
			this.getWidgetProperties(this.widgetId).then(function(widgetProps){
				//console.log('widgetProp',widgetProps);
				self.widgetProps = widgetProps;
				self.createDeferred.resolve(self);//ready to be loaded with data
			}, nq.errorDialog);
		},
		setSelectedObjIdPreviousLevel: function(value){
            var self = this;
            if(this.widgetProps.parentId) {
                if(this.widgetProps.parentId == this.selectedObjIdPreviousLevel) return this;
                else this.selectedObjIdPreviousLevel = Number(this.widgetProps.parentId);
            }
            else if(!value || value == this.selectedObjIdPreviousLevel) return this;
			else this.selectedObjIdPreviousLevel = value;
			if(self.tree) self.tree.destroy(); 
			self.createTree();
			self.treeModel.query = {parentId: self.selectedObjIdPreviousLevel, viewId: this.widgetId};
			self.setSelectedObjIdPreviousLevelDeferred.resolve(self);
			return this.setSelectedObjIdPreviousLevelDeferred.promise;
		},
		setSelectedObjIdThisLevel: function(value){
			//select the node
			//TODO expand tree
			if(this.selectedObjIdThisLevel == value) return this;
			this.selectedObjIdThisLevel = value;
			//if(value == 824) this.tree.set('path', ['810', '2016', '2020', '824']);
		},
		createTree: function(){
			var self = this;
			this.treeModel = new ObjectStoreModel({
				childrenAttr: this.viewIdsArr,
				store : this.store,
				query : {itemId: this.selectedObjIdPreviousLevel, viewId: this.widgetProps.views[0]._id}
			});			
			this.treeModel.getRoot = function(onItem, onError){
				/*var collection = this.store.filter(this.query);
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
				var children = collection.fetch();*/
                //this.store.getChildren({_id:self.selectedObjIdPreviousLevel, _viewId:self.widgetId}, onItem);

                if(self.selectedObjIdPreviousLevel==1) self.selectedObjIdPreviousLevel=67;
                self.store.get(self.selectedObjIdPreviousLevel).then(function(item) {
                    if(!item) onError('item not found');
                    else {
                        item._viewId = self.widgetProps.views[0]._id;
                        onItem(item);
                    }
                });
			},
			this.treeModel.getChildren = function(/*Object*/ parentItem, /*function(items)*/ onComplete, /*function*/ onError){
                this.store.getChildren(parentItem, onComplete);
                return;

//				var self = this;
				var id = this.store.getIdentity(parentItem);

				if(this.childrenCache[id]){
					// If this.childrenCache[id] is defined, then it always has the latest list of children
					// (like a live collection), so just return it.
					//TODO why aren't my collections like a live collection? something is wrong  
					when(this.childrenCache[id], onComplete, onError);
					return;
				}
				var children = this.childrenCache[id] = this.store.getChildren(parentItem, onComplete);
                return;
				/*var collection = this.childrenCache[id];
				if(!collection) collection = this.childrenCache[id] = this.store.getChildren(parentItem);
				// Setup observer in case children list changes, or the item(s) in the children list are updated.
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
				return onComplete(children);*/
			},
			this.tree = new Tree({
				id: 'tree'+this.widgetId,
				store: this.store,
                //model: this.store,
                model: this.treeModel,

				dndController: dndSource,
				betweenThreshold: 5, 
				persist: 'true',
                getLabel: function(item){
                    if(!item) return 'no item';
                    if(item._type == 'object') return item.name;
                    return item._name;
                },
				getIconClass: function(item, opened){
					if(!item) return 'icondefault';
                    if(item._type == 'object') return 'icon'+item._icon;
					if(item._type == 'assoc') return 'icon'+item._icon;
					return 'icon0';
				},
				getRowClass: function(item, opened){
					if(!item) return '';
					return 'css'+item._viewId;//used by tree menu to determine which menu to show
				},
				getTooltip: function(item, opened){
					if(!item) return '';
					//return item.id+' - '+item.viewId+' - '+item.classId;
					if(dojo.config.isDebug) return item._id+' - '+item._viewId+' - '+item._icon;
				},
				onClick: function(item, node, evt){
					self.inherited('onClick',arguments);
					nq.setHashViewId(self.level, item._viewId, self.tabId, item._id);
				},
                mayHaveChildren: function(item){
                    //return 'children' in item;
                    return true;
                },
                checkItemAcceptance: function(target, source, position){
					return true;
					var targetItem = dijit.getEnclosingWidget(target).item;
					var subClassIdArr = self.allowedClassesObj[targetItem._viewId];
					var sourceItemClassId = source.current.item._iconId;
					//console.log('sourceItemClassId', sourceItemClassId);
					for(var i = 0;i<subClassArr.length;i++){
						var mapsToClassId = subClassArr[i].id;
						//console.log('mapsToClassId', mapsToClassId);
						if(mapsToClassId === sourceItemClassId) return true;
					}
					return false;
				},
				getRoot: function(onItem, onError){
                    self.store.get(self.selectedObjIdPreviousLevel).then(function(item) {
                        onItem(item);
                    });
				},
				onLoad: function(){
					fullPage.resize();//need this for lazy loaded trees, some how the first tree lags behind
					//console.dir(self.createDeferred.resolve(self));
					self.createDeferred.resolve(self);//ready to be loaded with data/
//					self.setSelectedObjIdPreviousLevelDeferred.resolve(self);
				}
			}, domConstruct.create('div'));
			this.pane.containerNode.appendChild(this.tree.domNode);
			this.tree.startup();
			this.createDeferred.resolve(this);//ready to be loaded with data

		},
		
		createMenusForWidget: function(){
			var self = this;
			for(viewId in self.permittedClassesByViewArr) {
				var parentMenu = new Menu({targetNodeIds: [this.pane.containerNode], selector: ".css"+viewId});
				//var parentMenu = new Menu({targetNodeIds: [self.tree.domNode], selector: ".css"+viewId});
				var addMenu = new Menu({parentMenu: parentMenu});
				parentMenu.addChild(new PopupMenuItem({
					label:"New",
					iconClass:"addIcon",
					popup: addMenu
				}));
				parentMenu.addChild(new MenuItem({
					label:"Delete",
					iconClass:"removeIcon",
					onClick: function(){
						var selectedItem = self.tree.get("selectedItem");
						var directives = {parent:{id:self.selectedObjIdPreviousLevel}};
						self.store.remove(selectedItem.id,selectedItem.viewId, directives);
					}
				}));
				var permittedClassesArr = self.permittedClassesByViewArr[viewId];
				for(var i=0;i<permittedClassesArr.length;i++){
					classesObj = permittedClassesArr[i];

					var menuItem = new MenuItem({
						label: "View: "+classesObj.subViewName+" Object Type: <b>"+classesObj.subClassName+"</b> association: <span style='color:blue'>"+classesObj.assocName+"</span>",
						iconClass: "icon"+classesObj.subClassId,
						classId: classesObj.subClassId,
						viewId: classesObj.subViewId
					});
					menuItem.on("click", function(evt){
						var addObj = {
								'type': 1,
								'viewId': this.viewId, 
								'classId': this.classId
							};
						var selectedItem = self.tree.get("selectedItem");
						var directives = {parent:{id: selectedItem.id}};
						var newItem = self.store.add(addObj, directives);
						
						var selectedNodes = self.tree.getNodesByItem(selectedItem);
						if(!selectedNodes[0].isExpanded){
							self.tree._expandNode(selectedNodes[0]);
						}
						self.tree.set('selectedItem', newItem.id);
					});
					addMenu.addChild(menuItem);	
				}
			};
		},
/*		createMenus: function(){
			var OBJECT_TYPE = 1;
			var ASSOCS_ATTR_ID = 1613;
			var SUBCLASSES_PASSOC = 15;
			var ASSOCS_CLASS_TYPE = 94;
			var CLASS_TYPE = 0;
			var CELNAME_ATTR = 852;
			
			var self = this;
			when(self.store.getManyByAssocType(this.widgetId, MANYTOMANY_ASSOC, OBJECT_TYPE, true), function(viewIdArr){
				//console.log('getManyByAssocType', viewIdArr);					
				for(var i=0;i<viewIdArr.length;i++){
					viewId = viewIdArr[i];
					self.createMenuforView(viewId);
				}
			}, nq.errorDialog);		
		},
		createMenuforView: function(viewId){
			var CLASSMODEL_VIEWID = 844;
			var CLASSMODEL_ATTRTREFID = 852;
			var CLASSES_VIEWID = 733;
			var ASSOCIATIONS_VIEWID = 1934 ;
			var CLASSES_ATTRTREFID = 756;
			var SUBCLASSES_PASSOC = 15;
			var ASSOCS_CLASS_TYPE = 94;
			var CLASS_TYPE = 0;
			var CELNAME_ATTR = 852;
			var CLASSMODEL_VIEWID = 844;
			var CLASSMODEL_ATTRTREFID = 852;
			var CLASSES_VIEWID = 733;
			var ASSOCIATIONS_VIEWID = 1934 ;
			var CLASSES_ATTRTREFID = 756;
			var SUBCLASSES_PASSOC = 15;
			var ASSOCS_CLASS_TYPE = 94;
			var CLASS_TYPE = 0;
			var CELNAME_ATTR = 852;
			
			var self = this;

			//console.log('viewId', viewId);
			var parentMenu = new Menu({targetNodeIds: [self.tree.domNode], selector: ".css"+viewId});
			var addMenu = new Menu({parentMenu: parentMenu});
			parentMenu.addChild(new PopupMenuItem({
				label:"New",
				iconClass:"addIcon",
				popup: addMenu
			}));
			parentMenu.addChild(new MenuItem({
				label:"Delete",
				iconClass:"removeIcon",
				onClick: function(){
					var selectedItem = self.tree.get("selectedItem");
					self.store.remove(selectedItem.id,selectedItem.viewId);
				}
			}));
			if(viewId == CLASSMODEL_VIEWID){
				var menuItem = new MenuItem({
					label: "<b>Class</b> by <span style='color:blue'>child</span> association",
					iconClass: "icon0",
					viewId: viewId
				});
				menuItem.on("click", function(evt){
					var selectedItem = self.tree.get("selectedItem");
					//console.log('menu item on', dijit.byNode(this.getParent().currentTarget));
					var viewId = this.viewId;
					var item = self.store.add({type: 0, attrRefId: CLASSMODEL_ATTRTREFID, viewId: viewId, classId:CLASS_TYPE, name: 'New Class'}, {parent:{id: selectedItem.id}});
					var selectedNodes = self.tree.getNodesByItem(selectedItem);
					if(!selectedNodes[0].isExpanded) self.tree._expandNode(selectedItem);
					self.tree.set('selectedItem', item.id);
				});
				addMenu.addChild(menuItem);	
				var menuItem = new MenuItem({
					label: "<b>Oject</b> by <span style='color:blue'>child</span> association",
					iconClass: "icon1",
					viewId: viewId
				});
				menuItem.on("click", function(evt){
					var selectedItem = self.tree.get("selectedItem");
					//console.log('menu item on', evt);
					var viewId = this.viewId;
					var item = self.store.add({type: 1, attrRefId: CLASSMODEL_ATTRTREFID, viewId: viewId, classId:OBJECT_TYPE }, {parent:{id: selectedItem.id}});
					var selectedNodes = self.tree.getNodesByItem(selectedItem);
					if(!selectedNodes[0].isExpanded) self.tree._expandNode(selectedItem);
					self.tree.set('selectedItem', item.id);
				});
				addMenu.addChild(menuItem);	
			}
			else if(viewId == CLASSES_VIEWID){
				
			}
			else if(viewId == ASSOCIATIONS_VIEWID){
				
			}
			else{
				when(self.store.getManyByAssocType(viewId, MANYTOMANY_ASSOC, OBJECT_TYPE, true), function(viewIdArr){
					//console.log('related views getManyByAssocType', viewIdArr);					
					for(var i=0;i<viewIdArr.length;i++){
						subViewId = viewIdArr[i];
						/*var addSubMenu = new Menu({parentMenu: addMenu});
						parentMenu.addChild(new PopupMenuItem({
							label:"View",
							//iconClass:"addIcon",
							popup: addSubMenu
						}));* /
						self.createMenuforSubView(subViewId, addMenu);
					}
				}, nq.errorDialog);				
			}
		},	
		createMenuforSubView: function(viewId, addMenu){
			var CLASSMODEL_VIEWID = 844;
			var CLASSMODEL_ATTRTREFID = 852;
			var CLASSES_VIEWID = 733;
			var ASSOCIATIONS_VIEWID = 1934 ;
			var CLASSES_ATTRTREFID = 756;
			var SUBCLASSES_PASSOC = 15;
			var ASSOCS_CLASS_TYPE = 94;
			var CLASS_TYPE = 0;
			var CELNAME_ATTR = 852;
			
			var self = this;

			var attrPromises = [];
			//get the assocication type that this view has as an attribute
			attrPromises[0] = self.store.getOneByAssocTypeAndDestClass(viewId, ATTRIBUTE_ASSOC, ASSOCS_CLASS_TYPE);
			//get the class that this view maps to
			//attrPromises[1] = self.store.query({sourceFk: viewId, type: MAPSTO_ASSOC});
			attrPromises[1] = self.store.getOneByAssocType(viewId, MAPSTO_ASSOC, CLASS_TYPE, false);
			when(all(attrPromises), function(arr){
				if(!arr[0]) throw new Error('View '+viewId+' must have an association type as an attribute ');
				var assocType = arr[0];
				var assocName = self.store.getCell(assocType).name;//TODO will fail if it is asysnc
				if(!arr[1]) throw new Error('View '+viewId+' must map to one class ');
				//if(arr[1].length!=1) console.log('View '+viewId+' should map to one class ');
				var destClassId = arr[1];
				//get the subclasses as seen from the destClass
				when(self.store.getManyCellsByAssocType(destClassId, SUBCLASSES_PASSOC, CLASS_TYPE, true), function(subClassArr){
					subClassArr.push(self.store.getCell(destClassId));//TODO should getManyByAssocType also return destClassId?
					//console.log('subClassArr', subClassArr);
					self.allowedClassesObj[viewId] = subClassArr;//Check Item Acceptance needs this
					//var addMenu = new Menu({parentMenu: parentMenu});
					for(var j=0;j<subClassArr.length;j++){
						var subClassCell = subClassArr[j];
						var subClassId = subClassCell.id;
						//console.log(subClass);

						var tree = this.tree;
						var menuItem = new MenuItem({
							label: "viewId: "+viewId+" <b>"+subClassCell.name+"</b> object by <span style='color:blue'>"+assocName+"</span>"+' association',
							iconClass: "icon"+subClassId,
							subClassId: subClassId,
							viewId: viewId
						});
						menuItem.on("click", function(evt){
							//console.log('menu item on', this.subClassId);
							var viewId = this.viewId;
							var classId = this.subClassId;
							var addObj = {
									'type': 1,
									'viewId': this.viewId, 
									'classId': this.subClassId
								};
							var selectedItem = self.tree.get("selectedItem");
							var directives = {parent:{id: selectedItem.id}};
//									addObj[viewDefToCreate.label] = '[new '+subClassId+']';;
							var newItem = self.store.add(addObj, directives);
							
							//var selectedItem = self.tree.get("selectedItem");
							//if(!selectedItem[viewId]) selectedItem[viewId] = [];
							//selectedItem[viewId].push(newItem.id);
							//_nqDataStore.put(selectedItem);

							//TODO this should be done automaticly some where
							//var x = self.tree.model.getChildren(selectedItem, viewsArr);//we need this to create an observer on the newly created item
							
							var selectedNodes = self.tree.getNodesByItem(selectedItem);
							if(!selectedNodes[0].isExpanded){
								self.tree._expandNode(selectedNodes[0]);
							}
							self.tree.set('selectedItem', newItem.id);
						});
						addMenu.addChild(menuItem);	
					}
					addMenu.startup();
					/*parentMenu.addChild(new PopupMenuItem({
						label:"To",
						iconClass:"icon"+assocType,
						popup: addMenu
					}));* /
				}, nq.errorDialog);
			}, nq.errorDialog);			
		},*/
		getNodePathRecursive: function(nodesArr, selectedTabId){
			nodesArr.unshift(selectedTabId);//add at the first postion
			return null;
			return when(nqDataStore.getOneByAssocTypeAndDestClass(selectedTabId, ORDERED_PARENT_ASSOC, ACCORDIONTABS_ATTRCLASS), function(parentTab){
				if(parentTab) return getTabsPathRecursive(parentTab);
				else return null;
			});
		}	
	});
});
