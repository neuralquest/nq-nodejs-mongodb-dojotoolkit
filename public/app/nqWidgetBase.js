define(['dojo/_base/declare',  'dojo/dom-construct', "dijit/_WidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/_base/lang",
        'dojo/_base/array', 'dojo/dom-attr', "dojo/Deferred", "dojo/promise/all", "dojo/when", 'dijit/registry', 'dojo/store/Memory',
        'dijit/Toolbar'],
	function(declare, domConstruct, _WidgetBase, ContentPane, domGeometry, lang,
			arrayUtil, domAttr, Deferred, all, when, registry, Memory,
			Toolbar){
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
			this.pageToolbarDivNode = domConstruct.create('div', {'style' : { 'display': 'none', 'min-height': '23px'} }, this.domNode);//placeholder for the page toolbar
			this.editorToolbarDivNode = domConstruct.create('div', {'style' : { 'display': 'none', 'min-height': '23px'} }, this.domNode);//placeholder for the editor toolbar
            this.headerDivNode = domConstruct.create('div', {'style' : {  'display': 'none', 'padding': '10px'} }, this.domNode);//placeholder for header
			this.pageHelpTextDiv = domConstruct.create('div', {'class': 'helpTextInvisable', 'style' : { 'padding': '10px'} }, this.domNode);//placeholder for the helptext
			this.pane = new ContentPane( {
//				'class' : 'backgroundClass',
				'doLayout' : 'true',
//				'content': 'Some Content',
//				'style' : { 'overflow': 'auto', 'padding': '0px', 'margin': '0px', width: '100%', height: '100%', background:'transparent'}
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
        enrichObjectWithDefaults: function(obj, schema){
            var self = this;
            for(var attrName in schema.properties){
                var attrProps = schema.properties[attrName];
                if(attrProps.type == 'Document') continue;
                attrProps.field = attrName; // for dgrid
                attrProps.name = attrName; //for input
                attrProps.label = attrProps.title;
                attrProps.editable = attrProps.readOnly?false:true;
                attrProps.trim = true;
                attrProps.editOn = 'dblclick';  // for dgrid
                attrProps.autoSave = true; // for dgrid
                attrProps.sortable = true;
                if(attrProps.enum){
                    var data = [];
                    data.push({id:'[not selected]',label:'[not selected]'} );
                    attrProps.enum.forEach(function(value){
                        data.push({id:value, label:value});
                    });
                    var selectStore = new Memory({data: data});
                    attrProps.editorArgs = {
                        name: attrName,
                        store: selectStore,
                        style: "width:99%;",
                        labelAttr: 'label',
                        maxHeight: -1, // tells _HasDropDown to fit menu within viewport
                        fetchProperties: { sort : [ { attribute : "name" }]},
                        queryOptions: { ignoreCase: true }//doesnt work
                        //value: 749
                    };
                }
                else if(attrProps['#ref']){
                    var query = attrProps['#ref'];
                    //if(query.parentId = '$viewMapsTo') query.itemId = attrProps.viewMapsTo;
                    var collection = this.store.filter(query);
                    var data = [];
                    data.push({id:-1,label:'[not selected]'} );
                    collection.forEach(function(valueItem){
                        data.push({id:valueItem._id,label:valueItem.name});
                    });
                    var selectStore = new Memory({data: data});
                    attrProps.editorArgs = {
                        name: attrName,
                        store: selectStore,
                        style: "width:99%;",
                        labelAttr: 'label',
                        maxHeight: -1, // tells _HasDropDown to fit menu within viewport
                        fetchProperties: { sort : [ { attribute : "label" }]},
                        queryOptions: { ignoreCase: true }//doesnt work
                        //value: 749
                    };
                }
                else if(attrProps.media && attrProps.media.mediaType == 'text/html'){
                    var toolbar = new Toolbar({
                        //'style': {'display': 'none'}
                    });
                    attrProps.editorArgs = {
                        'toolbar': toolbar,
                        'addStyleSheet': 'css/editor.css',
                        'extraPlugins': self.extraPlugins,
                        //'maxHeight': -1
                    };
                    attrProps.height = '';//auto-expand mode
                }
            }
            schema.required.forEach(function(requiredAttr){
                if(schema.properties[requiredAttr]) schema.properties[requiredAttr].required = true;
            });
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
