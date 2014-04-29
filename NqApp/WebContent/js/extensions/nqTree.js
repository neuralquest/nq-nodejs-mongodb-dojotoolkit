define(["dojo/_base/declare", "nq/nqWidgetBase", "dijit/Tree", "dijit/registry", 'nq/nqObjectStoreModel',"dojo/hash","dojo/when", "dojo/promise/all",  
        'dojo/dom-construct', 'dijit/tree/dndSource', 'dijit/Menu', 'dijit/MenuItem', 'dijit/PopupMenuItem', 'dojo/query!css2'],
	function(declare, nqWidgetBase, Tree, registry, nqObjectStoreModel, hash, when, all,
			domConstruct, dndSource, Menu, MenuItem, PopupMenuItem){

	return declare("nqTreeWidget", [nqWidgetBase], {
		allowedClassesObj: {},//Check Item Acceptance needs this
		labelAttrIdObj: {}, //get Label needs this
		
		postCreate: function(){
			this.inherited(arguments);
		/*
			var self = this;
			var treeModel = new nqObjectStoreModel({
				childrenAttr: this.viewIdsArr,
				store : this.store,
				query : {id: this.parentId}
			});
			this.tree = new Tree({
				id: 'tree'+this.widgetObj.id,
				store: this.store,
				model: treeModel,
				dndController: dndSource,
				betweenThreshold: 5, 
				persist: 'true',
				getIconClass: function(item, opened){
					if(!item) return 'icondefault';
					return 'icon'+item.classId;
				},
				getRowClass: function(item, opened){
					if(!item) return '';
					return 'css'+item.viewId;//used by tree menu to determin which menu to show
				},
				getTooltip: function(item, opened){
					if(!item) return '';
					if(location.href.indexOf('localhost') >= 0) return item.id;
				},
				onClick: function(item, node, evt){
					self.inherited('onClick',arguments);
					nq.setHashViewId(self.level, item.viewId, self.tabId, item.id.split('/')[1]);
				},
				checkItemAcceptance: function(target, source, position){
					var targetItem = dijit.getEnclosingWidget(target).item;
					var subClassArr = self.allowedClassesObj[targetItem.viewId];
					var sourceItemClassId = source.current.item.classId;
					//console.log('sourceItemClassId', sourceItemClassId);
					for(var i = 0;i<subClassArr.length;i++){
						var mapsToClassId = subClassArr[i].id;
						//console.log('mapsToClassId', mapsToClassId);
						if(mapsToClassId === sourceItemClassId) return true;
					}
					return false;
				},
				getLabel: function(item){
					if(!item) return 'no item';
					var labelAttrId = self.labelAttrIdObj[item.viewId];
					return item[labelAttrId];
				},
				onLoad: function(){
					fullPage.resize();//need this for lazy loaded trees, some how the first tree lags behind
					//self.createDeferred.resolve(self);//ready to be loaded with data
				}
			}, domConstruct.create('div'));
			this.pane.containerNode.appendChild(this.tree.domNode);
/*
			this.tree.getLabel = function(/*dojo.data.Item* / item){
				if(!item) return 'no item';
				var schema = _nqSchemaMemoryStore.get(item.viewId);
				if(!schema) return 'no schema';
				return item[schema.label];
			};
			
			this.tree.checkItemAcceptance = function(target, source, position){
				var targetItem = this.tree.getEnclosingWidget(target).item;
				var subClassArr = allowedClasses[targetItem.viewId];
				var sourceItemClassId = source.current.item.classId;
				//console.log('sourceItemClassId', sourceItemClassId);
				for(var i = 0;i<subClassArr.length;i++){
					var mapsToClassId = subClassArr[i].id
					//console.log('mapsToClassId', mapsToClassId);
					if(mapsToClassId === sourceItemClassId) return true;
				}
				return false;
			};
			*/
//			this.tree.startup();
			this.createDeferred.resolve(this);//ready to be loaded with data

		},
		setSelectedObjIdPreviousLevel: function(value){
			var value = this.parentId;
			//load the data
			if(this.selectedObjIdPreviousLevel == value) return this;
			this.selectedObjIdPreviousLevel = value;
			//destroy tree
			var self = this;
			when(this.findTheLabels(), function(attrRefs){
				self.createTree();
				self.createMenus();
				//self.setSelectedObjIdPreviousLevelDeferred.resolve(self);//this is done in onLoad
			}, nq.errorDialog);
			return this.setSelectedObjIdPreviousLevelDeferred.promise;
		},
		setSelectedObjIdThisLevel: function(value){
			//select the node
			//TODO expand tree
			if(this.selectedObjIdThisLevel == value) return this;
			this.selectedObjIdThisLevel = value;
			if(value == 824) this.tree.set('paths', [['846/810','846/2016','846/2020', '846/824']]);
			else this.tree.set('selectedItem', value);
		},

		findTheLabels: function(){
			var MANYTOMANY_ASSOC = 10;	//TO MANY
			var OBJECT_TYPE = 1;
			var CLASS_MODEL_VIEW_ID = 844;
			var ASSOCS_ATTR_ID = 1613;
			var MAPSTO_ASSOC = 5;			//TO ONE
			var ORDERED_ASSOC = 8;		//TO MANY
			var ATTREF_CLASS_ID = CLASS_MODEL_VIEW_ID+'/'+63;
			var PRIMARYNAME_CLASS_ID = CLASS_MODEL_VIEW_ID+'/'+69;
			var CELLNAME_CLASS_ID = CLASS_MODEL_VIEW_ID+'/'+2057;
			
			var self = this;
			//recursivily get all of the views that belong to this widget
			return when(self.store.getManyByAssocType(CLASS_MODEL_VIEW_ID+'/'+this.widgetObj.id.split('/')[1], MANYTOMANY_ASSOC, OBJECT_TYPE, true), function(viewObjArr){
				var gotAttrRefsPrommises = [];
				for(var i=0;i<viewObjArr.length;i++){
					var viewObj = viewObjArr[i];
					//get the the attribute references that belong to this view
					gotAttrRefsPrommises.push(self.store.getManyByAssocTypeAndDestClass(viewObj, ORDERED_ASSOC, ATTREF_CLASS_ID));
				};
				return when(all(gotAttrRefsPrommises), function(viewsArr){
					for(var i=0;i<viewsArr.length;i++){
						var attrRefsArr = viewsArr[i];
						var viewObj = viewObjArr[i];
						//console.log('attrRefsArr', attrRefsArr);
						for(var j=0;j<attrRefsArr.length;j++){
							var attrRef = attrRefsArr[j];
							var mapsToClassId = attrRef[ASSOCS_ATTR_ID][MAPSTO_ASSOC][0];
							if(mapsToClassId == PRIMARYNAME_CLASS_ID || mapsToClassId == CELLNAME_CLASS_ID){
								//console.log('attrRef.id', attrRef.id);
								self.labelAttrIdObj[viewObj.id.split('/')[1]] = attrRef.id.split('/')[1];//get Label needs this
							}
						};
					};
					return viewsArr;
				});
			});
		},
		createTree: function(){
			var self = this;
			var treeModel = new nqObjectStoreModel({
				childrenAttr: this.viewIdsArr,
				store : this.store,
				query : {id: this.parentId}
			});
			this.tree = new Tree({
				id: 'tree'+this.widgetObj.id,
				store: this.store,
				model: treeModel,
				dndController: dndSource,
				betweenThreshold: 5, 
				persist: 'true',
				getIconClass: function(item, opened){
					if(!item) return 'icondefault';
					return 'icon'+item.classId;
				},
				getRowClass: function(item, opened){
					if(!item) return '';
					return 'css'+item.viewId;//used by tree menu to determin which menu to show
				},
				getTooltip: function(item, opened){
					if(!item) return '';
					if(location.href.indexOf('localhost') >= 0) return item.id;
				},
				onClick: function(item, node, evt){
					self.inherited('onClick',arguments);
					nq.setHashViewId(self.level, item.viewId, self.tabId, item.id.split('/')[1]);
				},
				checkItemAcceptance: function(target, source, position){
					var targetItem = dijit.getEnclosingWidget(target).item;
					var subClassArr = self.allowedClassesObj[targetItem.viewId];
					var sourceItemClassId = source.current.item.classId;
					//console.log('sourceItemClassId', sourceItemClassId);
					for(var i = 0;i<subClassArr.length;i++){
						var mapsToClassId = subClassArr[i].id;
						//console.log('mapsToClassId', mapsToClassId);
						if(mapsToClassId === sourceItemClassId) return true;
					}
					return false;
				},
				getLabel: function(item){
					if(!item) return 'no item';
					var labelAttrId = self.labelAttrIdObj[item.viewId];
					return item[labelAttrId];
				},
				onLoad: function(){
					fullPage.resize();//need this for lazy loaded trees, some how the first tree lags behind
					self.setSelectedObjIdPreviousLevelDeferred.resolve(self);
				}
			}, domConstruct.create('div'));
			this.pane.containerNode.appendChild(this.tree.domNode);
			this.tree.startup();
			this.createDeferred.resolve(this);//ready to be loaded with data

		},
		
		createMenus: function(){
			var MANYTOMANY_ASSOC = 10;	//TO MANY
			var OBJECT_TYPE = 1;
			var CLASS_MODEL_VIEW_ID = 844;
			var ASSOCS_ATTR_ID = 1613;
			var ATTRIBUTE_ASSOC = 4;		//TO ONE
			var MAPSTO_ASSOC = 5;			//TO ONE
			var ORDERED_ASSOC = 8;		//TO MANY
			var SUBCLASSES_PASSOC = 15;
			var ASSOCS_CLASS_TYPE = CLASS_MODEL_VIEW_ID+'/'+94;
			var CLASS_TYPE = 0;
			var CELNAME_ATTR = 852;
			
			var self = this;
			when(self.store.getManyByAssocType(CLASS_MODEL_VIEW_ID+'/'+this.widgetObj.id.split('/')[1], MANYTOMANY_ASSOC, OBJECT_TYPE, true), function(viewObjArr){
				//console.log('getManyByAssocType', viewObjArr);					
				for(var i=0;i<viewObjArr.length;i++){
					viewObj = viewObjArr[i];
					var parentMenu = new Menu({targetNodeIds: [self.tree.domNode], selector: ".css"+viewObj.id.split('/')[1]});					
					var destClassId = viewObj[ASSOCS_ATTR_ID][MAPSTO_ASSOC][0];
					//get the assocication type that this view has as an attribute
					when(self.store.getOneByAssocTypeAndDestClass(viewObj, ATTRIBUTE_ASSOC, ASSOCS_CLASS_TYPE), function(assocTypeObj){
						//get the subclasses as seen from the destClass
						when(self.store.getManyByAssocType(destClassId, SUBCLASSES_PASSOC, CLASS_TYPE, true), function(subClassArr){
							self.allowedClassesObj[viewObj.id.split('/')[1]] = subClassArr;//Check Item Acceptance needs this
							var classMenu = new Menu({parentMenu: parentMenu});
							for(var j=0;j<subClassArr.length;j++){
								var subClass = subClassArr[j];
								//console.log(subClass);

								var tree = this.tree;
								var menuItem = new MenuItem({
									label: "A New <b>"+subClass[CELNAME_ATTR]+"</b> Object",
									iconClass: "icon"+subClass.id,
									subClass: subClass,
									viewObj: viewObj
								});
								menuItem.on("click", function(evt){
									console.log('menu item on', this.subClass);
									var viewId = this.viewObj.id.split('/')[1];
									var classId = this.subClass.id.split('/')[1];
									var addObj = {
										'id': '',//cid will be added by our restStore exstension, we need a dummy id
										'viewId': viewId, 
										'classId': classId
									};
	//								addObj[viewDefToCreate.label] = '[new '+subClass+']';;
									var newItem = self.store.add(addObj);
									
									var selectedItem = self.tree.get("selectedItem");
									if(!selectedItem[viewId]) selectedItem[viewId] = [];
									selectedItem[viewId].push(newItem.id);
									_nqDataStore.put(selectedItem);

									//TODO this should be done automaticly some where
									var x = self.tree.model.getChildren(selectedItem, viewsArr);//we need this to create an observer on the newly created item
									
									var selectedNodes = self.tree.getNodesByItem(selectedItem);
									if(!selectedNodes[0].isExpanded){
										self.tree._expandNode(selectedNodes[0]);
									}
									self.tree.set('selectedItem', newItem.id);
								});
								classMenu.addChild(menuItem);	
							}
							classMenu.startup();
							parentMenu.addChild(new PopupMenuItem({
								label:"Add <span style='color:blue'>"+viewObj+"</span> Relationship To",
								iconClass:"icon"+destClassId,
								popup: classMenu
							}));
						}, nq.errorDialog);
						parentMenu.addChild(new MenuItem({
							label:"Delete",
							iconClass:"removeIcon",
							onClick: function(){
								//TODO
								var selectedItem = self.tree.get("selectedItem");
								self.store.remove(selectedItem.id);
								
								var parentItem = self.store.get(this.parentId);
								var viewId = self.viewDefToCreate.id;
								index = array.indexOf(parentItem[viewId], selectedItem.id);
								parentItem[viewId].splice(index, 1);
								self.store.put(parentItem);
							}
						}));
						parentMenu.startup();
					}, nq.errorDialog);
				}
			}, nq.errorDialog);		
		}
	});
});
