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
		setDocId: function(id){
			if(id.length == 0) return;
			var self = this;
			//Clear the page
			this.pane.destroyDescendants(false);//destroy all the widget but leave the pane intact
			//load the data
			self.store.get(id).then(function(obj){
				self.generateNextLevelContents(obj, 1, null, false).then(function(obj){
					registry.byId('tab'+self.tabId).resize();
					//self.pane.resize();
					//self.setDocIdDeferred.resolve(self);
				});
			}, nq.errorDialog);
		},
		//Create an ordinary HTML page recursively by obtaining data from the server
		generateNextLevelContents: function(item, headerLevel, parentId, previousParagraphHasRightFloat){
			var self = this;
            //Header
            var divDom = domConstruct.create(
                'div',
                {
                    id: item._id,
                    onclick: function(event){
                        var pageId = self.widget.pageId;
                        if(pageId) nq.setHash(item._id, pageId, self.tabNum, self.widNum, self.level+1);
                    }
                },
                this.pane.containerNode);

			//Header
			domConstruct.create(
				'h'+headerLevel,
				{innerHTML: item.name, style: {'clear': previousParagraphHasRightFloat?'both':'none'}},
                divDom
			);
            if(item.paragraphParts){
                item.paragraphParts.forEach(function(paragraphPart){
                    if(paragraphPart.mediaType){
                        if(paragraphPart.mediaType.media == 'text/html'){
                            //Paragraph
                            domConstruct.create("p", {innerHTML: paragraphPart.content}, divDom);
                        }
                    }
                });
            }

            if(item[this.schema.childArrayNames[0]]){
                var childrenFilter = this.store.Filter().in('_id', item[this.schema.childArrayNames[0]]);
                var childrenCollection = this.store.filter(childrenFilter);
                childrenCollection.on('update', function(event){
                    var obj = event.target;
                    alert('doc change');
                    //self.onChange(obj);
                });
                childrenCollection.forEach(function(childItem){
                    var previousParagraphHasRightFloat = false;
                    self.generateNextLevelContents(childItem, headerLevel+1, item._id, previousParagraphHasRightFloat);
                    //previousParagraphHasRightFloat = childItem.description && childItem.description.indexOf('floatright')==-1?false:true;
                });
            }

		},





		XpostCreate: function(){
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
			var initialized = self.store.get(self.widgetId).then(function(widget){
				self.widget = widget;
				self.headerDivNode.innerHTML = '<h1>'+widget.name+'</h1>';
				//domStyle.set(self.headerDivNode, 'display', 'block');
				self.pageHelpTextDiv.innerHTML = widget.description;
				return self.store.getItemsByAssocTypeAndDestClass(self.widgetId, 'manyToMany', VIEW_CLASS_TYPE).then(function(viewsArr) {
					self.view = viewsArr[0];//for now assume only one view
					return self.store.getCombinedSchemaForView(self.view).then(function(schema) {
						self.enrichSchema(schema);
						self.schema = schema;
						return true;
					});
				});
			});
			when(initialized, function(result){
				self.createDeferred.resolve(self);//ready to be loaded with data
			}, function(err){self.createDeferred.reject(err)});
		},
		XsetSelectedObjIdPreviousLevel: function(value){
			//load the data
			if(value){
				if(this.docId == value) return this;
				this.docId = value;
			}
			this.pane.destroyDescendants(false);//destroy all the widget but leave the pane intact

			var self = this;
			var viewId = this.view._id;
			/*var query = {itemId:this.docId, viewId:this.viewId};
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
			var item = children[0];*/
            self.store.get(this.docId, viewId).then(function(item) {
                var promise = when(self.generateNextLevelContents(item, 1, null, false), function(item){
					registry.byId('tab'+self.tabId).resize();
	//				self.pane.resize();
					self.setDocIdDeferred.resolve(self);
					return item;
                });
			}, nq.errorDialog);
 			return this.setDocIdDeferred.promise;
		},
		//Create an ordinary HTML page recursivly by obtaining data from the server
		XgenerateNextLevelContents: function(item, headerLevel, parentId, previousParagraphHasRightFloat){
			//console.log('do item',item[2535]);
			var self = this;
			//var hearderObj = item['attrRef'+this.HEADER_ATTRREF];
			//var paragraphObj = item['attrRef'+this.PARAGRAPH_ATTRREF];

			//Header
			var headerNode = domConstruct.create(
					'h'+headerLevel,
					{style: {'clear': previousParagraphHasRightFloat?'both':'none'}},
					this.pane.containerNode
				);
			var textDijit = new ValidationTextBox({
				item: item,
			    'type': 'text',
			    'trim': true,
			    'value': item.name,
			    //'style':{width:'90%','background': 'rgba(250, 250, 121, 0.28)', 'border-style': 'none'},//rgba(0,0,255,0.04)
			    'style':{width:'90%'},
				'placeHolder': 'Paragraph Header',
				'onChange': function(evt){
					item[self.name] = textDijit.get('value');
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
			var viewId = this.view._id;
			/*var collection = this.store.getChildren(item, viewId);
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
			var children = collection.fetch();*/
			this.store.getChildren(item, function(children){
				children.forEach(function(childItem){
					var previousParagraphHasRightFloat = false;
					self.generateNextLevelContents(childItem, headerLevel+1, item.id, previousParagraphHasRightFloat);
					previousParagraphHasRightFloat = childItem.description && childItem.description.indexOf('floatright')==-1?false:true;
				})
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
					item.description = editorDijit.get('value');
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
			editorDijit.set('value', item.description);
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
			var value = item.description;
			if(!value) value = '<p>[no text]</p>'
			var paragraphNode = domConstruct.create('div', {
				innerHTML: value, 
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
