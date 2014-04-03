define(['dojo/_base/declare', 'dojo/_base/array', 'dijit/form/Form', 'dijit/form/Select', 'dijit/Toolbar', 'dijit/form/DateTextBox',  'dijit/form/NumberTextBox', 
        'dijit/form/CheckBox', 'dijit/Editor', 'dijit/form/CurrencyTextBox', 'dijit/form/ValidationTextBox', 'dojo/store/Memory', 'dojo/dom-construct', "dojo/on", 
        "dojo/when", "dojo/query", 'dijit/registry', "nq/nqWidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/sniff", "dojo/_base/lang", "dojo/html",
        "dojo/mouse", "dojo/dom-style",
        
        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins', 
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
	function(declare, arrayUtil, Form, Select, Toolbar, DateTextBox, NumberTextBox, 
			CheckBox, Editor, CurrencyTextBox, ValidationTextBox, Memory, domConstruct, on, 
			when, query, registry, nqWidgetBase, ContentPane, domGeometry, has, lang, html,
			mouse, domStyle){
   
	return declare("nqReportWidget", [nqWidgetBase], {	
		postCreate: function(){
			this.inherited(arguments);

			var tableNode = domConstruct.create('table', null, this.pane.containerNode);
			
			var propsObj = this.viewDef.properties;
			//create an array with the propertie in the right order
			var propsArr = [];
			for(var key in propsObj){
				//we have to copy the object to an array so we can make sure they're in the right order 
			    //if(propsObj.hasOwnProperty(key)){
				prop = propsObj[key];
				prop.name = key;
				propsArr[prop.sequence] = prop;
			}
			for(var i=0; i<propsArr.length;i++){
				var prop = propsArr[i];

				var row = domConstruct.create("tr", null, tableNode);
				
				//the label
				domConstruct.create("td", {innerHTML: (prop.title), style: "padding-right: 5px"}, row);
				
				//the value
				var self = this;
				var valueDiv = domConstruct.create("td", { name:prop.name, style: "padding-right: 5px",}, row);
				if(!this.readOnly){
					on(valueDiv,'click', function(evt){
						self.replaceContentsWithEditor(evt.currentTarget, prop.type, self.parentId);
					});
					on(valueDiv, mouse.enter, function(evt){
						domStyle.set(valueDiv, 'border', '1px solid gray');// "backgroundColor", "rgba(250, 250, 121, 0.28)"
					});
					on(valueDiv, mouse.leave, function(evt){
						domStyle.set(valueDiv, 'border', '1px none gray');
					});
				}
				
				//the help text
				domConstruct.create("td", { innerHTML: (prop.description?prop.description:""), style: "padding-right: 5px", 'class': 'helpTextInvisable'}, row);
			};
		},	
		_setParentIdAttr: function(value){
			this.inherited(arguments);
			when(this.store.get(value), function(item){
				for(attr in item){
					if(item[attr].isNaN) continue;
					var attrQuery = "[name='"+attr+"']";
					query(attrQuery).forEach(function(td){
						html.set(td, item[attr]);
					});
			     }
			});
		}
	});
});
