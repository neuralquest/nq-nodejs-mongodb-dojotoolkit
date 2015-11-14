define(['dojo/_base/declare', 'dojo/_base/array', 'dijit/form/Select', 'dijit/Toolbar', 'dijit/form/DateTextBox',  'dijit/form/NumberTextBox','dijit/form/Textarea', "dijit/form/Form",
        'dijit/form/CheckBox', 'dijit/Editor', 'dijit/form/CurrencyTextBox', 'dijit/form/ValidationTextBox', 'dojo/dom-construct', "dojo/on",
        "dojo/when", "dojo/query", 'dijit/registry', "app/nqWidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/sniff", "dojo/_base/lang",
        "dojo/promise/all", "dojo/html", 'dojo/store/Memory', "dojo/dom-style","dojo/dom-attr", "dojo/json" , 'app/nqForm',

        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins',
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
    function(declare, arrayUtil, Select, Toolbar, DateTextBox, NumberTextBox, Textarea, Form,
             CheckBox, Editor, CurrencyTextBox, ValidationTextBox, domConstruct, on,
             when, query, registry, nqWidgetBase, ContentPane, domGeometry, has, lang,
             all, html, Memory, domStyle, domAttr, JSON ){

        return declare("nqBalanceSheet", [nqWidgetBase], {
            postCreate: function(){
                this.inherited(arguments);
                var self = this;
                //this.form = new Form();
                this.form = new Form(null, domConstruct.create('form', null, self.pane.containerNode));
                //var formNode = domConstruct.create('form', {style: 'border-spacing:5px;'}, this.pane.containerNode);
                var initialized = self.store.get(self.widgetId).then(function(widget){
                    self.widget = widget;
                    self.headerDivNode.innerHTML = '<h1>'+widget.name+'</h1>';
                    domStyle.set(self.headerDivNode, 'display', 'block');
                    self.pageHelpTextDiv.innerHTML = widget.description;
                    return self.store.getItemsByAssocTypeAndDestClass(self.widgetId, 'manyToMany', VIEW_CLASS_TYPE).then(function(viewsArr) {
                        self.view = viewsArr[0];//for now assume only one view
                        return when(self.store.getCombinedSchemaForView(self.view),function(schema) {
                            self.schema = schema;
                            self.enrichSchema(self.schema);
                            return true;
                        });
                    });
                });
                when(initialized, function(result){
                    var p1 = domConstruct.create("p", {style: "font-weight:bold; font-size:1.5em"}, self.form.domNode);
                    domConstruct.create("label", {innerHTML: ('Assets')}, p1);
                    domConstruct.create("label", null, p1);
                    domConstruct.create("label", {innerHTML: ('Liabilities')}, p1);
                    domConstruct.create("label", null, p1);

                    var p2 = domConstruct.create("p", {style: "font-weight:bold"}, self.form.domNode);
                    domConstruct.create("label", {innerHTML: ('Current Assets')}, p2);
                    domConstruct.create("label", null, p2);
                    domConstruct.create("label", {innerHTML: ('Current Liabilities')}, p2);
                    domConstruct.create("label", null, p2);




                    var p3 = domConstruct.create("p", null, self.form.domNode);
                    domConstruct.create("label", {innerHTML: ('Cash')}, p3);
                    self.bsCash = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p3));
                    domConstruct.create("label", {innerHTML: ('Notes payable')}, p3);
                    self.bsNotesPayable = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p3));

                    var p4 = domConstruct.create("p", null, self.form.domNode);
                    domConstruct.create("label", {innerHTML: ('Petty pash')}, p4);
                    self.bsPettyCash = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p4));
                    domConstruct.create("label", {innerHTML: ('Accounts payable')}, p4);
                    self.bsAccountsPayable = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p4));

                    var p5 = domConstruct.create("p", null, self.form.domNode);
                    domConstruct.create("label", {innerHTML: ('Temporary investments')}, p5);
                    self.bsTempInvestments = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p5));
                    domConstruct.create("label", {innerHTML: ('Wages payable')}, p5);
                    self.bsWagesPayable = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p5));

                    var p6 = domConstruct.create("p", null, self.form.domNode);
                    domConstruct.create("label", {innerHTML: ('Accounts receivable - net')}, p6);
                    self.bsAccountsReceivable = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p6));
                    domConstruct.create("label", {innerHTML: ('Intrest payable')}, p6);
                    self.bsIntrestPayable = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p6));

                    var p7 = domConstruct.create("p", null, self.form.domNode);
                    domConstruct.create("label", {innerHTML: ('Inventory')}, p7);
                    self.bsInventory = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p7));
                    domConstruct.create("label", {innerHTML: ('Taxes payable')}, p7);
                    self.bsTaxesPayable = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p7));

                    var p8 = domConstruct.create("p", null, self.form.domNode);
                    domConstruct.create("label", {innerHTML: ('Supplies')}, p8);
                    self.bsSupplies = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p8));
                    domConstruct.create("label", {innerHTML: ('Warranty liability')}, p8);
                    self.bsWarentyLibility = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p8));

                    var p9 = domConstruct.create("p", null, self.form.domNode);
                    domConstruct.create("label", {innerHTML: ('Prepaid insurance')}, p9);
                    self.bsPrepaidInsurance = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p9));
                    domConstruct.create("label", {innerHTML: ('Unearned revenues')}, p9);
                    self.bsUnearndRevenues = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p9));

                    var p10 = domConstruct.create("p", null, self.form.domNode);
                    domConstruct.create("label", null, p10);
                    self.bsTotalCurrentAssests = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p10));
                    domStyle.set(self.bsTotalCurrentAssests.domNode, 'font-weight', 'bold');
                    domStyle.set(self.bsTotalCurrentAssests.domNode, 'border-top-style', 'solid');
                    domStyle.set(self.bsTotalCurrentAssests.domNode, 'border-top-color', 'lightgrey');
                    domConstruct.create("label", null, p10);
                    self.bsTotalCurrentLiabilities = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p10));
                    domStyle.set(self.bsTotalCurrentLiabilities.domNode, 'font-weight', 'bold');
                    domStyle.set(self.bsTotalCurrentLiabilities.domNode, 'border-top-style', 'solid');
                    domStyle.set(self.bsTotalCurrentLiabilities.domNode, 'border-top-color', 'lightgrey');



                    var p11 = domConstruct.create("p", {style: "font-weight:bold"}, self.form.domNode);
                    domConstruct.create("label", {innerHTML: ('Investments')}, p11);
                    self.bsTotalInvestments = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p11));
                    domStyle.set(self.bsTotalInvestments.domNode, 'font-weight', 'bold');
                    domStyle.set(self.bsTotalInvestments.domNode, 'border-top-style', 'solid');
                    domStyle.set(self.bsTotalInvestments.domNode, 'border-top-color', 'lightgrey');

                    domConstruct.create("label", {innerHTML: ('Long-term Liabilities')}, p11);
                    domConstruct.create("label", null, p11);

                    var p12 = domConstruct.create("p", null, self.form.domNode);
                    domConstruct.create("label", {innerHTML: ('Property, plant & equipment'), style: "font-weight:bold"}, p12);
                    domConstruct.create("label", null, p12);
                    domConstruct.create("label", {innerHTML: ('Notes payable')}, p12);
                    self.bsNotesPayable2 = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p12));

                    var p13 = domConstruct.create("p", null, self.form.domNode);
                    domConstruct.create("label", {innerHTML: ('Land')}, p13);
                    self.bsLand = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p13));
                    domConstruct.create("label", {innerHTML: ('Bonds payable')}, p13);
                    self.bsBondsPayable = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p13));

                    var p14 = domConstruct.create("p", null, self.form.domNode);
                    domConstruct.create("label", {innerHTML: ('Land Improvements')}, p14);
                    self.bsLandImprovements = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p14));
                    domConstruct.create("label", null, p14);
                    self.bsTotalLongTermLiablities = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p14));
                    domStyle.set(self.bsTotalLongTermLiablities.domNode, 'font-weight', 'bold');
                    domStyle.set(self.bsTotalCurrentLiabilities.domNode, 'border-top-style', 'solid');
                    domStyle.set(self.bsTotalCurrentLiabilities.domNode, 'border-top-color', 'lightgrey');

                    var p15 = domConstruct.create("p", null, self.form.domNode);
                    domConstruct.create("label", {innerHTML: ('Buildings')}, p15);
                    self.bsBuildings = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p15));
                    domConstruct.create("label", {innerHTML: ("Stockholders' Equity"), style: "font-weight:bold; font-size:1.5em"}, p15);
                    domConstruct.create("label", null, p15);

                    var p16 = domConstruct.create("p", null, self.form.domNode);
                    domConstruct.create("label", {innerHTML: ('Equipment')}, p16);
                    self.bsEquipment = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p16));
                    domConstruct.create("label", {innerHTML: ('Common stock')}, p16);
                    self.bsCommonStock = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p16));

                    var p17 = domConstruct.create("p", null, self.form.domNode);
                    domConstruct.create("label", {innerHTML: ('Less: acc deprecation')}, p17);
                    self.bsAccDeprecation = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p17));
                    domConstruct.create("label", {innerHTML: ('Retained earnings')}, p17);
                    self.bsRetainedEarnings = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p17));

                    var p18 = domConstruct.create("p", null, self.form.domNode);
                    domConstruct.create("label", null, p18);
                    self.bsTotalPropPlantEquipNet = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p18));
                    domStyle.set(self.bsTotalPropPlantEquipNet.domNode, 'font-weight', 'bold');
                    domStyle.set(self.bsTotalPropPlantEquipNet.domNode, 'border-top-style', 'solid');
                    domStyle.set(self.bsTotalPropPlantEquipNet.domNode, 'border-top-color', 'lightgrey');
                    domConstruct.create("label", {innerHTML: ('Less: Treasury stock')}, p18);
                    self.bsTreasuryStock = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p18));

                    var p19 = domConstruct.create("p", {style: "font-weight:bold"}, self.form.domNode);
                    domConstruct.create("label", {innerHTML: ('Current Assets')}, p19);
                    domConstruct.create("label", null, p19);
                    domConstruct.create("label", null, p19);
                    self.bsTotalStockHolderEquipment = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p19));
                    domStyle.set(self.bsTotalStockHolderEquipment.domNode, 'font-weight', 'bold');
                    domStyle.set(self.bsTotalStockHolderEquipment.domNode, 'border-top-style', 'solid');
                    domStyle.set(self.bsTotalStockHolderEquipment.domNode, 'border-top-color', 'lightgrey');

                    var p20 = domConstruct.create("p", null, self.form.domNode);
                    domConstruct.create("label", {innerHTML: ('Goodwill')}, p20);
                    self.bsGoodWill = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p20));


                    var p21 = domConstruct.create("p", null, self.form.domNode);
                    domConstruct.create("label", {innerHTML: ('Trade names')}, p21);
                    self.bsTradeNames = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p21));

                    var p22 = domConstruct.create("p", null, self.form.domNode);
                    domConstruct.create("label", null, p22);
                    self.bsTotalIntangibleAssests = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p22));
                    domStyle.set(self.bsTotalIntangibleAssests.domNode, 'font-weight', 'bold');
                    domStyle.set(self.bsTotalCurrentLiabilities.domNode, 'border-top-style', 'solid');
                    domStyle.set(self.bsTotalIntangibleAssests.domNode, 'border-top-color', 'lightgrey');

                    var p23 = domConstruct.create("p", {style: "font-weight:bold"}, self.form.domNode);
                    domConstruct.create("label", {innerHTML: ('Other assests')}, p23);
                    self.bsOtherAssets = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p23));
                    domStyle.set(self.bsOtherAssets.domNode, 'font-weight', 'bold');
                    domStyle.set(self.bsOtherAssets.domNode, 'border-top-style', 'solid');
                    domStyle.set(self.bsOtherAssets.domNode, 'border-top-color', 'lightgrey');

                    var p24 = domConstruct.create("p", {style: "font-weight:bold"}, self.form.domNode);
                    domConstruct.create("label", {innerHTML: ('Total Assets')}, p24);
                    self.bsTotalAssets = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p24));
                    domStyle.set(self.bsTotalAssets.domNode, 'font-weight', 'bold');
                    domStyle.set(self.bsTotalAssets.domNode, 'border-top-style', 'solid');
                    domStyle.set(self.bsTotalAssets.domNode, 'border-top-color', 'lightgrey');
                    domConstruct.create("label", {innerHTML: ("Total Liabilities & Stockholders' Equity")}, p24);
                    self.bsTotalLibilitiesStockHolderEquity = new NumberTextBox({readonly:false, places:2}, domConstruct.create('input', null, p24));
                    domStyle.set(self.bsTotalLibilitiesStockHolderEquity.domNode, 'font-weight', 'bold');
                    domStyle.set(self.bsTotalLibilitiesStockHolderEquity.domNode, 'border-top-style', 'solid');
                    domStyle.set(self.bsTotalLibilitiesStockHolderEquity.domNode, 'border-top-color', 'lightgrey');


                    self.createDeferred.resolve(self);//ready to be loaded with data
                }, function(err){self.createDeferred.reject(err)});
            },
            setSelectedObjIdPreviousLevel: function(value){
                //load the data
                //if(this.selectedObjIdPreviousLevel == value) return this;
                this.selectedObjIdPreviousLevel = value;

                var self = this;

                self.bsCash.set('value', 10000);
                self.bsNotesPayable.set('value', 10000);
                self.bsPettyCash.set('value', 10000);
                self.bsAccountsPayable.set('value', 10000);
                self.bsTempInvestments.set('value', 10000);
                self.bsWagesPayable.set('value', 10000);
                self.bsAccountsReceivable.set('value', 10000);
                self.bsIntrestPayable.set('value', 10000);
                self.bsInventory.set('value', 10000);
                self.bsTaxesPayable.set('value', 10000);
                self.bsSupplies.set('value', 10000);
                self.bsPrepaidInsurance.set('value', 10000);
                self.bsWarentyLibility.set('value', 10000);
                self.bsCash.set('value', 10000);
                self.bsUnearndRevenues.set('value', 10000);
                self.bsTotalCurrentAssests.set('value', 10000);
                self.bsTotalCurrentLiabilities.set('value', 10000);
                self.bsTotalInvestments.set('value', 10000);
                self.bsNotesPayable2.set('value', 10000);
                self.bsLand.set('value', 10000);
                self.bsBondsPayable.set('value', 10000);
                self.bsLandImprovements.set('value', 10000);
                self.bsTotalLongTermLiablities.set('value', 10000);
                self.bsBuildings.set('value', 10000);
                self.bsEquipment.set('value', 10000);
                self.bsCommonStock.set('value', 10000);
                self.bsAccDeprecation.set('value', 10000);
                self.bsRetainedEarnings.set('value', 10000);
                self.bsTotalPropPlantEquipNet.set('value', 10000);
                self.bsTreasuryStock.set('value', 10000);
                self.bsTotalStockHolderEquipment.set('value', 10000);
                self.bsGoodWill.set('value', 10000);
                self.bsTradeNames.set('value', 10000);
                self.bsTotalIntangibleAssests.set('value', 10000);
                self.bsOtherAssets.set('value', 10000);
                self.bsTotalAssets.set('value', 10000);
                self.bsTotalLibilitiesStockHolderEquity.set('value', 10000);
                
                
                //this.form.set('value', updateObj);
                var value = this.form.get('value');
                console.log(value);
/*
//            var collection = this.store.filter({itemId:1802});
                var collection = this.store.filter({itemId:this.selectedObjIdPreviousLevel, viewId:self.view._id});
                collection.on('update', function(event){
                    var obj = event.target;
                    //debugger;
                    //self.setSelectedObjIdPreviousLevel();
                    //self.onChange(obj);
                });
                var children = collection.fetch();
//            children = children.value;
                self.item = children;
                for(var attrName in self.schema.properties) {
                    var attrProps = self.schema.properties[attrName];
                    var value = self.item[attrName];
                    if(!value) {
                        if(attrProps.defaultValue) value = attrProps.defaultValue;
                        else value = attrProps.nullValue;
                    }
                    if(attrProps.type == 'object') value = JSON.stringify(value, null, 4);
                    var dijitId = 'dijit:'+self.view._id+':'+attrName;
                    var wid = registry.byId(dijitId);
                    wid.set('value', value, false);// do not fire change
                }*/
                self.setSelectedObjIdPreviousLevelDeferred.resolve(self);
                return this.setSelectedObjIdPreviousLevelDeferred.promise;
            }
        });

    }
);

