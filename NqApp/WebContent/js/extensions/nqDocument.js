define(['dojo/_base/declare', 'dojo/dom-construct', 'dojo/when', 'dijit/registry', 'dijit/layout/ContentPane', 
        'dijit/Toolbar', 'dijit/form/ValidationTextBox', 'dijit/Editor', "nq/nqWidgetBase", "dojo/on", "dojo/dom-geometry", 
        "dojo/sniff", "dijit/form/ToggleButton", 'dijit/registry', "dojo/dom", "dojo/dom-attr",
        'nq/nqClassChart', "dojo/dom-style", "dojo/query", "dojo/mouse", 
        
        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins', 'dijit/WidgetSet', 
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
	function(declare, domConstruct, when, registry, ContentPane, 
			Toolbar, ValidationTextBox, Editor, nqWidgetBase, on, domGeometry, 
			has, ToggleButton, registry, dom, domAttr,
			nqClassChart, domStyle, query, mouse){

	return declare("nqDocumentWidget", [nqWidgetBase], {
		parentId: null,
		viewId: '846',
		HEADER_ATTRREF: 873,
		PARAGRAPH_ATTRREF: 959,

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
			
			this.createDeferred.resolve(this);//ready to be loaded with data
		},
		setSelectedObjIdPreviousLevel: function(value){
			//load the data
			if(value){
				if(this.selectedObjIdPreviousLevel == value) return this;
				this.selectedObjIdPreviousLevel = value;
			}
			//this.closeEditors();
			domConstruct.empty(this.pane.domNode);

			var self = this;
			var viewId = this.viewId;
			when(this.store.getItemByView(this.selectedObjIdPreviousLevel, this.viewId), function(item){
			//when(this.store.getCell(this.selectedObjIdPreviousLevel), function(item){
				return when(self.generateNextLevelContents(item, viewId, 1, [], null, false), function(item){
					registry.byId('tab'+self.tabId).resize();
//					self.pane.resize();
					self.setSelectedObjIdPreviousLevelDeferred.resolve(self);
					return item;
				});
			}, nq.errorDialog);
			return this.setSelectedObjIdPreviousLevelDeferred.promise;
		},
		//Create an ordinary HTML page recursivly by obtaining data from the server
		generateNextLevelContents: function(item, viewId, headerLevel, paragraphNrArr, parentId, previousParagrphHasRightFloat){
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

			on(headerNode, mouse.enter, function(evt){
				if(self.editModeButton.get('checked') ||
					   self.siblingButton.get('checked') ||
					   self.childButton.get('checked') ||
					   self.deleteButton.get('checked')){
					domStyle.set(headerNode, 'outline', '1px solid gray');// "backgroundColor", "rgba(250, 250, 121, 0.28)"
				}
			});
			on(headerNode, mouse.leave, function(evt){
				if(self.editModeButton.get('checked') ||
					   self.siblingButton.get('checked') ||
					   self.childButton.get('checked') ||
					   self.deleteButton.get('checked')){
					domStyle.set(headerNode, 'outline', '1px none gray');
				}
			});
			on(headerNode, 'click', function(evt){
//				self.closeEditors();
				if(self.siblingButton.get('checked')){
					self.siblingButton.set('checked', false);
					self.editModeButton.set('checked', true);
					var addObj = {
						'viewId': item.viewId, 
						'classId': item.classId
					};
					var directives = {parent:item.id};
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
					 //self.replaceHeaderWithEditor(evt.currentTarget);
					//var objectId = domAttr.get(evt.currentTarget,'objectId');

					//evt.currentTarget.set('readonly', false);
					// Just oprn all of them
					registry.byClass("dijit.form.ValidationTextBox",self.pane.containerNode).forEach(function(tb){
						tb.set('readonly', false);
					});
				}
			});
			//Illustration
			if(item.id=="846/1213"){
				var widgetDomNode = domConstruct.create('div', {
					'class': 'floatright',
					objectId: item.id
				}, this.pane.containerNode);
				
				self.addWidget(widgetDomNode);

				domConstruct.create('p', {innerHTML: '<b>Page Model</b> example'}, widgetDomNode);
			}
			
			//IFrame
			if(item.id=="846/1510"){
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
			var paragraphNode = domConstruct.create('div', {
				innerHTML: item[this.PARAGRAPH_ATTRREF], 
				cellId: item['cellId'+this.PARAGRAPH_ATTRREF], 
				objectId: item.id,
				viewId: item.viewId,
			}, this.pane.containerNode);

			on(paragraphNode, mouse.enter, function(evt){
				if(self.editModeButton.get('checked')) {
					domStyle.set(paragraphNode, 'outline', '1px solid gray');
				}
			});
			on(paragraphNode, mouse.leave, function(evt){
				if(self.editModeButton.get('checked')) {
					domStyle.set(paragraphNode, 'outline', '1px none gray');
				}
			});
			on(paragraphNode, 'click', function(evt){
				if(self.editModeButton.get('checked')) {
//					self.closeEditors();
					self.replaceParagraphWithEditor(evt.currentTarget, item);
				}
			});
			

			if(item.classId==80) return; //folder
			
			//Get the sub- headers/paragraphs
			//return when(this.store.getManyByView(item.id, viewId), function(children){
			//return when(this.store.getChildren(item, [846]), function(children){
			var res = this.store.getChildren(item);
			when(res, function(children){
				var previousParagrphHasRightFloat = false;
				for(var i=0;i<children.length;i++){
					var childItem = children[i];
					paragraphNrArr[headerLevel-1] = i+1;
					self.generateNextLevelContents(childItem, viewId, headerLevel+1, paragraphNrArr, item.id, previousParagrphHasRightFloat);
					paragraphNrArr.splice(headerLevel,100);//remove old shit
//					previousParagrphHasRightFloat = childItem[self.PARAGRAPH_ATTRREF].indexOf('floatright')==-1?false:true;
				}
			}, nq.errorDialog);
			res.observe(
				function(obj, removedFrom, insertedInto){
					//console.log("observe on children of ", item, ": ", obj, removedFrom, insertedInto);
					if(obj.id == item.id) self.setSelectedObjIdPreviousLevel();
				}, true);	// true means to notify on item changes
		},
		replaceParagraphWithEditor: function(replaceDiv, item){
			var self = this;
			// Create toolbar and place it at the top of the page
			var toolbar = new Toolbar();
			this.editorToolbarDivNode.appendChild(toolbar.domNode);
			//Paragraph
			var editorDijit = new Editor({
				//disabled: true,
				'height': '', //auto grow
			    'minHeight': '30px',
			    'extraPlugins': this.extraPlugins,
//			    'value': storedRtf,
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
			editorDijit.startup();			

			editorDijit.on(mouse.enter, function(evt){
			//on(editorDijit.domNode, mouse.enter, function(evt){
				if(self.editModeButton.get('checked')) {
					domStyle.set(editorDijit.domNode, 'outline', '1px solid gray');
				}
			});
			on(editorDijit.domNode, mouse.leave, function(evt){
				if(self.editModeButton.get('checked')) {
					domStyle.set(editorDijit.domNode, 'outline', '1px none gray');
				}
			});
			on(editorDijit.domNode, 'click', function(evt){
				if(self.editModeButton.get('checked')) {
//					self.closeEditors();
//					self.replaceParagraphWithEditor(evt.currentTarget, item);
					editorDijit.open();
					domStyle.set(editorDijit.toolbar.containerNode, "display", "");
				}
			});
		},

		closeEditors: function(){
			var self = this;
			registry.byClass("dijit.form.ValidationTextBox",this.pane.containerNode).forEach(function(tb){
				tb.set('readonly', true);
			});
			registry.byClass("dijit.Editor",this.pane.containerNode).forEach(function(editor){
				//editor.set('disabled', true);
				//self.replaceEditorWithParagraph(editor);
				editor.close();
				domStyle.set(editor.toolbar.containerNode, "display", "none");
			});
		}	
	});
});
