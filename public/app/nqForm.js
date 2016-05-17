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
                this.renderForm(this.schema.properties, this.pane.containerNode);
            },
            setDocId: function(id){
                if(id.length == 0) return;
                this.docId = id;
                var self = this;
                var docCol = this.store.filter({_id: id});
                docCol.on('update', function(event){
                    alert('doc update in form');
                    /*var obj = event.target;
                     self.onChange(obj);*/
                });
                docCol.fetch().then(function(docsArr){
                    self.setFromValues(self.view.properties, docsArr[0], self.pane.containerNode)
                });

                //self.setDocIdDeferred.resolve(self);
                //return this.setDocIdDeferred.promise;
            }

        });

    });
