define(['dojo/_base/declare',  'dojo/dom-construct', "dijit/_WidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/_base/lang", 'dojo/on',
        'dojo/_base/array', 'dojo/dom-attr', 'dijit/registry', 'dojo/store/Memory', "dojo/dom-style",'dojo/query!css3',
        "dojo/sniff", "dojo/date", "dojox/form/Uploader", 'app/nqSubDocStore',
        'dijit/form/Select',
        'dijit/form/DateTextBox',
        'dijit/form/NumberTextBox',
        'dijit/form/Textarea',
        'dijit/form/CheckBox',
        'dijit/Editor',
        'dijit/form/CurrencyTextBox',
        'dijit/form/ValidationTextBox',
        "dijit/form/RadioButton",
        'dijit/Toolbar',
        'dgrid/OnDemandGrid',
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
			arrayUtil, domAttr, registry, Memory, domStyle, css3, has, date, Uploader, nqSubDocStore,
             Select, DateTextBox, NumberTextBox, Textarea,
             CheckBox, Editor, CurrencyTextBox, ValidationTextBox, RadioButton,
             Toolbar, OnDemandGrid, CheckedMultiSelect, Button, Keyboard,
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
            this.headerDivNode = domConstruct.create('div', null, this.domNode);//placeholder for header
            this.pageHelpTextDiv = domConstruct.create('div', {'class': 'helpTextInvisable', 'style' : { 'padding': '10px'} }, this.domNode);//placeholder for the helptext
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
            this.inherited(arguments);
            if(this.schema){
                if(this.widTot>1) {
                    this.headerDivNode.innerHTML  = this.widget.name;
                    //domConstruct.create('h1', {innerHTML: this.widget.name,'style' : { 'padding': '10px'} }, this.pane.containerNode);
                    domStyle.set(this.headerDivNode, 'display', 'block');//set the header node, created in the superclass,  to visible
                }
                this.pageHelpTextDiv.innerHTML = this.schema.description;
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

        renderNewForm: function(properties, doc, owner, node){
            registry.findWidgets(node).forEach(function(wid){
                wid.destroyRecursive(true);
                //node.destroyDescendants(wid);
            });
            domConstruct.empty(node);
            this.renderForm(properties, doc, owner, node);
        },
        renderForm: function(properties, doc, owner, node){
            var self = this;
            var tableNode = domConstruct.create('table', null/*{style:{'border-top-style':'solid', 'border-top-width':'thin', 'border-top-color':'#a8c1eb'}}*/, node);
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
                                var labelStyle = {
                                    'font-weight': attrProps.bold?'bold':'normal',
                                    //'font-weight': 'bold',
                                    'font-size': attrProps.size?attrProps.size:'1em',
                                    'padding-top': '3px',
                                    'white-space': 'nowrap'
                                };
                                if(attrProps.title) domConstruct.create("td", {innerHTML: attrProps.title, style: labelStyle},trDom);
                                else domConstruct.create("td", null,trDom);

                                //The input td
                                var inputNode = domConstruct.create("td", {style:{'padding-left': '5px'}}, trDom);
                                self.renderValue(attrProps, attrName, doc, owner, inputNode);

                                //The help td
                                //domConstruct.create("img",{class:'helpIcon'}, inputNode);
                            }
                        }

                    }
                }
            }
        },
        renderValue: function(attrProps, attrName, doc, owner, node){
            var self = this;
            if(!doc) return;
            var value = doc[attrName];
            var readOnly = owner?false:attrProps.readOnly;
            var readOnly = attrProps.readOnly==undefined?false:attrProps.readOnly;
            value = value==undefined?attrProps.default:value;
            var dijitProperties = {
                name: attrName,
                value: value,
                class: 'nqField'
            };
            if(readOnly) {
                domAttr.set(node, 'name', attrName); //give it a name so we know where to put the value
                var style = {
                    'font-weight': attrProps.bold?'bold':'normal',
                    'font-size': attrProps.size?attrProps.size:'1em',
                    'border-top-style': attrProps.bold?'solid':'',
                    'border-top-color': 'lightgrey',
                    'border-width': '1px',
                    'padding-right': attrProps.bold?'10px':'50px'
                };
                domAttr.set(node, 'style', style);
            }

            //The input dijit
            //attrProps.class = 'nqField';
            //attrProps.name = attrName;
            var dijit = null;
            if(attrProps.type == 'string') {
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
                            name: attrName,
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
                        domConstruct.create("br", null, node);
                        domConstruct.create("img", {src:value}, node);
                    }
                }
                else if(attrProps.format && attrProps.format == 'uri') {
                    if(value) domConstruct.create("img", {src:value, style:{width:'200px'}}, node);
                }
                else if(attrProps.media && attrProps.media.mediaType == 'image/webgl') {
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
                                    name: attrName
                                    //dropDown: true
                                };
                                dijit = new CheckedMultiSelect(editorArgs, domConstruct.create("div", null, node));
                            }
                            else {
                                var editorArgs = {
                                    value: value?value:"",
                                    id: node.id,
                                    name: attrName,
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
                        var refDoc = self.store.cachingStore.getSync(value);
                        node.innerHTML = refDoc.name?refDoc.name:refDoc.title;
                    }
                    else{
                        var childrenFilter = self.store.buildBaseFilterFromQuery(attrProps.query, value, null);
                        if(childrenFilter) {
                            var childrenCollection = self.store.filter(childrenFilter);
                            data = [];
                            childrenCollection.forEach(function (childObject) {
                                data.push({id:childObject._id, label:childObject.name?childObject.name:childObject.title});
                            });
                            data.push({id:'null',label:'[not selected]'});
                            var selectStore = new Memory({
                                data: data
                            });
                            var editorArgs = {
                                value: value?value:"null",
                                id: node.id,
                                name: attrName,
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
            }
            else if (attrProps.type == 'number') {
                if(readOnly){
                    var style = domAttr.get(node, 'style');
                    style+='text-align: right;';
                    domAttr.set(node, 'style', style);
                    if(attrProps.query){
                        var childrenFilter = self.store.buildBaseFilterFromQuery(attrProps.query, value, null);
                        if(childrenFilter) {
                            var childrenCollection = self.store.filter(childrenFilter);
                            childrenCollection.fetch().then(function (childObjects) {
                                var sum = 0;
                                childObjects.forEach(function(asset){
                                    sum+=asset.value;
                                });
                                node.innerHTML = parseFloat(sum);
                            });
                        }
                    }
                    else node.innerHTML = parseFloat(value).toFixed(2);
                }
                else{
                    if(attrProps.query){
                        debugger;
                    }
                    else{
                        dijitProperties.constraints = {
                            min: attrProps.minimum,
                            max: attrProps.maximum
                        };
                        dijit = new NumberTextBox(dijitProperties, domConstruct.create("input", null, node));
                    }
                }
            }
            else if (attrProps.type == 'integer') {
                if(readOnly){

                }
                else{
                    dijit = new NumberTextBox(dijitProperties, domConstruct.create("input", null, node));
                }
            }
            else if (attrProps.type == 'date') {
                if(readOnly){
                    if(value=='$now') node.innerHTML = value;
                    else {
                        var date = dojo.date.stamp.fromISOString(value);
                        node.innerHTML = date.toLocaleDateString();
                    }
                }
                else{
                    dijit = new DateTextBox(dijitProperties, domConstruct.create("input", null, node));
                }
            }
            else if (attrProps.type == 'boolean') {
                if(readOnly){
                    node.innerHTML = value?'true':'false';
                }
                else{
                    dijit = new CheckBox(dijitProperties, domConstruct.create("input", null, node));
                }
            }
            else if (attrProps.type == 'array') {
                if(readOnly){
                    if(attrProps.items) {
                        var itemProperties = attrProps.items;
                        if(itemProperties.properties) {
                            var attrProps = itemProperties.properties;
                            if(value) value.forEach(function(valueObj){
                                self.renderForm(attrProps, valueObj, owner, node);
                            });
                        }
                    }
                    else if(attrProps.query){
                        var refDoc = self.store.cachingStore.getSync(item);
                        domConstruct.create("p", {innerHTML:refDoc.name}, td);
                    }
                    /*else if(attrProps.items && attrProps.items.properties){
                        var props = attrProps.items.properties;
                        //self.setFromValues(props, doc, td)
                        var codeNode = domConstruct.create("pre", {style:{padding:'0px', border:'none',background:'transparent'}}, node);
                        codeNode.innerHTML = JSON.stringify(value, null, 4);
                    }*/
                    else node.innerHTML = value;
                }
                else{
                    if(attrProps.items) {
                        var itemProperties = attrProps.items;
                        if(itemProperties.properties) {
                            var attrProps = itemProperties.properties;
                            var dndTbl = domConstruct.create('div', {class: 'container'}, node);
                            if (value) value.forEach(function (valueObj) {
                                var dndRow = domConstruct.create('div', {class: 'dojoDndItem'}, dndTbl);
                                self.renderForm(attrProps, valueObj, owner, dndRow);
                            });
                            new Source(dndTbl, {skipForm: 'true', type: attrName});
                        }
                        else if(attrProps.query){
                            var childrenFilter = self.store.Filter().in('_id', value);
                            // Create a new constructor by mixing in the components
                            var CustomGrid = declare([OnDemandGrid, Keyboard, Selection, DnD, DijitRegistry]);
                            var columns = [{
                                label: 'Name',
                                field: 'name',
                                sortable: true
                            }];
                            dijit = new CustomGrid({
                                name: attrName,
                                collection: self.store.filter(childrenFilter),
                                loadingMessage: 'Loading data...',
                                noDataMessage: 'No results found.',
                                columns: columns,
                                showHeader: false,
                                // for Selection; only select a single row at a time
                                selectionMode: 'single',
                                // for Keyboard; allow only row-level keyboard navigation
                                cellNavigation: false,
                                className: "dgrid-autoheight nqTransparent"//,
                                //declaredClass: 'OnDemandGrid' //need this for recognition later on
                            }, domConstruct.create("div",null, node));
                        }
                        /*
                        if(itemProperties.properties) {
                            var subDocStore = new nqSubDocStore({
                                idProperty: "name",
                                data: value?value:[]
                            });
                            //var subDocStore = new nqSubDocStore({data:parentDoc.insets});
                            var docCol = subDocStore.filter();
                            //docCol = new QueryResults(parentDoc.insets?parentDoc.insets:[]);
                            //this.grid.set('collection', docCol);
                            // Create a new constructor by mixing in the components
                            var CustomGrid = declare([OnDemandGrid, Keyboard,  DnD, DijitRegistry]);
                            var columns = [{
                                label: 'Label',
                                field: 'title',
                                sortable: true,
                                renderCell: function(object, value, gridNode, options) {
                                    if(!object) html.set(node, '{}');
                                    else self.renderForm(itemProperties.properties, object, owner, gridNode);
                                    //else html.set(node, JSON.stringify(object, null, 4));
                                }//,
                                //editor: 'text'
                            }];
                            dijit = new CustomGrid({
                                name: attrName,
                                collection: docCol,
                                loadingMessage: 'Loading data...',
                                noDataMessage: 'No results found.',
                                columns: columns,
                                showHeader: false,
                                // for Selection; only select a single row at a time
                                selectionMode: 'single',
                                // for Keyboard; allow only row-level keyboard navigation
                                cellNavigation: false,
                                className: "dgrid-autoheight nqTransparent",
                                declaredClass: 'OnDemandGrid' //need this for recognition later on
                            }, domConstruct.create("div",null, node));
                            /*var attrProps = itemProperties.properties;
                            if(value) value.forEach(function(valueObj){
                                self.renderForm(attrProps, valueObj, owner, node);
                            });* /
                        }*/

                    }
                    else {
                        dijit = new Select(dijitProperties, domConstruct.create("input", null, node));
                    }
                }
            }
            else if (attrProps.type == 'object') {
                if(attrProps.properties){
                    self.renderForm(attrProps.properties, value, owner, node);
                }
                else{
                    var codeNode = domConstruct.create("pre", {style:{padding:'0px', border:'none',background:'transparent'}}, node);
                    codeNode.innerHTML = JSON.stringify(value, null, 4);
                }
            }
            else if (attrProps.type == 'button') {
                var buttonProps = {
                    label: attrProps.label,
                    iconClass: attrProps.iconClass,
                    action: attrProps.action,
                    disabled: readOnly
                };
                dijit = new Button(buttonProps, domConstruct.create("input", null, node));
                this.own(dijit.on('click', function(evt){
                    var data = {};
                    var properties = self.schema.properties;
                    /*for(var attrName in self.schema.properties) {
                        var attrProps = self.schema.properties[attrName];
                        var value = null;
                        var widget = null;
                        registry.findWidgets(self.pane.containerNode).forEach(function(wid){
                            if(!widget && wid.name == attrName) widget = wid;
                            //console.log('wid', wid);
                        });
                        if(widget){
                            //console.log('widget', widget.name);
                            if(widget.declaredClass ==  "OnDemandGrid"){
                            }
                            else value = widget.get('value');
                        }
                        else {//no widget, so we're dealing with a readonly field
                            if (attrProps.default == '$userId') value = nq.getUser().id;
                            else if (attrProps.default == '$ownerId') value = nq.getOwner().id;
                            else if (attrProps.default == '$docId') value = self.docId;
                        }
                        if(value) data[attrName] = value;
                    }*/
                    /*data.stateHistory = [{
                     date: dojo.date.stamp.toISOString(new Date()),
                     stateId: "57790e503c6d3cd598a5a3a0"
                     }];*/
                    //data.parentId = self.schema.query.isA;
                    if('action' in this.params){
                        var action = this.params.action;
                        if('actionType' in action && action.actionType == 'add'){
                            var newDoc = lang.clone(action.newDoc);
                            for(var attrName in newDoc){
                                if (newDoc[attrName] == '$userId') newDoc[attrName] = nq.getUser().id;
                                else if (newDoc[attrName] == '$ownerId') newDoc[attrName] = nq.getOwner().id;
                                else if (newDoc[attrName] == '$docId') newDoc[attrName] = self.docId;
                            }
                            self.store.add(newDoc);
                        }
                        else if('actionType' in action && action.actionType == 'insertSubDocArray'){
                            var newDoc = lang.clone(action.newDoc);
                            for(var attrName in newDoc){
                                if (newDoc[attrName] == '$userId') newDoc[attrName] = nq.getUser().id;
                                else if (newDoc[attrName] == '$ownerId') newDoc[attrName] = nq.getOwner().id;
                                else if (newDoc[attrName] == '$docId') newDoc[attrName] = self.docId;
                            }
                            var updateDoc = self.store.cachingStore.getSync(self.docId);
                            var updateArray = updateDoc[action.arrayName];
                            updateArray.unshift(newDoc);
                            self.store.put(updateDoc);
                        }
                        else if('actionType' in action && action.actionType == 'post'){
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
                    }

                }));
            }
            else if (attrProps.type == 'file') {
                //dijit = new Uploader(dijitProperties, domConstruct.create("input", null, node));
                //domConstruct.create("input", {type:'file', id:"files", name:"files", accept:"image/*"  }, tdDom);
                //dijit = new Button({label:'A',type:'file', id:"files", name:"files", accept:"image/*"  }, domConstruct.create("input",null , tdDom));
                dijit = new Uploader({type:'file', url:'/upload', accept:"image/*", readOnly: "false"}, domConstruct.create("input",attrProps , node));
                this.own(dijit.on('change', function(evt){
                    var data = evt[0];
                    var temp = window.webkitURL.createObjectURL(evt);
                    data.owner = nq.getOwner().id;
                    data.user = nq.getUser().id;
                    data.path = 'C:/Users/cjong/Pictures/zonomhoog.jpg';
                    //data = {path:'C:/Users/cjong/Pictures/zonomhoog.jpg', name:'zonomhoog', owner:nq.getOwner().id};
                    request.post(this.post, {
                        headers: {'Content-Type': 'application/json; charset=UTF-8'},//This is not the default!!
                        data: JSON.stringify(data)
                    }).then(function(result){
                        var name = dojo.fromJson(result).name;
                    }, nq.errorDialog);
                }));
            }
            else if(value) node.innerHTML = value;
            if(dijit) {
                self.own(dijit);
                dijit.startup();
                if(!attrProps.abstract){
                    this.own(dijit.on('change', function(value){
                        var attrName = this.name;
                        var attrDefault = this.default;
                        self.store.get(self.docId).then(function(doc){
                            var docPart = doc;
                            //console.log(docPart);
                            if(docPart[attrName] !== value){
                                if(!value || value == attrDefault) docPart.delete(attrName);
                                else docPart[attrName] = value;
                                self.store.put(doc);
                            }
                        },nq.errorDialog);
                    }));
                }
            }
        },
        XsetFromValues: function(properties, doc, node){
            var self = this;
            for(var attrName in properties) {
                var attrProps = properties[attrName];
                var value = doc[attrName]?doc[attrName]:attrProps.default;
                if(value == '$userId') value = nq.getUser().id;
                else if(value == '$ownerId') value = nq.getOwner().id;
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
                                    var childrenFilter = self.store.buildBaseFilterFromQuery(attrProps.query, value, null);
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
