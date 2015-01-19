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

			var PERMITTEDVAULE_CLASS_ID = 58;
			var RTF_CLASS_ID = 65;
			var DATE_CLASS_ID = 52;
			var STRING_CLASS_ID = 54;
			var INTEGER_CLASS_ID = 55;
			var NUMBER_CLASS_ID = 56;
			var BOOLEAN_CLASS_ID = 57;
			

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
	
			when(this.getAttrRefPropertiesForWidget(this.widgetId), function(attrRefByViewArr){
				var columns = [];
				/*var iconColumn = {
					label: "",
					field: "classId",
					formatter: function (value) {
						return '<img class="icon'+value+'"/>';
					},
					style: 'width:2em'
			    };
				columns.push(iconColumn);*/
				for(viewId in attrRefByViewArr) {
					var subViewsArr = attrRefByViewArr[viewId];
					columns = columns.concat(subViewsArr); 
				}
				for(var i=0;i<columns.length;i++){
					var property = columns[i];
					switch(property.attrClassType){
					case PERMITTEDVAULE_CLASS_ID: 
						property.renderCell = function(object, value, node, options){
							if(!value) html.set(node, '[not selected]');
							//if(!value) node.appendChild(document.createTextNode('[not selected]'));
							else{
								var selectedOption = this.editorArgs.store.get(value);
								if(selectedOption) node.appendChild(document.createTextNode(selectedOption.name));
								else node.appendChild(document.createTextNode('id: '+value));
							}
						};
						property.editor = Select;
						break;	
					case RTF_CLASS_ID: 
						self.editorToolbarDivNode.appendChild(property.editorArgs.toolbar.domNode);
						property.renderCell = function(object, value, node, options) {
							html.set(node, value);
						};
						property.editor = RTFEditor;
						break;	
					case DATE_CLASS_ID:
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
						};*/
						//property.autoSave = true;
						property.editor = DateTextBox;
						break;	
					};
				}
				var collection = self.store.filter({parentId: self.selectedObjIdPreviousLevel, widgetId: self.widgetId, join:true});
				if(self.widgetId == 2393){
					var subRows = [];
					subRows[0] = [columns[0],columns[2]];
					subRows[0][1].rowSpan = 3;
					subRows[1] = [columns[1]];
					subRows[2] = [{label:'Name'}];
					//subRows = [[{label: 'First'},{label: 'First', rowSpan: 3}],[{label: 'First'}], [{label: 'First'}]];
					self.grid = new (declare([Grid, Selection, Keyboard, DijitRegistry, Dnd, Editor, ColumnResizer]))({
						collection: collection,
						selectionMode: "single",
						loadingMessage: 'Loading data...',
						noDataMessage: 'No data.',
						subRows: subRows,
						cleanAddedRules: true,
						//className: "dgrid-autoheight",
						//height: '',//needed for auto grow
						getBeforePut:false// temporary fix for the fact that a get without a viewId ruins the item sent to the put 
					}, domConstruct.create('div'));
//					self.grid.startup();
					self.grid.styleColumn(0, 'width:2em');	
				}
				else{
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
			}, nq.errorDialog);
		},
		setSelectedObjIdPreviousLevel: function(value){
			//load the data
			if(this.selectedObjIdPreviousLevel == value) return this;
			this.selectedObjIdPreviousLevel = value;
			
			//does this return a promise?
			//var collection = this.store;
			var collection = this.store.filter({parentId: value, widgetId: this.widgetId, join:true});
			var promise = this.grid.set('collection', collection);

//			this.grid.set('query',{parentId: value, widgetId: this.widgetId, join:true});
			//var promise = this.grid.refresh();
			
			return this;//TODO
			return this.setSelectedObjIdPreviousLevelDeferred.promise;
			this.setSelectedObjIdPreviousLevelDeferred.resolve(this);
		}
	});
});
