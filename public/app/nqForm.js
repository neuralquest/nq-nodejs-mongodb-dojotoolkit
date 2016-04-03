define(['dojo/_base/declare', 'dojo/_base/array', 'dijit/form/Select', 'dijit/Toolbar', 'dijit/form/DateTextBox',  'dijit/form/NumberTextBox','dijit/form/Textarea',
        'dijit/form/CheckBox', 'dijit/Editor', 'dijit/form/CurrencyTextBox', 'dijit/form/ValidationTextBox', 'dojo/dom-construct', "dojo/on",
        "dojo/when", "dojo/query", 'dijit/registry', "app/nqWidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/sniff", "dojo/_base/lang",
        "dojo/promise/all", "dojo/html", 'dojo/store/Memory', "dojo/dom-style","dojo/dom-attr", "dojo/json",

        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins',
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
    function(declare, arrayUtil, Select, Toolbar, DateTextBox, NumberTextBox, Textarea,
             CheckBox, Editor, CurrencyTextBox, ValidationTextBox, domConstruct, on,
             when, query, registry, nqWidgetBase, ContentPane, domGeometry, has, lang,
             all, html, Memory, domStyle, domAttr, JSON ){

        return declare("nqForm", [nqWidgetBase],{
            postCreate: function(){
                this.inherited(arguments);
                var self = this;
                var initialized = self.store.get(self.pageId).then(function(page){
                    self.page = page;
                    self.headerDivNode.innerHTML = '<h1>'+page.name+'</h1>';
                    domStyle.set(self.headerDivNode, 'display', 'block');//set the header node, created in the superclass,  to visible
                    self.pageHelpTextDiv.innerHTML = page.description;
                    return when(self.store.getInheritedSchema(self.pageId),function(schema) {
                        self.schema = schema;
                        self.enrichObjectWithDefaults(page, schema);
                        var formNode = domConstruct.create('form', {style: 'border-spacing:5px;'}, this.pane.containerNode);
                        //Collect the properties in a three dimensional array:
                        //[rows, columns, propertiesList]
                        var rowColProperties = [];
                        for(var attrName in schema.properties) {
                            var attrProps = schema.properties[attrName];
                            if(!rowColProperties[attrProps.row]) rowColProperties[attrProps.row] = [];
                            if(!rowColProperties[attrProps.row, attrProps.col]) rowColProperties[attrProps.row, attrProps.col] = [];
                            rowColProperties[attrProps.row, attrProps.col].push(schema.properties);
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
                                var par = domConstruct.create("p", null, formNode);
                                //For each column in this row
                                for(var j=1;j<colProperties.length;j++){//column 0 is not used
                                    var propertiesList = colProperties[j];
                                    var attrProps = propertiesList[l];
                                    if(attrProps) {
                                        domConstruct.create("label", {innerHTML: (attrProps.label)}, par);
                                        var dijit = null;
                                        if(attrProps.type == 'string'){
                                            if(attrProps.media && attrProps.media.mediaType == 'text/html'){
                                                dijit = new Editor(attrProps, domConstruct.create('input', {name: attrProps.name}));/*setting the name wont be done autoamticly*/
                                                //dijit.addStyleSheet('css/editor.css');
                                                //Needed for auto sizing, found it somewhere in the dijit library
                                                dijit.on("NormalizedDisplayChanged", function(event){
                                                    var height = domGeometry.getMarginSize(this.editNode).h;
                                                    if(has("opera")){
                                                        height = this.editNode.scrollHeight;
                                                    }
                                                    //console.log('height',domGeometry.getMarginSize(this.editNode));
                                                    //this.resize({h: height});
                                                    domGeometry.setMarginBox(this.iframe, { h: height });
                                                });
                                                domAttr.set(tdDom, 'colspan', '2');
                                            }
                                            else if(attrProps.media && attrProps.media.mediaType == 'image/jpg'){
                                            }
                                            else if(attrProps.media && attrProps.media.mediaType == 'image/webgl'){
                                            }
                                            else if(attrProps.enum){
                                                dijit = new Select(attrProps.editorArgs, domConstruct.create('input'));
                                            }
                                            else{
                                                if(attrProps.readOnly == true) {
                                                    domConstruct.create("input", null, par);
                                                }
                                                else {
                                                    dijit = new ValidationTextBox(attrProps, domConstruct.create('input'));
                                                }
                                            }
                                        }
                                        else if(attrProps.type == 'number'){
                                            if(attrProps.readOnly == true){
                                                domConstruct.create("input", null, par);
                                            }
                                            else {
                                                dijit = new NumberTextBox(attrProps, domConstruct.create('input', null, par));
                                            }
                                        }
                                        else if(attrProps.type == 'integer'){
                                            if(attrProps.readOnly == true){
                                                domConstruct.create("input", null, par);
                                            }
                                            else {
                                                dijit = new NumberTextBox(attrProps, domConstruct.create('input', null, par));
                                            }
                                        }
                                        else if(attrProps.type == 'date'){
                                            if(attrProps.readOnly == true){
                                                domConstruct.create("input", null, par);
                                            }
                                            else {
                                                dijit = new DateTextBox(attrProps, domConstruct.create('input', null, par));
                                            }
                                        }
                                        else if(attrProps.type == 'boolean'){
                                            if(attrProps.readOnly == true){
                                                domConstruct.create("input", null, par);
                                            }
                                            else {
                                                dijit = new CheckBox(attrProps, domConstruct.create('input', null, par));
                                            }
                                        }
                                        else if(attrProps.type == 'array'){
                                            if(attrProps.readOnly == true){
                                                domConstruct.create("input", null, par);
                                            }
                                            else {
                                                dijit = new CheckBox(attrProps, domConstruct.create('input', null, par));
                                            }
                                        }
                                        else if(attrProps.type == 'object'){
                                            if(attrProps.readOnly == true){
                                                domConstruct.create("input", null, par);
                                            }
                                            else {
                                                if(attrProps.media && attrProps.media.mediaType == 'text/json'){
                                                }
                                                else if(attrProps.media && attrProps.media.mediaType == 'text/javascript'){
                                                }
                                                dijit = new Textarea(attrProps, domConstruct.create('input', null, par));
                                            }
                                        }
                                        else {
                                            domConstruct.create("label", {innerHTML: ("unknown property type: "+attrProps.type)}, par);
                                        }
                                        if(dijit){
                                            self.own(dijit);
                                            dijit.on('change', function(newValue){
                                                var attrProps = self.schema.properties[this.name];
                                                if(newValue == attrProps.nullValue) newValue=null;
                                                else{
                                                    if(attrProps.type == 'object') newValue = JSON.parse(newValue);
                                                }
                                                self.item._viewId = self.view._id;
                                                self.item[this.name] = newValue;
                                                self.store.put(self.item, {viewId: self.view._id});
                                                console.log('self.item', self.item);
                                            });
                                        }
                                    }
                                    else {//Empty row
                                        domConstruct.create("label", {colspan:2}, par);
                                    }
                                }
                            }
                        }
                        return true;
                    });
                });
                when(initialized, function(result){
                    self.createDeferred.resolve(self);//ready to be loaded with data
                }, function(err){self.createDeferred.reject(err)});
            },
            setSelectedObjIdPreviousLevel: function(value){
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
