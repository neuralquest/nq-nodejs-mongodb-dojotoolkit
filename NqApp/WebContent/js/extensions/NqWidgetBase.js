define(['dojo/_base/declare',  'dojo/dom-construct', "dijit/_WidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry"],
	function(declare, domConstruct, _WidgetBase, ContentPane, domGeometry){
	return declare("NqWidgetBase", [_WidgetBase], {
		store: null,
		helpText: 'ToDo',
		rootId: null,
		viewId: null,
		selectedObjId: null,
		
		buildRendering: function(){
			this.inherited(arguments);
			this.domNode = domConstruct.create("div");
			this.toolbarDivNode = domConstruct.create('div', {}, this.domNode);//placeholder for the toolbars
			this.pageHelpTextDiv = domConstruct.create('div', {'class': 'helpTextInvisable', 'style' : { 'padding': '10px'} }, this.domNode);//placeholder for the helptext
			this.pageHelpTextDiv.innerHTML = helpText;
			this.pane = new ContentPane( {
				'class' : 'backgroundClass',
				'doLayout' : 'true',
				'style' : { 'overflow': 'auto', 'padding': '10px', 'margin': '0px', width: '100%', height: '100%', }
			},  domConstruct.create('div'));
			this.domNode.appendChild(this.pane.domNode);
		},
		resize: function(changeSize){
			this.inherited(arguments);
			var positionInfo = dojo.position(this.toolbarDivNode, true);
			changeSize.h -= positionInfo.h;
			var positionInfo = dojo.position(this.pageHelpTextDiv, true);
			changeSize.h -= positionInfo.h;
			this.pane.resize(changeSize);
		},
		_getRootIdAttr: function(){ 
			return this.rootId;
		},
		_setRootIdAttr: function(value){
			this.rootId = value;
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
		},
		destroy: function(){
			arrayUtil.forEach(this.pane.getChildren(), function(widget){
				if(widget.destroyRecursive) widget.destroyRecursive();
			});
			this.inherited(arguments);
		}	
	});
});
