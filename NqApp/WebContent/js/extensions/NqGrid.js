define(['dojo/_base/declare', 'dojo/_base/array', 'dijit/form/Select', 'dijit/Toolbar', 'dijit/form/DateTextBox',
         'dijit/Editor', 'dojo/store/Memory', 'dojo/dom-construct', "dojo/on", 
         "dijit/_WidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/sniff",
        'dgrid/OnDemandGrid', 'dgrid/editor', 'dgrid/Selection', 'dgrid/Keyboard', 'dgrid/extensions/DijitRegistry',
        
        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins', 
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
	function(declare, arrayUtil, Select, Toolbar, DateTextBox, 
			Editor, Memory, domConstruct, on, 
			 _WidgetBase, ContentPane, domGeometry, has, 
			Grid, editor, Selection, Keyboard, DijitRegistry){
	var dijit;
   
	return declare("NqGridWidget", [_WidgetBase], {
		extraPlugins: {},
		state: {},
		query: {},
		
		buildRendering: function(){
			this.inherited(arguments);
			this.domNode = domConstruct.create("div");
			this.toolbarDivNode = domConstruct.create('div', {},this.domNode);//placeholder for the toolbars
			this.pageHelpTextDiv = domConstruct.create('div', {'class': 'helpTextInvisable', 'style' : { 'padding': '10px'} }, this.domNode);//placeholder for the helptext
			this.pane = new ContentPane( {
				'class' : 'backgroundClass',
				'doLayout' : 'true',
				'style' : { 'overflow': 'auto', 'padding': '0px', 'margin': '0px', width: '100%', height: '100%', }
			},  domConstruct.create('div'));
			this.domNode.appendChild(this.pane.domNode);
		},
		postCreate: function(){
			this.inherited(arguments);
			var tabDef = _nqSchemaMemoryStore.get(this.state.tabId);
			this.pageHelpTextDiv.innerHTML = tabDef.description;

			//var tableNode = domConstruct.create('table', null, this.pane.domNode);
			//var viewDef = _nqSchemaMemoryStore.get(this.state.viewId);
			var viewsArr = _nqSchemaMemoryStore.query({parentTabId: this.state.tabId, entity: 'view'});//get the views that belong to this tab
			var viewDef = viewsArr[0];
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
			var columns = [];
			arrayUtil.forEach(propsArr, function(prop) {	
				//console.log('Create dijit:', prop.title, prop);				
				var editorProps = getWidgetProperties(prop);

				if('enum' in prop){
					editorProps.renderCell = function(object, value, node, options){
						var selectedOptionArr = selectStore.query({id: value});
						if(selectedOptionArr.length>0) node.appendChild(document.createTextNode(selectedOptionArr[0].name));
						else node.appendChild(document.createTextNode('id: '+value));
					};
					var selectStore = new Memory({data: prop.enum});
					editorProps.editorArgs = {
							'store': selectStore, 
							'style': "width:99%;",
							'labelAttr': 'name',
							'maxHeight': -1, // tells _HasDropDown to fit menu within viewport
							'fetchProperties': { sort : [ { attribute : "name" }]},
							'queryOptions': { ignoreCase: true }//doesnt work
							//value: 749
					};
					editorProps.editor = Select;
				}
				else if(prop.type=='string' && prop.format=='rtf') editorProps.editor = Editor;
				else if(prop.type=='string' && prop.format=='date-time')editorProps.editor = DateTextBox;
				else if(prop.type=='string') editorProps.editor = 'text';
				else if(prop.type=='integer') editorProps.editor = 'number';						
				else if(prop.type=='number') editorProps.editor = 'number';						
				else if(prop.type=='boolean') editorProps.editor = 'checkbox';						
				columns.push(editor(editorProps));
			});
			this.grid = new (declare([Grid, Selection, Keyboard, DijitRegistry]))({
				//'id' : 'widget'+state.tabId,
				'store': _nqDataStore,
				'query': this.query,
				'columns': columns
			}, dojo.doc.createElement('div'));
			this.pane.containerNode.appendChild(this.grid.domNode);
		},
		startup: function(){
			this.inherited(arguments);
			this.grid.startup();
		},
		resize: function(changeSize){
			this.pane.resize(changeSize);
		},
		_setQuery: function(query, queryOptions){
			this.grid.set('query',query);
		},
		destroy: function(){
			arrayUtil.forEach(this.pane.getChildren(), function(widget){
				if(widget.destroyRecursive) widget.destroyRecursive();
			});
			this.inherited(arguments);
		}
	});
	function getWidgetProperties(prop){
		var properties = {
				field: prop.name, 
				editOn: 'click', 
				autoSave: true, 
				label: prop.title 
		};
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
