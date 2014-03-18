define(['dojo/_base/declare',  'dojo/dom-construct', "dijit/_WidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry",
        'dojo/_base/array'],
	function(declare, domConstruct, _WidgetBase, ContentPane, domGeometry, arrayUtil){
	return declare("NqWidgetBase", [_WidgetBase], {
		store: null,
		tabDef: {},
		viewDef: {},
		parentId: null,
		viewId: null,
		selectedObjId: null,
		
		buildRendering: function(){
			this.inherited(arguments);
			this.domNode = domConstruct.create("div");
			this.headerDivNode = domConstruct.create('div', {}, this.domNode);//placeholder for header
			this.pageToolbarDivNode = domConstruct.create('div', {}, this.headerDivNode);//placeholder for the page toolbar
			this.editorToolbarDivNode = domConstruct.create('div', {'style' : { 'min-height': '23px'} }, this.headerDivNode);//placeholder for the editor toolbar
			this.pageHelpTextDiv = domConstruct.create('div', {'class': 'helpTextInvisable', 'style' : { 'padding': '10px'} }, this.headerDivNode);//placeholder for the helptext
			this.pageHelpTextDiv.innerHTML = this.tabDef.description;
			this.pane = new ContentPane( {
				'class' : 'backgroundClass',
				'doLayout' : 'true',
				'style' : { 'overflow': 'auto', 'padding': '10px', 'margin': '0px', width: '100%', height: '100%' }
			},  domConstruct.create('div'));
			this.domNode.appendChild(this.pane.domNode);
		},
		resize: function(changeSize){
			if(!changeSize) return;
//			this.inherited(arguments);
			var hDiv = dojo.position(this.headerDivNode);
			changeSize.h -= hDiv.h;
			this.pane.resize(changeSize);
		},
		_getParentIdAttr: function(){ 
			return this.parentId;
		},
		_setParentIdAttr: function(value){
			this.parentId = value;
		},
		_getSelectedObjIdAttr: function(){ 
			return this.selectedObjId;
		},
		_setSelectedObjIdAttr: function(value){
			this.selectedObjId = value;
		},
		startup: function(){
			arrayUtil.forEach(this.pane.getChildren(), function(widget){
				if(widget.startup) widget.startup();
			});
			this.resize();
		}/*,
		destroy: function(){
			arrayUtil.forEach(this.pane.getChildren(), function(widget){
				//if(widget.destroyRecursive) widget.destroyRecursive();
			});
			this.inherited(arguments);
		}*/	
	});
});
