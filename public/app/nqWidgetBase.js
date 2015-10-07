define(['dojo/_base/declare',  'dojo/dom-construct', "dijit/_WidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/_base/lang",
        'dojo/_base/array', 'dojo/dom-attr', "dojo/Deferred", "dojo/promise/all", "dojo/when", 'dijit/registry', 'dojo/store/Memory',
        'dijit/Toolbar', 'dijit/form/Select', 'dijit/form/DateTextBox',  'dijit/form/NumberTextBox', 'dijit/form/CheckBox', 'dijit/Editor', 'dijit/form/CurrencyTextBox', 'dijit/form/ValidationTextBox', ],
	function(declare, domConstruct, _WidgetBase, ContentPane, domGeometry, lang,
			arrayUtil, domAttr, Deferred, all, when, registry, Memory,
			Toolbar, Select, DateTextBox, NumberTextBox, CheckBox, Editor, CurrencyTextBox, ValidationTextBox){
	return declare("nqWidgetBase", [_WidgetBase], {
		readOnly: false,
		store: null,
		widgetDef: {},
		viewDef: {},
		parentId: null,
		viewId: null,
		selectedObjIdPreviousLevel: null,
		selectedObjIdThisLevel: null,
		
		createDeferred: null,
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
			this.pageToolbarDivNode = domConstruct.create('div', {'style' : { 'display': 'none', 'min-height': '23px'} }, this.headerDivNode);//placeholder for the page toolbar
			this.editorToolbarDivNode = domConstruct.create('div', {'style' : { 'display': 'none', 'min-height': '23px'} }, this.headerDivNode);//placeholder for the editor toolbar
            this.headerDivNode = domConstruct.create('div', {'style' : { 'padding': '10px'} }, this.domNode);//placeholder for header
			this.pageHelpTextDiv = domConstruct.create('div', {'class': 'helpTextInvisable', 'style' : { 'padding': '10px'} }, this.headerDivNode);//placeholder for the helptext
			this.pane = new ContentPane( {
//				'class' : 'backgroundClass',
				'doLayout' : 'true',
//				'content': 'Some Content',
//				'style' : { 'overflow': 'auto', 'padding': '0px', 'margin': '0px', width: '100%', height: '100%', background:'transparent'}
			},  domConstruct.create('div'));
			this.domNode.appendChild(this.pane.domNode);
			this.own(this.pane);

		},
		/*postCreate: function(){
			//only do this if we're displaying in a tab 
			this.inherited(arguments);
			var PRIMARY_NAMES = 69;
			var self = this;
			when(this.store.getOneByAssocTypeAndDestClass(this.widgetId, ATTRIBUTE_ASSOC, PRIMARY_NAMES), function(nameCellId){
				if(nameCellId) when(self.store.getCell(nameCellId), function(nameCell){
					if(nameCell && nameCell.name!=''){
						domConstruct.create('h1', {innerHTML: nameCell.name}, self.pane.domNode);
						//this.pane.domNode.appendChild(this.pane.domNode);
					}
				});
			});
		},*/
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
		getWidgetProperties: function(widgetId){
			var self = this;
			return self.store.get(widgetId).then(function(widget){
 				//TODO recursively get all of the views that belong to this widget
				return self.store.getItemsByAssocTypeAndDestClass(widgetId, 'manyToMany', VIEW_CLASS_TYPE).then(function(viewsArr) {
                    var widgetProps = {
                        parentId : widget.parentId,
                        name : widget.name,
                        description : widget.description
                    }
                    var schemaPromises = [];
                    viewsArr.forEach(function(view){
                        schemaPromises.push(self.store.getCombinedSchemaForView(view));
                    });
                    return all(schemaPromises).then(function(schemasArr){
                        var properties = [];
                        schemasArr.forEach(function(schema){
                            var propertiesArr = self.schemaToProperties(schema);
                            properties.push(propertiesArr);
                        });
                        return widgetProps.properties = properties;
                    });

                    var viewsArr = JSON.parse(JSON.stringify(dbViewsArr));// mustn't update the the actual database dbViewsArr object.
					viewsArr.forEach(function(view){
						view.properties = self.enrichSchema(view.schema);
					});
					widget.views = viewsArr;
					//console.log('widget',widget);
					return widget;
				})
			});
		},
        enrichSchema: function(schema){
            var self = this;
            for(var attrName in schema){
                var attrProp = schema[attrName];
                if(attrProp.type == 'Document') continue;
                var dijitType = attrProp.type;
                if(attrProp.type == 'String'){
                }
                if(attrProp.enum) dijitType = 'Select';
                else if(attrProp['#ref']) dijitType = 'Select';
                else if(attrProp.media && attrProp.media.mediaType == 'text/html') dijitType = 'RichText';
                attrProp.dijitType = dijitType;
                attrProp.field = attrName; // for dgrid
                attrProp.name = attrName; //for input
                attrProp.assocType = '';
                attrProp.label = attrProp.title;
                attrProp.editable = attrProp.readOnly?false:true;
                attrProp.trim = true;
                attrProp.editOn = 'dblclick';  // for dgrid
                attrProp.autoSave = true; // for dgrid
                attrProp.sortable = true;
                if(dijitType == 'Select'){
                    if(attrProp.enum){
                        var data = [];
                        data.push({label:'[not selected]'} );
                        attrProp.enum.forEach(function(value){
                            data.push({label:value});
                        });
                        var selectStore = new Memory({data: data});
                        attrProp.editorArgs = {
                            name: attrName,
                            store: selectStore,
                            style: "width:99%;",
                            labelAttr: 'label',
                            maxHeight: -1, // tells _HasDropDown to fit menu within viewport
                            fetchProperties: { sort : [ { attribute : "name" }]},
                            queryOptions: { ignoreCase: true }//doesnt work
                            //value: 749
                        };
                        attrProp.get = function(item){
                            var value = item[this.name];
                            if(!value) return '[not selected]';//dropdown will display [not selected]
                            return value;
                        };
                    }
                    if(attrProp['#ref']){
                        var query = attrProp['#ref'];
                        if(query.parentId = '$viewMapsTo') query.itemId = attrProp.viewMapsTo;
                        var collection = this.store.filter(query);

                        var data = collection.fetch();

                        //collection.forEach(function(valueItem){
                        //    console.log(valueItem);
                        //});
                        debugger;
                        data.push({_id:-1,_name:'[invalid]'} );
                        var selectStore = new Memory({data: data});
                        attrProp.editorArgs = {
                            name: attrName,
                            store: selectStore,
                            style: "width:99%;",
                            labelAttr: '_name',
                            maxHeight: -1, // tells _HasDropDown to fit menu within viewport
                            fetchProperties: { sort : [ { attribute : "_name" }]},
                            queryOptions: { ignoreCase: true }//doesnt work
                            //value: 749
                        };
                        attrProp.get = function(item){
                            var value = item[this.name];
                            if(!value) return -1;//dropdown will display [not selected]
                            return value;
                        };
                    }
                }
                else if(dijitType == 'RichText'){
                    var toolbar = new Toolbar({
                        //'style': {'display': 'none'}
                    });
                    attrProp.editorArgs = {
                        'toolbar': toolbar,
                        'addStyleSheet': 'css/editor.css',
                        'extraPlugins': self.extraPlugins,
                        //'maxHeight': -1
                    };
                    attrProp.get = function(item){
                        var value = item[attrName];
                        if(!value) return '<p>[no text]</p>';//editor will crash if it does not have a value
                        return value;
                    };
                    attrProp.height = '';//auto-expand mode
                }
                else if(dijitType == 'Date'){
                }
                else if(dijitType == 'Number') {
                    //property.editorArgs.constraints = {
                    //minimum: attrRef[MINIMUM_ATTR_ID],
                    //maximum: attrRef[MAXIMUM_ATTR_ID],
                    //places: 0
                    //}
                    attrProp.get = function (item) {
                        var value = item[this.name];
                        if (!value) return '[null]';
                        return value;
                    };
                }
                else if(dijitType == 'Boolean'){
                    attrProp.get = function(item){
                        var value = item[this.name];
                        if(!value) return false;
                        return value;
                    };
                }
                else{ // String
                    attrProp.dijitType = 'String';//default
                    attrProp.editorArgs = {
                        //maxLength: attrRef[MAXLENGTH_ATTR_ID],
                        //minLength: attrRef[MINLENGTH_ATTR_ID],
                        //regRex: attrRef[REGEX_ATTR_ID], //e.g. email "[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}"
                    };
                    attrProp.get = function(item){
                        var value = item[this.name];
                        if(!value) return '[empty]';
                        return value;
                    };
                }
            }
        },
        schemaToProperties: function(schema){
            var self = this;
            var properties = [];
            for(var attrName in schema){
                var attrProp = schema[attrName];
                if(attrProp.type == 'Document') continue;
                /*if(attrName.charAt(0)=='_'){
                 //properties.push(attrProp.attrName);
                 continue;
                 }*/
                var dijitType = attrProp.type;
                if(attrProp.type == 'String'){
                    if(attrProp.enum) dijitType = 'Select';
                    else if(attrProp.media && attrProp.media.mediaType == 'text/html') dijitType = 'RichText';
                }
                var propObj = {
                    viewId: attrProp.viewId,
                    className: attrProp.className,
                    classId: attrProp.classId,
                    dijitType: dijitType,
                    field: attrName, // for dgrid
                    name: attrName, //for input
                    assocType: '',
                    //attrClassType: attrName,
                    label: attrProp.title,
                    editable: attrProp.readOnly?false:true,
                    trim: true,
                    editOn: 'dblclick',  // for dgrid
                    autoSave: true, // for dgrid
                    sortable: true,
                };
                if(dijitType == 'Select'){
                    //propObj.enum = attrProp.enum;
                    var data = [];
                    data.push({id:-1,label:'[not selected]'} );
                    attrProp.enum.forEach(function(value){
                        data.push({id:value,label:value});
                    });
                    var selectStore = new Memory({data: data});
                    propObj.editorArgs = {
                        name: attrName,
                        store: selectStore,
                        style: "width:99%;",
                        labelAttr: 'label',
                        maxHeight: -1, // tells _HasDropDown to fit menu within viewport
                        fetchProperties: { sort : [ { attribute : "name" }]},
                        queryOptions: { ignoreCase: true }//doesnt work
                        //value: 749
                    };
                    propObj.get = function(item){
                        var value = item[this.name];
                        if(!value) return -1;//dropdown will display [not selected]
                        return value;
                    };
                }
                else if(dijitType == 'RichText'){
                    var toolbar = new Toolbar({
                        //'style': {'display': 'none'}
                    });
                    propObj.editorArgs = {
                        'toolbar': toolbar,
                        'addStyleSheet': 'css/editor.css',
                        'extraPlugins': self.extraPlugins,
                        //'maxHeight': -1
                    };
                    propObj.get = function(item){
                        var value = item[attrName];
                        if(!value) return '<p>[no text]</p>';//editor will crash if it does not have a value
                        return value;
                    };
                    propObj.height = '';//auto-expand mode
                }
                else if(dijitType == 'Date'){
                }
                else if(dijitType == 'Number') {
                    //property.editorArgs.constraints = {
                    //minimum: attrRef[MINIMUM_ATTR_ID],
                    //maximum: attrRef[MAXIMUM_ATTR_ID],
                    //places: 0
                    //}
                    propObj.get = function (item) {
                        var value = item[this.name];
                        if (!value) return '[null]';
                        return value;
                    };
                }
                else if(dijitType == 'Boolean'){
                    propObj.get = function(item){
                        var value = item[this.name];
                        if(!value) return false;
                        return value;
                    };
                }
                else{ // String
                    propObj.dijitType = 'String';//default
                    propObj.editorArgs = {
                        //maxLength: attrRef[MAXLENGTH_ATTR_ID],
                        //minLength: attrRef[MINLENGTH_ATTR_ID],
                        //regRex: attrRef[REGEX_ATTR_ID], //e.g. email "[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}"
                    };
                    propObj.get = function(item){
                        var value = item[this.name];
                        if(!value) return '[empty]';
                        return value;
                    };
                }
                properties.push(propObj);
            }
            return properties;
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
