define(['dojo/_base/declare', 'dojo/_base/array', 'dijit/form/Select', 'dijit/Toolbar', 'dijit/form/DateTextBox',  'dijit/form/NumberTextBox', 
        'dijit/form/CheckBox', 'dijit/Editor', 'dijit/form/CurrencyTextBox', 'dijit/form/ValidationTextBox', 'dojo/dom-construct', "dojo/on", 
        "dojo/when", "dojo/query", 'dijit/registry', "nq/nqWidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/sniff", "dojo/_base/lang",
        "dojo/promise/all", "dojo/html", 'dojo/store/Memory', "dojo/dom-style",
        
        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins', 
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
	function(declare, arrayUtil, Select, Toolbar, DateTextBox, NumberTextBox, 
			CheckBox, Editor, CurrencyTextBox, ValidationTextBox, domConstruct, on, 
			when, query, registry, nqWidgetBase, ContentPane, domGeometry, has, lang, 
			all, html, Memory, domStyle){
   
	return declare("nqFormWidget", [nqWidgetBase], {
		postCreate: function(){
			this.inherited(arguments);

			var PERMITTEDVAULE_CLASS_ID = '58';
			var RTF_CLASS_ID = '65';
			var DATE_CLASS_ID = '52';
			var STRING_CLASS_ID = '54';
			var INTEGER_CLASS_ID = '55';
			var NUMBER_CLASS_ID = '56';
			var BOOLEAN_CLASS_ID = '57';
			
			var tableNode = domConstruct.create('table', {style: 'border-spacing:5px;'}, this.pane.containerNode);
			var self = this;
			when(this.getAttrRefProperties(this.viewObj), function(propertiesArr){
				for(var i=0;i<propertiesArr.length;i++){
					property = propertiesArr[i];
					/*
					if(property.attrClassType==RTF_CLASS_ID){
						var row = domConstruct.create("tr", null, tableNode);						
						//the label
						domConstruct.create("td", {innerHTML: (property.label), style: "padding: 3px"}, row);
						
						//the dijit
						var row = domConstruct.create("tr", null, tableNode);						
						var tdDom = domConstruct.create("td", {colspan:'2', style: "padding: 3px; background: rgba(249, 249, 182, 0.5);"}, row);
						var toolbar = new Toolbar();
						self.editorToolbarDivNode.appendChild(toolbar.domNode);
						//initially show the toolbar div
						domStyle.set(self.editorToolbarDivNode, 'display' , '');

						property.height = '';//auto grow
						property.extraPlugins = self.extraPlugins;
						property.value = '<p></p>';
						property.toolbar = toolbar;
						//property.styleSheet = 'css/editor.css';
						dijit = new Editor(property, domConstruct.create('div'));
						dijit.addStyleSheet('css/editor.css');
						dijit.on("NormalizedDisplayChanged", function(){
							var height = domGeometry.getMarginSize(dijit.domNode).h;
							if(has("opera")){
								height = dijit.editNode.scrollHeight;
							}
							dijit.resize({h: height});
						});
						continue;
					}
					*/
					
					var row = domConstruct.create("tr", null, tableNode);
					
					//the label
					domConstruct.create("td", {innerHTML: (property.label), style: "padding: 3px"}, row);
					
					//the dijit
					var tdDom = domConstruct.create("td", {style: "padding: 3px; background: rgba(249, 249, 182, 0.5);"}, row);
					var dijit = null;
					switch(property.attrClassType){
					case PERMITTEDVAULE_CLASS_ID: 
						dijit = new Select({
						    'store': new Memory({data: property.permittedValues}),
							'name': property.field,
							'labelAttr': 'name',
							'style': "width: "+property.width,
							'maxHeight': -1, // tells _HasDropDown to fit menu within viewport
							'fetchProperties': { sort : [ { attribute : "name" }]},
							'queryOptions': { ignoreCase: true }//doesnt work
						}, domConstruct.create('div'));
						break;	
					case RTF_CLASS_ID: 
						var toolbar = new Toolbar();
						self.editorToolbarDivNode.appendChild(toolbar.domNode);
						//initially show the toolbar div
						domStyle.set(self.editorToolbarDivNode, 'display' , '');

						property.height = '';//auto grow
						property.extraPlugins = self.extraPlugins;
						property.toolbar = toolbar;
						//property.styleSheet = 'css/editor.css';
						property.value = '<p></p>';
						dijit = new Editor(property, domConstruct.create('div'));
						dijit.addStyleSheet('css/editor.css');
						dijit.on("NormalizedDisplayChanged", function(){
							var height = domGeometry.getMarginSize(dijit.domNode).h;
							if(has("opera")){
								height = dijit.editNode.scrollHeight;
							}
							dijit.resize({h: height});
						});	

						break;	
					case DATE_CLASS_ID:
						dijit = new DateTextBox(property, domConstruct.create('input'));
						break;	
					case STRING_CLASS_ID:
						property.type = 'text';
						dijit = new ValidationTextBox(property, domConstruct.create('input'));
						break;	
					case INTEGER_CLASS_ID: 
						dijit = new NumberTextBox(property, domConstruct.create('input'));
						break;	
					case NUMBER_CLASS_ID: 
						dijit = new NumberTextBox(property, domConstruct.create('input'));
						break;	
					case BOOLEAN_CLASS_ID: 
						dijit = new CheckBox(property, domConstruct.create('input'));
						break;
					default:
						dijit = new Select({
						    'store': new Memory({data: property.permittedValues}),
							'name': property.field,
							'labelAttr': 'name',
							'style': "width: "+property.width,
							'maxHeight': -1, // tells _HasDropDown to fit menu within viewport
							'fetchProperties': { sort : [ { attribute : "name" }]},
							'queryOptions': { ignoreCase: true }//doesnt work
						}, domConstruct.create('div'));
					};
					if(dijit){
						tdDom.appendChild(dijit.domNode);
						
						dijit.on('change', function(value){
							var _parentId = self.parentId;
							var _name = self.name;
							var _value = value;
							when(self.store.get(_parentId), function(item){
								item[_name] = _value;
								self.store.put(item);
							});
						});
						dijit.startup();
					}
					//else html.set(tdDom, 'unknown attribute type: '+property.attrClassType); 
					
					//the help text
					domConstruct.create("td", { innerHTML: (property.helpText), style: "padding: 3px", 'class': 'helpTextInvisable'}, row);
				}
				
				self.createDeferred.resolve(self);//ready to be loaded with data

			}, nq.errorDialog);
		},
		setSelectedObjIdPreviousLevel: function(value){
			//load the data
			//if(this.selectedObjIdPreviousLevel == value) return this;
			this.selectedObjIdPreviousLevel = value;
			
			var self = this;
			when(this.store.get(value), function(item){
				for(attr in item){
					if(item[attr].isNaN) continue;
					var attrQuery = "[name='"+attr+"']";
					query(attrQuery).forEach(function(input){
						var wid = registry.getEnclosingWidget(input);
						wid.set('value',item[attr], false);// do not fire change
					});
			     }
				self.setSelectedObjIdPreviousLevelDeferred.resolve(self);
			});
			return this.setSelectedObjIdPreviousLevelDeferred.promise;
		}
	});
	/*		
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
	}*/

});
