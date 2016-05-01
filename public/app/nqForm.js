define(['dojo/_base/declare', 'dojo/_base/array', 'dijit/form/Select', 'dijit/Toolbar', 'dijit/form/DateTextBox',  'dijit/form/NumberTextBox','dijit/form/Textarea',
        'dijit/form/CheckBox', 'dijit/Editor', 'dijit/form/CurrencyTextBox', 'dijit/form/ValidationTextBox',"dijit/form/RadioButton", 'dojo/dom-construct', "dojo/on",
        "dojo/when", "dojo/query", 'dijit/registry', "app/nqWidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/sniff", "dojo/_base/lang",
        "dojo/promise/all", "dojo/html", 'dojo/store/Memory', "dojo/dom", "dojo/dom-style","dojo/dom-attr", "dojo/json",
        'dgrid/OnDemandGrid', 'dojox/form/CheckedMultiSelect', "dijit/form/Button",
        'dgrid/Grid',
        'dgrid/Keyboard',
        'dgrid/Selection',
        'dgrid/extensions/DnD',
        'dojo/dnd/Source',

        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins',
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
    function(declare, arrayUtil, Select, Toolbar, DateTextBox, NumberTextBox, Textarea,
             CheckBox, Editor, CurrencyTextBox, ValidationTextBox, RadioButton, domConstruct, on,
             when, query, registry, nqWidgetBase, ContentPane, domGeometry, has, lang,
             all, html, Memory, dom, domStyle, domAttr, JSON, OnDemandGrid, CheckedMultiSelect, Button, Grid, Keyboard, Selection, DnD, Source){

        return declare("nqForm", [nqWidgetBase],{
            postCreate: function(){
                this.inherited(arguments);
                var self = this;
                if(!self.widget.viewRefs || self.widget.viewRefs.length<1) return;
                var initialized = self.store.get(self.widget.viewRefs[0]).then(function(view){
                    console.log(JSON.stringify(view));
                    //return when(self.store.getInheritedSchema(self.viewId),function(schema) {
                    // });
                    self.view = view;
                    self.headerDivNode.innerHTML = '<h1>'+view.name+'</h1>';
                    //domStyle.set(self.headerDivNode, 'display', 'block');//set the header node, created in the superclass,  to visible
                    self.pageHelpTextDiv.innerHTML = view.description;
                    self.renderForm(view.properties, self.pane.containerNode);
                    return true;
                });
                when(initialized, function(result){
                    self.createDeferred.resolve(self);//ready to be loaded with data
                }, function(err){self.createDeferred.reject(err)});
            },
            setSelectedObjIdPreviousLevel: function(id){
                var self = this;
                var docCol = this.store.filter({_id: id});
                docCol.on('update', function(event){
                    alert('doc update in form');
                    /*var obj = event.target;
                     self.onChange(obj);*/
                });
                docCol.fetch().then(function(doc){
                    self.setFromValues(self.view.properties, doc, self.pane.containerNode)
                });

                //self.setSelectedObjIdPreviousLevelDeferred.resolve(self);
                //return this.setSelectedObjIdPreviousLevelDeferred.promise;
            }

        });

    });
