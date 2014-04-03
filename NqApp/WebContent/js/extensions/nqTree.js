define(["dojo/_base/declare", "dijit/Tree", "dijit/registry", "dojo/cookie", "dojo/hash", 'dijit/Menu', 'dijit/MenuItem', 'dijit/PopupMenuItem', 'dojo/query!css2'],
	function(declare, Tree, registry, cookie, hash, Menu, MenuItem, PopupMenuItem){
	
	var nqTree = declare(Tree, {
		postCreate: function(){
			this.inherited(arguments);
			
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

			};		
		},
		/*
		onLoad: function(){
			fullPage.resize();//need this for lazy loaded trees
		},*/
		getIconClass: function(/*dojo.data.Item*/ item, /*Boolean*/ opened){
			if(!item) return 'icondefault';
			return 'icon'+item.classId;
			//must fix page model for contents firstm before we can use this
			var schema = _nqSchemaMemoryStore.get(item.viewId);
			return 'icon'+schema.classId;
		},
		getLabel: function(/*dojo.data.Item*/ item){
			if(!item) return 'no item';
			var schema = _nqSchemaMemoryStore.get(item.viewId);
			if(!schema) return 'no schema';
			return item[schema.label];
		},
		getRowClass: function(item, opened){
			if(!item) return '';
			return 'css'+item.viewId;//used by tree menu to determin which menu to show
		},
		getTooltip: function(item, opened){
			if(!item) return '';
			if(location.href.indexOf('localhost') >= 0)
			return item.id;
		},
		checkItemAcceptance: function(target, source, position){
			var targetItem = dijit.getEnclosingWidget(target).item;
			var mapsToClassesArr = _nqSchemaMemoryStore.get(targetItem.viewId).mapsToClasses;
			var sourceItemClassId = source.current.item.classId;
			//console.log('sourceItemClassId', sourceItemClassId);
			for(var i = 0;i<mapsToClassesArr.length;i++){
				var mapsToClassId = mapsToClassesArr[i].id
				//console.log('mapsToClassId', mapsToClassId);
				if(mapsToClassId === sourceItemClassId) return true;
			}
			return false;
		},
		onClick: function(item, node, evt){
			this.inherited('onClick',arguments);
			var level = this.level;

			var tabPane = registry.byId('tab'+this.tabId);
			document.title = 'NQ - '+(tabPane?tabPane.title+' - ':'')+this.getLabel(item);

			var newViewId = item.viewId;
			var ids = _nqDataStore.getIdentity(item).split('/');
			
			var hashArr = hash().split('.');
			hashArr[level*3+1] = this.tabId;//it may have changed
			hashArr[level*3+2] = ids[1];//it will have changed
			if(hashArr[(level+1)*3+0] != newViewId){//if its changed
				//remove anything following this level in the hash since it is nolonger valid
				hashArr = hashArr.slice(0,(level+1)*3+0);
				
				hashArr[(level+1)*3+0] = newViewId;
				//if there is a cookie for this acctab, use if to set the hash tabId (we can prevent unnessasary interperitHash())//FIXME remove set tabId
				var cookieValue = cookie('acctab'+newViewId+'_selectedChild');
				if(cookieValue) hashArr[(level+1)*3+1] = cookieValue.substr(3);
				else{//find the first tab and use it
					var tabsArr = _nqSchemaMemoryStore.query({parentViewId: newViewId, entity: 'tab'});//get the tabs		 
					if(tabsArr.length>0) hashArr[(level+1)*3+1] = tabsArr[0].id;
				}
			}

			var newHash = hashArr.join('.');
			hash(newHash);			
		}
	});
	return nqTree;
});

