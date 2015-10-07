define(['dojo/_base/declare', 'dojo/_base/array',  "dojo/_base/lang", "dojo/dom-style",'dijit/form/Select', 'dijit/Toolbar', 'dijit/form/DateTextBox', 'dojo/when', "dojo/promise/all", 
         'dijit/Editor', 'dojo/store/Memory', 'dojo/dom-construct', "dojo/on", "dojo/cookie", "dojo/hash", "dijit/form/ToggleButton",
         "app/nqWidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/sniff", "dojo/date/locale", "dojo/html", 'dgrid/extensions/ColumnResizer',
        'dgrid/OnDemandGrid', 'dgrid/Editor', 'dgrid/Selector', 'dgrid/Keyboard', 'dgrid/extensions/DijitRegistry', "dgrid/extensions/DnD",
        "dgrid/Selection", "dijit/form/Button","dojo/_base/array", "dijit/registry",
        "dojo/date/stamp", //'dGrid/_StoreMixin', 
        
        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins', 
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
	function(declare, arrayUtil, lang, domStyle, Select, Toolbar, DateTextBox, when, all, 
			RTFEditor, Memory, domConstruct, on, cookie, hash, ToggleButton,
			nqWidgetBase, ContentPane, domGeometry, has, locale, html, ColumnResizer,
			Grid, Editor, Selector, Keyboard, DijitRegistry, Dnd,
			Selection, Button, array, registry,
			stamp/*, nqRenderAllMixin*/){
   
	return declare("nqTable", [nqWidgetBase], {
		viewIdsArr: [],
		
		postCreate: function(){
			this.inherited(arguments);

			//initially show the toolbar div
			domStyle.set(this.pageToolbarDivNode, 'display' , '');
			// Create toolbar and place it at the top of the page
			this.normalToolbar = new Toolbar({});
			var self = this;
			// Add sibling toggle button
			var siblingButton = new Button({
		        showLabel: true,
		        label: 'Add Row',
				iconClass: 'addIcon',
		        onClick: function(evt){
					var viewId = self.viewIdsArr[0]; //TODO what about more than one
					//get the class that this view maps to
					when(self.store.getOneByAssocType(viewId, MAPSTO_ASSOC, 0), function(classId){
						if(!classId) throw new Error('View '+item.viewId+' must map to one class ');
						var addObj = {
							viewId: viewId, //TODO what about more than one
							classId: classId
						};
						var directives = {parent:{id:self.selectedObjIdPreviousLevel}};
						self.store.add(addObj, directives);
					});

		        },
				style : {'margin-left':'5px'} 
			});
			this.normalToolbar.addChild(siblingButton);
			// Add delete toggle button
			this.deleteButton = new Button({
		        showLabel: true,
		        checked: false,
		        label: 'Delete Row',
				iconClass: 'removeIcon',
				style : {'margin-left':'5px'}, 
		        onClick: function(evt){
		        	for(var rowid in self.grid.selection){ 
		        		var item=self.grid.row(rowid).data; 
						var directives = {parent:{id:self.selectedObjIdPreviousLevel}};
	                    self.store.remove(item.id, item.viewId, directives);//what if there is more than one view?
		        	}
				}
			});
			this.normalToolbar.addChild(this.deleteButton);
			this.pageToolbarDivNode.appendChild(this.normalToolbar.domNode);

            var self = this;
            var columnsPromise =  self.store.get(self.widgetId).then(function(widget){
                self.widget = widget;
                self.headerDivNode.innerHTML = '<h1>'+widget.name+'</h1>';
                self.pageHelpTextDiv.innerHTML = widget.description;
                return self.store.getItemsByAssocTypeAndDestClass(self.widgetId, 'manyToMany', VIEW_CLASS_TYPE).then(function(viewsArr) {
                    self.view = viewsArr[0]//for now assume only one view
                    var columns =[];
                    return self.store.getCombinedSchemaForView(self.view).then(function(schema) {
                        self.schema = self.enrichSchema(schema);
                        self.createDeferred.resolve(self);//ready to be loaded with data
                        for(var attrName in schema) {
                            var attribute = schema[attrName];
                            columns.push(attribute);
                            //console.dir('property',property);
                            if(attribute.dijitType == 'Select') {
                                attribute.renderCell = function(object, value, node, options){
                                    if(!value) html.set(node, '[not selected]');
                                    //if(!value) node.appendChild(document.createTextNode('[not selected]'));
                                    else{
                                        var selectedOption = this.editorArgs.store.get(value);
                                        if(selectedOption) node.appendChild(document.createTextNode(selectedOption.label));
                                        else node.appendChild(document.createTextNode('id: '+value));
                                    }
                                };
                                attribute.editor = Select;
                            }
                            else if(attribute.dijitType == 'RichText') {
                                self.editorToolbarDivNode.appendChild(attribute.editorArgs.toolbar.domNode);
                                attribute.renderCell = function(object, value, node, options) {
                                    html.set(node, value);
                                };
                                attribute.editor = RTFEditor;
                            }
                            else if(attribute.dijitType == 'String') {
                                attribute.editor == 'text';
                            }
                            else if(attribute.dijitType == 'Number') {
                                attribute.editor == 'number';
                            }
                            else if(attribute.dijitType == 'Boolean') {
                                attribute.editor = 'radio';
                            }
                            else if(attribute.dijitType == 'Date') {
                                attribute.renderCell = function(object, value, node, options) {
                                    console.log('value', value);
                                    if(!value || value=='') html.set(node, '[no date selected]');
                                    else {
                                        var date = null;
                                        if(lang.isObject(value)) date = value;//the date widget returns an date object
                                        else date = dojo.date.stamp.fromISOString(value);
                                        html.set(node, date.toLocaleDateString());
                                    }
                                };
                                /*attribute.set = function(item) {
                                 var value = item[this.field];
                                 if(!value) return;
                                 var date = dojo.date.stamp.fromISOString(value);
                                 return stamp.toISOString(date);
                                 };*/
                                //attribute.autoSave = true;
                                attribute.editor = DateTextBox;
                            }
                        }
                        return columns;
                    });
                });
            }, nq.errorDialog);
            columnsPromise.then(function(columns){
                var collection = self.store.filter({parentId: self.selectedObjIdPreviousLevel, parentViewId: self.widgetId, join:true});
                self.grid = new (declare([Grid, Selection, Keyboard, DijitRegistry, Dnd, Editor, ColumnResizer]))({
                    collection: collection,
                    selectionMode: "single",
                    loadingMessage: 'Loading data...',
                    noDataMessage: 'No data.',
                    columns: columns,
                    //subRows: [columns],
                    cleanAddedRules: true,
                    //className: "dgrid-autoheight",
                    //height: '',//needed for auto grow
                    getBeforePut:false// temporary fix for the fact that a get without a viewId ruins the item sent to the put
                }, domConstruct.create('div'));
//					self.grid.startup();
                for(var i=0;i<columns.length;i++){
                    var attribute = columns[i];
                    self.grid.styleColumn(i, attribute.style);
                }

                self.pane.containerNode.appendChild(self.grid.domNode);

                collection.on('remove, add, update', function(event){
                    self.grid.refresh();
                });
                self.grid.on(".dgrid-row:click", function(event){
                    var item = self.grid.row(event).data;
                    //var level = self.level;
                    nq.setHashViewId(self.level, item.viewId, self.tabId, item.id);
                });
                self.grid.on("dgrid-error", function(event) {
                    //nq.errorDialog;
                    // Display an error message above the grid when an error occurs.
                    new dijit.Dialog({title: "Get Error", extractContent: true, content: event.error.message}).show();
                });
                /*self.grid.on("dgrid-refresh-complete", function(event){
                 var row = grid.row(event);
                 console.log("Row complete:", event);
                 });
                 */



                self.own(self.normalToolbar);
                self.own(self.grid);
                self.createDeferred.resolve(self);//ready to be loaded with data
            });
            /*var self = this;
			this.getWidgetProperties(this.widgetId).then(function(widgetProps){
				console.log('widgetProp',widgetProps);
				self.widgetProps = widgetProps;
                var columns = [];
				widgetProps.views.forEach(function(view){
					view.properties.forEach(function(property){
                        columns.push(property);
						//console.dir('property',property);
						if(property.dijitType == 'Select') {
                            property.renderCell = function(object, value, node, options){
                                if(!value) html.set(node, '[not selected]');
                                //if(!value) node.appendChild(document.createTextNode('[not selected]'));
                                else{
                                    var selectedOption = this.editorArgs.store.get(value);
                                    if(selectedOption) node.appendChild(document.createTextNode(selectedOption.label));
                                    else node.appendChild(document.createTextNode('id: '+value));
                                }
                            };
                            property.editor = Select;
                        }
						else if(property.dijitType == 'RichText') {
                            self.editorToolbarDivNode.appendChild(property.editorArgs.toolbar.domNode);
                            property.renderCell = function(object, value, node, options) {
                                html.set(node, value);
                            };
                            property.editor = RTFEditor;
						}
						else if(property.dijitType == 'String') {
                            property.editor == 'text';
						}
                        else if(property.dijitType == 'Number') {
                            property.editor == 'number';
                        }
                        else if(property.dijitType == 'Boolean') {
                            property.editor = 'radio';
                        }
						else if(property.dijitType == 'Date') {
                            property.renderCell = function(object, value, node, options) {
                                console.log('value', value);
                                if(!value || value=='') html.set(node, '[no date selected]');
                                else {
                                    var date = null;
                                    if(lang.isObject(value)) date = value;//the date widget returns an date object
                                    else date = dojo.date.stamp.fromISOString(value);
                                    html.set(node, date.toLocaleDateString());
                                }
                            };
                            /*property.set = function(item) {
                             var value = item[this.field];
                             if(!value) return;
                             var date = dojo.date.stamp.fromISOString(value);
                             return stamp.toISOString(date);
                             };* /
                            //property.autoSave = true;
                            property.editor = DateTextBox;
						}
					});
				});
                var collection = self.store.filter({parentId: self.selectedObjIdPreviousLevel, parentViewId: self.widgetId, join:true});
                self.grid = new (declare([Grid, Selection, Keyboard, DijitRegistry, Dnd, Editor, ColumnResizer]))({
                    collection: collection,
                    selectionMode: "single",
                    loadingMessage: 'Loading data...',
                    noDataMessage: 'No data.',
                    columns: columns,
                    //subRows: [columns],
                    cleanAddedRules: true,
                    //className: "dgrid-autoheight",
                    //height: '',//needed for auto grow
                    getBeforePut:false// temporary fix for the fact that a get without a viewId ruins the item sent to the put
                }, domConstruct.create('div'));
//					self.grid.startup();
                for(var i=0;i<columns.length;i++){
                    var property = columns[i];
                    self.grid.styleColumn(i, property.style);
                }

                self.pane.containerNode.appendChild(self.grid.domNode);

                collection.on('remove, add, update', function(event){
                    self.grid.refresh();
                });
                self.grid.on(".dgrid-row:click", function(event){
                    var item = self.grid.row(event).data;
                    //var level = self.level;
                    nq.setHashViewId(self.level, item.viewId, self.tabId, item.id);
                });
                self.grid.on("dgrid-error", function(event) {
                    //nq.errorDialog;
                    // Display an error message above the grid when an error occurs.
                    new dijit.Dialog({title: "Get Error", extractContent: true, content: event.error.message}).show();
                });
                /*self.grid.on("dgrid-refresh-complete", function(event){
                 var row = grid.row(event);
                 console.log("Row complete:", event);
                 });
                 * /



                self.own(self.normalToolbar);
                self.own(self.grid);
                self.createDeferred.resolve(self);//ready to be loaded with data
			}, nq.errorDialog);*/
		},
		setSelectedObjIdPreviousLevel: function(value){
			//load the data
			if(this.selectedObjIdPreviousLevel == value) return this;
			this.selectedObjIdPreviousLevel = value;
			
			//does this return a promise?
			//var collection = this.store;
			var collection = this.store.filter({parentId: value, parentViewId: this.widgetId, join:true});
			var promise = this.grid.set('collection', collection);

//			this.grid.set('query',{parentId: value, widgetId: this.widgetId, join:true});
			//var promise = this.grid.refresh();
			
			return this;//TODO
			return this.setSelectedObjIdPreviousLevelDeferred.promise;
			this.setSelectedObjIdPreviousLevelDeferred.resolve(this);
		}

	});
});

