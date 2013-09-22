define(['dojo/_base/declare',  'dojo/dom-construct', "dijit/_WidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry"],
	function(declare, domConstruct, _WidgetBase, ContentPane, domGeometry){
	return declare("NqWidgetBase", [_WidgetBase], {
		store: null,
		description: 'ToDo',
		selectedItem: null,
		
		buildRendering: function(){
			this.inherited(arguments);
			this.domNode = domConstruct.create("div");
			this.toolbarDivNode = domConstruct.create('div', {},this.domNode);//placeholder for the toolbars
			this.pageHelpTextDiv = domConstruct.create('div', {'class': 'helpTextInvisable', 'style' : { 'padding': '10px'} }, this.domNode);//placeholder for the helptext
			this.pageHelpTextDiv.innerHTML = description;
			this.pane = new ContentPane( {
				'class' : 'backgroundClass',
				'doLayout' : 'true',
				'style' : { 'overflow': 'auto', 'padding': '10px', 'margin': '0px', width: '100%', height: '100%', }
			},  domConstruct.create('div'));
			this.domNode.appendChild(this.pane.domNode);
		},
		startup: function(){
			arrayUtil.forEach(this.pane.getChildren(), function(widget){
				if(widget.startup) widget.startup();
			});
			this.resize();
		},
		resize: function(changeSize){
			this.pane.resize();
		},
		destroy: function(){
			arrayUtil.forEach(this.pane.getChildren(), function(widget){
				if(widget.destroyRecursive) widget.destroyRecursive();
			});
			this.inherited(arguments);
		}	
	});
});
