define(["dojo/_base/declare", "app/nqWidgetBase", "dijit/Tree", 'app/nqObjectStoreModel',
        'dojo/dom-construct', 'dijit/tree/dndSource', 'dijit/Menu', 'dijit/MenuItem', 'dijit/PopupMenuItem', "dojo/_base/array",
        'dojo/query!css2'],
	function(declare, nqWidgetBase, Tree, nqObjectStoreModel,
			domConstruct, dndSource, Menu, MenuItem, PopupMenuItem, array){

	return declare("nqTree", [nqWidgetBase], {
        postCreate: function(){
            this.inherited(arguments);
            this.createMenusForWidget();
        },
        _setDocIdAttr: function(docId){
            var self = this;

            if(self.widget.rootDocId) {
                if(self.docId == self.widget.rootDocId) return;
                self.docId = self.widget.rootDocId;
            }
            else {
                if(self.docId == docId) return;
                this.inherited(arguments);
            }

			if(self.tree) self.tree.destroy();

			this.treeModel = new nqObjectStoreModel({
				store : this.store,
                query: {_id:  self.docId},
                //query: self.schema.query,
                schema: self.schema
            });
			this.tree = new Tree({
                id: 'tree.'+self.id,
				store: this.store,
                model: this.treeModel,
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
                    var icon = '';
                    if(!item) return '';
                    else if(item.icon) icon = item.icon;
                    else {
                        var viewObj = self.store.cachingStore.getSync(item.viewId);
                        if(viewObj.icon) icon = viewObj.icon;
                    }
                    return {backgroundImage: "url('"+icon+"')"}
                },
				getRowClass: function(item, opened){
					if(!item) return '';
                    //TODO if(!this.schema.updateAllowed(item)) return;
					return 'css'+item.viewId;//used by tree menu to determine which menu to show
				},
				getTooltip: function(item, opened){
					if(!item) return '';
                    var viewObj = self.store.cachingStore.getSync(item.viewId);
					if(dojo.config.isDebug) return JSON.stringify({
                        _id: item._id,
                        schemaName: viewObj.name,
                        query: viewObj.query,
                        childrenQuery: viewObj.childrenQuery,
                        childrenView: viewObj.childrenView
                    }, null, 4)
				},
				onClick: function(item, node, evt){
					self.inherited('onClick',arguments);
                    //var pageId = item.pageId;
                    //if(!pageId) pageId = self.widget.pageId;
                    var pageId = self.widget.pageId;
                    if(!pageId) pageId = item.pageId;
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
		createMenusForWidget: function(){
			var self = this;
            var parentMenu = new Menu({targetNodeIds: [this.pane.containerNode], selector: ".css" + self.schema._id});//selector: '.dijitTreeNode'
            //this.parentMenu = parentMenu;
            //var parentMenu = new Menu({targetNodeIds: [self.tree.domNode], selector: ".css"+viewId});
            var addMenu = new Menu({parentMenu: parentMenu});
            parentMenu.addChild(new MenuItem({
                label: "Add Child",
                iconClass: "addIcon",
                //popup: addMenu,
               // viewId: viewId,
                onClick: function(evt){
                    //var node = this.getParent().currentTarget;
                    //var target = dijit.getEnclosingWidget(evt.target);
                    //var tn = dijit.byNode(this.getParent().currentTarget);
                    //var selectedItem = tn.item;
                    var selectedItem = self.tree.get("selectedItem");
                    var directives = {parentId: selectedItem._id, ownerId: self.rootDocId, schema: self.schema};
                    self.store.add(null, directives).then(function(newObj){
                        var selectedNodes = self.tree.getNodesByItem(selectedItem);
                        selectedNodes[0]._loadDeferred = null;
                        self.tree._expandNode(selectedNodes[0]).then(function(newObj){
                            //self.tree.set('selectedItem', newObj._id);
                        });
                    });
                }
            }));

            parentMenu.addChild(new MenuItem({
                label:"Delete",
                iconClass:"removeIcon",
                //viewId: viewId,
                onClick: function(){
                    var pathArr = self.tree.path;
                    var selectedItem = pathArr[pathArr.length-1];
                    var parentItem = pathArr[pathArr.length-2];
                    var directives = {oldParent:parentItem, viewId: this.viewId};
                    self.store.remove(selectedItem, directives);
                }
            }));
                /*var uViewObj = self.permittedClassesByViewObj[viewId];
                if(viewId!=844){
                    parentMenu.addChild(new MenuItem({
                        label:"Delete",
                        iconClass:"removeIcon",
                        viewId: viewId,
                        disabled: self.store.updateAllowed(self.tree.get("selectedItem")),
                        onClick: function(){
                            var pathArr = self.tree.path;
                            var selectedItem = pathArr[pathArr.length-1];
                            var parentItem = pathArr[pathArr.length-2];
                            var directives = {oldParent:parentItem, viewId: this.viewId};
                            self.store.remove(selectedItem, directives);
                        }
                    }));
                    for(var uViewId in uViewObj){
                        var manyViewObj = uViewObj[uViewId];
                        var manyView = manyViewObj.view;
                        var permittedClassesArr = manyViewObj.classes;
                        for(var i=0;i<permittedClassesArr.length;i++){
                            var classesObj = permittedClassesArr[i];

                            var menuItem = new MenuItem({
                                label: "<b>"+classesObj.name+"</b> by <span style='color:blue'>"+manyView.toManyAssociations+"</span>",
                                iconClass: "icon"+classesObj._id,
                                classId: classesObj._id,
                                viewId: manyView._id
                            });
                            menuItem.on("click", function(evt){
                                var addObj = {
                                    'type': 'object',
                                    '_icon': this.classId
                                };
                                var selectedItem = self.tree.get("selectedItem");
                                var directives = {parent: selectedItem, viewId: this.viewId, classId:this.classId};
                                self.store.add(addObj, directives);

                                var selectedNodes = self.tree.getNodesByItem(selectedItem);
                                if(!selectedNodes[0].isExpanded){
                                    self.tree._expandNode(selectedNodes[0]);
                                }
                                self.tree.set('selectedItem', addObj._id);
                            });
                            addMenu.addChild(menuItem);
                        }
                    }
                }
                else{//exception for class model
                    parentMenu.addChild(new MenuItem({
                        label:"Delete",
                        iconClass:"removeIcon",
                        onClick: function(){
                            var pathArr = self.tree.path;
                            var selectedItem = pathArr[pathArr.length-1];
                            var parentItem = pathArr[pathArr.length-2];
                            var directives = {oldParent:parentItem, viewId: 844};
                            self.store.remove(selectedItem, directives);
                        }
                    }));
                    var classMenuItem = new MenuItem({
                        label: "<b>Class</b> by <span style='color:blue'>children</span>",
                        iconClass: "icon0"
                    });
                    classMenuItem.on("click", function(evt){
                        var addObj = {
                            'type': 'class',
                            '_icon': 0
                        };
                        var selectedItem = self.tree.get("selectedItem");
                        var directives = {parent: selectedItem, viewId: 844};
                        self.store.add(addObj, directives);

                        var selectedNodes = self.tree.getNodesByItem(selectedItem);
                        if(!selectedNodes[0].isExpanded){
                            self.tree._expandNode(selectedNodes[0]);
                        }
                        self.tree.set('selectedItem', addObj._id);
                    });
                    addMenu.addChild(classMenuItem);
                    var objectMenuItem = new MenuItem({
                        label: "<b>Object</b> by <span style='color:blue'>children</span>",
                        iconClass: "icon1"
                    });
                    objectMenuItem.on("click", function(evt){
                        var selectedItem = self.tree.get("selectedItem");
                        var addObj = {
                            'type': 'object',
                            '_icon': selectedItem._id
                        };
                        var directives = {parent: selectedItem, viewId: 844};
                        self.store.add(addObj, directives);

                        var selectedNodes = self.tree.getNodesByItem(selectedItem);
                        if(!selectedNodes[0].isExpanded){
                            self.tree._expandNode(selectedNodes[0]);
                        }
                        self.tree.set('selectedItem', addObj._id);
                    });
                    addMenu.addChild(objectMenuItem);
                }
            }*/
		}
	});
});
