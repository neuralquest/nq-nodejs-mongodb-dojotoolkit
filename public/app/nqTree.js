define(["dojo/_base/declare", "dojo/_base/lang", "app/nqWidgetBase", "dijit/Tree", 'app/nqObjectStoreModel',
        'dojo/dom-construct', 'dijit/tree/dndSource', 'dijit/Menu', 'dijit/MenuItem', 'dijit/PopupMenuItem', "dojo/_base/array",
        'dojo/query!css2'],
	function(declare, lang, nqWidgetBase, Tree, nqObjectStoreModel,
			domConstruct, dndSource, Menu, MenuItem, PopupMenuItem, array){

	return declare("nqTree", [nqWidgetBase], {
        postCreate: function(){
            this.inherited(arguments);
            this.createMenusForWidget();
        },
        _setDocIdAttr: function(docId) {
            if (docId == this.docId) return;
            this.inherited(arguments);

            if(this.tree &&
                'rootQuery' in this.schema &&
                'where' in this.schema.rootQuery &&
                'docProp' in this.schema.rootQuery.where)
            {
                var value = this.schema.rootQuery.where.value;
                if(value.substring(0, 1) != '$') return;
            }

            var self = this;

			if(self.tree) self.tree.destroy();

			this.treeModel = new nqObjectStoreModel({
				store : this.store,
                docId: self.docId,
                schema: self.schema
            });
			this.tree = new Tree({
                id: 'tree.'+self.id,
				store: self.store,
                schema: self.schema,
                model: self.treeModel,
				dndController: dndSource,
				betweenThreshold: 5, 
				persist: true,//doesnt deal well with recursion. Tends to expand everything
                getLabel: function(item){
                    if(!item) return 'no item';
                    if(item.docType == 'class') return item.title;
                    if(item.name) return item.name;
                    return '[unnamed]';
                },
				getIconClass: function(item, opened){
					return '';//for some reason this override is required
				},
                getIconStyle: function(item, opened){
                    //var self = this;
                    var icon;
                    if(!item) return '';
                    if('$queryName' in item) {
                        var query;
                        if(item.$queryName == 'rootQuery') query = self.schema.rootQuery;
                        else query = self.store.getSubQueryByName(self.schema.query, item.$queryName);
                        if('icon' in query) icon = query.icon;
                    }
                    if(!icon){
                        icon = self.getIconForObject(item);
                    }
                    return {backgroundImage: "url('"+icon+"')"}
                },
				getRowClass: function(item, opened){
                    //used by tree menu to determine which menu to show
					if(!item) return '';
                    //TODO if(!this.schema.updateAllowed(item)) return;
                    if('$queryName' in item) return 'css'+item.$queryName;
                    return '';
				},
				getTooltip: function(item, opened){
                    var self = this;
					if(!item) return '';
                    if(dojo.config.isDebug) {
                        var tt = {_id: item._id};
                        if ('$queryName' in item) {
                            var query;
                            if (item.$queryName == 'rootQuery') query = self.schema.rootQuery;
                            else query = self.model.getSubQueryByName(self.schema.query, item.$queryName);
                            var clonedQuery = lang.clone(query);
                            if(clonedQuery.icon) clonedQuery.icon = 'yes';
                            if(clonedQuery.join && clonedQuery.join.icon) clonedQuery.join.icon = 'yes';
                            tt.$query = clonedQuery;
                        }
                        return JSON.stringify(tt, null, 4);
                    }
				},
				onClick: function(item, node, evt){
					self.inherited('onClick',arguments);
                    var pageId;
                    if ('$queryName' in item) {
                        var query;
                        if (item.$queryName == 'rootQuery') query = self.schema.rootQuery;
                        else query = self.treeModel.getSubQueryByName(self.schema.query, item.$queryName);
                        pageId = query.pageId;
                    }
                    if(!pageId && 'pageId' in item) pageId = item.pageId;
                    if(pageId) nq.setHash(item._id, pageId, self.tabNum, self.widNum, self.level+1);
				},
                checkItemAcceptance: function(target, source, position){
					//var targetItem = dijit.getEnclosingWidget(target).item;
 					return true;
				},
				onLoad: function(){
					fullPage.resize();//need this for lazy loaded trees, some how the first tree lags behind
				}
			}, domConstruct.create('div'));
			this.pane.containerNode.appendChild(this.tree.domNode);
//			this.tree.startup();
		},
        _setSelectedIdAttr: function(selectedId){
            this.inherited(arguments);
            this.tree.set('selectedItem', selectedId);
        },
		createMenusForWidget: function() {
            var self = this;
            var menus = [];
            if('query' in this.schema) {
                this.schema.query.forEach(function (query) {
                    if('menu' in query){
                        var parentMenu = new Menu({
                            targetNodeIds: [self.pane.containerNode],
                            selector: ".css" + query.queryName
                        });
                        //var addMenu = new Menu({parentMenu: parentMenu});
                        query.menu.forEach(function(menuDef) {
                            if ('action' in menuDef) {
                                //var menu = new MenuItem();
                                parentMenu.addChild(new MenuItem({
                                    label: menuDef.label,
                                    iconClass: menuDef.iconClass,
                                    onClick: function (evt) {
                                        //var node = this.getParent().currentTarget;
                                        //var target = dijit.getEnclosingWidget(evt.target);
                                        //var tn = dijit.byNode(this.getParent().currentTarget);
                                        //var selectedItem = tn.item;
                                        var selectedItem = self.tree.get("selectedItem");
                                        var newDoc = {
                                            docType: 'object',
                                            name: '[new paragraph]',
                                            ownerId: "575d4c3f2cf3d6dc3ed83148",
                                            classId: "573435f03c6d3cd598a5a2e1",
                                            $queryName: query.queryName
                                        };
                                        var directives = {parentId: selectedItem._id, viewId: self.schema._id};
                                        self.store.add(newDoc, directives).then(function (newObj) {
                                            var selectedNodes = self.tree.getNodesByItem(selectedItem);
                                            selectedNodes[0]._loadDeferred = null;
                                            self.tree._expandNode(selectedNodes[0]).then(function (newObj) {
                                                //self.tree.set('selectedItem', newObj._id);
                                            });
                                        });
                                    }
                                }));
                            }
                            else if ('action' in menuDef) {
                                parentMenu.addChild(new MenuItem({
                                    label: menuDef.label,
                                    iconClass: menuDef.iconClass,
                                    onClick: function () {
                                        var pathArr = self.tree.path;
                                        var selectedItem = pathArr[pathArr.length - 1];
                                        var parentItem = pathArr[pathArr.length - 2];
                                        var directives = {oldParent: parentItem, viewId: self.viewId};
                                        self.store.remove(selectedItem, directives);
                                    }
                                }));
                            }
                        });
                    }
                });
            }
		}
	});
});
