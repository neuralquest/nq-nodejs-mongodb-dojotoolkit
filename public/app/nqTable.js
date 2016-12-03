define(['dojo/_base/declare',  'dojo/_base/array',  "dojo/_base/lang", "dojo/dom-style",'dijit/form/Select', 'dijit/Toolbar', "dijit/form/DropDownButton", "dijit/DropDownMenu", 'dijit/form/DateTextBox', 'dojo/when', "dojo/promise/all",
         'dijit/Editor', 'dojo/store/Memory', 'dojo/dom-construct', "dojo/on", "dojo/cookie", "dojo/hash", "dijit/form/ToggleButton",
         "app/nqWidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/sniff", "dojo/date/locale", "dojo/html", 'dgrid/extensions/ColumnResizer',
        'dgrid/OnDemandGrid', 'dgrid/Editor', 'dgrid/Selector', 'dgrid/Keyboard', 'dgrid/extensions/DijitRegistry', "dgrid/extensions/DnD",
        "dgrid/Selection", "dijit/form/Button","dojo/_base/array", "dijit/registry",
        "dojo/date/stamp",'dstore/QueryResults', //'dGrid/_StoreMixin',
        
        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins', 
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
	function(declare, arrayUtil, lang, domStyle, Select, Toolbar, DropDownButton, DropDownMenu, DateTextBox, when, all,
			RTFEditor, Memory, domConstruct, on, cookie, hash, ToggleButton,
			nqWidgetBase, ContentPane, domGeometry, has, locale, html, ColumnResizer,
			Grid, Editor, Selector, Keyboard, DijitRegistry, Dnd,
			Selection, Button, array, registry,
			stamp, QueryResults/*, nqRenderAllMixin*/){
   
	return declare("nqTable", [nqWidgetBase], {
		//viewIdsArr: [],
        //readOnly: true,

		postCreate: function(){
			this.inherited(arguments);
            var self = this;
            if('query' in self.schema && 'menu' in self.schema.query[0]){
                var menuDefArr = self.schema.query[0].menu;
                //initially show the toolbar div
                domStyle.set(this.pageToolbarDivNode, 'display' , 'block');
                // Create toolbar and place it at the top of the page
                var normalToolbar = new Toolbar({});
                menuDefArr.forEach(function(menuDef){
                    var button;
                    if('menu' in menuDef){
                        var menu = new DropDownMenu({ style: "display: none;"});
                        self.addMenuItemsForMenuDefArr(menuDef.menu, menu);
                        button = new DropDownButton({
                            label: menuDef.label,
                            iconClass: menuDef.iconClass,
                            dropDown: menu
                        })
                    }
                    else if('action' in menuDef){
                        if(menuDef.action == 'add') {
                            button = new Button({
                                label: menuDef.label,
                                iconClass: menuDef.iconClass,
                                style: {'margin-left': '5px'},
                                onClick: function (evt) {
                                    //var selectedItem = self.tree.get("selectedItem");
                                    var newDoc = {
                                        docType: 'object',
                                        name: '[new service agreement]',
                                        buyerId: '575d4c3f2cf3d6dc3ed8314f', //platos cave //selected from owners with current offerings
                                        //offeringId: '58322160425310133a49f115',
                                        stateHistory: [{
                                            date: '$now',//default
                                            stateId: '583225ed425310133a49f119'//the initial state of parentDoc.offerings
                                        }],
                                        classId: "57424f1b3c6d3cd598a5a321"//from clause
                                    };
                                    var directives = {viewId: self.schema._id};
                                    self.store.add(newDoc, directives).then(function (newObj) {
                                        //update hash to open form
                                    });
                                }
                            });
                        }
                    }
                    if(button) normalToolbar.addChild(button);
                });
                this.pageToolbarDivNode.appendChild(normalToolbar.domNode);
            }

            var columns = [];
            var properties = self.schema.properties;
            for(var attrName in properties) {
                var attrProps = properties[attrName];
                //var attrProps ={};
                attrProps.field = attrName;
                attrProps.label = attrProps.title;
                attrProps.editOn = 'dblclick';
                attrProps.canEdit = function (object, value) {
                    if(attrProps.readOnly == undefined) return false;
                    if(attrProps.readOnly) return false;
                    return self.store.amAuthorizedToUpdate(object);
                };
                columns.push(attrProps);
                //if(attrName == 'stateHistoryDate') debugger;

                if('path' in attrProps){
                    attrProps.get = lang.hitch(attrProps.path, function(obj){
                        return self.store.getValueByDotNotation2(obj, this);
                    });
                }

                /*if(attrProps.subDoc){
                    attrProps.get = lang.hitch(attrProps, function(item){
                        var subDoc = this.subDoc;
                        var prop = this.prop;
                        var subArr = item[subDoc];
                        if(subArr) {
                            var subObj = subArr[0];
                            return subObj[prop];
                        }
                        return null;
                    });
                }
                else if(attrProps.prop){
                    attrProps.get = lang.hitch(attrProps, function(item){
                        var prop = this.prop;
                        return item[prop];
                    });
                }*/
                if(attrProps.enum){
                    attrProps.renderCell = function(object, value, node, options){
                        if(!value) html.set(node, '[not selected]');
                        else{
                            var selectedOption = this.editorArgs.store.get(value);
                            if(selectedOption) node.appendChild(document.createTextNode(selectedOption.label));
                            else node.appendChild(document.createTextNode('id: '+value));
                        }
                    };
                    attrProps.editor = Select;
                }
                else if(attrProps.media && attrProps.media.mediaType == 'text/json'){
                }
                else if(attrProps.type == 'string'){
                    if(attrProps.media && attrProps.media.mediaType == 'text/html'){
                        //self.editorToolbarDivNode.appendChild(attrProps.editorArgs.toolbar.domNode);
                        attrProps.renderCell = function(object, value, node, options) {
                            if(!value) html.set(node, '<p>[no text]</p>');
                            else html.set(node, value);
                        };
                        attrProps.get = function(item){
                            var value = item[attrName];
                            if(!value) return '<p>[no text]</p>';//editor will crash if it does not have a value
                            return value;
                        };
                        if(!self.readOnly) attrProps.editor = RTFEditor;
                    }
                    else if(attrProps.media && attrProps.media.binaryEncoding == 'base64' && attrProps.media.type == 'image/png') {
                        attrProps.renderCell = function(object, value, node, options) {
                            if(value) {
                                var foundDoc = self.store.cachingStore.getSync(value);
                                if('icon' in foundDoc) domConstruct.create("img", {src: foundDoc.icon}, node);
                                else {
                                    var classDoc = self.store.cachingStore.getSync(foundDoc.classId);
                                    if('icon' in classDoc) domConstruct.create("img", {src: classDoc.icon}, node);
                                }
                                //html.set(node, value);
                            }
                        };
                    }
                    else if(attrProps.format == 'date-time'){
                        attrProps.renderCell = function(object, value, node, options) {
                            console.log('value', value);
                            if(!value || value=='') html.set(node, '[no date]');
                            else if(value=='$now') html.set(node, '[$now]');
                            else {
                                var date = null;
                                //var value = "2008-10-17T00:00:00Z";
                                if(lang.isObject(value)) date = value;//the date widget returns an date object
                                else date = dojo.date.stamp.fromISOString(value);
                                html.set(node, date.toLocaleDateString());
                            }
                        };
                        attrProps.editor = DateTextBox;
                    }
                    else if(attrProps.format == 'uri'){
                        attrProps.renderCell = function (object, value, node, options) {
                            if(value) domConstruct.create("img", {src:value, style:{width:'100px'}}, node);
                        };
                    }
                    else if(attrProps.query){
                        /*attrProps.get = function(item) {
                            var value = item[this.field];
                            if(!value) return '[null]';
                            //var date = dojo.date.stamp.fromISOString(value);
                            return self.store.cachingStore.getSync(value).name;
                        };*/
                        attrProps.renderCell = lang.hitch(attrProps, function(object, value, node, options){
                            if(!value) html.set(node, '[not selected]');
                            else{
                                var refDoc = self.store.cachingStore.getSync(value);
                                if('displayIcon' in this) {
                                    var icon = self.getIconForObject(refDoc);
                                    var div = domConstruct.create("div", {style:{'white-space': 'nowrap'}},  node);
                                    domConstruct.create("img", {src:icon}, div);
                                    domConstruct.create("span", {style:{'padding-left':'3px', 'vertical-align': 'top'}, innerHTML:refDoc.name}, div);
                                }
                                else html.set(node, refDoc.name);
                            }
                        });
                        //attrProps.autoSave = true;
                        attrProps.editor =  'text';
                    }
                    else if('displayIcon' in attrProps) {
                        attrProps.renderCell = function (object, value, node, options) {
                            if (!value) html.set(node, '[null]');
                            else {
                                var refDoc = self.store.cachingStore.getSync(value);
                                var icon = self.getIconForObject(refDoc);
                                var div = domConstruct.create("div", {style:{'white-space': 'nowrap'}},  node);
                                domConstruct.create("img", {src:icon}, div);
                                domConstruct.create("span", {style:{'padding-left':'3px', 'vertical-align': 'top'}, innerHTML:refDoc.name}, div);
                            }
                        };
                    }
                    else {
                        attrProps.renderCell = function (object, value, node, options) {
                            if (!value) html.set(node, '[null]');
                            else html.set(node, value);
                        };
                        attrProps.editor == 'text';
                    }
                }
                else if(attrProps.type == 'number') {
                    attrProps.renderCell = function(object, value, node, options) {
                        if(!value) html.set(node, '[null]');
                        else html.set(node, String(value));
                    };
                    attrProps.editor == 'number';
                }
                else if(attrProps.type == 'boolean'){
                    attrProps.renderCell = function(object, value, node, options) {
                        html.set(node, value==undefined?'false':String(value));
                    };
                    attrProps.editor = 'radio';
                }
                else if(attrProps.type == 'array'){
                    attrProps.renderCell = function(object, value, node, options) {
                        var props = self.schema.properties.insets.items.properties;
                        if(!object) html.set(node, '{}');
                        else {
                            self.renderForm(props, object, node);
                        }
                        //else html.set(node, JSON.stringify(object, null, 4));
                    };
                    attrProps.editor = 'text';
                }
                else if(attrProps.type == 'object'){
                    attrProps.renderCell = function(object, value, node, options) {
                        var props = self.schema.properties;
                        if(!object) html.set(node, '{}');
                        else self.renderForm(props, {}, node);
                        //else html.set(node, JSON.stringify(object, null, 4));
                    };
                    attrProps.editor = 'text';
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
                showHeader: columns.length>1,
                getBeforePut:false// temporary fix for the fact that a get without a viewId ruins the item sent to the put
            }, domConstruct.create('div'));
//					self.grid.startup();
            for(var i=0;i<columns.length;i++){
                var attrProps = columns[i];
                if(attrProps.styleColumn) self.grid.styleColumn(i, attrProps.styleColumn);
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
            self.own(self.grid.on('dgrid-select', function (event) {
                // Report the item from the selected row to the console.
                var item = event.rows[0].data;
                //var id = event.rows[0].data._id;
                //if(!id) id = event.rows[0].data.id;
                //console.log('Row selected: ', event.rows);
                //nq.setHashViewId(self.level, self.view._id, self.tabId, id);
                //var pageId = item.pageId;
                //if(!pageId) pageId = self.widget.pageId;
                var pageId = self.widget.pageId;
                if(!pageId) pageId = item.pageId;
                if(pageId) nq.setHash(item._id, pageId, 0, 0, self.level+1);
            }));
            self.own(self.grid.on("dgrid-error", function(event) {
                nq.errorDialog(event.error);
            }));
            /*self.grid.on("dgrid-refresh-complete", function(event){
             var row = grid.row(event);
             console.log("Row complete:", event);
             });
             */
		},
        _setDocIdAttr: function(docId) {
            if (docId == this.docId) return;
            var self = this;
            this.inherited(arguments);
            if(!this.docId) return;
            if('query' in this.schema) {
                this.docCol = this.store.getCollectionForSubstitutedQuery(this.schema.query[0], this.docId, this.docId);
                this.own(this.docCol.on('update', function(event){
                    self.grid.refresh();
                }));
                this.grid.set('collection', self.docCol);
            }
        },
        _setSelectedIdAttr: function(selectedId){
            this.inherited(arguments);
            if(this.selectedId) this.grid.select(this.grid.row(this.selectedId));
        }
	});
});

