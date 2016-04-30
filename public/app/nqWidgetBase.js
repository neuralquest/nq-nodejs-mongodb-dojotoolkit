define(['dojo/_base/declare',  'dojo/dom-construct', "dijit/_WidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/_base/lang",
        'dojo/_base/array', 'dojo/dom-attr', "dojo/Deferred", "dojo/promise/all", "dojo/when", 'dijit/registry', 'dojo/store/Memory', "dojo/dom-style",
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
	function(declare, domConstruct, _WidgetBase, ContentPane, domGeometry, lang,
			arrayUtil, domAttr, Deferred, all, when, registry, Memory, domStyle, Select, DateTextBox, NumberTextBox, Textarea,
             CheckBox, Editor, CurrencyTextBox, ValidationTextBox, RadioButton,
             Toolbar, OnDemandGrid, CheckedMultiSelect, Button, Grid, Keyboard,
             Selection, DnD, Source, Tree, ColumnResizer, DijitRegistry){
	return declare("nqWidgetBase", [_WidgetBase], {
        widget: null,
		store: null,
        createDeferred: null,
        parentId: null,
		schema: null,
		selectedObjIdPreviousLevel: null,
		selectedObjIdThisLevel: null,
		setSelectedObjIdPreviousLevelDeferred: new Deferred(),
		
		setSelectedObjIdPreviousLevel: function(value){
			this.selectedObjIdPreviousLevel = value;
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
				//'content': 'Loading...',
				'style' : { 'overflow': 'auto', 'padding': '0px', 'margin': '0px', width: '100%', height: '100%', background:'transparent'}
			},  domConstruct.create('div'));
			this.domNode.appendChild(this.pane.domNode);
			this.own(this.pane);

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
        renderForm: function(object, value, node, options){
            //console.log(JSON.stringify(object));
            var formNode = domConstruct.create('table', {style:{'border-spacing':'3px', 'padding-left': '5px'}}, node);
            var self = this;
            var properties = self.view.properties;
            var done = false;
            self.subDocs.forEach(function(subDoc){
                if(!done && subDoc.arrayName == object.arrayName){
                    properties = subDoc.properties;
                    done = true;
                }
            });
            //Collect the properties in a three dimensional array:
            //[rows, columns, propertiesList]
            var rowColProperties = [];
            for(var attrName in properties) {
                var attrProps = properties[attrName];
                if(!attrProps.row) attrProps.row = 1;
                if(!attrProps.col) attrProps.col = 1;
                if(!rowColProperties[attrProps.row]) rowColProperties[attrProps.row] = [];
                if(!rowColProperties[attrProps.row][attrProps.col]) rowColProperties[attrProps.row][attrProps.col] = [];
                //rowColProperties[attrProps.row][attrProps.col].push(attrProps);
                rowColProperties[attrProps.row][attrProps.col].push(attrName);
            }
            for(var i=1;i<rowColProperties.length;i++){//row 0 is invisible
                var colProperties = rowColProperties[i];
                //Find the highest length of propertiesList for the columns in this row
                var maxProperties = 0;
                for(var j=1;j<colProperties.length;j++){//column 0 is not used
                    var props = colProperties[j];
                    maxProperties = props.length>maxProperties?props.length:maxProperties;
                }
                for(var l=0;l<maxProperties;l++){
                    var trDom = domConstruct.create("tr", null, formNode);
                    //For each column in this row
                    for(var j=1;j<colProperties.length;j++){//column 0 is not used
                        var propertiesList = colProperties[j];
                        var attrName = propertiesList[l];
                        var attrProps = properties[attrName];
                        if(!attrProps ||
                            (attrProps.type == 'array' && attrProps.items && attrProps.items.type=='object' ) ||
                            attrProps.type == 'object' ) {
                            domConstruct.create("td", {colspan:2}, trDom);//Empty row
                            continue;
                        }
                        var value = object[attrName]?object[attrName]:object.default;
                        var style = {
                            'font-weight': attrProps.bold?'bold':'normal',
                            'font-size': attrProps.size?attrProps.size:'1em'
                        };
                        attrProps.class = 'nqField';
                        // The label
                        domConstruct.create("td", {innerHTML: attrProps.title, style: style},trDom);
                        //The input field
                        var tdDom = domConstruct.create("td", null, trDom);
                        var dijit = null;
                        if(attrProps.type == 'string'){
                            if(attrProps.media && attrProps.media.mediaType == 'text/html'){
                                domConstruct.create("td", null, trDom);//empty td

                                domStyle.set(self.editorToolbarDivNode, 'display', 'block');
                                var toolbar = new Toolbar({
                                    'style': {'display': 'none'}
                                });
                                domConstruct.place(toolbar.domNode, self.editorToolbarDivNode);
                                //self.editorToolbarDivNode.appendChild(property.editorArgs.toolbar.domNode);
                                var editorRowDom = domConstruct.create("tr", null, formNode);
                                var editorTdDom = domConstruct.create("td", {colspan: 2}, editorRowDom);
                                dijit = new Editor({value:'<p>Hi</p>',toolbar:toolbar, minHeight: '30px', height:''}, domConstruct.create('div', null, editorTdDom));//setting the name wont be done autoamticly
                                dijit.addStyleSheet('app/resources/editor.css');


                                //Needed for auto sizing, found it in AlwaysShowToolbar in the dijit library
                                //dijit.startup();//dijit has to be started before we can attach evens
                                /*dijit.on("NormalizedDisplayChanged", function(event){
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
                                 domGeometry.setMarginBox(this.iframe, { h: this._lastHeight });
                                 }
                                 /*var height = domGeometry.getMarginSize(this.domNode).h;
                                 if(has("opera"))
                                 height = this.editNode.scrollHeight;
                                 }
                                 //console.log('height',domGeometry.getMarginSize(this.editNode));
                                 this.resize({h: height});
                                 domGeometry.setMarginBox(this.iframe, { h: height });
                                 * /
                                 });*/
                            }
                            else if(attrProps.media && attrProps.media.mediaType == 'image/jpg'){
                            }
                            else if(attrProps.media && attrProps.media.mediaType == 'image/webgl'){
                            }
                            else if(attrProps.enum){
                                dijit = self.radioButtonsOrSelect(tdDom, attrProps.enum, attrProps.default);
                            }
                            else{
                                if(attrProps.readOnly == true) tdDom.innerHTML = value;
                                else dijit = new ValidationTextBox(attrProps, domConstruct.create("input", null, tdDom));
                            }
                        }
                        else if(attrProps.type == 'number'){
                            if(attrProps.readOnly == true) tdDom.innerHTML = parseFloat(value).toFixed(2);
                            else {
                                dijit = new NumberTextBox(attrProps, domConstruct.create("input", null, tdDom));
                            }
                        }
                        else if(attrProps.type == 'integer'){
                            if(attrProps.readOnly == true) tdDom.innerHTML = parseInt(value);
                            else dijit = new NumberTextBox(attrProps, domConstruct.create("input", null, tdDom));
                        }
                        else if(attrProps.type == 'date'){
                            if(attrProps.readOnly == true){
                            }
                            else dijit = new DateTextBox(attrProps, domConstruct.create("input", null, tdDom));
                        }
                        else if(attrProps.type == 'boolean'){
                            if(attrProps.readOnly == true) tdDom.innerHTML = toString(this.value);
                            else dijit = new CheckBox(attrProps, domConstruct.create("input", null, tdDom));
                        }
                        else if(attrProps.type == 'array'){
                            if(attrProps.items){
                                var itemProperties = attrProps.items;
                                if(itemProperties.properties) {
                                    var attrProps = itemProperties.properties;
                                    //self.buildRowCols(attrProps, formNode, nestingLevel+1);
                                }
                                else {
                                    // Create a new constructor by mixing in the components
                                    var CustomGrid = declare([OnDemandGrid, Keyboard, Selection, DnD, DijitRegistry]);
                                    var columns = [
                                        {
                                            label : 'View Name',
                                            field : 'title',
                                            sortable : true
                                        }
                                    ];
                                    // Now, create an instance of our custom grid which
                                    // have the features we added!
                                    dijit = new CustomGrid({
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
                                        declaredClass:'OnDemandGrid' //need this for recognition later on
                                    }, domConstruct.create("div", null, tdDom));
                                }
                            }
                            else if(attrProps.readOnly == true){
                            }
                            else {
                                dijit = new Select(attrProps.editorArgs, domConstruct.create("input", null, tdDom));
                            }
                        }
                        /*else if(attrProps.type == 'Xobject'){
                         if(attrProps.patternProperties){
                         var patPropObj = attrProps.patternProperties;
                         for(var attrName in patPropObj) {
                         domConstruct.create("td", {innerHTML: attrName}, tdDom);
                         var attrProps = patPropObj[attrName];
                         if(attrProps.anyOf){
                         attrProps.anyOf.forEach(function(typeOf){
                         //self.buildRowCols(typeOf.properties, formNode, nestingLevel+1);
                         });
                         }
                         //else self.buildRowCols(attrProps, formNode, nestingLevel+1);
                         }
                         }
                         else if(attrProps.properties){
                         //self.buildRowCols(attrProps.properties, formNode, nestingLevel+1);
                         }
                         else if(attrProps.readOnly == true){
                         }
                         else {
                         if(attrProps.media && attrProps.media.mediaType == 'text/json'){
                         }
                         else if(attrProps.media && attrProps.media.mediaType == 'text/javascript'){
                         }
                         dijit = new Textarea(attrProps, domConstruct.create("td", {class: 'inputClass'}, tdDom));
                         }
                         }
                         else {
                         }*/
                        if(dijit){
                            self.own(dijit);
                            dijit.startup();
                            var widType = dijit.declaredClass;
                            if(widType ==  "OnDemandGrid"){
                                var filter = new this.store.Filter();
                                var childrenFilter = filter.in('_id', object[attrName]);
                                var childrenCollection = this.store.filter(childrenFilter);
                                dijit.set('collection', childrenCollection);
                            }
                            else if(value) {
                                dijit.set('value', value, false);
                            }

                            dijit.on('change', function(newValue){
                                var attrProps = properties[this.name];
                                /*
                                 if(newValue == attrProps.default) newValue.delete;
                                 else{
                                 if(attrProps.type == 'object') newValue = JSON.parse(newValue);
                                 }
                                 self.item._viewId = self.view._id;
                                 self.item[this.name] = newValue;
                                 self.store.put(self.item, {viewId: self.view._id});
                                 console.log('self.item', self.item);
                                 */
                            });
                        }
                    }
                }
            }
            return true;
        },
        radioButtonsOrSelect: function(tdDom, valuesArr, defaultValue){
            if(valuesArr.length == 1){
                tdDom.innerHTML = valuesArr[0];
            }
            else{
                var data = [];
                valuesArr.forEach(function(value){
                    data.push({id:value, label:value});
                });
                var selectStore = new Memory({
                    data: data
                });
                if(valuesArr.length < 5) {
                    var editorArgs = {
                        id: tdDom.id,
                        store: selectStore,
                        idProperty: "id",
                        labelAttr: "label"
                        //dropDown: true
                    };
                    return new CheckedMultiSelect(editorArgs, domConstruct.create("div", null, tdDom));
                }
                else{
                    var editorArgs = {
                        id: tdDom.id,
                        //name: attrName,
                        store: selectStore,
                        style: "width:100%;",
                        idProperty: "id",
                        labelAttr: 'label',
                        maxHeight: -1, // tells _HasDropDown to fit menu within viewport
                        fetchProperties: { sort : [ { attribute : "name" }]},
                        queryOptions: { ignoreCase: true }//doesnt work
                    };
                    return new Select(editorArgs, domConstruct.create("div", null, tdDom));
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
         ],	

	});
});
