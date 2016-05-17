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
			domStyle.set(this.pageToolbarDivNode, 'display' , 'block');
			// Create toolbar and place it at the top of the page
			this.normalToolbar = new Toolbar({});
			var self = this;
			// Add sibling toggle button
			var siblingButton = new Button({
		        showLabel: true,
		        label: 'Add Row',
				iconClass: 'addIcon',
		        onClick: function(evt){
                    var addObj = {
                        viewId: self.view._id, //TODO what about more than one
                        classId: self.view.mapsTo
                    };
                    var directives = {parent:{id:self.docId}};
                    self.store.add(addObj, directives);
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
						var directives = {parent:{id:self.docId}};
	                    self.store.remove(item.id, item.viewId, directives);//what if there is more than one view?
		        	}
				}
			});
			this.normalToolbar.addChild(this.deleteButton);
			this.pageToolbarDivNode.appendChild(this.normalToolbar.domNode);

            var columns = [];
            for(var attrName in self.schema.properties) {
                var attrProps = self.schema.properties[attrName];
                columns.push(attrProps);
                if(attrProps.enum){
                    attrProps.renderCell = function(object, value, node, options){
                        if(!value) html.set(node, '[not selected]');
                        //if(!value) node.appendChild(document.createTextNode('[not selected]'));
                        else{
                            var selectedOption = this.editorArgs.store.get(value);
                            if(selectedOption) node.appendChild(document.createTextNode(selectedOption.label));
                            else node.appendChild(document.createTextNode('id: '+value));
                        }
                    };
                    attrProps.editor = Select;
                }
                else if(attrProps['#ref']){
                    attrProps.renderCell = function(object, value, node, options){
                        if(!value) html.set(node, '[not selected]');
                        //if(!value) node.appendChild(document.createTextNode('[not selected]'));
                        else{
                            var selectedOption = this.editorArgs.store.get(value);
                            if(selectedOption) node.appendChild(document.createTextNode(selectedOption.label));
                            else node.appendChild(document.createTextNode('id: '+value));
                        }
                    };
                    attrProps.editor = Select;
                }
                else if(attrProps.media && attrProps.media.mediaType == 'text/html'){
                    self.editorToolbarDivNode.appendChild(attrProps.editorArgs.toolbar.domNode);
                    attrProps.renderCell = function(object, value, node, options) {
                        if(!value) html.set(node, '<p>[no text]</p>');
                        else html.set(node, value);
                    };
                    attrProps.get = function(item){
                        var value = item[attrName];
                        if(!value) return '<p>[no text]</p>';//editor will crash if it does not have a value
                        return value;
                    };
                    attrProps.editor = RTFEditor;
                }
                else if(attrProps.media && attrProps.media.mediaType == 'text/json'){
                }
                else if(attrProps.type == 'string'){
                    attrProps.renderCell = function(object, value, node, options) {
                        if(!value) html.set(node, '[null]');
                        else html.set(node, value);
                    };
                    attrProps.editor == 'text';
                }
                else if(attrProps.type == 'number') {
                    attrProps.renderCell = function(object, value, node, options) {
                        if(!value) html.set(node, '[null]');
                        else html.set(node, String(value));
                    };
                    attrProps.editor == 'number';
                }
                else if(attrProps.type == 'date'){
                    attrProps.renderCell = function(object, value, node, options) {
                        console.log('value', value);
                        if(!value || value=='') html.set(node, '[no date selected]');
                        else {
                            var date = null;
                            if(lang.isObject(value)) date = value;//the date widget returns an date object
                            else date = dojo.date.stamp.fromISOString(value);
                            html.set(node, date.toLocaleDateString());
                        }
                    };
                    /*attrProps.set = function(item) {
                     var value = item[this.field];
                     if(!value) return;
                     var date = dojo.date.stamp.fromISOString(value);
                     return stamp.toISOString(date);
                     };*/
                    //attrProps.autoSave = true;
                    attrProps.editor = DateTextBox;
                }
                else if(attrProps.type == 'boolean'){
                    attrProps.renderCell = function(object, value, node, options) {
                        if(!value) html.set(node, 'false');
                        else html.set(node, String(value));
                    };
                    attrProps.editor = 'radio';
                }
                else if(attrProps.type == 'object'){
                    attrProps.renderCell = function(object, value, node, options) {
                        if(!value) html.set(node, '{}');
                        else html.set(node, JSON.stringify(value, null, 4));
                    };
                    attrProps.editor == 'text';
                }
            }
            self.grid = new (declare([Grid, Selection, Keyboard, DijitRegistry, Dnd, Editor, ColumnResizer]))({
                //collection: collection,
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
                var attrProps = columns[i];
                self.grid.styleColumn(i, attrProps.style);
            }

            self.pane.containerNode.appendChild(self.grid.domNode);

            //collection.on('remove, add, update', function(event){
            //    self.grid.refresh();
            //});
            /*self.grid.on(".dgrid-row:click", function(event){
             var item = self.grid.row(event).data;
             //var level = self.level;
             var id = item._id;
             nq.setHashViewId(self.level, self.view._id, self.tabId, id);
             });*/
            self.grid.on('dgrid-select', function (event) {
                // Report the item from the selected row to the console.
                var id = event.rows[0].data._id;
                if(!id) id = event.rows[0].data.id;
                console.log('Row selected: ', event.rows);
                nq.setHashViewId(self.level, self.view._id, self.tabId, id);
            });
            self.grid.on("dgrid-error", function(event) {
                //nq.errorDialog;
                // Display an error message above the grid when an error occurs.
                new dijit.Dialog({title: "DGrid Error", extractContent: true, content: event.error.message}).show();
            });
            /*self.grid.on("dgrid-refresh-complete", function(event){
             var row = grid.row(event);
             console.log("Row complete:", event);
             });
             */



            self.own(self.normalToolbar);
            self.own(self.grid);
		},
		setDocId: function(id){
            if(id.length == 0) return;
            //load the data
			if(this.docId == id) return this;
			this.docId = id;

            //var collection = this.store.filter({parentId: id, parentViewId: this.widgetId});
            //var children = collection.fetch();
            //this.grid.set('collection', collection);


			//this.grid.set('query',{parentId: value, widgetId: this.widgetId, join:true});
            //this.grid.refresh();
			
			//this.setDocIdDeferred.resolve(this);
		}

	});
});

