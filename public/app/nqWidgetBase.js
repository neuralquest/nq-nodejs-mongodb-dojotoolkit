define(['dojo/_base/declare',  'dojo/dom-construct', "dijit/_WidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/_base/lang", 'dojo/on',
        'dojo/_base/array', 'dojo/dom-attr', "dojo/Deferred", "dojo/promise/all", "dojo/when", 'dijit/registry', 'dojo/store/Memory', "dojo/dom-style",'dojo/query!css3',
        "dojo/sniff",
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
        'dgrid/Grid',
        'dgrid/Keyboard',
        'dgrid/Selection',
        'dgrid/extensions/DnD',
        'dojo/dnd/Source',
        'dgrid/Tree',
        'dgrid/extensions/ColumnResizer',
        "dgrid/extensions/DijitRegistry",
        "dojo/request",
        "dijit/form/Form",

        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins'],
	function(declare, domConstruct, _WidgetBase, ContentPane, domGeometry, lang, on,
			arrayUtil, domAttr, Deferred, all, when, registry, Memory, domStyle, css3, has, Select, DateTextBox, NumberTextBox, Textarea,
             CheckBox, Editor, CurrencyTextBox, ValidationTextBox, RadioButton,
             Toolbar, OnDemandGrid, CheckedMultiSelect, Button, Grid, Keyboard,
             Selection, DnD, Source, Tree, ColumnResizer, DijitRegistry, request, Form){
	return declare("nqWidgetBase", [_WidgetBase], {
        widget: null,
		store: null,
        createDeferred: null,
        parentId: null,
		schema: null,
		docId: null,
		selectedObjIdThisLevel: null,
		setDocIdDeferred: null,

        _setDocIdAttr: function(docId){
            this.docId = docId.length==0?null:docId;
        },
		setDocId: function(value){
			this.docId = value;
			return this;
		},
		setSelectedObjIdThisLevel: function(value){
			this.selectedObjIdThisLevel = value;
		},
		buildRendering: function(){
			this.inherited(arguments);
			this.domNode = domConstruct.create("div");
            this.headerDivNode = domConstruct.create('h1', {'style' : {  'display': 'none', 'padding': '10px'} }, this.domNode);//placeholder for header
            this.pageHelpTextDiv = domConstruct.create('div', {'class': 'helpTextInvisable', 'style' : { 'padding': '10px'} }, this.domNode);//placeholder for the helptext
			this.pageToolbarDivNode = domConstruct.create('div', {'style' : { 'display': 'none', 'min-height': '23px'} }, this.domNode);//placeholder for the page toolbar
			this.editorToolbarDivNode = domConstruct.create('div', {'style' : { 'display': 'none', 'min-height': '23px'} }, this.domNode);//placeholder for the editor toolbar
			this.pane = new ContentPane( {
//				'class' : 'backgroundClass',
				'doLayout' : 'true',
				'style' : { 'overflow': 'auto', 'padding': '0px', 'margin': '0px', width: '100%', height: '100%', background:'transparent'}
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
			var hDiv = dojo.position(this.headerDivNode);
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
        setFromValues: function(properties, doc, node){
            var self = this;
            for(var attrName in properties) {
                var attrProps = properties[attrName];
                var value = doc[attrName]?doc[attrName]:attrProps.default;
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
                            else if(attrProps.type == 'number') td.innerHTML = parseFloat(value).toFixed(2);
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
        renderForm: function(properties, node, structuredDocPathArr){
            var self = this;
            registry.findWidgets(node).forEach(function(wid){
                wid.destroyRecursive(true);
                //node.destroyDescendants(wid);
            });
            domConstruct.empty(node);
            //console.log(JSON.stringify(object));
            //var form = new Form();
            //var form = new Form({}, domConstruct.create("form", null, node));
            var tableNode = domConstruct.create('table', {style:{'border-spacing':'3px', 'padding-left': '5px'}}, node);

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
                        else{
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
                                if(attrProps.type == 'button') domConstruct.create("td", {},trDom); // No label for buttons
                                else domConstruct.create("td", {innerHTML: attrProps.title, style: labelStyle},trDom);

                                //The input td
                                var tdDom = null;
                                var style = {
                                    'font-weight': attrProps.bold?'bold':'normal',
                                    'font-size': attrProps.size?attrProps.size:'1em'
                                };
                                /*if ((attrProps.type == 'object' && attrProps.title != '_id') || (attrProps.type == 'string' && attrProps.media && attrProps.media.mediaType == 'text/html')) {
                                    // certain input field get they're own row
                                    domConstruct.create("td", null, trDom);//empty td
                                    var editorRowDom = domConstruct.create("tr", null, tableNode);
                                    tdDom = domConstruct.create("td", {name:attrName, style:style, colspan: 2}, editorRowDom);
                                }
                                else*/ tdDom = domConstruct.create("td", null, trDom);//ordinary td
                                if(attrProps.readOnly == undefined ||
                                    attrProps.readOnly ||
                                    self.amAuthorizedToUpdate == false){
                                    domAttr.set(tdDom, 'name', attrName); //give it a name so we know where to put the value
                                    if(attrProps.bold) {//TODO make these optional
                                        //style['border-top-style'] = 'solid';
                                        style['border-top-color'] = 'lightgrey';
                                        style['padding-left'] = '30px';
                                    }
                                    domAttr.set(tdDom, 'style', style);
                                }
                                else {
                                    //The input dijit
                                    attrProps.class = 'nqField';
                                    attrProps.name = attrName;
                                    var dijit = null;
                                    if (attrProps.type == 'string') {
                                        if (attrProps.media && attrProps.media.mediaType == 'text/html') {
                                            //domConstruct.create("td", null, trDom);//empty td
                                            //var editorRowDom = domConstruct.create("tr", null, tableNode);
                                            //var editorTdDom = domConstruct.create("td", {colspan: 2}, editorRowDom);

                                            domStyle.set(self.editorToolbarDivNode, 'display', 'block');
                                            var toolbar = new Toolbar({
                                                'style': {'display': 'none'}
                                            });
                                            domConstruct.place(toolbar.domNode, self.editorToolbarDivNode);
                                            dijit = new Editor({
                                                value: "<p></p>",
                                                toolbar: toolbar,
                                                minHeight: '30px',
                                                height: '',
                                                name: attrName
                                            }, domConstruct.create('div', null, tdDom));//setting the name wont be done autoamticly
                                            dijit.addStyleSheet('app/resources/editor.css');

                                            dijit.on('focus', lang.hitch(toolbar, function(event){
                                                registry.findWidgets(self.editorToolbarDivNode).forEach(function(wid){
                                                    domAttr.set(wid.domNode, 'style', {'display': 'none'});
                                                });
                                                domAttr.set(this.domNode, 'style', {'display': ''});
                                            }));
                                            //Needed for auto sizing, found it in AlwaysShowToolbar in the dijit library
                                            dijit.on('NormalizedDisplayChanged', lang.hitch(dijit, function(event){
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
                                            }));
                                        }
                                        else if (attrProps.media && attrProps.media.mediaType == 'image/jpg') {

                                        }
                                        else if (attrProps.media && attrProps.media.mediaType == 'image/webgl') {
                                        }
                                        else if (attrProps.enum) {
                                            if (attrProps.enum.length == 1) {
                                                tdDom.innerHTML = attrProps.enum[0];
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
                                                        id: tdDom.id,
                                                        store: selectStore,
                                                        idProperty: "id",
                                                        labelAttr: "label",
                                                        name: attrName
                                                        //dropDown: true
                                                    };
                                                    dijit = new CheckedMultiSelect(editorArgs, domConstruct.create("div", null, tdDom));
                                                }
                                                else {
                                                    var editorArgs = {
                                                        id: tdDom.id,
                                                        name: attrName,
                                                        store: selectStore,
                                                        style: "width:100%;",
                                                        idProperty: "id",
                                                        labelAttr: 'label',
                                                        maxHeight: -1, // tells _HasDropDown to fit menu within viewport
                                                        fetchProperties: {sort: [{attribute: "name"}]},
                                                        queryOptions: {ignoreCase: true}//doesnt work
                                                    };
                                                    dijit = new Select(editorArgs, domConstruct.create("div", null, tdDom));
                                                }
                                            }
                                        }
                                        else {
                                            if(attrProps.mask) attrProps.type = 'password';
                                            dijit = new ValidationTextBox(attrProps, domConstruct.create("input", null, tdDom));
                                        }
                                    }
                                    else if (attrProps.type == 'number') {
                                        dijit = new NumberTextBox(attrProps, domConstruct.create("input", null, tdDom));
                                    }
                                    else if (attrProps.type == 'integer') {
                                        dijit = new NumberTextBox(attrProps, domConstruct.create("input", null, tdDom));
                                    }
                                    else if (attrProps.type == 'date') {
                                        dijit = new DateTextBox(attrProps, domConstruct.create("input", null, tdDom));
                                    }
                                    else if (attrProps.type == 'boolean') {
                                        dijit = new CheckBox(attrProps, domConstruct.create("input", null, tdDom));
                                    }
                                    else if (attrProps.type == 'array') {
                                        if (attrProps.items) {
                                            var itemProperties = attrProps.items;
                                            if (itemProperties.properties) {
                                                var attrProps = itemProperties.properties;
                                                //self.buildRowCols(attrProps, tableNode, nestingLevel+1);
                                            }
                                            else {
                                                // Create a new constructor by mixing in the components
                                                var CustomGrid = declare([OnDemandGrid, Keyboard, Selection, DnD, DijitRegistry]);
                                                var columns = [{
                                                        label: 'View Name',
                                                        field: 'title',
                                                        sortable: true
                                                }];
                                                dijit = new CustomGrid({
                                                    name: attrName,
                                                    collection: self.store.filter({_id: 0}),//must return empty array
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
                                                }, domConstruct.create("div", null, tdDom));
                                            }
                                        }
                                        else {
                                            dijit = new Select(attrProps.editorArgs, domConstruct.create("input", null, tdDom));
                                        }
                                    }
                                    else if (attrProps.type == 'object') {
                                        if(attrProps.properties){
                                            self.renderForm(attrProps.properties, tdDom, []);
                                        }
                                        //domConstruct.create("td", null, trDom);//empty td
                                        //var editorRowDom = domConstruct.create("tr", null, tableNode);
                                        //var editorTdDom = domConstruct.create("td", {colspan: 2}, editorRowDom);
                                        else dijit = new Textarea(attrProps, domConstruct.create("td", {class: 'inputClass'}, tdDom));
                                    }
                                    else if (attrProps.type == 'button') {
                                        var buttonProps = {
                                            label: attrProps.title,
                                            iconClass: attrProps.iconClass,
                                            post: attrProps.post
                                        };
                                        dijit = new Button(buttonProps, domConstruct.create("input", null, tdDom));
                                    }
                                    if(dijit) {
                                        self.own(dijit);
                                        dijit.startup();
                                        dijit.structuredDocPathArr = structuredDocPathArr;
                                        if(dijit.declaredClass == 'dijit.form.Button'){
                                            dijit.on('click', function(evt){
                                                //if(!form.validate()) return;
                                                var data = {};
                                                registry.findWidgets(node).forEach(function(wid){
                                                    data[wid.name] = wid.get('value');
                                                });
                                                request.post(this.post, {
                                                    headers: {'Content-Type': 'application/json; charset=UTF-8'},//This is not the default!!
                                                    data: JSON.stringify(data)
                                                }).then(function(result){
                                                    var user = dojo.fromJson(result);
                                                    nq.setUser(user);
                                                    //TODO refresh the data
                                                    window.history.back();
                                                }, nq.errorDialog);
                                            });
                                        }
                                        else if(!attrProps.abstract){
                                            dijit.on('change', function(value){
                                                var attrName = this.name;
                                                var attrDefault = this.default;
                                                var structuredDocPathArr = this.structuredDocPathArr;
                                                self.store.get(self.docId).then(function(doc){
                                                    var docPart = doc;
                                                    if(structuredDocPathArr) structuredDocPathArr.forEach(function(pathObj){
                                                        docPart = docPart[pathObj.arrayName][pathObj.idx];
                                                    });
                                                    //console.log(docPart);
                                                    if(docPart[attrName] !== value){
                                                        if(!value || value == attrDefault) docPart.delete(attrName);
                                                        else docPart[attrName] = value;
                                                        self.store.put(doc);
                                                    }
                                                },nq.errorDialog);
                                            });
                                        }
                                    }
                                }
                            }
                        }

                    }
                }
            }
            return true;
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
