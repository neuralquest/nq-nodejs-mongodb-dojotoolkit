define(['dojo/_base/declare', 'dojo/_base/array', 'dijit/form/Form', 'dijit/form/Select', 'dijit/Toolbar', 'dijit/form/DateTextBox',  'dijit/form/NumberTextBox', 
        'dijit/form/CheckBox', 'dijit/Editor', 'dijit/form/CurrencyTextBox', 'dijit/form/ValidationTextBox', 'dojo/store/Memory', 'dojo/dom-construct', "dojo/on", 
        "dojo/when", "dojo/query", 'dijit/registry', "dijit/_WidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/sniff", "dojo/_base/lang",
        
        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins', 
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
	function(declare, arrayUtil, Form, Select, Toolbar, DateTextBox, NumberTextBox, 
			CheckBox, Editor, CurrencyTextBox, ValidationTextBox, Memory, domConstruct, on, 
			when, query, registry, _WidgetBase, ContentPane, domGeometry, has, lang){
	var dijit;
   
	return declare("NqFormWidget", [_WidgetBase], {
		extraPlugins: {},
		state: {},
		objectId: 0,
		
		buildRendering: function(){
			this.inherited(arguments);
			this.domNode = domConstruct.create("div");
			this.toolbarDivNode = domConstruct.create('div', {},this.domNode);//placeholder for the toolbars
			this.pageHelpTextDiv = domConstruct.create('div', {'class': 'helpTextInvisable', 'style' : { 'padding': '10px'} }, this.domNode);//placeholder for the helptext
			this.pane = new ContentPane( {
				'class' : 'backgroundClass',
				'doLayout' : 'true',
				'style' : { 'overflow': 'auto', 'padding': '10px', 'margin': '0px', width: '100%', height: '100%', }
			},  domConstruct.create('div'));
			this.domNode.appendChild(this.pane.domNode);
		},
		postCreate: function(){
			this.inherited(arguments);
			var tabDef = _nqSchemaMemoryStore.get(this.state.tabId);
			this.pageHelpTextDiv.innerHTML = tabDef.description;
			
			var tableNode = domConstruct.create('table', null, this.pane.domNode);
			var viewDef = _nqSchemaMemoryStore.get(this.state.viewId);
			var propsObj = viewDef.properties;
			//create an array with the propertie in the right order
			var propsArr = [];
			for(var key in propsObj){
				//we have to copy the object to an array so we can make sure they're in the right order 
			    //if(propsObj.hasOwnProperty(key)){
				prop = propsObj[key];
				prop.name = key;
				propsArr[prop.sequence] = prop;
			}
			var toolbarDivNode = this.toolbarDivNode; 
			var extraPlugins = this.extraPlugins; 
			for(var i=0; i<propsArr.length;i++){
				var prop = propsArr[i];

				//console.log('Create dijit:', prop.title, prop);				
				var row = domConstruct.create("tr", null, tableNode);
				
				//the label
				domConstruct.create("td", {innerHTML: (prop.title), style: "padding-right: 5px"}, row);
				
				//the dijit
				var tdDom = domConstruct.create("td", {style: "padding-right: 5px"}, row);
				if('enum' in prop){
					var selectStore = new Memory({data: prop.enum});
					dijit = new Select({
					    'store': selectStore,
						'name': prop.name,
						'labelAttr': 'name',
						'style': "width: "+prop.width+"em;",
						'maxHeight': -1, // tells _HasDropDown to fit menu within viewport
						'fetchProperties': { sort : [ { attribute : "name" }]},
						'queryOptions': { ignoreCase: true },//doesnt work
					}, domConstruct.create('div'));
				}
				else if(prop.type=='string' && prop.format=='rtf'){
					var toolbar = new Toolbar({
						//'style': {'display': 'none'}
					});
					toolbarDivNode.appendChild(toolbar.domNode);
					var widgetProperties = getWidgetProperties(prop);
					widgetProperties.height = '';//auto grow
					widgetProperties.extraPlugins = extraPlugins;
					widgetProperties.toolbar = toolbar;
					//widgetProperties.styleSheet = 'css/editor.css';
					dijit = new Editor(widgetProperties, domConstruct.create('div'));
					dijit.addStyleSheet('css/editor.css');
					dijit.on("NormalizedDisplayChanged", function(){
						var height = domGeometry.getMarginSize(dijit.editNode).h;
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
//				dijit.startup();
				
				var _this = this;
				dijit.on('change', function(evt){
					var _objectId = _this.objectId;
					var _name = this.name;
					var _value = evt;
					when(_nqDataStore.get(_objectId), function(item){
						item[_name] = _value;
						_nqDataStore.put(item);
					});
				});	
				
				//the help text
				domConstruct.create("td", { innerHTML: (prop.description?prop.description:""), style: "padding-right: 5px", 'class': 'helpTextInvisable'}, row);
			};
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
		},		
		setSelectedObjectId: function(objectId){
			this.set('objectId', objectId);
			when(_nqDataStore.get(objectId), function(item){
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
