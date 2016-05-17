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

        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins'],
	function(declare, domConstruct, _WidgetBase, ContentPane, domGeometry, lang, on,
			arrayUtil, domAttr, Deferred, all, when, registry, Memory, domStyle, css3, has, Select, DateTextBox, NumberTextBox, Textarea,
             CheckBox, Editor, CurrencyTextBox, ValidationTextBox, RadioButton,
             Toolbar, OnDemandGrid, CheckedMultiSelect, Button, Grid, Keyboard,
             Selection, DnD, Source, Tree, ColumnResizer, DijitRegistry){
	return declare("nqWidgetBase", [_WidgetBase], {
        widget: null,
		store: null,
        createDeferred: null,
        parentId: null,
		schema: null,
		docId: null,
		selectedObjIdThisLevel: null,
		setDocIdDeferred: null,
		
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
            this.pageHelpTextDiv = domConstruct.create('div', {'class': 'helpTextInvisable', 'style' : { 'padding': '10px'} }, this.domNode);//placeholder for the helptext
			this.pageToolbarDivNode = domConstruct.create('div', {'style' : { 'display': 'none', 'min-height': '23px'} }, this.domNode);//placeholder for the page toolbar
			this.editorToolbarDivNode = domConstruct.create('div', {'style' : { 'display': 'none', 'min-height': '23px'} }, this.domNode);//placeholder for the editor toolbar
            this.headerDivNode = domConstruct.create('div', {'style' : {  'display': 'none', 'padding': '10px'} }, this.domNode);//placeholder for header
			this.pane = new ContentPane( {
//				'class' : 'backgroundClass',
				'doLayout' : 'true',
				'style' : { 'overflow': 'auto', 'padding': '0px', 'margin': '0px', width: '100%', height: '100%', background:'transparent'}
			},  domConstruct.create('div'));
			this.domNode.appendChild(this.pane.domNode);
			this.own(this.pane);
		},
        postCreate: function(){
            if(this.schema){
                this.headerDivNode.innerHTML = '<h1>'+this.schema.name+'</h1>';
                //domStyle.set(self.headerDivNode, 'display', 'block');//set the header node, created in the superclass,  to visible
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
                                }
                                else if(attrProps.media && attrProps.media.mediaType == 'image/webgl'){
                                }
                                else if(attrProps.enum) td.innerHTML = value;
                                else td.innerHTML = value;
                            }
                            else if(attrProps.type == 'number') td.innerHTML = parseFloat(value).toFixed(2);
                            else if(attrProps.type == 'integer') td.innerHTML = parseInt(value);
                            else if(attrProps.type == 'date') {
                                var date = dojo.date.stamp.fromISOString(value);
                                td.innerHTML = date.toLocaleDateString();
                            }
                            else if(attrProps.type == 'boolean') td.innerHTML = value?'true':'false';
                            else if(attrProps.type == 'array');
                            else if(attrProps.type == 'object') td.innerHTML = JSON.stringify(value, null, 4);
                        }
                    });
                }
            }
        },
        renderForm: function(properties, node, structuredDocPathArr){
            var self = this;
            //console.log(JSON.stringify(object));
            var formNode = domConstruct.create('table', {style:{'border-spacing':'3px', 'padding-left': '5px'}}, node);

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
                //iterate the max number of properties for this row 
                for(var propListIdx=0;propListIdx<maxProperties;propListIdx++){
                    var trDom = domConstruct.create("tr", null, formNode);
                    //For each column in this row
                    for(var j=1;j<colProperties.length;j++){//column 0 is not used
                        var propNameArr = colProperties[j]; //get the property name array for this row/column
                        var attrName = propNameArr[propListIdx]; //get the attrName from the property name array
                        // there is no corresponding attrName in this column, so add an empty row
                        if(!attrName) domConstruct.create("td", {colspan:2}, trDom);//Empty row
                        else{
                            var attrProps = properties[attrName];
                            if(attrProps && !(attrProps.type == 'array' && attrProps.items && attrProps.items.type=='object' )){
                                var style = {
                                    'font-weight': attrProps.bold?'bold':'normal',
                                    'font-size': attrProps.size?attrProps.size:'1em'
                                };
                                // The label
                                domConstruct.create("td", {innerHTML: attrProps.title, style: style},trDom);
                                var tdDom = null;
                                //The input td
                                if (attrProps.type == 'object' || (attrProps.type == 'string' && attrProps.media && attrProps.media.mediaType == 'text/html')) {
                                    // certain input field get they're own row
                                    domConstruct.create("td", null, trDom);//empty td
                                    var editorRowDom = domConstruct.create("tr", null, formNode);
                                    tdDom = domConstruct.create("td", {name:attrName, style:style, colspan: 2}, editorRowDom);
                                }
                                else tdDom = domConstruct.create("td", null, trDom);//ordinary td
                                if(/*!attrProps.readOnly || */attrProps.readOnly == true){
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
                                            domConstruct.create("td", null, trDom);//empty td
                                            var editorRowDom = domConstruct.create("tr", null, formNode);
                                            var editorTdDom = domConstruct.create("td", {colspan: 2}, editorRowDom);

                                            domStyle.set(self.editorToolbarDivNode, 'display', 'block');
                                            var toolbar = new Toolbar({
                                                'style': {'display': 'none'}
                                            });
                                            domConstruct.place(toolbar.domNode, self.editorToolbarDivNode);
                                            dijit = new Editor({
                                                value: "<p>You shouldn't be seeing this</p>",
                                                toolbar: toolbar,
                                                minHeight: '30px',
                                                height: '',
                                                name: attrName
                                            }, domConstruct.create('div', null, editorTdDom));//setting the name wont be done autoamticly
                                            dijit.addStyleSheet('app/resources/editor.css');


                                            //Needed for auto sizing, found it in AlwaysShowToolbar in the dijit library
                                            //dijit.startup();//dijit has to be started before we can attach evens
                                            dijit.on("NormalizedDisplayChanged", function(event){
                                                // summary:
                                                //		Updates the height of the editor area to fit the contents.
                                                var e = this.editorObject;
                                                //if(!e.isLoaded) return;
                                                if(e.height) return;
                                                var height = domGeometry.getMarginSize(this.domNode).h;
                                                if(has("opera"))height = e.editNode.scrollHeight;
                                                // console.debug('height',height);
                                                // alert(this.editNode);
                                                //height maybe zero in some cases even though the content is not empty,
                                                //we try the height of body instead
                                                if(!height) height = domGeometry.getMarginSize(this.ownerDocumentBody).h;
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
                                                    //domGeometry.setMarginBox(this.iframe, { h: this._lastHeight });
                                                }
                                             /*var height = domGeometry.getMarginSize(this.domNode).h;
                                             if(has("opera"))
                                             height = this.editNode.scrollHeight;
                                             }
                                             //console.log('height',domGeometry.getMarginSize(this.editNode));
                                             this.resize({h: height});
                                             domGeometry.setMarginBox(this.iframe, { h: height });
                                             */
                                             });
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
                                        else dijit = new ValidationTextBox(attrProps, domConstruct.create("input", null, tdDom));
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
                                                //self.buildRowCols(attrProps, formNode, nestingLevel+1);
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
                                        domConstruct.create("td", null, trDom);//empty td
                                        var editorRowDom = domConstruct.create("tr", null, formNode);
                                        var editorTdDom = domConstruct.create("td", {colspan: 2}, editorRowDom);
                                        dijit = new Textarea(attrProps, domConstruct.create("td", {class: 'inputClass'}, editorTdDom));
                                    }
                                    if (dijit) {
                                        self.own(dijit);
                                        dijit.startup();
                                        dijit.structuredDocPathArr = structuredDocPathArr;
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
