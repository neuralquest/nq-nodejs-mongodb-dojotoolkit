define(['dojo/_base/declare',  'dojo/dom-construct', "dijit/_WidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/_base/lang", 'dojo/on',
        'dojo/_base/array', 'dojo/dom-attr', 'dijit/registry', 'dojo/store/Memory', "dojo/dom-style",'dojo/query!css3',
        "dojo/sniff", "dojo/date", "dojox/form/Uploader",
        'dijit/form/Select',
        'dijit/form/DateTextBox',
        'dijit/form/NumberTextBox',
        'dijit/form/Textarea', "dijit/Menu", 'dijit/MenuItem', 'dijit/DropDownMenu', 'dijit/PopupMenuItem', 'dijit/CheckedMenuItem',
        'dijit/form/CheckBox',
        'dijit/Editor',
        'dijit/form/CurrencyTextBox',
        'dijit/form/ValidationTextBox',
        "dijit/form/RadioButton",
        'dijit/Toolbar',
        'dijit/Tooltip',
        'dijit/form/MultiSelect',
        'dojox/form/CheckedMultiSelect',
        "dijit/form/Button",
        'dgrid/Keyboard',
        'dgrid/Selection',
        'dgrid/extensions/DnD',
        'dojo/dnd/Source',
        "dgrid/extensions/DijitRegistry",
        "dojo/request",

        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins'],
	function(declare, domConstruct, _WidgetBase, ContentPane, domGeometry, lang, on,
			arrayUtil, domAttr, registry, Memory, domStyle, css3, has, date, Uploader,
             Select, DateTextBox, NumberTextBox, Textarea,Menu,  MenuItem, DropDownMenu, PopupMenuItem, CheckedMenuItem,
             CheckBox, Editor, CurrencyTextBox, ValidationTextBox, RadioButton,
             Toolbar, Tooltip, MultiSelect, CheckedMultiSelect, Button, Keyboard,
             Selection, DnD, Source, DijitRegistry, request){
	return declare("nqWidgetBase", [_WidgetBase], {
        widget: null,
		store: null,
		schema: null,
		docId: null,
        selectedId: null,


        _setDocIdAttr: function(docId){
            this.docId = docId?docId.length==24?docId:null:null;
        },
        _setSelectedIdAttr: function(selectedId){
            this.selectedId = selectedId?selectedId.length==24?selectedId:null:null;
        },

		buildRendering: function(){
			this.inherited(arguments);
			this.domNode = domConstruct.create("div");
            this.headerDivNode = domConstruct.create('div', {style:{'font-size': '90%'}}, this.domNode);//placeholder for header
            this.pageHelpTextDiv = domConstruct.create('div', {'class': 'helpTextInvisible'}, this.domNode);//placeholder for the helptext
			this.pageToolbarDivNode = domConstruct.create('div', {'style' : { 'display': 'none', 'min-height': '23px'} }, this.domNode);//placeholder for the page toolbar
			this.editorToolbarDivNode = domConstruct.create('div', {'style' : { 'display': 'none', 'min-height': '23px'} }, this.domNode);//placeholder for the editor toolbar
			this.pane = new ContentPane( {
//				'class' : 'backgroundClass',
				'doLayout' : 'true',
				'style' : { 'overflow': 'auto', 'padding': '0px', 'margin': '0px', width: '100%', height: '100%', background:'backgroundClass'}
			},  domConstruct.create('div'));
			this.domNode.appendChild(this.pane.domNode);
			this.own(this.pane);
		},
        postCreate: function(){
            var self = this;
            this.inherited(arguments);
            if(this.schema){
                if(this.widTot>1) {
                    this.headerDivNode.innerHTML  = this.widget.name;
                    //domConstruct.create('h1', {innerHTML: this.widget.name,'style' : { 'padding': '10px'} }, this.pane.containerNode);
                    domStyle.set(this.headerDivNode, 'display', 'block');//set the header node, created in the superclass,  to visible
                }
                this.pageHelpTextDiv.innerHTML = this.schema.description;
                new Tooltip({
                    connectId: [self.pane.containerNode],
                    selector: "td",
                    getContent: function(matchedNode){
                        return matchedNode.getAttribute("helpText");
                    }
                });
            }
        },
		resize: function(changeSize){
			this.inherited(arguments);
			if(!changeSize) return;
			var hDiv = dojo.position(this.editorToolbarDivNode);
			if(hDiv) changeSize.h -= hDiv.h;
			this.pane.resize(changeSize);
		},
		startup: function(){
			//console.log('startup CALLED', this.id);
			dojo.forEach(registry.findWidgets(this.domNode), function(widget) {
				widget.startup();
			});
			this.pane.resize();
		},

        renderNewForm: function(properties, doc, node){
            registry.findWidgets(node).forEach(function(wid){
                wid.destroyRecursive(true);
                //node.destroyDescendants(wid);
            });
            domConstruct.empty(node);
            this.renderForm(properties, doc, node, '');
        },
        renderForm: function(properties, doc, node, path){
            var self = this;
            var tableNode = domConstruct.create('table', {style:{width:'100%','border-top-style':'solid', 'border-top-width':'thin', 'border-top-color':'#a8c1eb'}}, node);
            //Collect the properties in a three dimensional array: [rows, columns, propNameArr]
            var rowColProperties = [];
            for(var attrName in properties) {
                var attrProps = properties[attrName];
                if(!attrProps.row) attrProps.row = 1;
                if(!attrProps.col) attrProps.col = 1;
                if(!rowColProperties[attrProps.row]) rowColProperties[attrProps.row] = [];
                if(!rowColProperties[attrProps.row][attrProps.col]) rowColProperties[attrProps.row][attrProps.col] = [];
                rowColProperties[attrProps.row][attrProps.col].push(attrName);
            }
            //console.dir(rowColProperties);
            //for each row we found
            for(var i=1;i<rowColProperties.length;i++){//row 0 is invisible
                var colProperties = rowColProperties[i];
                //Find the highest length of propNameArr for the columns in this row
                var maxProperties = 0;
                for(var j=1;j<colProperties.length;j++){//column 0 is not used
                    var props = colProperties[j];
                    maxProperties = props.length>maxProperties?props.length:maxProperties;
                }
                //iterate the max number of column properties for this row
                for(var propListIdx=0;propListIdx<maxProperties;propListIdx++){
                    var trDom = domConstruct.create("tr", null, tableNode);
                    //For each column in this row
                    for(var k=1;k<colProperties.length;k++){//column 0 is not used
                        var propNameArr = colProperties[k]; //get the property name array for this row/column
                        var attrName = propNameArr[propListIdx]; //get the attrName from the property name array
                        // there is no corresponding attrName in this column, so add an empty row
                        if(!attrName) domConstruct.create("td", {colspan:2}, trDom);//Empty row
                        else {
                            var attrProps = properties[attrName];
                            if(attrProps){
                                // The label
                                var labelStyle = {};
                                if('labelStyle' in attrProps) labelStyle = attrProps.labelStyle;
                                labelStyle['padding-top'] = '3px';
                                labelStyle['white-space'] = 'nowrap';
                                if(attrProps.title) domConstruct.create("td", {innerHTML: attrProps.title, style: labelStyle},trDom);
                                else domConstruct.create("td", null,trDom);

                                //The input td
                                var helpText = self.getHelpText(attrProps, attrName);
                                var inputNode = domConstruct.create("td", {helpText: helpText, style:{'padding-left': '5px', width:'100%'}}, trDom);
                                var pathArr = [];
                                if(path) pathArr = path.split('.');
                                pathArr.push(attrName);
                                self.renderValue(attrProps, attrName, doc, inputNode, pathArr.join('.'));

                                //The help td
                                //domConstruct.create("img",{class:'smallHelp helpTextInvisible'}, trDom);
                                //var helpTextTd = domConstruct.create("td", {class:'helpTextInvisible'},trDom);
                                //helpTextTd.appendChild(self.makeToolTip(attrProps, attrName));
                            }
                        }
                    }
                }
            }
        },
        renderValue: function(attrProps, attrName, doc, node, path){
            var self = this;
            if(!doc) return;

            var value = doc[attrName];

            var readOnly = true;
            if(self.editMode && (attrProps.readOnly != undefined)) {
                if(typeof(attrProps.readOnly) == 'boolean') readOnly = attrProps.readOnly;
                else readOnly = self.store.getValueByDotNotation2(doc, attrProps.readOnly);
            }
            if(readOnly) { // readOnly
                domAttr.set(node, 'name', attrName); //give it a name so we know where to get the value
                //if('style' in attrProps) domAttr.set(node, 'style', attrProps.style);
            }
            if('style' in attrProps){
                var style = self.store.getValueByDotNotation3(doc, self.docId, attrProps.style);
                if(style) domStyle.set(node, style);
            }

            var dijitProperties = {
                name: path,
                value: value,
                readOnly: readOnly,
                class: 'nqField'
            };
            
            var dijit = null;
            if(attrProps.type == 'string') dijit = self.renderValueString(attrProps,  node, dijitProperties);
            else if(attrProps.type == 'number') dijit = self.renderValueNumber(attrProps, node, dijitProperties);
            else if(attrProps.type == 'boolean') dijit = self.renderValueBoolean(attrProps, node, dijitProperties);
            else if(attrProps.type == 'array') dijit = self.renderValueArray(attrProps, node, dijitProperties);
            else if(attrProps.type == 'object') dijit = self.renderValueObject(attrProps, node, dijitProperties);
            else if(attrProps.type == 'button') dijit = self.renderValueButton(attrProps, node, dijitProperties, doc);
            else if(attrProps.type == 'file') dijit = self.renderValueFile(attrProps, node, dijitProperties);
            
 
            
            if(dijit) {
                self.own(dijit);
                dijit.startup();
                if(!attrProps.abstract){
                    this.own(dijit.on('change', function(value){
                        var attrName = this.name;
                        var path = this.name;
                        self.store.get(self.docId).then(function(doc){
                            var docPart = doc;
                            var storedValue = self.store.getValueByDotNotation(doc, path, value);
                            if(storedValue!=value) {
                                self.store.setValueByDotNotation(doc, path, value);
                                self.store.put(doc, {viewId: self.schema._id});
                            }
                            //console.log(docPart);
                            if(docPart[attrName] !== value){
                                docPart[attrName] = value;
                                self.store.put(doc, {viewId: self.schema._id});
                            }
                        },nq.errorDialog);
                    }));
                }
            }
        },
        
        
        //------------------------------------------------------------
        // String
        //------------------------------------------------------------
        renderValueString: function(attrProps, node, dijitProperties){
            var self = this;
            var dijit = null;
            var value = dijitProperties.value;
            var readOnly = dijitProperties.readOnly;
            if(attrProps.media && attrProps.media.mediaType == 'text/html') {
                if(readOnly){
                    node.innerHTML = value;
                }
                else{
                    //domConstruct.create("td", null, trDom);//empty td
                    //var editorRowDom = domConstruct.create("tr", null, tableNode);
                    //var editorTdDom = domConstruct.create("td", {colspan: 2}, editorRowDom);

                    domStyle.set(self.editorToolbarDivNode, 'display', 'block');
                    var toolbar = new Toolbar({
                        'style': {'display': 'none'}
                    });
                    domConstruct.place(toolbar.domNode, self.editorToolbarDivNode);
                    dijit = new Editor({
                        value: value,
                        toolbar: toolbar,
                        minHeight: '30px',
                        height: '',
                        name: dijitProperties.attrName,
                        class: 'nqField'
                    }, domConstruct.create('div', null, node));//setting the name wont be done autoamticly
                    dijit.addStyleSheet('app/resources/editor.css');

                    this.own(dijit.on('focus', lang.hitch(toolbar, function(event){
                        registry.findWidgets(self.editorToolbarDivNode).forEach(function(wid){
                            domAttr.set(wid.domNode, 'style', {'display': 'none'});
                        });
                        domAttr.set(this.domNode, 'style', {'display': ''});
                    })));
                    //Needed for auto sizing, found it in AlwaysShowToolbar in the dijit library
                    this.own(dijit.on('NormalizedDisplayChanged', lang.hitch(dijit, function(event){
                        // summary:
                        //		Updates the height of the editor area to fit the contents.
                        var e = this;
                        if(!e.isLoaded){
                            return;
                        }
                        if(e.height){
                            return;
                        }

                        var height = domGeometry.getMarginSize(e.editNode).h;
                        if(has("opera")){
                            height = e.editNode.scrollHeight;
                        }
                        // console.debug('height',height);
                        // alert(this.editNode);

                        //height maybe zero in some cases even though the content is not empty,
                        //we try the height of body instead
                        if(!height){
                            height = domGeometry.getMarginSize(e.document.body).h;
                        }

                        if(this._fixEnabled){
                            // #16204: add toolbar height when it is fixed aka "stuck to the top of the screen" to prevent content from cutting off during autosizing.
                            // Seems like _updateHeight should be taking the intitial margin height from a more appropriate node that includes the marginTop set in globalOnScrollHandler.
                            height += domGeometry.getMarginSize(this.editor.header).h;
                        }

                        if(height == 0){
                            console.debug("Can not figure out the height of the editing area!");
                            return; //prevent setting height to 0
                        }
                        if(has("ie") <= 7 && this.editor.minHeight){
                            var min = parseInt(this.editor.minHeight);
                            if(height < min){
                                height = min;
                            }
                        }
                        if(height != this._lastHeight){
                            this._lastHeight = height;
                            // this.editorObject.style.height = this._lastHeight + "px";
                            domGeometry.setMarginBox(e.iframe, { h: this._lastHeight });
                        }
                    })));
                }
            }
            else if(attrProps.media && attrProps.media.binaryEncoding == 'base64' && attrProps.media.type == 'image/png') {
                if(!readOnly){
                    dijitProperties.constraints = {
                        minLength: attrProps.minLength,
                        maxLength: attrProps.maxLength,
                        regExp: attrProps.pattern
                    };
                    dijit = new ValidationTextBox(dijitProperties, domConstruct.create("input", null, node));
                }
                if(value) {
                    //domConstruct.create("br", null, node);
                    domConstruct.create("img", {src:value}, node);
                }
            }
            else if(attrProps.media && attrProps.media.mediaType == 'image/webgl') {
            }
            else if(attrProps.format && attrProps.format == 'date-time') {
                if(readOnly){
                    if(!value) node.innerHTML = '[no date]';
                    else if(value=='$now') node.innerHTML = value;
                    else {
                        var date = dojo.date.stamp.fromISOString(value);
                        node.innerHTML = date.toLocaleDateString();
                    }
                }
                else{
                    dijit = new DateTextBox(dijitProperties, domConstruct.create("input", null, node));
                }
            }
            else if(attrProps.format && attrProps.format == 'uri') {
                if(value) domConstruct.create("img", {src:value, style:{width:'200px'}}, node);
            }
           
            else if (attrProps.enum) {
                if(readOnly){
                    node.innerHTML = value;
                }
                else{
                    if (attrProps.enum.length == 1) {
                        node.innerHTML = attrProps.enum[0];
                    }
                    else {
                        var data = [];
                        attrProps.enum.forEach(function (value) {
                            data.push({id: value, label: value});
                        });
                        var selectStore = new Memory({
                            data: data
                        });
                        if (attrProps.enum.length < 5) {
                            var editorArgs = {
                                value: value?value:"",
                                id: node.id,
                                store: selectStore,
                                idProperty: "id",
                                labelAttr: "label",
                                name: dijitProperties.attrName
                                //dropDown: true
                            };
                            dijit = new CheckedMultiSelect(editorArgs, domConstruct.create("div", null, node));
                        }
                        else {
                            var editorArgs = {
                                value: value?value:"",
                                id: node.id,
                                name: dijitProperties.attrName,
                                store: selectStore,
                                style: "width:100%;",
                                idProperty: "id",
                                labelAttr: 'label',
                                maxHeight: -1, // tells _HasDropDown to fit menu within viewport
                                fetchProperties: {sort: [{attribute: "name"}]},
                                queryOptions: {ignoreCase: true}//doesnt work
                            };
                            dijit = new Select(editorArgs, domConstruct.create("div", null, node));
                        }
                    }
                }
            }
            else if(attrProps.query) {
                if(readOnly){
                    if(!value) node.innerHTML = '[not selected]';
                    else {
                        var refDoc = self.store.cachingStore.getSync(value);
                        if('displayIcon' in attrProps) {
                            var iconDiv = self.getIconDivForObject(refDoc);
                            node.appendChild(iconDiv);
                        }
                        else node.innerHTML = refDoc.name ? refDoc.name : refDoc.title;
                    }
                }
                else{
                    var childrenCollection = self.store.getCollectionForSubstitutedQuery(attrProps.query, this.docId, this.docId);
                    data = [];
                    childrenCollection.forEach(function (childObject) {
                        data.push({id:childObject._id, label:childObject.name?childObject.name:childObject.title});
                    });

                    if(data.length == 1) {
                        if('displayIcon' in attrProps) {
                            var iconDiv = self.getIconDivForObject(data);
                            node.appendChild(iconDiv);
                        }
                        else node.innerHTML = data[0].label;
                    }
                    else if(data.length > 1){
                        data.push({id:'null',label:'[not selected]'});
                        //data.push({id:'null',label:"<img width='16px' height='16px' src='images/one.jpg'/>Ecuador"});
                        var selectStore = new Memory({
                            data: data
                        });
                        if(data.length < 5){
                            var editorArgs = {
                                value: value?value:"",
                                id: node.id,
                                store: selectStore,
                                idProperty: "id",
                                labelAttr: "label",
                                name: dijitProperties.name
                                //dropDown: true
                            };
                            dijit = new CheckedMultiSelect(editorArgs, domConstruct.create("div", null, node));
                        }
                        else {
                            var editorArgs = {
                                value: value ? value : "null",
                                id: node.id,
                                name: dijitProperties.name,
                                store: selectStore,
                                style: "width:100%;",
                                idProperty: "id",
                                labelAttr: 'label',
                                maxHeight: -1, // tells _HasDropDown to fit menu within viewport
                                fetchProperties: {sort: [{attribute: "name"}]},
                                queryOptions: {ignoreCase: true}//doesnt work
                            };
                            dijit = new Select(editorArgs, domConstruct.create("div", null, node));
                        }
                    }
                }
            }
            else {
                if(readOnly){
                    if(value && !attrProps.mask) node.innerHTML = value;
                }
                else{
                    //if(attrProps.maxLength > 500) dijit = new Textarea(attrProps, domConstruct.create("td", {class: 'inputClass'}, tdDom));
                    dijitProperties.type = attrProps.mask?'password':'text';
                    dijitProperties.constraints = {
                        minLength: attrProps.minLength,
                        maxLength: attrProps.maxLength
                        //regExp: attrProps.pattern
                    };
                    dijitProperties.type = attrProps.mask?'password':'text';
                    dijit = new ValidationTextBox(dijitProperties, domConstruct.create("input", null, node));
                }
            }
            return dijit;
        },
        //------------------------------------------------------------
        // Number
        //------------------------------------------------------------
        renderValueNumber: function(attrProps, node, dijitProperties){
            var self = this;
            var dijit = null;
            var readOnly = dijitProperties.readOnly;
            if(readOnly){
                var style = domAttr.get(node, 'style');
                style+='text-align: right;';
                domAttr.set(node, 'style', style);
                if(attrProps.query){
                    var childrenCollection = self.store.getCollectionForSubstitutedQuery(attrProps.query, this.docId, this.docId);
                    childrenCollection.fetch().then(function (childObjects) {
                        var sum = 0;
                        childObjects.forEach(function(asset){
                            sum+=asset.value;
                        });
                        node.innerHTML = parseFloat(sum);
                    });
                }
                else node.innerHTML = parseFloat(dijitProperties.value).toFixed(2);
            }
            else{
                dijitProperties.constraints = {
                    min: attrProps.minimum,
                    max: attrProps.maximum
                };
                dijit = new NumberTextBox(dijitProperties, domConstruct.create("input", null, node));
            }
            return dijit;
        },        
        //------------------------------------------------------------
        // Boolean
        //------------------------------------------------------------
        renderValueBoolean: function(attrProps, node, dijitProperties){
            var self = this;
            var dijit = null;
            var readOnly = dijitProperties.readOnly;
            if(readOnly){ // readOnly
                node.innerHTML = dijitProperties.value?'true':'false';
            }
            else{
                dijit = new CheckBox(dijitProperties, domConstruct.create("input", null, node));
            }
            return dijit;
        },
        //------------------------------------------------------------
        // Array
        //------------------------------------------------------------
        renderValueArray: function(attrProps, node, dijitProperties){
            var self = this;
            var dijit = null;
            var value = dijitProperties.value;
            var readOnly = dijitProperties.readOnly;
            if(readOnly){ // readOnly
                if(attrProps.items) {
                    var itemProperties = attrProps.items;
                    if(itemProperties.properties) {
                        var itemAttrProps = itemProperties.properties;
                        var num = 0;
                        if(value) value.forEach(function(valueObj){
                            var pathArr = dijitProperties.name.split('.');
                            pathArr.push(num);
                            self.renderForm(itemAttrProps, valueObj, node, pathArr.join('.'));
                            num++;
                        });
                    }
                    else if(attrProps.query){

                        dijitProperties.value.forEach(function(id){
                            if('displayIcon' in attrProps) {
                                var iconDiv = self.getIconDivForObject(id);
                                node.appendChild(iconDiv);
                            }
                            else {
                                var docObj = self.store.cachingStore.getSync(id);
                                domConstruct.create("p", {innerHTML:docObj.name}, node);
                            }
                        });
                    }
                }
                else node.innerHTML = value;
            }
            else{
                if(attrProps.items) {
                    var itemProperties = attrProps.items;
                    if(itemProperties.properties) {
                        var itemAttrProps = itemProperties.properties;
                        var dndTbl = domConstruct.create('div', {class: 'container'}, node);
                        var num = 0;
                        if (value) value.forEach(function (valueObj) {
                            var dndRow = domConstruct.create('div', {class: 'dojoDndItem'}, dndTbl);
                            var pathArr = dijitProperties.name.split('.');
                            pathArr.push(num);
                            self.renderForm(itemAttrProps, valueObj, dndRow, pathArr.join('.'));
                            num++;
                        });
                        new Source(dndTbl, {skipForm: 'true', type: dijitProperties.attrName});
                    }
                    else if(attrProps.query){
                        var childrenCollection = self.store.getCollectionForSubstitutedQuery(attrProps.query, this.docId, this.docId);
                        data = [];
                        childrenCollection.forEach(function (childObject) {
                            data.push({id:childObject._id, label:childObject.name?childObject.name:childObject.title});
                        });

                        if(data.length == 0) {
                            node.innerHTML = '[no options]';
                        }
                        if(data.length == 1) {
                            if('displayIcon' in attrProps) {
                                var iconDiv = self.getIconDivForObject(data);
                                node.appendChild(iconDiv);
                            }
                            else node.innerHTML = data[0].label;
                        }
                        else if(data.length > 1){
                            //data.push({id:'null',label:"<img width='16px' height='16px' src='images/one.jpg'/>Ecuador"});

                            if(data.length < 5){
                                var selectStore = new Memory({
                                    data: data
                                });
                                var editorArgs = {
                                    value: value?value:"",
                                    id: node.id,
                                    store: selectStore,
                                    idProperty: "id",
                                    labelAttr: "label",
                                    name: dijitProperties.name,
                                    multiple: true
                                    //dropDown: true
                                };
                                dijit = new CheckedMultiSelect(editorArgs, domConstruct.create("div", null, node));
                            }
                            else {
                                var selectElement = domConstruct.create("select", null, node);
                                for (var i in data) {
                                    var opData = document.createElement('option');
                                    opData.innerHTML =data[i].label;
                                    opData.value = data[i].id;
                                    selectElement.appendChild(opData);
                                }
                                var editorArgs = {
                                    value: value ? value : "null",
                                    id: node.id,
                                    name: dijitProperties.name,
                                    store: selectStore,
                                    style: "width:100%;",
                                    idProperty: "id",
                                    labelAttr: 'label',
                                    maxHeight: -1, // tells _HasDropDown to fit menu within viewport
                                    fetchProperties: {sort: [{attribute: "name"}]},
                                    queryOptions: {ignoreCase: true},//doesnt work,
                                    multiple: true
                                };
                                dijit = new MultiSelect(editorArgs, selectElement);
                            }
                        }
                    }
                }
            }
            return dijit;
        },
        //------------------------------------------------------------
        // Object
        //------------------------------------------------------------
        renderValueObject: function(attrProps, node, dijitProperties){
            var self = this;
            var value = dijitProperties.value;
            if(attrProps.properties){
                //self.renderForm(attrProps.properties, value, node);
                //var pathArr = dijitProperties.name.split('.');
                //pathArr.push(valueObj);
                //self.renderForm(itemAttrProps, valueObj, dndRow, pathArr.join('.'));
            }
            else{
                var codeNode = domConstruct.create("pre", {}, node);
                codeNode.innerHTML = JSON.stringify(value, null, 4);
            }
            return null;
        },
        //------------------------------------------------------------
        // Button
        //------------------------------------------------------------
        renderValueButton: function(attrProps, node, dijitProperties, doc){
            var self = this;
            var style = self.store.getValueByDotNotation3(doc, self.docId, attrProps.style);

            var buttonProps = {
                label: attrProps.label,
                iconClass: attrProps.iconClass,
                attrProps: attrProps,
                disabled: dijitProperties.readOnly,
                style: style
            };
            var dijit = new Button(buttonProps, domConstruct.create("input", null, node));
            this.own(dijit.on('click', function(evt){
                var data = {};
                var attrProps = this.params.attrProps;
                if('action' in attrProps && 'actionType' in attrProps.action){
                    var action = attrProps.action;
                    if(action.actionType == 'add'){
                        var newDoc = lang.clone(action.template);
                        for(var attrName in newDoc){
                            if (newDoc[attrName] == '$userId') newDoc[attrName] = nq.getUser()._id;
                            else if (newDoc[attrName] == '$ownerId') newDoc[attrName] = nq.getOwner()._id;
                            else if (newDoc[attrName] == '$docId') newDoc[attrName] = self.docId;
                        }
                        self.store.add(newDoc, {viewId:self.schema._id});
                    }
                    else if(action.actionType == 'insertSubDocArray'){
                        var newDoc = {};
                        for(var attrName in attrProps){
                            if(attrProps.default) newDoc[attrName] = attrProps.default;
                            //if (newDoc[attrName] == '$userId') newDoc[attrName] = nq.getUser().id;
                            //else if (newDoc[attrName] == '$ownerId') newDoc[attrName] = nq.getOwner().id;
                            //else if (newDoc[attrName] == '$docId') newDoc[attrName] = self.docId;
                        }
                        newDoc.$newDoc = true;
                        newDoc.date = '$now';
                        newDoc.description = '<p>[new text]</p>';//editor will crash with no text
                        var updateDoc = self.store.cachingStore.getSync(self.docId);
                        //var updateArray = updateDoc[action.arrayName];
                        updateDoc.stateHistory.unshift(newDoc);
                        self.store.put(updateDoc, {viewId: self.schema._id});
                    }
                    else if(action.actionType == 'login'){
                        var userNameWid = null;
                        var passwordWid = null;
                        registry.findWidgets(self.pane.containerNode).forEach(function(wid){
                            if(wid.name == 'username') userNameWid = wid;
                            if(wid.name == 'password') passwordWid = wid;
                        });
                        var data = {
                            username: userNameWid.getValue(),
                            password: passwordWid.getValue()
                        };
                        request.post('login', {
                            headers: {'Content-Type': 'application/json; charset=UTF-8'},//This is not the default!!
                            data: JSON.stringify(data)
                        }).then(function(result){
                            var user = dojo.fromJson(result);
                            nq.setUser(user);
                            //TODO refresh the data
                            window.history.back();
                        }, nq.errorDialog);
                    }
                    else if(action.actionType == 'signup'){
                        var userNameWid = null;
                        var passwordWid = null;
                        var emailWid = null;
                        registry.findWidgets(self.pane.containerNode).forEach(function(wid){
                            if(wid.name == 'username') userNameWid = wid;
                            if(wid.name == 'password') passwordWid = wid;
                            if(wid.name == 'email') emailWid = wid;
                        });
                        var data = {
                            _id: self.store.makeObjectId(),
                            username: userNameWid.getValue(),
                            password: passwordWid.getValue(),
                            email: emailWid.getValue()
                        };
                        request.post('signup', {
                            headers: {'Content-Type': 'application/json; charset=UTF-8'},//This is not the default!!
                            data: JSON.stringify(data)
                        }).then(function(result){
                            var user = dojo.fromJson(result);
                            nq.setUser(user);
                            //TODO refresh the data
                            window.history.back();
                        }, nq.errorDialog);
                    }
                }

            }));
            return dijit;
        },
        //------------------------------------------------------------
        // File
        //------------------------------------------------------------
        renderValueFile: function(attrProps, node, dijitProperties){
            //dijit = new Uploader(dijitProperties, domConstruct.create("input", null, node));
            //domConstruct.create("input", {type:'file', id:"files", name:"files", accept:"image/*"  }, tdDom);
            //dijit = new Button({label:'A',type:'file', id:"files", name:"files", accept:"image/*"  }, domConstruct.create("input",null , tdDom));
            var dijit = new Uploader({type:'file', url:'/upload', accept:"image/*", readOnly: "false"}, domConstruct.create("input",attrProps , node));
            this.own(dijit.on('change', function(evt){
                var data = evt[0];
                var temp = window.webkitURL.createObjectURL(evt);
                data.owner = nq.getOwner()._id;
                data.user = nq.getUser()._id;
                data.path = 'C:/Users/cjong/Pictures/zonomhoog.jpg';
                //data = {path:'C:/Users/cjong/Pictures/zonomhoog.jpg', name:'zonomhoog', owner:nq.getOwner().id};
                request.post(this.post, {
                    headers: {'Content-Type': 'application/json; charset=UTF-8'},//This is not the default!!
                    data: JSON.stringify(data)
                }).then(function(result){
                    var name = dojo.fromJson(result).name;
                }, nq.errorDialog);
            }));
            return dijit;
        },
        getIconDivForObject: function(doc){
            var docObj = doc;
            if(typeof doc == 'string') docObj = this.store.cachingStore.getSync(doc);
            var icon = this.getIconForObject(docObj);
            var div = domConstruct.create("div", {style:{'white-space': 'nowrap'}});
            domConstruct.create("img", {src:icon}, div);
            domConstruct.create("span", {style:{'padding-left':'3px', 'vertical-align': 'top'}, innerHTML:docObj.name}, div);
            return div;
        },
        getIconForObject: function(docObj){
            if('icon' in docObj) return docObj.icon;
            else {
                var classDoc = this.store.cachingStore.getSync(docObj.classId);
                if('icon' in classDoc) return classDoc.icon;
                //TODO search ancestors
            }
        },
        addMenuItemsForMenuDefArr: function(menuDefArr, parent){
            var self = this;
            menuDefArr.forEach(function(menuDef){
                var menuItem;
                if('menu' in menuDef){
                    var menu = new Menu({ style: "display: none;"}).startup();
                    self.addMenuItemsForMenuDefArr(menuDef.menu, menu);
                    menuItem = new PopupMenuItem({
                        showLabel: true,
                        label: menuDef.label,
                        iconClass: menuDef.iconClass,
                        popup: menu
                    }).startup();
                }
                else if('action' in menuDef){
                    var menuProperties = {
                        label: menuDef.label,
                        iconClass: menuDef.iconClass,
                        checked: menuDef.checked,
                        onClick: function(evt){
                            //var selectedItem = self.tree.get("selectedItem");
                            var newDoc = {
                                docType: 'object',
                                name: '[new service agreement]',
                                //offeringId: '',
                                buyerId: '575d4c3f2cf3d6dc3ed8314f', //platos cave
                                classId: "57424f1b3c6d3cd598a5a321"
                            };
                            var directives = {viewId: self.schema._id};
                            self.store.add(newDoc, directives).then(function(newObj){
                                //update hash to open form
                            });
                        }
                    };
                    if(menuDef.checked == undefined) menuItem = new MenuItem(menuProperties);
                    else menuItem = new CheckedMenuItem(menuProperties);
                    menuItem.startup();
                }
                if(menuItem) parent.addChild(menuItem);
            });
        },
        getHelpText: function(attrProps, attrName){
            var div = domConstruct.create("div");
            var firstLine = '';
            if('title' in attrProps) firstLine = '<b>'+attrProps.title+': </b>';
            if('description' in attrProps) firstLine += attrProps.description;
            domConstruct.create("p", {innerHTML:firstLine}, div);
            var ulDiv = domConstruct.create("ul",null, div);
            if(attrName) domConstruct.create("li",{innerHTML: 'Property Name: '+ attrName}, ulDiv);
            if(attrProps.type) domConstruct.create("li",{innerHTML: 'Type: '+ attrProps.type}, ulDiv);
            if(attrProps.media) domConstruct.create("li",{innerHTML: 'Media Type: '+ attrProps.media.mediaType}, ulDiv);
            if(attrProps.readOnly) domConstruct.create("li",{innerHTML: 'Read Only: '+ attrProps.readOnly}, ulDiv);
            if(attrProps.maxLength) domConstruct.create("li",{innerHTML: 'Maximum Length: '+ attrProps.maxLength}, ulDiv);
            if(attrProps.minLength) domConstruct.create("li",{innerHTML: 'Minimum Length: '+ attrProps.minLength}, ulDiv);
            if(attrProps.maximum) domConstruct.create("li",{innerHTML: 'Maximum: '+ attrProps.maximum}, ulDiv);
            if(attrProps.minimum) domConstruct.create("li",{innerHTML: 'Minimum: '+ attrProps.minimum}, ulDiv);
            if(attrProps.pattern) domConstruct.create("li",{innerHTML: 'Pattern: '+ attrProps.pattern}, ulDiv);
            //if(attrProps.col) domConstruct.create("li",{innerHTML: 'Column: '+ attrProps.col}, ulDiv);
            //if(attrProps.row) domConstruct.create("li",{innerHTML: 'Row: '+ attrProps.row}, ulDiv);
            if(attrProps.style) domConstruct.create("li",{innerHTML: 'Field Style: '+ JSON.stringify(attrProps.style, null, 4)}, ulDiv);
            if(attrProps.labelStyle) domConstruct.create("li",{innerHTML: 'Label Style: '+ JSON.stringify(attrProps.labelStyle, null, 4)}, ulDiv);
            if(attrProps.default) domConstruct.create("li",{innerHTML: 'Default: '+ attrProps.default}, ulDiv);
            //if(attrProps.styleColumn) domConstruct.create("li",{innerHTML: 'Column Style: '+ attrProps.styleColumn}, ulDiv);
            //if(attrProps.displayIcon) domConstruct.create("li",{innerHTML: 'Display Icon: '+ attrProps.displayIcon?'true':'false'}, ulDiv);
            if(attrProps.query) {
                domConstruct.create("p",{innerHTML: 'Query: '}, div);
                domConstruct.create("pre",{innerHTML: JSON.stringify(attrProps.query, null, 4) }, div);
            }

            return div.innerHTML;
        },
        XsetFromValues: function(properties, doc, node){
            var self = this;
            for(var attrName in properties) {
                var attrProps = properties[attrName];
                var value = doc[attrName]?doc[attrName]:attrProps.default;
                if(value == '$userId') value = nq.getUser()._id;
                else if(value == '$ownerId') value = nq.getOwner()._id;
                else if(value == '$docId') value = self.docId;

                //console.log('attrName', attrName);
                //console.log('value', value);
                //console.log('attrProps', attrProps);
                var widget = null;
                registry.findWidgets(node).forEach(function(wid){
                    if(!widget && wid.name == attrName) widget = wid;
                    //console.log('wid', wid);
                });
                if(widget){
                    //console.log('widget', widget.name);
                    if(widget.declaredClass ==  "OnDemandGrid"){
                        var filter = new this.store.Filter();
                        var childrenFilter = filter.in('_id', doc[attrName]);
                        var childrenCollection = this.store.filter(childrenFilter);
                        widget.set('collection', childrenCollection);
                    }
                    else if(value) {
                        if(attrProps.type == 'object') value = JSON.stringify(value, null, 4);
                        widget.set('value', value, false);
                    }
                }
                else{//no widget, so we're dealing with a readonly field
                    dojo.query('td[name=\"'+attrName+'\"]', node).forEach(function(td){//expect only one td
                        //console.log('td', td);
                        if(undefined != value){
                            if(attrProps.type == 'string'){
                                if(attrProps.media && attrProps.media.mediaType == 'text/html') td.innerHTML = value;
                                else if(attrProps.media && attrProps.media.mediaType == 'image/jpg'){
                                    domConstruct.create("img", {src: value.url, width: 300}, td);
                                }
                                else if(attrProps.media && attrProps.media.mediaType == 'image/webgl'){
                                }
                                else if(attrProps.enum) td.innerHTML = value;
                                else if(attrProps.query) {
                                    var refDoc = self.store.cachingStore.getSync(value);
                                    td.innerHTML = refDoc.name?refDoc.name:refDoc.title;
                                }
                                else td.innerHTML = value;
                            }
                            else if(attrProps.type == 'number') {
                                var style = domAttr.get(td, 'style');
                                style+='text-align: right;';
                                domAttr.set(td, 'style', style);
                                if(attrProps.query){
                                    var childrenFilter = self.store.buildBaseFilterFromQueryNew(attrProps.query, null, self.docId);
                                    if(childrenFilter) {
                                        var childrenCollection = self.store.filter(childrenFilter);
                                        childrenCollection.fetch().then(function (childObjects) {
                                            var sum = 0;
                                            childObjects.forEach(function(asset){
                                                sum+=asset.value;
                                            });
                                            td.innerHTML = parseFloat(sum);
                                        });
                                    }
                                }
                                else td.innerHTML = parseFloat(value).toFixed(2);
                            }
                            else if(attrProps.type == 'integer') td.innerHTML = parseInt(value);
                            else if(attrProps.type == 'date') {
                                var date = dojo.date.stamp.fromISOString(value);
                                td.innerHTML = date.toLocaleDateString();
                            }
                            else if(attrProps.type == 'boolean') td.innerHTML = value?'true':'false';
                            else if(attrProps.type == 'array'){
                                value.forEach(function(item){
                                    if(attrProps.query){
                                        var refDoc = self.store.cachingStore.getSync(item);
                                        domConstruct.create("p", {innerHTML:refDoc.name}, td);
                                    }
                                    else if(attrProps.items && attrProps.items.properties){
                                        var props = attrProps.items.properties;
                                        //self.setFromValues(props, doc, td)
                                        var codeNode = domConstruct.create("pre", {style:{padding:'0px', border:'none',background:'transparent'}}, td);
                                        codeNode.innerHTML = JSON.stringify(item, null, 4);
                                    }
                                    else td.innerHTML = value;
                                });
                            }
                            else if(attrProps.type == 'object') {
                                var codeNode = domConstruct.create("pre", {style:{padding:'0px', border:'none',background:'transparent'}}, td);
                                codeNode.innerHTML = JSON.stringify(value, null, 4);
                            }
                            else td.innerHTML = value;
                        }
                    });
                }
            }
        },

        extraPlugins:[
     		'|',
     		'foreColor','hiliteColor',
     	    '|',
     		'createLink', 'unlink', 'insertImage',
     	    '|',
     /*	    {name: 'dojox.editor.plugins.TablePlugins', command: 'insertTable'},
     	   	{name: 'dojox.editor.plugins.TablePlugins', command: 'modifyTable'},
     	    {name: 'dojox.editor.plugins.TablePlugins', command: 'InsertTableRowBefore'},
     	    {name: 'dojox.editor.plugins.TablePlugins', command: 'InsertTableRowAfter'},
     	    {name: 'dojox.editor.plugins.TablePlugins', command: 'insertTableColumnBefore'},
     	    {name: 'dojox.editor.plugins.TablePlugins', command: 'insertTableColumnAfter'},
     	    {name: 'dojox.editor.plugins.TablePlugins', command: 'deleteTableRow'},
     	    {name: 'dojox.editor.plugins.TablePlugins', command: 'deleteTableColumn'},
     	    {name: 'dojox.editor.plugins.TablePlugins', command: 'colorTableCell'},
     	    {name: 'dojox.editor.plugins.TablePlugins', command: 'tableContextMenu'},
     	    {name: 'dojox.editor.plugins.TablePlugins', command: 'ResizeTableColumn'},
     	    '|',*/
     		'viewsource'
         ]

	});

});
