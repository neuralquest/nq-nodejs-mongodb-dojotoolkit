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
			this.closeEditors();
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
			var headerNode = domConstruct.create('h'+headerLevel, {style: {'clear': previousParagrphHasRightFloat?'both':'none'}}, this.pane.containerNode);
			if(headerLevel>1) domConstruct.create('span', { innerHTML: paragraphNrStr, style: { 'margin-right':'30px'}}, headerNode);
			var headerSpan = domConstruct.create('span', { 
				innerHTML: item[this.HEADER_ATTRREF],
				cellId: item['cellId'+this.HEADER_ATTRREF],
				objectId: item.id,
				parentId: parentId,
				onclick: function(evt){
					self.closeEditors();
					if(self.siblingButton.get('checked')){
						self.siblingButton.set('checked', false);
						self.editModeButton.set('checked', true);
						var addObj = {
							'viewId': item.viewId, 
							'classId': item.classId
						};
						//addObj[self.HEADER_ATTRREF] = '[header]';
						//addObj[self.PARAGRAPH_ATTRREF] = '<p>[paragraph]</p>';
						var objectId = domAttr.get(evt.currentTarget,'objectId');
						when(self.store.query({sourceFk:objectId, type:NEXT_ASSOC}), function(assocArr) {
							if(assocArr.length>1) throw new Error('One assoc expected');
							var parentId = domAttr.get(evt.currentTarget,'parentId');
							var directives = {parent:{id:parentId}};
							if(assocArr.length==1) {
								nextObjId = assocArr[0].destFk;
								directives.before = {id:nextObjId};
							}
							when(self.store.add(addObj, directives), function(newItem){
								when(self.setSelectedObjIdPreviousLevel(), function(done){
									var newDiv = query('span[objectid="'+newItem.id+'"]')[0];
									self.replaceHeaderWithEditor(newDiv);
								});
							});
						});
					}
					else if(self.childButton.get('checked')){
						self.childButton.set('checked', false);
						self.editModeButton.set('checked', true);
						var addObj = {
							'viewId': item.viewId, 
							'classId': item.classId
						};
						var objectId = domAttr.get(evt.currentTarget,'objectId');
						var directives = {parent:{id:objectId}};
						when(self.store.add(addObj, directives), function(newItem){
							when(self.setSelectedObjIdPreviousLevel(), function(done){
								var newDiv = query('span[objectid="'+newItem.id+'"]')[0];
								self.replaceHeaderWithEditor(newDiv);
							});
						});
					}
					else if(self.deleteButton.get('checked')){
						if(!item[viewId] || item[viewId].length == 0){
							self.deleteButton.set('checked', false);
							self.store.remove(item.id);
							
							var parentItem = self.store.getCell(parentId);
							var pos = parentItem[viewId].indexOf(item.id);
							parentItem[viewId].splice(pos, 1);
							_nqDataStore.put(parentItem);
							self.set('parentid');// redraw the page
						}
					}
					else if(self.editModeButton.get('checked')) {
						 self.replaceHeaderWithEditor(evt.currentTarget);
					}
				}
			}, headerNode);
			
			on(headerSpan, mouse.enter, function(evt){
				if(self.editModeButton.get('checked') ||
					   self.siblingButton.get('checked') ||
					   self.childButton.get('checked') ||
					   self.deleteButton.get('checked')){
					domStyle.set(headerSpan, 'border', '1px solid gray');// "backgroundColor", "rgba(250, 250, 121, 0.28)"
				}
			});
			on(headerSpan, mouse.leave, function(evt){
				if(self.editModeButton.get('checked') ||
					   self.siblingButton.get('checked') ||
					   self.childButton.get('checked') ||
					   self.deleteButton.get('checked')){
					domStyle.set(headerSpan, 'border', '1px none gray');
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
						self.closeEditors();
						self.replaceParagraphWithEditor(evt.currentTarget);
					}
				}
			}, this.pane.containerNode);

			
			//Paragraph
			var paragraphNode = domConstruct.create('div', {
				innerHTML: item[this.PARAGRAPH_ATTRREF], 
				cellId: item['cellId'+this.PARAGRAPH_ATTRREF], 
				objectId: item.id,
				onclick: function(evt){
					if(self.editModeButton.get('checked')) {
						self.closeEditors();
						self.replaceParagraphWithEditor(evt.currentTarget);
					}
				}
			}, this.pane.containerNode);

			on(paragraphNode, mouse.enter, function(evt){
				if(self.editModeButton.get('checked')) {
					domStyle.set(paragraphNode, 'border', '1px solid gray');
				}
			});
			on(paragraphNode, mouse.leave, function(evt){
				if(self.editModeButton.get('checked')) {
					domStyle.set(paragraphNode, 'border', '1px none gray');
				}
			});

			if(item.classId==80) return; //folder
			
			//Get the sub- headers/paragraphs
			return when(this.store.getManyByView(item.id, viewId), function(children){
			//return when(this.store.getChildren(item, [846]), function(children){
				var previousParagrphHasRightFloat = false;
				for(var i=0;i<children.length;i++){
					var childItem = children[i];
					paragraphNrArr[headerLevel-1] = i+1;
					self.generateNextLevelContents(childItem, viewId, headerLevel+1, paragraphNrArr, item.id, previousParagrphHasRightFloat);
					paragraphNrArr.splice(headerLevel,100);//remove old shit
//					previousParagrphHasRightFloat = childItem[self.PARAGRAPH_ATTRREF].indexOf('floatright')==-1?false:true;
				}
			}, nq.errorDialog);
		},
		replaceHeaderWithEditor: function(replaceDiv){
			var self = this;
			var cellId = domAttr.get(replaceDiv,'cellId');
			var cell = this.store.getCell(cellId);
			var textDijit = new ValidationTextBox({
				cellId: cellId,
			    'type': 'text',
			    'trim': true,
			    'value': cell.name,
			    //'style':{ 'width':'90%', 'background': 'rgba(0,0,255,0.04)', 'border-style': 'none'},
			    'style':{width:'90%','background': 'rgba(250, 250, 121, 0.28)', 'border-style': 'none'},//rgba(0,0,255,0.04)
				'placeHolder': 'Paragraph Header',
				'onChange': function(evt){
					when(self.store.getCell(cellId), function(item){
						item.name = textDijit.get('value');
						self.store.put(item);
					});
			    }
			}, domConstruct.create('input'));
			domConstruct.place(textDijit.domNode, replaceDiv, "replace");
			textDijit.focus();			
		},
		replaceParagraphWithEditor: function(replaceDiv){
			var self = this;
			var cellId = domAttr.get(replaceDiv,'cellId');
			var cell = this.store.getCell(cellId);
			// Create toolbar and place it at the top of the page
			var toolbar = new Toolbar();
			this.editorToolbarDivNode.appendChild(toolbar.domNode);
			//Paragraph
			var editorDijit = new Editor({
				cellId: cellId,
				'height': '', //auto grow
			    'minHeight': '30px',
			    'extraPlugins': this.extraPlugins,
//			    'value': storedRtf,
				'toolbar': toolbar,
				focusOnLoad: true,
				'onChange': function(evt){
					when(self.store.getCell(cellId), function(item){
						item.name = editorDijit.get('value');
						self.store.put(item);
				});}
			}, domConstruct.create('div'));
			editorDijit.addStyleSheet('css/editor.css');
			editorDijit.on("NormalizedDisplayChanged", function(){
				var height = domGeometry.getMarginSize(editorDijit.editNode).h;
				if(has("opera")){
					height = editorDijit.editNode.scrollHeight;
				}
				editorDijit.resize({h: height});
			});
			editorDijit.set('value', cell.name);
			domConstruct.place(editorDijit.domNode, replaceDiv, "replace");
			editorDijit.startup();			
		},
		closeEditors: function(){
			var self = this;
			registry.byClass("dijit.form.ValidationTextBox",this.pane.containerNode).forEach(function(tb){
				domConstruct.create('span', { 
					innerHTML: tb.get('value'),
					cellId: tb.cellId,
					objectId: tb.objectId,
					onclick: function(evt){
						if(self.editModeButton.get('checked')) {
//							self.closeEditors();
							self.replaceHeaderWithEditor(evt.currentTarget);
						}
					}
				}, tb.domNode, 'replace');
				tb.destroy();
			});
			registry.byClass("dijit.Editor",this.pane.containerNode).forEach(function(editor){
				domConstruct.create('div', {
					innerHTML: editor.get('value'), 
					cellId: editor.cellId,
					objectId: editor.objectId,
					onclick: function(evt){
						if(self.editModeButton.get('checked')) {
//							self.closeEditors();
							self.replaceParagraphWithEditor(evt.currentTarget);
						}
					}
				}, editor.domNode, 'replace');
				editor.close(false, false);
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
