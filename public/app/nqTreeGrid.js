define(['dojo/_base/declare', 'dojo/_base/array', 'dijit/form/Select', 'dijit/Toolbar', 'dijit/form/DateTextBox',  'dijit/form/NumberTextBox','dijit/form/Textarea',
        'dijit/form/CheckBox', 'dijit/Editor', 'dijit/form/CurrencyTextBox', 'dijit/form/ValidationTextBox',"dijit/form/RadioButton", 'dojo/dom-construct', "dojo/on",
        "dojo/when", "dojo/query", 'dijit/registry', "app/nqWidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/sniff", "dojo/_base/lang",
        "dojo/promise/all", "dojo/html", 'dojo/store/Memory', "dojo/dom", "dojo/dom-style","dojo/dom-attr", "dojo/json",
        'dgrid/OnDemandGrid',
        'dojox/form/CheckedMultiSelect',
        "dijit/form/Button",
        'dgrid/Grid',
        'dgrid/Keyboard',
        'dgrid/Selection',
        'dgrid/extensions/DnD',
        'dojo/dnd/Source',
        'dgrid/Tree',
        'dgrid/extensions/ColumnResizer',
        "dgrid/extensions/DijitRegistry",

        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins'
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
    function(declare, arrayUtil, Select, Toolbar, DateTextBox, NumberTextBox, Textarea,
             CheckBox, Editor, CurrencyTextBox, ValidationTextBox, RadioButton, domConstruct, on,
             when, query, registry, nqWidgetBase, ContentPane, domGeometry, has, lang,
             all, html, Memory, dom, domStyle, domAttr, JSON, OnDemandGrid, CheckedMultiSelect, Button, Grid, Keyboard,
             Selection, DnD, Source, Tree, ColumnResizer, DijitRegistry){

        return declare("nqTreeGrid", [nqWidgetBase],{
            postCreate: function(){
                this.inherited(arguments);
                var self = this;
                if(!self.widget.viewRefs || self.widget.viewRefs.length<1) return;
                var initialized = self.store.get(self.widget.viewRefs[0]).then(function(view){
                    //console.log('VIEW:',view);
                    //console.log(JSON.stringify(view));
                    self.view = view;
                    self.pageHelpTextDiv.innerHTML = view.description;

                    self.subDocs = [];
                    self.collectSubDocs(view.properties);
                    console.log('subDocs:', self.subDocs);


                    self.treeGrid = new (declare([ OnDemandGrid, Keyboard, Tree, ColumnResizer, DijitRegistry ]))({
                        collection: self.store.filter({_id: 0}),//must return empty array
                        loadingMessage: 'Loading data...',
                        noDataMessage: 'No results found.',
                        //className: "dgrid-autoheight nqTransparent",
                        //selectionMode: 'none',
                        //height: '',
                        columns: {
                            // Render expando icon and trigger expansion from first column
                            name: {
                                label: 'Name',
                                renderExpando: true,
                                //renderCell: lang.hitch(self, self.renderTreeNode),
                                sortable : false,
                                width: 150
                            },
                            properties: {
                                label:'Properties',
                                renderCell: lang.hitch(self, self.renderTreeDetails),
                                //set: lang.hitch(self, self.setForm),
                                sortable : false
                            }
                        },
                        removeRow: function (rowElement) {
                            // destroy our widget during the row removal operation
                            var cellElement = self.treeGrid.cell(rowElement, 'properties').element;
                            var formWidgets = registry.findWidgets(cellElement);
                            formWidgets.forEach(function(widget){
                                //widget.destroyRecursive();
                            });
                            console.log('formWidgets', formWidgets);
                            //this.inherited(arguments);
                        }/*,
                        resize: function(){
                            if (arguments.length>0){
                                domGeometry.setMarginBox(this.domNode, arguments[0]);
                            }
                            this.inherited("resize", arguments);
                        }*/
                    }, domConstruct.create("div", null, self.pane.containerNode));
                    self.treeGrid.on("dgrid-error", function(event){nq.errorDialog(event.error);});
                    self.treeGrid.on("dgrid-datachange", lang.hitch(self, function(evt) {
                        this.updateClient(evt.rowId, evt.value);
                    }));
                    /*
                    self.treeGrid.on("refresh", lang.hitch(self, function(evt) {
                        this.pane.resize();
                    }));*/


                    return true;
                });
                when(initialized, function(result){
                    self.createDeferred.resolve(self);//ready to be loaded with data
                }, function(err){self.createDeferred.reject(err)});
            },
            renderTreeNode: function(object, value, node, options) {
                //<i class="fa fa-cloud">gtregfdg</i>
                var labelNode = domConstruct.create("span",null, node);
                //domConstruct.create('img', {style:{float: 'left'}, class: 'editIcon'}, labelNode);
                domConstruct.create('div', {style:{float: 'left'}, innerHTML:object.arrayName}, labelNode);
                domConstruct.create('div', {style:{float: 'left'}, innerHTML:object.name}, labelNode);
            },
            renderTreeDetails: function(object, value, node, options) {
                var self = this;
                var properties = self.view.properties;
                var done = false;
                if(self.subDocs) self.subDocs.forEach(function(subDoc){
                    if(!done && subDoc.arrayName == object.arrayName){
                        properties = subDoc.properties;
                        done = true;
                    }
                });
                self.renderForm(properties, node);
                self.setFromValues(properties, object, node);
            },
            setSelectedObjIdPreviousLevel: function(value){
                // Create a delegate of the original store with a new getChildren method.
                /*var rootCollection = lang.delegate(this.store.filter({_id: value}), {
                    getChildren: function(parent){
                        //var children = rootCollection.getChildren(parent);
                        return rootCollection.dotArray({id:parent._id, arrayName:'tabs'});
                        var idArr = parent.id.split('.');
                        if(idArr.length == 1) {
                            return rootCollection.dotArray({id:parseInt(idArr[0]), arrayName:'tabs'});
                        }
                        else if(idArr.length == 2) {
                            return rootCollection.dotArray({id:parseInt(idArr[0]), arrayName:'tabs'}).dotArray({id:parseInt(idArr[1]), arrayName:'widgets'});
                        }
                        else if(idArr.length == 3) {
                            return rootCollection.dotArray({id:parseInt(idArr[0]), arrayName:'tabs'}).dotArray({id:parseInt(idArr[1]), arrayName:'widgets'}).dotArray({id:parseInt(idArr[2]), arrayName:'views'});
                        }
                    }

                });*/
                this.treeGrid.set('collection', this.store.cachingStore.filter({_id: value}));
            },
            collectSubDocs: function(properties, arrayName){
                var self = this;
                for(var attrName in properties) {
                    var newArrayName = arrayName?arrayName+'.'+attrName:attrName;
                    var attrProps = properties[attrName];
                    if(attrProps.type == 'array' && attrProps.items && attrProps.items.type=='object') {
                        var oneOfArr = attrProps.items.oneOf;
                        if(oneOfArr){
                            oneOfArr.forEach(function (oneOfobj) {
                                self.subDocs.push({arrayName: newArrayName, subType:oneOfobj.name, properties: oneOfobj.properties});
                                self.collectSubDocs(oneOfobj.properties, newArrayName);
                            });
                        }
                        else {
                            self.subDocs.push({arrayName: newArrayName, properties: attrProps.items.properties});
                            self.collectSubDocs(attrProps.items.properties, newArrayName);
                        }
                    }
                }
             }
        });

    });
