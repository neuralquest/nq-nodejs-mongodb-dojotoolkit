define(["dojo/_base/declare", "dijit/Tree", "dijit/registry", "dojo/cookie", "dojo/hash", 'dijit/Menu', 'dijit/MenuItem', 'dijit/PopupMenuItem'],
	function(declare, Tree, registry, cookie, hash, Menu, MenuItem, PopupMenuItem ){
	
	var NqTree = declare(Tree, {
		postCreate: function(){
			this.inherited(arguments);
			
			var state = nq.getState(this.level);
			var viewsArr = _nqSchemaMemoryStore.query({parentTabId: state.tabId, entity: 'view'});//get the views that belong to this tab
			var node = this.domNode;
			dojo.forEach(viewsArr, function(childView) {
				var menu = new Menu({targetNodeIds: [node], selector: ".css"+childView.id});
				dojo.forEach(childView.childViews, function(allowedViewId) {
					var viewDef = _nqSchemaMemoryStore.get(allowedViewId);
					var classMenu = new Menu({});
					dojo.forEach(viewDef.mapsToClasses, function(mapsToClass) {
						classMenu.addChild(new MenuItem({
							label:"A New <b>"+mapsToClass.className+"</b> Object",
							iconClass:"icon"+mapsToClass.id,
							onClick: function(){
								/*var children = treeNode.getChildren();
								var lastItem = children[children.length-1].item;
								if(lastItem){
									lastItem.insertBefore = tempId;
									_nqDataStore.put(lastItem);
								}*/
								var selectedItem = tree.get("selectedItem");
								var labelAttrId = viewDef.label;
								var addObj = {
									'id': '',//cid will be added by our restStore extention, we need a dummy id
									//labelArrrId: '[new]',
									'viewId': viewDef.id, 
									'classId': mapsToClass.id
								};
								addObj[labelAttrId] = '[new '+mapsToClass.className+']';
								var newItem = _nqDataStore.add(addObj);
								var x = treeModel.getChildren(selectedItem, viewIdsArr);//we need this to create an observer in the parent
								selectedItem[viewDef.id].push(newItem.id);
								_nqDataStore.put(selectedItem);
								interpritHash(0);//force page refresh of the content pane. we could do providedataforwidget, but we dont know the level
								
								var selectedNodes = tree.getNodesByItem(selectedItem);
								selectedNodes[0].expand();
							}
						}));	
					});	
					menu.addChild(new PopupMenuItem({
						label:"Add <span style='color:blue'>"+viewDef.relationship+"</span> Relationship To",
						iconClass:"icon"+viewDef.relationshipId,
						popup: classMenu
					}));
				});	
				menu.addChild(new MenuItem({
					label:"Delete",
					iconClass:"dijitEditorIcon dijitEditorIconCut",
					onClick: function(){
						var selectedItem = tree.get("selectedItem");
						//var selectedItem = this.getParent().currentTarget.item;
						_nqDataStore.remove(selectedItem.id);
					}//TODO must fix linkedList, on the server?
				}));
			});		
		},
		onLoad: function(){
			fullPage.resize();//need this for lazy loaded trees
		},
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
			var state = nq.getState(level);
			//var nextState = getState(level+1);
			var tabPane = registry.byId('tab'+state.tabId);
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
		},
		_onNodeMouseEnter: function (node,evt) {
			if(location.href.indexOf('debug'))
			dijit.showTooltip(node.item.id,node.domNode);
		},
		_onNodeMouseLeave: function (node,evt) {
			dijit.hideTooltip(node.domNode);
		}

	});
	return NqTree;
});

