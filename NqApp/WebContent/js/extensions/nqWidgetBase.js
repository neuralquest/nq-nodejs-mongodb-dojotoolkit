define(['dojo/_base/declare',  'dojo/dom-construct', "dijit/_WidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry",
        'dojo/_base/array', 'dojo/dom-attr', "dojo/Deferred", 
        'dijit/Toolbar', 'dijit/form/Select', 'dijit/form/DateTextBox',  'dijit/form/NumberTextBox', 'dijit/form/CheckBox', 'dijit/Editor', 'dijit/form/CurrencyTextBox', 'dijit/form/ValidationTextBox', ],
	function(declare, domConstruct, _WidgetBase, ContentPane, domGeometry, arrayUtil, domAttr, Deferred,
			Toolbar, Select, DateTextBox, NumberTextBox, CheckBox, Editor, CurrencyTextBox, ValidationTextBox){
	return declare("nqWidgetBase", [_WidgetBase], {
		readOnly: false,
		store: null,
		widgetDef: {},
		viewDef: {},
		parentId: null,
		viewId: null,
		selectedObjId: null,
		
		startupDeferred: new Deferred(),
		setParentDeferred: new Deferred(),
		setSelectedDeferred: new Deferred(),
		
		_setParentIdAttr: function(value){
			if(value) this.parentId = value;
			//return this.setParentDeferred;
		},
		_getParentIdAttr: function(){ 
			return this.parentId;
		},
		_setSelectedObjIdAttr: function(value){
			if(value) this.selectedObjId = value;
			//return this.setSelectedDeferred;
		},
		_getSelectedObjIdAttr: function(){ 
			return this.selectedObjId;
		},
		buildRendering: function(){
			this.inherited(arguments);
			this.domNode = domConstruct.create("div");
			this.headerDivNode = domConstruct.create('div', {}, this.domNode);//placeholder for header
			this.pageToolbarDivNode = domConstruct.create('div', {'style' : { 'display': 'none', 'min-height': '23px'} }, this.headerDivNode);//placeholder for the page toolbar
			this.editorToolbarDivNode = domConstruct.create('div', {'style' : { 'display': 'none', 'min-height': '23px'} }, this.headerDivNode);//placeholder for the editor toolbar
			this.pageHelpTextDiv = domConstruct.create('div', {'class': 'helpTextInvisable', 'style' : { 'padding': '10px'} }, this.headerDivNode);//placeholder for the helptext
			this.pageHelpTextDiv.innerHTML = this.widgetDef.description;
			this.pane = new ContentPane( {
//				'class' : 'backgroundClass',
				'doLayout' : 'true',
//				'content': 'Some Conetent',
				'style' : { 'overflow': 'auto', 'padding': '10px', 'margin': '0px', width: '100%', height: '100%', background:'transparent'}
			},  domConstruct.create('div'));
			this.domNode.appendChild(this.pane.domNode);
		},
		resize: function(changeSize){
			this.inherited(arguments);
			if(!changeSize) return;
			var hDiv = dojo.position(this.headerDivNode);
			if(hDiv) changeSize.h -= hDiv.h;
			this.pane.resize(changeSize);
		},
		startup: function(){
			arrayUtil.forEach(this.pane.getChildren(), function(widget){
				if(widget.startup) widget.startup();
			});
			this.pane.resize();
			//return this.startupDeferred;
		},/*
		destroy: function(){
			arrayUtil.forEach(this.pane.getChildren(), function(widget){
				//if(widget.destroyRecursive) widget.destroyRecursive();
			});
			this.inherited(arguments);
		}
		replaceContentsWithEditor: function(fillDiv, editorType, objectId){
			if(editorType == 'string'){
				var self = this;
				var value = domAttr.get(fillDiv, 'innerHTML');
				var textDijit = new ValidationTextBox({
					objectId: objectId,
				    'type': 'text',
				    'trim': true,
				    'value': value,
				    //'style':{ 'width':'90%', 'background': 'rgba(0,0,255,0.04)', 'border-style': 'none'},
				    'style':{width:'90%','background': 'rgba(250, 250, 121, 0.28)', 'border-style': 'none'},//rgba(0,0,255,0.04)
					'placeHolder': 'Paragraph Header',
					'onChange': function(evt){
						when(self.store.get(objectId), function(item){
							item[self.headerAttrId] = textDijit.get('value');
							self.store.put(item);
						});
				    }
				}, domConstruct.create('input'));
				domConstruct.place(textDijit.domNode, fillDiv);
				textDijit.focus();			
			}
		},
		formatGridDate: function(theDate, rowIndex) {
			var rowdata = this.grid.getItem(rowIndex);
			var theDate = new Date(parseInt(rowdata.datefieldname));
			theDateString = dojo.date.locale.format(theDate, {selector: 'date', datePattern: 'MM/dd/yyyy' });
			return theDateString;
		},
*/
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
