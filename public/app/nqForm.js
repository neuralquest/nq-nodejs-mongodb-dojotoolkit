define(['dojo/_base/declare', 'dojo/_base/array', 'dijit/form/Select', 'dijit/Toolbar', 'dijit/form/DateTextBox',  'dijit/form/NumberTextBox','dijit/form/Textarea',
        'dijit/form/CheckBox', 'dijit/Editor', 'dijit/form/CurrencyTextBox', 'dijit/form/ValidationTextBox',"dijit/form/RadioButton", 'dojo/dom-construct', "dojo/on",
        "dojo/when", "dojo/query", 'dijit/registry', "app/nqWidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/sniff", "dojo/_base/lang",
        "dojo/promise/all", "dojo/html", 'dojo/store/Memory', "dojo/dom-style","dojo/dom-attr", "dojo/json", 'dgrid/OnDemandGrid',

        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins',
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
    function(declare, arrayUtil, Select, Toolbar, DateTextBox, NumberTextBox, Textarea,
             CheckBox, Editor, CurrencyTextBox, ValidationTextBox, RadioButton, domConstruct, on,
             when, query, registry, nqWidgetBase, ContentPane, domGeometry, has, lang,
             all, html, Memory, domStyle, domAttr, JSON, OnDemandGrid ){

        return declare("nqForm", [nqWidgetBase],{
            postCreate: function(){
                this.inherited(arguments);
                var self = this;
                if(!self.widget.viewRefs || self.widget.viewRefs.length<1) return;
                var initialized = self.store.get(self.widget.viewRefs[0]).then(function(view){
                    self.view = view;
                    self.headerDivNode.innerHTML = '<h1>'+view.name+'</h1>';
                    //domStyle.set(self.headerDivNode, 'display', 'block');//set the header node, created in the superclass,  to visible
                    self.pageHelpTextDiv.innerHTML = view.description;
                    //return when(self.store.getInheritedSchema(self.viewId),function(schema) {
                        self.schema = view;
                        //self.enrichObjectWithDefaults(view, schema);
                        var formNode = domConstruct.create('table', null, self.pane.containerNode);
                        if(self.schema.oneOf){
                            var par = domConstruct.create("tr", null, formNode);
                            domConstruct.create("td", {innerHTML: 'Choose Page Type'}, par);
                            var radioTd = domConstruct.create("td", null, par);
                            self.schema.oneOf.forEach(function(typeOf){
                                //var par = domConstruct.create("tr", null, formNode);
                                //domConstruct.create("label", {innerHTML: typeOf.name}, par);
                                var dijit = new RadioButton({
                                    checked: false,
                                    value: typeOf.name,
                                    name: "typeOf"
                                }, domConstruct.create("div", {display: 'inline-block'}, radioTd));
                                domConstruct.create("div", {innerHTML: typeOf.name, style:{display: 'inline-block'}}, radioTd);
                                domConstruct.create("br", null, radioTd);
                                dijit.startup();
                            });
                            self.schema.oneOf.forEach(function(typeOf){
                                self.buildRowCols(typeOf.properties, formNode, 1);
                            });
                        }
                        else self.buildRowCols(self.schema.properties, formNode, 0);

                    //});
                });
                when(initialized, function(result){
                    self.createDeferred.resolve(self);//ready to be loaded with data
                }, function(err){self.createDeferred.reject(err)});
            },
            buildRowCols: function(properties, formNode, nestingLevel){
                var self = this;
                //Collect the properties in a three dimensional array:
                //[rows, columns, propertiesList]
                var rowColProperties = [];
                for(var attrName in properties) {
                    var attrProps = properties[attrName];
                    if(!attrProps.row) attrProps.row = 1;
                    if(!attrProps.col) attrProps.col = 1;
                    if(!rowColProperties[attrProps.row]) rowColProperties[attrProps.row] = [];
                    if(!rowColProperties[attrProps.row][attrProps.col]) rowColProperties[attrProps.row][attrProps.col] = [];
                    rowColProperties[attrProps.row][attrProps.col].push(attrProps);
                }
                for(var i=1;i<rowColProperties.length;i++){//row 0 is invisible
                    var colProperties = rowColProperties[i];
                    //Find the highest length of propertiesList for the columns in this row
                    var maxProperties = 0;
                    for(var j=1;j<colProperties.length;j++){//column 0 is not used
                        var properties = colProperties[j];
                        maxProperties = properties.length>maxProperties?maxProperties = properties.length:maxProperties = maxProperties;
                    }
                    for(var l=0;l<maxProperties;l++){
                        //Create a row (takes the form of a paragraph thanks to css)
                        var par = domConstruct.create("tr", null, formNode);
                        //For each column in this row
                        for(var j=1;j<colProperties.length;j++){//column 0 is not used
                            var propertiesList = colProperties[j];
                            var attrProps = propertiesList[l];
                            if(attrProps) {
                                var format = {
                                    innerHTML: (attrProps.title),
                                    style: {
                                        'font-weight': attrProps.bold?'bold':'normal',
                                        'font-size': attrProps.size?attrProps.size:'1em',
                                        //'padding':'5px',
                                        'padding-left': (nestingLevel*10+10)+'px'//need px here because different font sizes will have different em
                                    }
                                };
                                domConstruct.create("td", format, par);
                                var dijit = null;
                                if(attrProps.type == 'string'){
                                    if(attrProps.media && attrProps.media.mediaType == 'text/html'){
                                        domConstruct.create("td", null, par);//empty td
                                        var row = domConstruct.create("tr", null, formNode);
                                        var style = {
                                            //style: {
                                                border: 'solid',
                                                'border-color': 'lightgrey',
                                                'border-width': 'thin',
                                                background: 'transparent',
                                                //'padding':'5px'
                                                //width: '15em',

                                            //}
                                        };
                                        var rowTd = domConstruct.create("td", {style:{'padding-left': (nestingLevel*10+10)+'px'}}, row);
                                        dijit = new Editor({height: ''}, domConstruct.create('div', {name: attrProps.title}, rowTd));/*setting the name wont be done autoamticly*/
                                        dijit.addStyleSheet('app/resources/editor.css');
                                        //Needed for auto sizing, found it somewhere in the dijit library
                                        //dijit.startup();//dijit has to be started before we can attach evens
                                        dijit.on("NormalizedDisplayChanged", function(event){
                                            var height = domGeometry.getMarginSize(this.domNode).h;
                                            if(has("opera")){
                                                height = this.editNode.scrollHeight;
                                            }
                                            //console.log('height',domGeometry.getMarginSize(this.editNode));
                                            //this.resize({h: height});
                                            domGeometry.setMarginBox(this.iframe, { h: height });
                                        });
                                        domStyle.set(dijit.domNode, style);
                                        domAttr.set(rowTd, 'colspan', '2');
                                    }
                                    else if(attrProps.media && attrProps.media.mediaType == 'image/jpg'){
                                    }
                                    else if(attrProps.media && attrProps.media.mediaType == 'image/webgl'){
                                    }
                                    else if(attrProps.enum){
                                        if(attrProps.enum.length == 1){
                                            domConstruct.create("td", {innerHTML: attrProps.enum[0], style: style}, par);
                                        }
                                        else {
                                            var data = [];
                                            data.push({id:'[not selected]',label:'[not selected]'} );
                                            attrProps.enum.forEach(function(value){
                                                data.push({id:value, label:value});
                                            });
                                            var selectStore = new Memory({data: data});
                                            var editorArgs = {
                                                name: attrName,
                                                store: selectStore,
                                                //style: "width:99%;",
                                                labelAttr: 'label',
                                                maxHeight: -1, // tells _HasDropDown to fit menu within viewport
                                                fetchProperties: { sort : [ { attribute : "name" }]},
                                                queryOptions: { ignoreCase: true }//doesnt work
                                                //value: 749
                                            };
                                            dijit = new Select(editorArgs, domConstruct.create("td", {class: 'inputClass'}, par));
                                        }
                                    }
                                    else{
                                        if(attrProps.readOnly == true) {
                                            domConstruct.create("td", {class: 'inputClass'}, par);
                                        }
                                        else {
                                            dijit = new ValidationTextBox(attrProps, domConstruct.create("td", {class: 'inputClass'}, par));
                                        }
                                    }
                                }
                                else if(attrProps.type == 'number'){
                                    if(attrProps.readOnly == true){
                                        var style = {
                                            'font-weight': attrProps.bold?'bold':'normal',
                                            'font-size': attrProps.size?attrProps.size:'1em',
                                            'border-top-style': attrProps.bold?'solid':'none',
                                            'border-top-color': 'lightgrey',
                                            'text-align': 'right'
                                        };
                                        domConstruct.create("td", {innerHTML: '0.00', style: style}, par);
                                    }
                                    else {
                                        dijit = new NumberTextBox(attrProps, domConstruct.create("td", {class: 'inputClass'}, par));
                                    }
                                }
                                else if(attrProps.type == 'integer'){
                                    if(attrProps.readOnly == true){
                                        domConstruct.create("td", null, par);
                                    }
                                    else {
                                        dijit = new NumberTextBox(attrProps, domConstruct.create("td", {class: 'inputClass'}, par));
                                    }
                                }
                                else if(attrProps.type == 'date'){
                                    if(attrProps.readOnly == true){
                                        domConstruct.create("td", null, par);
                                    }
                                    else {
                                        dijit = new DateTextBox(attrProps, domConstruct.create("td", {class: 'inputClass'}, par));
                                    }
                                }
                                else if(attrProps.type == 'boolean'){
                                    if(attrProps.readOnly == true){
                                        domConstruct.create("td", null, par);
                                    }
                                    else {
                                        dijit = new CheckBox(attrProps, domConstruct.create("td", {class: 'inputClass'}, par));
                                    }
                                }
                                else if(attrProps.type == 'array'){
                                    if(attrProps.items){
                                        var itemProperties = attrProps.items;
                                        if(itemProperties.properties) {
                                            var attrProps = itemProperties.properties;
                                            self.buildRowCols(attrProps, formNode, nestingLevel+1);
                                        }
                                        else {
                                            grid = new OnDemandGrid({
                                                collection: self.nqStore, // a dstore store
                                                columns: [
                                                    { label: 'ID', field: '_id', sortable: false },
                                                    { label: 'name', field: 'name' }
                                                ]
                                            }, domConstruct.create("td", {class: 'inputClass'}, par));
                                            //domConstruct.create("td", {innerHTML: 'TABLE'}, par);
                                        }
                                    }
                                    else if(attrProps.readOnly == true){
                                        domConstruct.create("td", null, par);
                                    }
                                    else {
                                        dijit = new Select(attrProps.editorArgs, domConstruct.create("td", {class: 'inputClass'}, par));
                                    }
                                }
                                else if(attrProps.type == 'object'){
                                    if(attrProps.patternProperties){
                                        var patPropObj = attrProps.patternProperties;
                                        for(var attrName in patPropObj) {
                                            domConstruct.create("td", {innerHTML: attrName}, par);
                                            var attrProps = patPropObj[attrName];
                                            if(attrProps.anyOf){
                                                attrProps.anyOf.forEach(function(typeOf){
                                                    self.buildRowCols(typeOf.properties, formNode, nestingLevel+1);
                                                });
                                            }
                                            else self.buildRowCols(attrProps, formNode, nestingLevel+1);
                                        }
                                    }
                                    else if(attrProps.properties){
                                        self.buildRowCols(attrProps.properties, formNode, nestingLevel+1);
                                    }
                                    else if(attrProps.readOnly == true){
                                        domConstruct.create("td", null, par);
                                    }
                                    else {
                                        if(attrProps.media && attrProps.media.mediaType == 'text/json'){
                                        }
                                        else if(attrProps.media && attrProps.media.mediaType == 'text/javascript'){
                                        }
                                        dijit = new Textarea(attrProps, domConstruct.create("td", {class: 'inputClass'}, par));
                                    }
                                }
                                else {
                                    domConstruct.create("td", null, par);
                                }
                                if(dijit){
                                    self.own(dijit);
                                    dijit.startup();
                                    dijit.on('change', function(newValue){
                                        var attrProps = properties[this.name];
                                        if(newValue == attrProps.nullValue) newValue=null;
                                        else{
                                            if(attrProps.type == 'object') newValue = JSON.parse(newValue);
                                        }
                                        self.item._viewId = self.view._id;
                                        self.item[this.name] = newValue;
                                        self.store.put(self.item, {viewId: self.view._id});
                                        console.log('self.item', self.item);
                                    });
                                    dijit.startup();
                                }
                            }
                            else {//Empty row
                                domConstruct.create("td", {colspan:2}, par);
                            }
                        }
                    }
                }
                return true;
            },
            setSelectedObjIdPreviousLevel: function(value){
                return;
                //load the data
                //if(this.selectedObjIdPreviousLevel == value) return this;
                this.selectedObjIdPreviousLevel = value;

                var self = this;

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
                }
                self.setSelectedObjIdPreviousLevelDeferred.resolve(self);
                return this.setSelectedObjIdPreviousLevelDeferred.promise;
            }
        });

    });
