define(['dojo/_base/declare', 'dojo/dom-construct', 'dojo/when', 'dijit/registry', 'dijit/layout/ContentPane', 
        'dijit/Toolbar', 'dijit/form/ValidationTextBox', 'dijit/Editor', "nq/nqWidgetBase", "dojo/on", "dojo/dom-geometry", 
        "dojo/sniff", "dijit/form/ToggleButton", "dojo/_base/lang", 'dijit/registry', "dojo/dom", "dojo/dom-attr",
        'nq/nqClassChart', "dojo/dom-style", "dojo/query", "dojo/mouse", "dijit/form/RadioButton",
        
        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins', 'dijit/WidgetSet', 
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
	function(declare, domConstruct, when, registry, ContentPane, 
			Toolbar, ValidationTextBox, Editor, nqWidgetBase, on, domGeometry, 
			has, ToggleButton, lang, registry, dom, domAttr,
			nqClassChart, domStyle, query, mouse, RadioButton){

	return declare("nqLogTable", [nqWidgetBase], {
		parentId: null,
		extraPlugins: {},
		viewId: '846',
		headerAttrId: 873,
		paragraphAttrId: 959,

		postCreate: function(){
			this.inherited(arguments);
			//initially show the toolbar div
			domStyle.set(this.editorToolbarDivNode, 'display' , '');
			
			this.tableNode = domConstruct.create('table', {'class': 'nqtable'}, this.pane.containerNode);

			var row = domConstruct.create("tr", null, this.tableNode);
			domConstruct.create("th", {innerHTML: 'State'}, row);
			domConstruct.create("th", {innerHTML: 'Comments'}, row);

			
			var row = domConstruct.create("tr", null, this.tableNode);
			var td = domConstruct.create("td", null, row);
			
			var stateTableNode = domConstruct.create('table', null, td);		
			var stateRow = domConstruct.create("tr", null, stateTableNode);

			domConstruct.create("td", {innerHTML: 'Next State'}, stateRow);
			var stateTd = domConstruct.create("td", null, stateRow);			
			var radio1 = new RadioButton({checked: true, value: "tea", name: "assigned"});
			stateTd.appendChild(radio1.domNode);
			domConstruct.create("div", {innerHTML: 'assigned'}, stateTd);
			domConstruct.create("br", null, stateTd);
			var radio2 = new RadioButton({checked: false, value: "tea", name: "additional info requested"});
			stateTd.appendChild(radio2.domNode);
			domConstruct.create("div", {innerHTML: 'additional info requested'}, stateTd);
			domConstruct.create("br", null, stateTd);
			var radio3 = new RadioButton({checked: false, value: "tea", name: "closed"});
			stateTd.appendChild(radio3.domNode);			
			domConstruct.create("div", {innerHTML: 'closed'}, stateTd);
			
			var stateRow = domConstruct.create("tr", null, stateTableNode);

			domConstruct.create("td", {innerHTML: 'Date'}, stateRow);
			domConstruct.create("td", {innerHTML: 'Next State'}, stateRow);
			
			var stateRow = domConstruct.create("tr", null, stateTableNode);

			domConstruct.create("td", {innerHTML: 'Role'}, stateRow);
			domConstruct.create("td", {innerHTML: 'Customer'}, stateRow);

			
			
			var tdDom = domConstruct.create("td", {}, row);
			var toolbar = new Toolbar({
				//'style': {'display': 'none'}
			});
			this.editorToolbarDivNode.appendChild(toolbar.domNode);
//			var widgetProperties = getWidgetProperties(prop);
			var widgetProperties = {};
			widgetProperties.height = '';//auto grow
			widgetProperties.extraPlugins = this.extraPlugins;
			widgetProperties.toolbar = toolbar;
			//widgetProperties.styleSheet = 'css/editor.css';
			var dijit = new Editor(widgetProperties, domConstruct.create('div'));
			dijit.addStyleSheet('css/editor.css');
			dijit.on("NormalizedDisplayChanged", function(){
				var height = domGeometry.getMarginSize(dijit.domNode).h;
				if(has("opera")){
					height = dijit.editNode.scrollHeight;
				}
				dijit.resize({h: height});
			});
			tdDom.appendChild(dijit.domNode);
//			dijit.startup();
			
//			this.pane.set('content',"<b>MORE CONTENT</>");
			
			
		},
		_setParentIdAttr: function(value){
			this.inherited(arguments);
//			domConstruct.empty(this.pane.domNode);
			
//			this.pane.set('content',this.tableNode);

			var self = this;
			var viewId = this.viewId;
			when(this.store.get(this.parentId), function(item){
				when(self.store.getChildren(item, [2313]), function(children){
					for(var i=0;i<children.length;i++){
						var childItem = children[i];
						var row = domConstruct.create("tr", null, self.tableNode);
						domConstruct.create("td", {innerHTML: 'State<br/>Date<br/>Role'}, row);
						domConstruct.create("td", {innerHTML: childItem}, row);
					}
//					self.pane.resize();
				});
			});
		}
		
	});
});
