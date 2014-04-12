define(["dojo/_base/declare", "nq/nqWidgetBase", "dijit/Tree", "dijit/registry", 'nq/nqObjectStoreModel',"dojo/hash", 
        'dojo/dom-construct', 'dijit/tree/dndSource', 'dijit/Menu', 'dijit/MenuItem', 'dijit/PopupMenuItem', 'dojo/query!css2'],
	function(declare, nqWidgetBase, Tree, registry, nqObjectStoreModel, hash, 
			domConstruct, dndSource, Menu, MenuItem, PopupMenuItem){

	return declare("nqTreeWidget", [nqWidgetBase], {
		postCreate: function(){
			this.inherited(arguments);
			/*
			// walk through all the views that are allowed as seen from this tab
			for(var i=0;i<this.viewsArr.length;i++){
				var childView = this.viewsArr[i];			
				var parentMenu = new Menu({targetNodeIds: [this.domNode], selector: ".css"+childView.id});
				for(var k=0;k<childView.childViews.length;k++){
					var allowedViewId = childView.childViews[k];			
					var viewDef = _nqSchemaMemoryStore.get(allowedViewId);
					var classMenu = new Menu({parentMenu: parentMenu});
					//arrayUtil.forEach(viewDef.mapsToClasses,  lang.hitch(this, function(mapsToClass) {
					for(var j=0;j<viewDef.mapsToClasses.length;j++){
						var mapsToClass = viewDef.mapsToClasses[j];
						var model = this.tree.model;
						var tree = this.tree;
						var menuItem = new MenuItem({
							label: "A New <b>"+mapsToClass.className+"</b> Object",
							iconClass: "icon"+mapsToClass.id,
							classToCreate: mapsToClass,
							viewDefToCreate: viewDef
						});
						menuItem.on("click", function(evt){
							var classToCreate = this.classToCreate;
							var viewDefToCreate = this.viewDefToCreate;
							var viewId = viewDefToCreate.id;
							console.log(classToCreate.className); 
							var addObj = {
								'id': '',//cid will be added by our restStore exstension, we need a dummy id
								'viewId': viewId, 
								'classId': classToCreate.id
							};
							addObj[viewDefToCreate.label] = '[new '+classToCreate.className+']';;
							var newItem = _nqDataStore.add(addObj);
							
							var selectedItem = tree.get("selectedItem");
							if(!selectedItem[viewId]) selectedItem[viewId] = [];
							selectedItem[viewId].push(newItem.id);
							_nqDataStore.put(selectedItem);

							//TODO this should be done automaticly some where
							var x = model.getChildren(selectedItem, viewsArr);//we need this to create an observer on the newly created item
							
							var selectedNodes = tree.getNodesByItem(selectedItem);
							if(!selectedNodes[0].isExpanded){
							    tree._expandNode(selectedNodes[0]);
							}
							tree.set('selectedItem', newItem.id);
						});
						classMenu.addChild(menuItem);	
					};
					classMenu.startup();
					parentMenu.addChild(new PopupMenuItem({
						label:"Add <span style='color:blue'>"+viewDef.relationship+"</span> Relationship To",
						iconClass:"icon"+viewDef.relationshipId,
						popup: classMenu
					}));
				};	
				parentMenu.addChild(new MenuItem({
					label:"Delete",
					iconClass:"removeIcon",
					onClick: function(){
						//TODO
						var selectedItem = tree.get("selectedItem");
				    	this.store.remove(selectedItem.id);
						
						var parentItem = this.store.get(this.parentId);
						var viewId = this.viewDefToCreate.id;
						index = array.indexOf(parentItem[viewId], selectedItem.id);
						parentItem[viewId].splice(index, 1);
						this.store.put(parentItem);
					}
				}));
				parentMenu.startup();

			};*/
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
			}, domConstruct.create('div'));
			this.pane.containerNode.appendChild(this.tree.domNode);
			
			this.tree.getIconClass = function(/*dojo.data.Item*/ item, /*Boolean*/ opened){
				if(!item) return 'icondefault';
				return 'icon'+item.classId;
				//must fix page model for contents firstm before we can use this
				var schema = _nqSchemaMemoryStore.get(item.viewId);
				return 'icon'+schema.classId;
			};
			this.tree.getLabel = function(/*dojo.data.Item*/ item){
				if(!item) return 'no item';
				var schema = _nqSchemaMemoryStore.get(item.viewId);
				if(!schema) return 'no schema';
				return item[schema.label];
			};
			this.tree.getRowClass = function(item, opened){
				if(!item) return '';
				return 'css'+item.viewId;//used by tree menu to determin which menu to show
			};
			this.tree.getTooltip = function(item, opened){
				if(!item) return '';
				if(location.href.indexOf('localhost') >= 0)
				return item.id;
			};
			this.tree.checkItemAcceptance = function(target, source, position){
				var targetItem = this.tree.getEnclosingWidget(target).item;
				var mapsToClassesArr = _nqSchemaMemoryStore.get(targetItem.viewId).mapsToClasses;
				var sourceItemClassId = source.current.item.classId;
				//console.log('sourceItemClassId', sourceItemClassId);
				for(var i = 0;i<mapsToClassesArr.length;i++){
					var mapsToClassId = mapsToClassesArr[i].id
					//console.log('mapsToClassId', mapsToClassId);
					if(mapsToClassId === sourceItemClassId) return true;
				}
				return false;
			};
			var self = this;
			this.tree.onClick = function(item, node, evt){
				this.inherited('onClick',arguments);
				nq.setHashViewId(self.level, item.viewId, self.tabId, item.id.split('/')[1]);
			};
			
			this.tree.startup();
			this.createDeferred.resolve(this);//ready to be loaded with data

		},
		_setSelectedObjIdPreviousLevelAttr: function(value){
			//load the data
			if(this.selectedObjIdPreviousLevel == value) return this;
			this.selectedObjIdPreviousLevel = value;
			//destroy tree
			//this.setSelectedObjIdPreviousLevelDeferred.resolve(self);
			//return setSelectedObjIdPreviousLevelDeferred.promise;
			return this;
		},
		_setSelectedObjIdThisLevelAttr: function(value){
			//select the node
			//TODO expand tree
			if(this.selectedObjIdThisLevel == value) return this;
			this.selectedObjIdThisLevel = value;
			if(value == 824) this.tree.set('paths', [['846/810','846/2016','846/2020', '846/824']]);
			else this.tree.set('selectedItem', value);
			return this;
		},

		onLoad: function(){
			fullPage.resize();//need this for lazy loaded trees, some how the first tree lags behind
		},

		
	});
});
