define(['dojo/_base/declare', 'dojo/dom-construct', "dojo/promise/all", 'dojo/when', 'dijit/registry', 'dijit/layout/ContentPane',
        'dijit/Toolbar', 'dijit/form/ValidationTextBox', 'dijit/Editor', "app/nqWidgetBase", "dojo/on", "dojo/dom-geometry", 
        "dojo/sniff", "dijit/form/ToggleButton", "dojo/dom", "dojo/dom-attr", "dojo/dom-prop", "dojo/NodeList-dom",
        'app/nqClassChart', "dojo/dom-style", "dojo/query", "dojo/mouse",'dojo/query!css3',

    // Commom plugins
    "dijit/_editor/plugins/FullScreen",
    "dijit/_editor/plugins/LinkDialog",
    "dijit/_editor/plugins/Print",
    "dijit/_editor/plugins/ViewSource",
    "dijit/_editor/plugins/FontChoice",
    //"dijit/_editor/plugins/TextColor",
    "dijit/_editor/plugins/NewPage",
    "dijit/_editor/plugins/ToggleDir",

    //Extension (Less common) plugins
    "dojox/editor/plugins/ShowBlockNodes",
    "dojox/editor/plugins/ToolbarLineBreak",
    "dojox/editor/plugins/Save",
    "dojox/editor/plugins/InsertEntity",
    "dojox/editor/plugins/Preview",
    "dojox/editor/plugins/PageBreak",
    "dojox/editor/plugins/PrettyPrint",
    "dojox/editor/plugins/InsertAnchor",
    "dojox/editor/plugins/CollapsibleToolbar",
    "dojox/editor/plugins/Blockquote",
    //"dojox/editor/plugins/InsertAnchor",

    // Experimental Plugins
    "dojox/editor/plugins/NormalizeIndentOutdent",
    "dojox/editor/plugins/FindReplace",
    "dojox/editor/plugins/TablePlugins",
    "dojox/editor/plugins/TextColor",
    "dojox/editor/plugins/Breadcrumb",
    "dojox/editor/plugins/PasteFromWord",
    "dojox/editor/plugins/Smiley",
    "dojox/editor/plugins/NormalizeStyle",
    "dojox/editor/plugins/StatusBar",
    "dojox/editor/plugins/SafePaste"

        //'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins',"dijit._editor.plugins.FontChoice", 'dijit/WidgetSet'
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
	function(declare, domConstruct, all, when, registry, ContentPane,
			Toolbar, ValidationTextBox, Editor, nqWidgetBase, on, domGeometry, 
			has, ToggleButton, dom, attr, domProp, NodeList,
			nqClassChart, domStyle, query, mouse, css3){

	return declare("nqDocument", [nqWidgetBase], {
        buildRendering: function(){
            this.inherited(arguments);
            domStyle.set(this.pane.containerNode, 'padding-left' , '10px');
            domStyle.set(this.pane.containerNode, 'padding-right' , '10px');
        },
        _setDocIdAttr: function(docId){
            this.inherited(arguments);
            var self = this;
            if(!this.docId) return;
            var docCol = this.store.filter({_id: this.docId});
            docCol.on('update', function(event){
                docCol.fetch().then(function(docsArr){
                    var doc = docsArr[0];
                    self.buildPage(doc);
                });
            });
            docCol.fetch().then(function(docsArr){
                var doc = docsArr[0];
                when(self.store.amAuthorizedToUpdate(doc), function(updateAllowed){
                    //if(self.amAuthorizedToUpdate != updateAllowed) self.buildPage(doc);
                    self.amAuthorizedToUpdate = updateAllowed;
                    self.buildPage(doc);
                });
            });
        },
        buildPage: function(item){
            var self = this;
            var docDom = domConstruct.create('div');
            //var docDom = "";
            when(self.generateNextLevelContents(docDom, item, 1, null, false), function(obj){
                if(self.widget.readOnly==undefined?true:self.widget.readOnly){
                    //Clear the page
                    self.pane.destroyDescendants(false);//destroy all the widgets but leave the pane intact
                    self.editorDijit = null;
                    domStyle.set(self.editorToolbarDivNode, 'display' , 'none');
                    domConstruct.place(docDom, self.pane.containerNode, 'last');
                }
                else{
                    domStyle.set(self.editorToolbarDivNode, 'display' , '');
                    if(!self.editorDijit){
                        // Create toolbar and place it at the top of the page
                        var toolbar = new Toolbar();
                        self.editorToolbarDivNode.appendChild(toolbar.domNode);
                        //Paragraph
                        self.editorDijit = new Editor({
                            'height': '', //auto grow
                            'minHeight': '30px',
                            plugins: self.plugins,
                            //'extraPlugins': [{name: 'formatBlock', plainText: true},'viewSource'],
                            'toolbar': toolbar,
                            focusOnLoad: true//,
                            //'onChange': self.interpretPage
                        }, domConstruct.create('div'));
                        self.editorDijit.on('change', dojo.hitch(self,self.interpretPage));
                        self.editorDijit.addStyleSheet('app/resources/editor.css');
                        /*self.editorDijit.on("NormalizedDisplayChanged", function(){
                            var height = domGeometry.getMarginSize(self.editorDijit.editNode).h;
                            if(has("opera")){
                                height = editorDijit.editNode.scrollHeight;
                            }
                            self.editorDijit.resize({h: height});
                        });*/
                        domConstruct.place(self.editorDijit.domNode, self.pane.containerNode, 'last');
                        //domConstruct.place(editorDijit.domNode, replaceDiv, "replace");
                        self.editorDijit.startup();
                    }
                    //console.log(docDom);
                    self.editorDijit.set('value', docDom.innerHTML);
                }
            });
        },
		//Create an ordinary HTML page recursively by obtaining data from the server
        generateNextLevelContents: function(docDom, item, headerLevel, parentId, previousParagraphHasRightFloat){
            var self = this;
            var divDom = domConstruct.create('div', {id: item._id}, docDom);
            //Header
            domConstruct.create(
                'h'+headerLevel,
                {innerHTML: item.name, style: {'clear': previousParagraphHasRightFloat?'both':'none'}},
                divDom
            );
            if(item.insets){
                item.insets.forEach(function(inset){
                    if(inset.mediaType){
                        if(inset.mediaType.media == 'img/png'){
                            //image
                            domConstruct.create("img", {style:{float :'right', 'margin-left':'10px'}, src: inset.url, width: 300}, divDom);
                        }
                    }
                });
            }
            var pDom = dojo.toDom(item.description);
            domConstruct.place(pDom, divDom, 'last');


            var childrenFilter = this.store.buildFilterFromQuery(item, this.schema.childrenQuery);
            if(childrenFilter){
                var childrenCollection = this.store.filter(childrenFilter);
                /*childrenCollection.on('update', function(event){
                 var obj = event.target;
                 alert('doc change');
                 //self.onChange(obj);
                 });*/
                var childDocPromises = [];
                childrenCollection.forEach(function(childItem){
                    var previousParagraphHasRightFloat = false;
                    childDocPromises.push(self.generateNextLevelContents(docDom, childItem, headerLevel+1, item._id, previousParagraphHasRightFloat));
                    //previousParagraphHasRightFloat = childItem.description && childItem.description.indexOf('floatright')==-1?false:true;
                });
                return all(childDocPromises);
            }
            return true;
        },
        interpretPage: function(docString){
            var self = this;
            //var docString = self.editorDijit.get('value');
            //var docString = self.editorDijit.editNode.innerHTML;
            var docDom = dojo.toDom(docString);
            //var nl = new NodeList(docDom.childNodes);
            //var h1List = query("h1", docDom);
            docDom.childNodes.forEach(function(dom){
                var nodeName = domProp.get(dom, 'nodeName');
                if(nodeName == 'DIV'){
                    var id = attr.get(dom, 'id');
                    if(id){
                        var update = false;
                        self.store.get(id).then(function(storedItem){
                            var newParagraphParts = [];
                            dom.childNodes.forEach(function(domToUpdate) {
                                var nodeNameToUpdate = domProp.get(domToUpdate, 'nodeName');
                                if(nodeNameToUpdate.charAt(0) == 'H') {
                                    var newText = attr.get(domToUpdate, 'innerHTML');
                                    if(storedItem.name != newText){
                                        update = true;
                                        storedItem.name = newText;
                                    }
                                }
								else if(nodeNameToUpdate == 'P'){
									var newText = attr.get(domToUpdate, 'innerHTML');
									if(storedItem.description != newText){
										update = true;
										storedItem.description = newText;
									}
								}
								else if(nodeNameToUpdate == 'DIV'){
                                    //newParagraphParts.push(domToUpdate.outerHTML);
                                }
                                //var value = domToUpdate.outerHTML;
                                //console.log(domToUpdate);
                            });
                            /*if(!newParagraphParts.isEqualNode(storedItem.paragraphParts)){
                                update = true;
                                storedItem.paragraphParts = newParagraphParts;
                            }*/
                            if(update) self.store.put(storedItem);
                        });
                    }
                }
            });
        },



        plugins: [
            //'collapsibletoolbar', 'breadcrumb', 'newpage', 'save',
            {name: 'viewSource', stripScripts: true, stripComments: true},
            //'showBlockNodes', '|',{name: 'fullscreen', zIndex: 900},
            'preview', 'print', '|',
            'findreplace', 'selectAll', 'cut', 'copy','paste', 'pastefromword', 'delete', '|', 'undo', 'redo', '|',
            'pageBreak', 'insertHorizontalRule', 'insertOrderedList', 'insertUnorderedList', 'indent', 'outdent', 'blockquote', '|',
            'justifyLeft', 'justifyRight', 'justifyCenter', 'justifyFull', 'toggleDir', '|',
            'bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'foreColor', 'hiliteColor', 'removeFormat', '|',
            'insertEntity', 'smiley', 'createLink', 'insertanchor', 'unlink', //'insertImage', '||',
            //{name: 'nqLocalImage', uploadable: true, uploadUrl: '/upload', baseImageUrl: '/app/resources/Neuralquest'},
            //'fontName', {name: 'fontSize', plainText: true}, {name: 'formatBlock', plainText: true},// '||',

            /*{name: 'dojox.editor.plugins.TablePlugins', command: 'insertTable'},
            {name: 'dojox.editor.plugins.TablePlugins', command: 'modifyTable'},
            {name: 'dojox.editor.plugins.TablePlugins', command: 'InsertTableRowBefore'},
            {name: 'dojox.editor.plugins.TablePlugins', command: 'InsertTableRowAfter'},
            {name: 'dojox.editor.plugins.TablePlugins', command: 'insertTableColumnBefore'},
            {name: 'dojox.editor.plugins.TablePlugins', command: 'insertTableColumnAfter'},
            {name: 'dojox.editor.plugins.TablePlugins', command: 'deleteTableRow'},
            {name: 'dojox.editor.plugins.TablePlugins', command: 'deleteTableColumn'},
            {name: 'dojox.editor.plugins.TablePlugins', command: 'colorTableCell'},
            {name: 'dojox.editor.plugins.TablePlugins', command: 'tableContextMenu'},*/
            //Pretty Print messes with the format of the result
            //{name: 'prettyprint', indentBy: 3, lineLength: 80, entityMap: dojox.html.entities.html.concat(dojox.html.entities.latin)},
            {name: 'dijit._editor.plugins.EnterKeyHandling', blockNodeForEnter: "Br"},
            'normalizeindentoutdent', 'normalizestyle', {name: 'statusbar', resizer: false}, "safepaste"
        ],
















		YgenerateNextLevelContents: function(item, headerLevel, parentId, previousParagraphHasRightFloat){
			var self = this;
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
            var headerText = item.name?item.name:'';
            if(true == true){
                var headerDom = domConstruct.create('h'+headerLevel,{},divDom);
                var textDijit = new ValidationTextBox({
                    item: item,
                    'type': 'text',
                    'trim': true,
                    'value': headerText,
                    //'style':{width:'90%','background': 'rgba(250, 250, 121, 0.28)', 'border-style': 'none'},//rgba(0,0,255,0.04)
                    'style':{width:'90%'},
                    'placeHolder': 'Paragraph Header',
                    'onChange': function(evt){
                        item.name = textDijit.get('value');
                        self.store.put(item);
                    }
                }, domConstruct.create('span'));
                headerDom.appendChild(textDijit.domNode);
            }
			else{
                domConstruct.create(
                    'h'+headerLevel,
                    {innerHTML: headerText, style: {'clear': previousParagraphHasRightFloat?'both':'none'}},
                    divDom
                );
            }
            if(item.paragraphParts){
                var paragraphContent = null;
                item.paragraphParts.forEach(function(paragraphPart){
                    if(paragraphPart.mediaType){
                        if(paragraphPart.mediaType.media == 'text/html'){
                            //Paragraph
                            paragraphContent =  paragraphPart.content;
                        }
                        else if(paragraphPart.mediaType.media == 'img/png'){
                            //image
                            domConstruct.create("img", {style:{float :'right', 'margin-left':'10px'}, src: paragraphPart.url, width: 300}, divDom);
                        }
                    }
                });
                if(paragraphContent) domConstruct.place(paragraphContent, divDom, 'last');
            }
			var childrenFilter = this.store.buildFilterFromQuery(item, this.schema.childrenQuery);
			if(childrenFilter){
				var childrenCollection = this.store.filter(childrenFilter);
				/*childrenCollection.on('update', function(event){
					var obj = event.target;
					alert('doc change');
					//self.onChange(obj);
				});*/
				var childDocPromises = [];
				childrenCollection.forEach(function(childItem){
					var previousParagraphHasRightFloat = false;
					childDocPromises.push(self.generateNextLevelContents(childItem, headerLevel+1, item._id, previousParagraphHasRightFloat));
					//previousParagraphHasRightFloat = childItem.description && childItem.description.indexOf('floatright')==-1?false:true;
				});
				return all(childDocPromises);
			}
			return true;
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
