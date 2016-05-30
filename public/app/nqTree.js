define(["dojo/_base/declare", "app/nqWidgetBase", "dijit/Tree", 'dojo/_base/lang', "dijit/registry", 'app/nqObjectStoreModel',/*"dijit/tree/ObjectStoreModel",*/ "dojo/hash","dojo/when", "dojo/promise/all",
        'dojo/dom-construct', 'dijit/tree/dndSource', 'dijit/Menu', 'dijit/MenuItem', 'dijit/PopupMenuItem', "dojo/_base/array",
        'dojo/query!css2'],
	function(declare, nqWidgetBase, Tree, lang, registry, nqObjectStoreModel, hash, when, all,
			domConstruct, dndSource, Menu, MenuItem, PopupMenuItem, array){

	return declare("nqTree", [nqWidgetBase], {
		setDocId: function(id){
            var self = this;
            if(self.rootDocId == self.widget.rootDocId) return;
            self.rootDocId = self.widget.rootDocId;
			if(self.tree) self.tree.destroy();

			this.treeModel = new nqObjectStoreModel({
				//childrenAttr: this.viewIdsArr,
				store : this.store,
                query: {_id:  self.rootDocId},
                arrayNames: self.schema.childArrayNames,
                view: self.schema
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
                    return item.name;
                },
				getIconClass: function(item, opened){
					if(!item) return 'icondefault';
                    if(item.docType == 'class') return 'icon0';
					//if(item.type == 'assoc') return 'icon'+item._icon;
					return 'icon1';
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
                    var pageId = item.pageId;
                    if(!pageId) pageId = self.widget.pageId;
                    if(pageId) nq.setHash(item._id, pageId, self.tabNum, self.widNum, self.level+1);
				},
                /*mayHaveChildren: function(item){
                    //return 'children' in item;
                    return true;
                },
                checkItemAcceptance: function(target, source, position){
					var targetItem = dijit.getEnclosingWidget(target).item;
					var uViewObj = self.permittedClassesByViewObj[targetItem._viewId];
					var sourceItemClassId = source.current.item._icon;
                    var found = false;
                    for(var uViewId in uViewObj) {
                        var permClassesArr = uViewObj[uViewId].classes;
                        permClassesArr.forEach(function(permClass){
                            var permClassId = permClass._id;
                            // Why the f doesnt this work?
                            //if(permClassId == sourceItemClassId) return true;
                            //if(permClassId == sourceItemClassId) console.log('sourceItemClassId', sourceItemClassId);
                            if(permClassId == sourceItemClassId) found = true;
                        });
                    }
 					return found;
				},

				getRoot: function(onItem, onError){
                    self.store.get( self.rootDocId).then(function(item) {
                        onItem(item);
                    });
				},*/
				onLoad: function(){
					fullPage.resize();//need this for lazy loaded trees, some how the first tree lags behind
					//console.dir(self.createDeferred.resolve(self));
//					self.createDeferred.resolve(self);//ready to be loaded with data/
//					self.setDocIdDeferred.resolve(self);
				}
			}, domConstruct.create('div'));
			this.pane.containerNode.appendChild(this.tree.domNode);
//			this.tree.startup();
		},
        setSelectedObjIdThisLevel: function(itemId){
            if(!itemId) return;
            var self = this;
            //var itemNode = this.tree.getNodesByItem[846];
            //console.log('itemNode', itemNode);
            //this.tree.set('path', [842, 1784, 2387, 846]);



            var promises = [];
            var viewsArr = [];
            //find the class of the current item
            promises.push(self.store.getItemsByAssocType(itemId, 'parent'));
            promises.push(self.store.getUniqueViewsForWidget(self.widgetId, viewsArr));
            var pathPromises = all(promises).then(function(promiseResults){
                var itemClass = promiseResults[0][0];
                var allowedClassesPromises = [];
                viewsArr.forEach(function(view){
                    if(view.mapsTo) allowedClassesPromises.push(self.store.collectAllByAssocType(view.mapsTo, 'subclasses'));
                    else allowedClassesPromises.push([]);
                });
                return all(allowedClassesPromises).then(function(allowedClassesArrArr){
                    var count = 0;
                    var restultsArr = [];
                    var treePathPromises = [];
                    allowedClassesArrArr.forEach(function(allowedClassesArr){
                        var view = viewsArr[count];
                        allowedClassesArr.forEach(function(allowedClass){
                            if(itemClass._id == allowedClass._id){
                                treePathPromises.push(self.store.getTreePath(view, itemId, restultsArr, 0));
                            }
                        });
                        count++;
                    });
                    return all(treePathPromises).then(function(tree){
                        return restultsArr;
                    });
                });
            });
            pathPromises.then(function(treePaths){
                console.log('treePaths',treePaths);
                if(treePaths[0] == 702) treePaths = [846,2016,702];
                self.tree.set('path', treePaths).then(function(results){
                    console.log('results',results);
                    //self.tree.set('selectedItem', result[results.length-1]);
                }, function(err){console.log('defect in set tree path');});
            }, nq.errorDialog);
        },
        permittedClassesForUniqueView: function(uView){
            var self = this;
            self.store.getItemsByAssocTypeAndDestClass(uView._id, 'manyToMany', VIEW_CLASS_TYPE).then(function(manyViewsArr){
                var permClassesPromises = [];
                manyViewsArr.forEach(function(manyView){
                    if(manyView.mapsTo) permClassesPromises.push(self.store.collectAllByAssocType(manyView.mapsTo, 'subclasses'));
                });
                return all(permClassesPromises).then(function(permClassesArrArr){
                    //console.log('permClassesArrArr',permClassesArrArr);
                    var permObj = {};
                    var count = 0;
                    permClassesArrArr.forEach(function(permClassesArr){
                        var manyView = manyViewsArr[count];
                        permObj[manyView._id] = {view: manyView, classes: permClassesArr};
                        count++;
                    });
                    self.permittedClassesByViewObj[uView._id] = permObj;
                    //console.log('permObj',uView._id,permObj);
                    return true;
                });
            });
        },
		createMenusForWidget: function(){
			var self = this;
            for(var viewId in self.permittedClassesByViewObj) {
                var parentMenu = new Menu({targetNodeIds: [this.pane.containerNode], selector: ".css"+viewId});
                //var parentMenu = new Menu({targetNodeIds: [self.tree.domNode], selector: ".css"+viewId});
                var addMenu = new Menu({parentMenu: parentMenu});
                parentMenu.addChild(new PopupMenuItem({
                    label:"Add New",
                    iconClass:"addIcon",
                    popup: addMenu,
                    viewId: viewId
                }));
                var uViewObj = self.permittedClassesByViewObj[viewId];
                if(viewId!=844){
                    parentMenu.addChild(new MenuItem({
                        label:"Delete",
                        iconClass:"removeIcon",
                        viewId: viewId,
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
            }
		}
	});
});
