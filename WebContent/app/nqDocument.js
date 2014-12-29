define(['dojo/_base/declare', 'dojo/dom-construct', 'dojo/when', 'dijit/registry', 'dijit/layout/ContentPane', 
        'dijit/Toolbar', 'dijit/form/ValidationTextBox', 'dijit/Editor', "app/nqWidgetBase", "dojo/on", "dojo/dom-geometry", 
        "dojo/sniff", "dijit/form/ToggleButton", 'dijit/registry', "dojo/dom", "dojo/dom-attr",
        'app/nqClassChart', "dojo/dom-style", "dojo/query", "dojo/mouse", 
        
        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins', 'dijit/WidgetSet', 
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
	function(declare, domConstruct, when, registry, ContentPane, 
			Toolbar, ValidationTextBox, Editor, nqWidgetBase, on, domGeometry, 
			has, ToggleButton, registry, dom, domAttr,
			nqClassChart, domStyle, query, mouse){

	return declare("nqDocument", [nqWidgetBase], {
		parentId: null,
		viewId: null,
/*		HEADER_ATTRREF: 873,
		PARAGRAPH_ATTRREF: 959,

		HEADER_ATTRREF: 2535,
		PARAGRAPH_ATTRREF: 2537,
		SVG_ATTRREF: 747,
		IMAGEURL_ATTRREF: 1613,
		ANNOTATION_ATTRREF: 1734,
		WIDGET_ATTRREF: 1747,*/

		//		editMode: false,
		normalToolbar: null,
		// Map from id of each parent node to array of its children, or to Promise for that array of children.
		childrenCache: {},


		postCreate: function(){
			this.inherited(arguments);
			//initially show the toolbar div
			domStyle.set(this.pageToolbarDivNode, 'display' , '');
			// Create toolbar and place it at the top of the page
			this.normalToolbar = new Toolbar({});
			domStyle.set(this.pane.containerNode, 'padding-left' , '10px');
			domStyle.set(this.pane.containerNode, 'padding-right' , '10px');
			var self = this;
			// Add edit mode toggle button
			this.editModeButton = new ToggleButton({
		        showLabel: true,
		        checked: false,
		        label: 'Edit Mode',
				iconClass: 'editIcon',
		        onChange: function(val){
		        	if(val) {
		        		domStyle.set(self.editorToolbarDivNode, 'display' , '');
		        		self.siblingButton.set('checked', false);
		        		self.childButton.set('checked', false);
		        		self.deleteButton.set('checked', false);
		        	}
		        	else {
		        		self.closeEditors();
		        		domStyle.set(self.editorToolbarDivNode, 'display' , 'none');
		        	}
				},
				style : {'margin-left':'10px'} 
			});
			this.normalToolbar.addChild(this.editModeButton);
			// Add sibling toggle button
			this.siblingButton = new ToggleButton({
		        showLabel: true,
		        checked: false,
		        label: 'Add Sibling',
				iconClass: 'addIcon',
		        onChange: function(val){ 
		        	if(val) {
		        		self.editModeButton.set('checked', false);
		        		self.childButton.set('checked', false);
		        		self.deleteButton.set('checked', false);
		        	}
		        },
				style : {'margin-left':'5px'} 
			});
			this.normalToolbar.addChild(this.siblingButton);
			// Add child toggle button
			this.childButton = new ToggleButton({
		        showLabel: true,
		        checked: false,
		        label: 'Add Child',
				iconClass: 'addIcon',
		        onChange: function(val){
		        	if(val) {
		        		self.editModeButton.set('checked', false);
		        		self.siblingButton.set('checked', false);
		        		self.deleteButton.set('checked', false);
			        }
	        },
				style : {'margin-left':'5px'} 
			});
			this.normalToolbar.addChild(this.childButton);
			// Add delete toggle button
			this.deleteButton = new ToggleButton({
		        showLabel: true,
		        checked: false,
		        label: 'Delete',
				iconClass: 'removeIcon',
		        onChange: function(val){ 
		        	if(val) {
		        		self.editModeButton.set('checked', false);
		        		self.siblingButton.set('checked', false);
		        		self.childButton.set('checked', false);
		        	}
		        },
				style : {'margin-left':'5px'} 
			});
			this.normalToolbar.addChild(this.deleteButton);
			
			// these are floated right
			// Add images toggle button
			var button5 = new ToggleButton({
		        showLabel: true,
		        checked: true,
		        onChange: function(val){
					if(val) dojox.html.insertCssRule('.floatright', 'display:block;', 'nq.css');
					else dojox.html.insertCssRule('.floatright', 'display:none;', 'nq.css');
				},
				label: 'llustrations',
				iconClass: 'annoIcon',
				style : { 'float': 'right', 'margin-right':'10px'} 
			});
			this.normalToolbar.addChild(button5);
			// Add ToDo toggle button
			var button6 = new ToggleButton({
		        onChange: function(val){
					if(val) dojox.html.insertCssRule('.todofloatright', 'display:block;', 'nq.css');
					else dojox.html.insertCssRule('.todofloatright', 'display:none;', 'nq.css');
				},
				label: 'ToDo',
				iconClass: 'todoIcon',
				style : { 'float': 'right', 'margin-right':'10px'} 				
			});
			this.normalToolbar.addChild(button6);
			
			this.pageToolbarDivNode.appendChild(this.normalToolbar.domNode);

			var self = this;
			when(self.store.getOneByAssocType(this.widgetId, MANYTOMANY_ASSOC, OBJECT_TYPE, true), function(viewId){
				self.viewId = viewId; 
				when(self.getAttrRefPropertiesForView(viewId), function(attrRefArr){
					self.HEADER_ATTRREF = attrRefArr[0].name;
					self.PARAGRAPH_ATTRREF = attrRefArr[1].name;
					self.createDeferred.resolve(self);//ready to be loaded with data
				});
			}, nq.errorDialog);
			
//			this.createDeferred.resolve(this);//ready to be loaded with data
		},
		setSelectedObjIdPreviousLevel: function(value){
			//load the data
			if(value){
				if(this.selectedObjIdPreviousLevel == value) return this;
				this.selectedObjIdPreviousLevel = value;
			}
			this.pane.destroyDescendants(false);//destroy all the widget but leave the pane intact

			var self = this;
			var viewId = this.viewId;
			var query = {itemId:this.selectedObjIdPreviousLevel, viewId:this.viewId};
			var collection = this.store.filter(query);
			collection.on('remove, add', function(event){
				var parent = event.parent;
				var collection = self.childrenCache[parent.id];
				var children = collection.fetch();
				self.onChildrenChange(parent, children);
			});	
			collection.on('update', function(event){
				var obj = event.target;
				self.onChange(obj);
			});	
			var children = collection.fetch();
			var item = children[0];
			var promise = when(self.generateNextLevelContents(item, 1, [], null, false), function(item){
				registry.byId('tab'+self.tabId).resize();
//				self.pane.resize();
				self.setSelectedObjIdPreviousLevelDeferred.resolve(self);
				return item;
			});
			return this.setSelectedObjIdPreviousLevelDeferred.promise;
		},
		//Create an ordinary HTML page recursivly by obtaining data from the server
		generateNextLevelContents: function(item, headerLevel, paragraphNrArr, parentId, previousParagrphHasRightFloat){
			var self = this;
			var hearderObj = item['attrRef'+this.HEADER_ATTRREF];
			var paragraphObj = item['attrRef'+this.PARAGRAPH_ATTRREF];
			
			//Header
			var paragraphNrStr = paragraphNrArr.length==0?'':paragraphNrArr.join('.');
			var headerNode = domConstruct.create(
					'h'+headerLevel, 
					{style: {'clear': previousParagrphHasRightFloat?'both':'none'}}, 
					this.pane.containerNode
				);
			if(headerLevel>1) domConstruct.create('span', { innerHTML: paragraphNrStr, style: { 'margin-right':'30px'}}, headerNode);
			var textDijit = new ValidationTextBox({
				item: item,
			    'type': 'text',
			    'trim': true,
			    'value': item[self.HEADER_ATTRREF],
			    //'style':{width:'90%','background': 'rgba(250, 250, 121, 0.28)', 'border-style': 'none'},//rgba(0,0,255,0.04)
			    'style':{width:'90%'},
				'placeHolder': 'Paragraph Header',
				'onChange': function(evt){
					item[self.HEADER_ATTRREF] = textDijit.get('value');
					self.store.put(item);
			    }
			}, domConstruct.create('span'));
			headerNode.appendChild(textDijit.domNode);

			this.own(on(headerNode, mouse.enter, function(evt){
				if(self.editModeButton.get('checked') ||
					   self.siblingButton.get('checked') ||
					   self.childButton.get('checked') ||
					   self.deleteButton.get('checked')){
					domStyle.set(headerNode, 'outline', '1px solid gray');// "backgroundColor", "rgba(250, 250, 121, 0.28)"
				}
			}));
			this.own(on(headerNode, mouse.leave, function(evt){
				if(self.editModeButton.get('checked') ||
					   self.siblingButton.get('checked') ||
					   self.childButton.get('checked') ||
					   self.deleteButton.get('checked')){
					domStyle.set(headerNode, 'outline', '1px none gray');
				}
			}));
			this.own(on(headerNode, 'click', function(evt){
//				self.closeEditors();
				if(self.siblingButton.get('checked')){
					self.siblingButton.set('checked', false);
					self.editModeButton.set('checked', true);
					var addObj = {
						'viewId': item.viewId, 
						'classId': item.classId
					};
					var directives = {parent:{id:item.id}};
					self.store.add(addObj, directives);
				}
				else if(self.childButton.get('checked')){
					self.childButton.set('checked', false);
					self.editModeButton.set('checked', true);
					var addObj = {
						'viewId': item.viewId, 
						'classId': item.classId
					};
					var directives = {parent:{id:item.id}};
					self.store.add(addObj, directives);
				}
				else if(self.deleteButton.get('checked')){
					if(!item[viewId] || item[viewId].length == 0){
						self.deleteButton.set('checked', false);
						self.store.remove(item.id);
					}
				}
				else if(self.editModeButton.get('checked')) {
					self.closeEditors();
					// Just oprn all of them
					registry.byClass("dijit.form.ValidationTextBox",self.pane.containerNode).forEach(function(tb){
						tb.set('readonly', false);
					});
				}
			}));
			this.own(textDijit);

			
			//Illustration
			if(item.id=="1213"){
				var widgetDomNode = domConstruct.create('div', {
					'class': 'floatright',
					objectId: item.id
				}, this.pane.containerNode);
				
				self.addWidget(widgetDomNode);

				domConstruct.create('p', {innerHTML: '<b>Page Model</b> example'}, widgetDomNode);
			}
			
			//IFrame
			if(item.id=="1510"){
				var widgetDomNode = domConstruct.create('div', {
					style: {width:'300px'},
					'class': 'floatright',
					objectId: item.id
				}, this.pane.containerNode);				
				
				var wrapper = domConstruct.create('div', {style: {width:'300px', height:'200px', overflow: 'hidden'}}, widgetDomNode);
				domConstruct.create('iframe', {
					sandbox:'allow-scripts allow-same-origin',
					src:'http://neuralquest.org'
				}, wrapper);
				domConstruct.create('p', {innerHTML: '<b>Iframe</b> example'}, widgetDomNode);
			}
			
			
			//ToDo
			domConstruct.create('div', {
				innerHTML: '<p><b>ToDo:</b> Elaborate</p>', 
				'class': 'todofloatright',
				objectId: item.id,
				onclick: function(evt){
					if(self.editModeButton.get('checked')) {
						//self.closeEditors();
						//self.replaceParagraphWithEditor(evt.currentTarget);
					}
				}
			}, this.pane.containerNode);

			//Paragraph
			var paragraphDomNode = domConstruct.create('div', {}, this.pane.containerNode);
			this.replaceNodeWithParagraph(paragraphDomNode, item);			

			if(item.classId==80) return; //folder
			
			//Get the sub- headers/paragraphs
			var collection = this.store.getChildren(item);
			// Setup observer in case children list changes, or the item(s) in the children list are updated.
			collection.on('remove, add', function(event){
				var parent = event.parent;
				var collection = self.childrenCache[parent.id];
				var children = collection.fetch();
				self.onChildrenChange(parent, children);
			});	
			collection.on('update', function(event){
				var obj = event.target;
				self.onChange(obj);
			});	
			var children = collection.fetch();
			children.forEach(function(childItem){
				var previousParagrphHasRightFloat = false;
				for(var i=0;i<children.length;i++){
					var childItem = children[i];
					paragraphNrArr[headerLevel-1] = i+1;
					self.generateNextLevelContents(childItem, headerLevel+1, paragraphNrArr, item.id, previousParagrphHasRightFloat);
					paragraphNrArr.splice(headerLevel,100);//remove old shit
//					previousParagrphHasRightFloat = childItem[self.PARAGRAPH_ATTRREF].indexOf('floatright')==-1?false:true;
				}				
			});
		},
		replaceParagraphWithEditor: function(replaceDiv, item){
			var self = this;
			// Create toolbar and place it at the top of the page
			var toolbar = new Toolbar();
			this.editorToolbarDivNode.appendChild(toolbar.domNode);
			//Paragraph
			var editorDijit = new Editor({
				//disabled: true,
				item: item,
				'height': '', //auto grow
			    'minHeight': '30px',
			    'extraPlugins': this.extraPlugins,
				'toolbar': toolbar,
				focusOnLoad: true,
				'onChange': function(evt){
					item[self.PARAGRAPH_ATTRREF] = editorDijit.get('value');
					self.store.put(item);
				}
			}, domConstruct.create('div'));
			editorDijit.addStyleSheet('css/editor.css');
			editorDijit.on("NormalizedDisplayChanged", function(){
				var height = domGeometry.getMarginSize(editorDijit.editNode).h;
				if(has("opera")){
					height = editorDijit.editNode.scrollHeight;
				}
				editorDijit.resize({h: height});
			});
			editorDijit.set('value', item[self.PARAGRAPH_ATTRREF]);
			domConstruct.place(editorDijit.domNode, replaceDiv, "replace");

			editorDijit.on('mouseenter', function(evt){
				if(self.editModeButton.get('checked')) {
					domStyle.set(editorDijit.domNode, 'outline', '1px solid gray');
				}
			});
			editorDijit.on('mouseleave', function(evt){
				if(self.editModeButton.get('checked')) {
					domStyle.set(editorDijit.domNode, 'outline', '1px none gray');
				}
			});

			this.own(editorDijit);
			editorDijit.startup();			
			
		},
		replaceNodeWithParagraph: function(replaceDiv, item){
			var self = this;
			var paragraphNode = domConstruct.create('div', {
				innerHTML: item[this.PARAGRAPH_ATTRREF], 
			}, replaceDiv, "replace");

			this.own(on(paragraphNode, mouse.enter, function(evt){
				if(self.editModeButton.get('checked')) {
					domStyle.set(paragraphNode, 'outline', '1px solid gray');
				}
			}));
			this.own(on(paragraphNode, mouse.leave, function(evt){
				if(self.editModeButton.get('checked')) {
					domStyle.set(paragraphNode, 'outline', '1px none gray');
				}
			}));
			this.own(on(paragraphNode, 'click', function(evt){
				if(self.editModeButton.get('checked')) {
					self.closeEditors();
					self.replaceParagraphWithEditor(evt.currentTarget, item);
				}
			}));
		},
		closeEditors: function(){
			var self = this;
			registry.byClass("dijit.form.ValidationTextBox",this.pane.containerNode).forEach(function(tb){
				tb.set('readonly', true);
			});
			registry.byClass("dijit.Editor",this.pane.containerNode).forEach(function(editor){
				self.replaceNodeWithParagraph(editor.domNode, editor.item);
				editor.destroy();
			});

		},		
		addWidget: function(widgetDomNode){
			widget = new nqClassChart({
				store : this.store,
				XYAxisRootId: '844/78' // Process Classes
			}, domConstruct.create('div'));
			widgetDomNode.appendChild(widget.domNode);
			widget.startup().then(function(res){
				//widget.setParentId(state.ParentIdPreviousLevel);
			});
		}

	});
});
