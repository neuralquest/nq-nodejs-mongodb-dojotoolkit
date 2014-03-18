define(['dojo/_base/declare', 'dojo/_base/array', 'dijit/form/Select', 'dijit/Toolbar', 'dijit/form/DateTextBox',
         'dijit/Editor', 'dojo/store/Memory', 'dojo/dom-construct', "dojo/on", 
         "nq/NqWidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/sniff",
        'dgrid/OnDemandGrid', 'dgrid/editor', 'dgrid/Selection', 'dgrid/Keyboard', 'dgrid/extensions/DijitRegistry', "dgrid/extensions/DnD",
        "dgrid/Selection", "dgrid/selector", "dgrid/selector", "dijit/form/Button","dojo/_base/array",
        
        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins', 
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
	function(declare, arrayUtil, Select, Toolbar, DateTextBox, 
			Editor, Memory, domConstruct, on, 
			NqWidgetBase, ContentPane, domGeometry, has, 
			Grid, editor, Selection, Keyboard, DijitRegistry, Dnd,
			Selection, selector, Button, array){
   
	return declare("NqGridWidget", [NqWidgetBase], {
		extraPlugins: {},
		viewsArr: [],
		query: {},
		
		postCreate: function(){
			this.inherited(arguments);
			this.pageHelpTextDiv.innerHTML = this.tabDef.description;

			var sortable = true;
			var rowsUpdateable = false;

//			if(viewsArr.length == 1) rowsUpdateable = true;

			var propsArr = [];
			for(var i = 0;i<this.viewsArr.length;i++){
				var viewDef = this.viewsArr[i];
				if(viewDef.relationship = 'ordered') sortable = false;
				var propsObj = viewDef.properties;
				//create an array with the properties in the right order
				for(var key in propsObj){
					//we have to copy the object to an array so we can make sure they're in the right order 
				    //if(propsObj.hasOwnProperty(key)){
					prop = propsObj[key];
					prop.name = key;
					propsArr.push(prop);
				}
			}
			var columns = [];
			columns.push(
				//selector({ field:'rowSelector', label: " ",  
				//selectorType: "radio",
				//})
				{
					label : ' ',
					field : 'rowSelector',
					renderCell: function(object, value, node, options) {
						var div = domConstruct.create("div");
						div.className = "renderedCell";
						div.innerHTML = '1';
						return div;
					}			    
				}
				//rowNumber({label:' '})
			);
			var gridStyle = {};
			var _this = this;
			arrayUtil.forEach(propsArr, function(prop) {	
				var editorProps = getWidgetProperties(prop);
				editorProps.sortable = sortable;
				//get the width of the colomn
				//gridStyle[prop.name] = 'width:'+(prop.width<=0?"auto":prop.width+"em");
				gridStyle[prop.name] = 'width: 40px';

				if('permittedValues' in prop){
					editorProps.renderCell = function(object, value, node, options){
						var selectedOptionArr = selectStore.query({id: value});
						if(selectedOptionArr.length>0) node.appendChild(document.createTextNode(selectedOptionArr[0].name));
						else node.appendChild(document.createTextNode('id: '+value));
					};
					var selectStore = new Memory({data: prop.permittedValues});
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
				else if(prop.type=='string' && prop.format=='rtf') {
					
					var toolbar = new Toolbar({
						//'style': {'display': 'none'}
					});
					_this.editorToolbarDivNode.appendChild(toolbar.domNode);
					editorProps.editorArgs = {
							'toolbar': toolbar, 
							'addStyleSheet': 'css/editor.css',
							'extraPlugins': _this.extraPlugins,
							'maxHeight': -1
					};
					
					editorProps.editor = Editor;
				}
				else if(prop.type=='string' && prop.format=='date-time') editorProps.editor = DateTextBox;
				else if(prop.type=='string') editorProps.editor = 'text';
				else if(prop.type=='integer') editorProps.editor = 'number';						
				else if(prop.type=='number') editorProps.editor = 'number';						
				else if(prop.type=='boolean') editorProps.editor = 'checkbox';						
				columns.push(editor(editorProps));
			});
			this.grid = new (declare([Grid, Selection, Keyboard, DijitRegistry, Dnd]))({
				//'id' : 'widget'+state.tabId,
				'store': this.store,
				'selectionMode': "single",
				'loadingMessage': 'Loading data...',
				'noDataMessage': 'No data.',
				'query': this.query,
				'columns': columns,
				'cleanAddedRules': true
			}, domConstruct.create('div'));
			for(var key in gridStyle){
				this.grid.styleColumn(key, gridStyle[key]);
			}
			this.pane.containerNode.appendChild(this.grid.domNode);

			if(rowsUpdateable){
				var mapsToClass = viewDef.mapsToClasses[0];
			    var addButton = new Button({
			        label: "Add Row",
			        disabled:false, 
			        iconClass:'addIcon',
					classToCreate: mapsToClass,
					viewDefToCreate: viewDef,
					store: this.store,
					parentId: this.query.parentId,
					grid: this.grid
			    }, dojo.doc.createElement('div'));
/*			    on(addButton,"click", function(evt){
					var classToCreate = this.classToCreate;
					var viewDefToCreate = this.viewDefToCreate;
					var viewId = viewDefToCreate.id;
					console.log(classToCreate.className); 
					var addObj = {
						'id': '',//cid will be added by our restStore exstension, we need a dummy id
						'viewId': viewId, 
						'classId': classToCreate.id
					};
					addObj[viewDefToCreate.label] = '[new '+classToCreate.className+']';
					var newItem = this.store.add(addObj);
					var parentItem = this.store.get(this.parentId);
					if(!parentItem[viewId]) parentItem[viewId] = [];
					parentItem[viewId].push(newItem.id);
					this.store.put(parentItem);
					this.grid.refresh();
					this.grid.select(newItem);
				});*/
				this.pane.containerNode.appendChild(addButton.domNode);
			    var removeButton = new Button({
			        label: "Remove Row",
	//		        disabled: true, 
			        iconClass: 'removeIcon',
					viewDefToCreate: viewDef,
					store: this.store,
					parentId: this.query.parentId,
					grid: this.grid
			    }, dojo.doc.createElement('div'));
/*			    on(removeButton,"click", function(evt){
			    	var selectedRows = this.grid.selection;
			    	for(key in selectedRows) {
				    	this.store.remove(key);
						
						var parentItem = this.store.get(this.parentId);
						var viewId = this.viewDefToCreate.id;
						index = array.indexOf(parentItem[viewId], key);
						parentItem[viewId].splice(index, 1);
						this.store.put(parentItem);
			    	}
					this.grid.refresh();
				});*/
				this.pane.containerNode.appendChild(removeButton.domNode);
			}
			/*
			this.grid.on(".dgrid-row:click", function(event){
//				var row = grid.row(event);
				console.log("Row clicked:", event);
			});
			this.grid.on("dgrid-refresh-complete", function(event){
//				var row = grid.row(event);
				console.log("Row complete:", event);
			});
			*/
		},
		_setQuery: function(query, queryOptions){
			this.grid.set('query',query);
		}
	});
	function getWidgetProperties(prop){
		var properties = {
				id: prop.name, 
				field: prop.name, 
				editOn: 'click', 
				autoSave: true, 
				label: prop.title 
		};
		if(prop.placeHolder) properties.placeHolder = prop.placeHolder;
		if(prop['default']) properties.value = prop['default'];
		if(prop.optional) properties.required = (prop.optional?false:true);
		//if(prop.readonly && prop.readonly == true) properties.canEdit = function(object){ return false; }
		//else properties.canEdit = function(object){ return true; }
		//if(prop.width) properties.width = (prop.width<=0?"100%":prop.width+"em");
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
