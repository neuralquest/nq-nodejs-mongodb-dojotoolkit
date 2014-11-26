define(['dojo/_base/declare', 'dojo/_base/array',  "dojo/_base/lang", "dojo/dom-style",'dijit/form/Select', 'dijit/Toolbar', 'dijit/form/DateTextBox', 'dojo/when', "dojo/promise/all", 
         'dijit/Editor', 'dojo/store/Memory', 'dojo/dom-construct', "dojo/on", "dojo/cookie", "dojo/hash", "dijit/form/ToggleButton",
         "app/nqWidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/sniff", "dojo/date/locale", "dojo/html",
        'dgrid/OnDemandGrid', 'dgrid/Editor', 'dgrid/Selector', 'dgrid/Keyboard', 'dgrid/extensions/DijitRegistry', "dgrid/extensions/DnD",
        "dgrid/Selection", "dijit/form/Button","dojo/_base/array", "dijit/registry",
        "dojo/date/stamp", 'dojo/promise/instrumentation', 
        
        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins', 
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
	function(declare, arrayUtil, lang, domStyle, Select, Toolbar, DateTextBox, when, all, 
			RTFEditor, Memory, domConstruct, on, cookie, hash, ToggleButton,
			nqWidgetBase, ContentPane, domGeometry, has, locale, html, 
			Grid, Editor, Selector, Keyboard, DijitRegistry, Dnd,
			Selection, Button, array, registry,
			stamp, instrumentation){
   
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
			var siblingButton = new ToggleButton({
		        showLabel: true,
		        label: 'Add Row',
				iconClass: 'addIcon',
		        onClick: function(evt){
					//get the class that this view maps to
					when(self.store.getOneByAssocType(item.viewId, MAPSTO_ASSOC, 0), function(classId){
						if(!classId) throw new Error('View '+item.viewId+' must map to one class ');
						var addObj = {
							viewId: self.viewIdsArr[0], //TODO what about more than one
							classId: classId
						};
						var directives = {
								parent:{id:self.selectedObjIdPreviousLevel}
						};
						var newItem = self.store.add(addObj, directives);
						when(newItem, function(item){
							self.grid.refresh();//we should be getting refresh from observe
							self.grid.select(item);
						});
					});

		        },
				style : {'margin-left':'5px'} 
			});
			this.normalToolbar.addChild(siblingButton);
			// Add delete toggle button
			this.deleteButton = new ToggleButton({
		        showLabel: true,
		        checked: false,
		        label: 'Delete Row',
				iconClass: 'removeIcon',
				style : {'margin-left':'5px'} 
			});
			this.normalToolbar.addChild(this.deleteButton);
			this.pageToolbarDivNode.appendChild(this.normalToolbar.domNode);
	
			var MANYTOMANY_ASSOC = 10;	//TO MANY
			var OBJECT_TYPE = 1;
			//something wierd just happend. I have to add dojo. to when, else it dont work: object is not a function
			//recursivily get all of the views that belong to this widget
			dojo.when(self.store.getManyByAssocType(this.widgetId, MANYTOMANY_ASSOC, OBJECT_TYPE, true), function(viewIdsArr){
				self.viewIdsArr = viewIdsArr;
				var attrRefPropertiesPromisses = [];
				for(var i=0;i<viewIdsArr.length;i++){
					var viewId = viewIdsArr[i];
					attrRefPropertiesPromisses.push(dojo.when(self.getAttrRefProperties(viewId)));
				}
				return when(all(attrRefPropertiesPromisses), function(arrayOfArrays){
					var merged = [];
					merged[0] = { label: ' ', selector: 'checkbox', width:'2em'};
					var columns = merged.concat.apply(merged, arrayOfArrays);

					/*for(var i=0;i<propertiesArr.length;i++){
						var property = propertiesArr[i];
						switch(property.attrClassType){
						case PERMITTEDVAULE_CLASS_ID: 
							property.renderCell = function(object, value, node, options){
								var selectedOption = this.editorArgs.store.get(value);
								if(selectedOption) node.appendChild(document.createTextNode(selectedOption.name));
								else node.appendChild(document.createTextNode('id: '+value));
							};
							break;	
						case RTF_CLASS_ID: 
							self.editorToolbarDivNode.appendChild(property.editorArgs.toolbar.domNode);
							property.renderCell = function(object, value, node, options) {
								html.set(node, value);
							};
							//Editor.editor(toolbar);
							break;	
						case DATE_CLASS_ID:
							property.renderCell = function(object, value, node, options) {
								console.log('value', value);
								if(!value || value=='') return;
								var date = null;
								if(lang.isObject(value)) date = value;//the date widget returns an date object
								else date = dojo.date.stamp.fromISOString(value);
								html.set(node, date.toLocaleDateString());
							};
							property.set = function(item) {
								var value = item[prop.name];
								if(!value) return;
								return value.toISOString();
							};
							property.autoSave = true;
							break;	
						case STRING_CLASS_ID:
							break;	
						case INTEGER_CLASS_ID: 
							break;	
						case NUMBER_CLASS_ID: 
							break;	
						case BOOLEAN_CLASS_ID: 
							break;
						default:
						};
					}*/

					//console.log('propertiesArr', propertiesArr);
					self.grid = new (declare([Grid, Selector, Keyboard, DijitRegistry, Dnd, Editor]))({
						collection: self.store,
						//'id' : 'widget'+state.tabId,
						'class': '.nqGrid',
						//'store': self.store,
						'selectionMode': "single",
						'loadingMessage': 'Loading data...',
						'noDataMessage': 'No data.',
						'query': {parentId: self.selectedObjIdPreviousLevel, widgetId: self.widgetId, join:true},
						'columns': columns,
						'cleanAddedRules': true,
						'className': "dgrid-autoheight",// version dgrid 0.3.14
						'getBeforePut':false// temporary fix for the fact that a get without a viewId ruins the item sent to the put 
					}, domConstruct.create('div'));
//							for(var key in gridStyle){
//								this.grid.styleColumn(key, gridStyle[key]);
//							}
					self.pane.containerNode.appendChild(self.grid.domNode);

					self.grid.on("dgrid-error", function(event) {
						//nq.errorDialog;
						// Display an error message above the grid when an error occurs.
		    	    	new dijit.Dialog({title: "Get Error", extractContent: true, content: event.error.message}).show();
					});
									
					self.grid.on(".dgrid-row:click", function(event){
						var item = self.grid.row(event).data;
						if(self.deleteButton.get('checked')){
							self.deleteButton.set('checked', false);
							self.store.remove(item.id, item.viewId);//what if there is more than one view?

							self.grid.refresh();
						}
						else{
							var item = self.grid.row(event).data;
							//var level = self.level;
							nq.setHashViewId(self.level, item.viewId, self.tabId, item.id);	
						}
					});
					/*self.grid.on("dgrid-refresh-complete", function(event){
//								var row = grid.row(event);
								console.log("Row complete:", event);
							});
							*/
					//self.grid.startup();
					self.own(self.normalToolbar);
					self.own(self.grid);
					self.createDeferred.resolve(self);//ready to be loaded with data					
				}, nq.errorDialog);
			}, nq.errorDialog);
		},
		setSelectedObjIdPreviousLevel: function(value){
			//load the data
			if(this.selectedObjIdPreviousLevel == value) return this;
			this.selectedObjIdPreviousLevel = value;
			
			//does this return a promise?
			this.grid.set('query',{parentId: value, widgetId: this.widgetId, join:true});
			var promise = this.grid.refresh();
			
			return this;//TODO
			return this.setSelectedObjIdPreviousLevelDeferred.promise;
			this.setSelectedObjIdPreviousLevelDeferred.resolve(this);
		}
	});
});
