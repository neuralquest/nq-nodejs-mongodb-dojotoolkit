define(['dojo/_base/declare', 'dojo/_base/array',  "dojo/_base/lang", "dojo/dom-style",'dijit/form/Select', 'dijit/Toolbar', 'dijit/form/DateTextBox',
         'dijit/Editor', 'dojo/store/Memory', 'dojo/dom-construct', "dojo/on", "dojo/cookie", "dojo/hash", "dijit/form/ToggleButton",
         "nq/nqWidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/sniff", "dojo/date/locale", "dojo/html",
        'dgrid/OnDemandGrid', 'dgrid/editor', 'dgrid/Selection', 'dgrid/Keyboard', 'dgrid/extensions/DijitRegistry', "dgrid/extensions/DnD",
        "dgrid/Selection", "dgrid/selector", "dgrid/selector", "dijit/form/Button","dojo/_base/array", "dijit/registry",
        "dojo/date/stamp",
        
        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins', 
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
	function(declare, arrayUtil, lang, domStyle, Select, Toolbar, DateTextBox, 
			Editor, Memory, domConstruct, on, cookie, hash, ToggleButton,
			nqWidgetBase, ContentPane, domGeometry, has, locale, html, 
			Grid, editor, Selection, Keyboard, DijitRegistry, Dnd,
			Selection, selector, Button, array, registry,
			stamp){
   
	return declare("nqGridWidget", [nqWidgetBase], {
		extraPlugins: {},
		viewsArr: [],
		query: {},
		
		postCreate: function(){
			this.inherited(arguments);
			this.pageHelpTextDiv.innerHTML = this.widgetDef.description;

			var sortable = true;
			var rowsUpdateable = false;

//			if(viewsArr.length == 1) rowsUpdateable = true;

			//initially show the toolbar div
			domStyle.set(this.pageToolbarDivNode, 'display' , '');
			// Create toolbar and place it at the top of the page
			this.normalToolbar = new Toolbar({});
			var self = this;
			// Add sibling toggle button
			var siblingButton = new ToggleButton({
		        showLabel: true,
		        label: 'Add Row',
				iconClass: 'addIcon',
		        onClick: function(evt){
		        	var viewDefToCreate = self.viewsArr[0];//TODO what about more than one 
					var classToCreate = viewDefToCreate.mapsToClasses[0];
					var viewId = self.viewsArr[0].id;
//					console.log(classToCreate.className);
					//add the child
					var addObj = {
						'id': '',//cid will be added by our restStore exstension, we need a dummy id
						'viewId': viewId, 
						'classId': classToCreate.id
					};
					//TODO add default values
					addObj[self.viewDef.label] = '[new '+classToCreate.className+']';
					var newItem = self.store.add(addObj);
					//update the parent
					var parentItem = self.store.get(self.query.parentId);
					if(!parentItem[viewId]) parentItem[viewId] = [];
					parentItem[viewId].unshift(newItem.id);
					self.store.put(parentItem);
					self.grid.refresh();
					self.grid.select(newItem);
		        },
				style : {'margin-left':'5px'} 
			});
			this.normalToolbar.addChild(siblingButton);
			// Add delete toggle button
			this.deleteButton = new ToggleButton({
		        showLabel: true,
		        checked: false,
		        label: 'Delete Row',
				iconClass: 'removeIcon',
				style : {'margin-left':'5px'} 
			});
			this.normalToolbar.addChild(this.deleteButton);
			this.pageToolbarDivNode.appendChild(this.normalToolbar.domNode);
			
			
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
			var self = this;
			arrayUtil.forEach(propsArr, function(prop) {	
				var editorProps = self.getWidgetProperties(prop);
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
				else if(prop.type=='string' && prop.format=='date-time'){
					editorProps.renderCell = function(object, value, node, options) {
						console.log('value', value);
						if(!value || value=='') return;
						var date = null;
						if(lang.isObject(value)) date = value;
						else date = dojo.date.stamp.fromISOString(value);
						html.set(node, date.toLocaleDateString());
					};
					editorProps.set = function(item) {
						var value = item[prop.name];
						if(!value) return;
						return value.toISOString();
					};
					editorProps.autoSave = true;
					editorProps.editor = DateTextBox;
				}
				else if(prop.type=='string' && prop.format=='rtf') {
					
					var toolbar = new Toolbar({
						//'style': {'display': 'none'}
					});
					self.editorToolbarDivNode.appendChild(toolbar.domNode);
					editorProps.editorArgs = {
							'toolbar': toolbar, 
							'addStyleSheet': 'css/editor.css',
							'extraPlugins': self.extraPlugins,
							'maxHeight': -1
					};					
					editorProps.editor = Editor;
					editorProps.renderCell = function(object, value, node, options) {
						html.set(node, value);
					}

				}
				else if(prop.type=='string') editorProps.editor = 'text';
				else if(prop.type=='integer') editorProps.editor = 'number';						
				else if(prop.type=='number') editorProps.editor = 'number';						
				else if(prop.type=='boolean') editorProps.editor = 'checkbox';						
				columns.push(editor(editorProps));
			});
			this.grid = new (declare([Grid, Selection, Keyboard, DijitRegistry, Dnd]))({
				//'id' : 'widget'+state.tabId,
				'class': '.nqGrid',
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

			this.grid.on("dgrid-error", function(event) {
				// Display an error message above the grid when an error occurs.
    	    	new dijit.Dialog({title: "Get Error", extractContent: true, content: event.error.message}).show();
			});
			
			if(rowsUpdateable){

			}
			
			this.grid.on(".dgrid-row:click", function(event){
				var item = self.grid.row(event).data;
				if(self.deleteButton.get('checked')){
					self.deleteButton.set('checked', false);
					self.store.remove(item.id);
					
					var viewId = self.viewsArr[0].id;
					var parentItem = self.store.get(self.query.parentId);
					var pos = parentItem[viewId].indexOf(item.id);
					parentItem[viewId].splice(pos, 1);
					_nqDataStore.put(parentItem);
					self.grid.refresh();
				}
				else{
					var level = self.level;
					//var nextState = getState(level+1);
//					var tabPane = registry.byId('tab'+self.widgetDef.id);
//					document.title = 'NQ - '+(tabPane?tabPane.title+' - ':'')+this.getLabel(item);

					var newViewId = item.viewId;
					var ids = _nqDataStore.getIdentity(item).split('/');
					
					var currentHash = hash();
					var hashArr = currentHash.split('.');
					hashArr[level*3+1] = self.tabId;//it may have changed
					hashArr[level*3+2] = ''+ids[1];//it will have changed
					if(hashArr[(level+1)*3+0] != newViewId){//if its changed
						//remove anything following this level in the hash since it is nolonger valid
						hashArr = hashArr.slice(0,(level+1)*3+0);
						
						hashArr[(level+1)*3+0] = newViewId;
						//if there is a cookie for this acctab, use if to set the hash tabId (we can prevent unnessasary interperitHash())//FIXME remove set tabId
						var cookieValue = cookie('acctab'+newViewId+'_selectedChild');
						if(cookieValue) hashArr[(level+1)*3+1] = cookieValue.substr(3);
						else{//find the first tab and use it
							var tabsArr = _nqSchemaMemoryStore.query({parentViewId: newViewId, entity: 'tab'});//get the tabs		 
							if(tabsArr.length>0) hashArr[(level+1)*3+1] = tabsArr[0].id;
						}
					}

					var newHash = hashArr.join('.');
					hash(newHash);		
				}
			});
			/*this.grid.on("dgrid-refresh-complete", function(event){
//				var row = grid.row(event);
				console.log("Row complete:", event);
			});
			*/
		},
		_setQuery: function(query, queryOptions){
			this.grid.set('query',query);
		},
		_retQuery: function(query, queryOptions){
			return this.grid.set('query');
		},
		getWidgetProperties: function(prop){
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
});
