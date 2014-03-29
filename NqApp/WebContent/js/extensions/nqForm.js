define(['dojo/_base/declare', 'dojo/_base/array', 'dijit/form/Form', 'dijit/form/Select', 'dijit/Toolbar', 'dijit/form/DateTextBox',  'dijit/form/NumberTextBox', 
        'dijit/form/CheckBox', 'dijit/Editor', 'dijit/form/CurrencyTextBox', 'dijit/form/ValidationTextBox', 'dojo/store/Memory', 'dojo/dom-construct', "dojo/on", 
        "dojo/when", "dojo/query", 'dijit/registry', "nq/nqWidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/sniff", "dojo/_base/lang",
        
        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins', 
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
	function(declare, arrayUtil, Form, Select, Toolbar, DateTextBox, NumberTextBox, 
			CheckBox, Editor, CurrencyTextBox, ValidationTextBox, Memory, domConstruct, on, 
			when, query, registry, nqWidgetBase, ContentPane, domGeometry, has, lang){
   
	return declare("nqFormWidget", [nqWidgetBase], {
		postCreate: function(){
			this.inherited(arguments);

			var tableNode = domConstruct.create('table', {style: 'border-spacing:5px;'}, this.pane.containerNode);
			
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
				var dijit;
				var prop = propsArr[i];

				var row = domConstruct.create("tr", null, tableNode);
				
				//the label
				domConstruct.create("td", {innerHTML: (prop.title), style: "padding: 3px"}, row);
				
				//the dijit
				var tdDom = domConstruct.create("td", {style: "padding: 3px; background: rgba(249, 249, 182, 0.5);"}, row);
				if('permittedValues' in prop){
					var selectStore = new Memory({data: prop.permittedValues});
					dijit = new Select({
					    'store': selectStore,
						'name': prop.name,
						'labelAttr': 'name',
						'style': "width: "+prop.width+"em;",
						'maxHeight': -1, // tells _HasDropDown to fit menu within viewport
						'fetchProperties': { sort : [ { attribute : "name" }]},
						'queryOptions': { ignoreCase: true }//doesnt work
					}, domConstruct.create('div'));
				}
				else if(prop.type=='string' && prop.format=='rtf'){
					var toolbar = new Toolbar({
						//'style': {'display': 'none'}
					});
					this.editorToolbarDivNode.appendChild(toolbar.domNode);
					var widgetProperties = getWidgetProperties(prop);
					widgetProperties.height = '';//auto grow
					widgetProperties.extraPlugins = this.extraPlugins;
					widgetProperties.toolbar = toolbar;
					//widgetProperties.styleSheet = 'css/editor.css';
					dijit = new Editor(widgetProperties, domConstruct.create('div'));
					dijit.addStyleSheet('css/editor.css');
					dijit.on("NormalizedDisplayChanged", function(){
						var height = domGeometry.getMarginSize(dijit.domNode).h;
						if(has("opera")){
							height = dijit.editNode.scrollHeight;
						}
						dijit.resize({h: height});
					});

				}
				else if(prop.type=='string' && prop.format=='date-time') dijit = new DateTextBox(getWidgetProperties(prop), domConstruct.create('input'));
				else if(prop.type=='string'){
					var widgetProperties = getWidgetProperties(prop);
					widgetProperties.type = 'text';
					widgetProperties.trim = true;
					dijit = new ValidationTextBox(widgetProperties, domConstruct.create('input'));
				}
				else if(prop.type=='integer') dijit = new NumberTextBox(getWidgetProperties(prop), domConstruct.create('input'));
				else if(prop.type=='number') dijit = new NumberTextBox(getWidgetProperties(prop), domConstruct.create('input'));
				else if(prop.type=='curency') dijit = new NumberTextBox(getWidgetProperties(prop), domConstruct.create('input'));
				else if(prop.type=='boolean') dijit = new CheckBox(getWidgetProperties(prop), domConstruct.create('input'));
				else tdDom.innerHTML = "[unknown poperty type in schema]";

				tdDom.appendChild(dijit.domNode);
				
				var self = this;
				dijit.on('change', lang.hitch(dijit, function(evt){
					var _parentId = self.parentId;
					var _name = this.name;
					var _value = evt;
					when(self.store.get(_parentId), function(item){
						item[_name] = _value;
						self.store.put(item);
					});
				}));	
				
				//the help text
				domConstruct.create("td", { innerHTML: (prop.description?prop.description:""), style: "padding: 3px", 'class': 'helpTextInvisable'}, row);
			};
		},	
		_setParentIdAttr: function(value){
			this.inherited(arguments);
			when(this.store.get(value), function(item){
				for(attr in item){
					if(item[attr].isNaN) continue;
					var attrQuery = "[name='"+attr+"']";
					query(attrQuery).forEach(function(input){
						var wid = registry.getEnclosingWidget(input);
						wid.set('value',item[attr], false);
					});
					//innerHTML: readonly values		
			     }
			});
		}
	});
	function getWidgetProperties(prop){
		properties = {'name': prop.name};
		if(prop.placeHolder) properties.placeHolder = prop.placeHolder;
		if(prop['default']) properties.value = prop['default'];
		if(prop.optional) properties.required = (prop.optional?false:true);
		if(prop.readonly) properties.editable = (prop.readonly?false:true);
		if(prop.width) properties.width = (prop.width<=0?"100%":prop.width+"em");
		if(prop.placeHolder) properties.placeHolder = prop.placeHolder;
		//if(prop.promptMessage) properties.promptMessage = prop.promptMessage;//we dont like this
		if(prop.invalidMessage) properties.invalidMessage = prop.invalidMessage;

		if(prop.maxLength) properties.maxLength = prop.maxLength;
		if(prop.minLength) properties.minLength = prop.minLength;
		if(prop.curency) properties.curency = prop.curency;
		if(prop.regExp) properties.regExp = prop.regExp;//e.g. email "[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}"
		constraints = {};
		if(prop.minimum) constraints.minimum = prop.minimum;
		if(prop.maximum) constraints.maximum = prop.maximum;
		if(prop.maxDecimal) constraints.places = prop.maxDecimal;
		if(prop.type=='curency') constraints.fractional = true;
		properties.constraints = constraints;
		
		return properties;
	}

});
