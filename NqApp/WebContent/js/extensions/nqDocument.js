define(['dojo/_base/declare', 'dojo/dom-construct', 'dojo/when', 'dijit/registry', 'dijit/layout/ContentPane', 
        'dijit/Toolbar', 'dijit/form/ValidationTextBox', 'dijit/Editor', "nq/nqWidgetBase", "dojo/on", "dojo/dom-geometry", 
        "dojo/sniff", "dijit/form/ToggleButton", "dojo/_base/lang", 'dijit/registry', "dojo/dom", "dojo/dom-attr",
        'nq/nqClassChart', "dojo/dom-style", "dojo/query", "dojo/mouse", 
        
        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins', 'dijit/WidgetSet', 
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
	function(declare, domConstruct, when, registry, ContentPane, 
			Toolbar, ValidationTextBox, Editor, nqWidgetBase, on, domGeometry, 
			has, ToggleButton, lang, registry, dom, domAttr,
			nqClassChart, domStyle, query, mouse){

	return declare("nqDocumentWidget", [nqWidgetBase], {
		parentId: null,
		extraPlugins: {},
		viewId: '846',
		headerAttrId: 873,
		paragraphAttrId: 959,

//		editMode: false,
		normalToolbar: null,

		postCreate: function(){
			//initially hide the editor toolbar div
			domStyle.set(this.editorToolbarDivNode, 'display' , 'none');
			// Create toolbar and place it at the top of the page
			this.normalToolbar = new Toolbar({});
			this.inherited(arguments);
			var _this = this;
			// Add edit mode toggle button
			this.editModeButton = new ToggleButton({
		        showLabel: true,
		        checked: false,
		        label: 'Edit Mode',
				iconClass: 'editIcon',
		        onChange: function(val){
		        	if(val) {
		        		domStyle.set(_this.editorToolbarDivNode, 'display' , '');
		        		_this.siblingButton.set('checked', false);
		        		_this.childButton.set('checked', false);
		        		_this.deleteButton.set('checked', false);
		        	}
		        	else {
		        		_this.closeEditors();
		        		domStyle.set(_this.editorToolbarDivNode, 'display' , 'none');
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
		        		_this.editModeButton.set('checked', false);
		        		_this.childButton.set('checked', false);
		        		_this.deleteButton.set('checked', false);
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
		        		_this.editModeButton.set('checked', false);
		        		_this.siblingButton.set('checked', false);
		        		_this.deleteButton.set('checked', false);
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
		        		_this.editModeButton.set('checked', false);
		        		_this.siblingButton.set('checked', false);
		        		_this.childButton.set('checked', false);
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
		},
		_setParentIdAttr: function(value){
			this.inherited(arguments);
			this.closeEditors();
			domConstruct.empty(this.pane.domNode);

			var _this = this;
			var viewId = this.viewId;
			when(this.store.get(this.parentId), function(item){
				when(_this.generateNextLevelContents(item, viewId, 1, [], null, false), function(item){
					registry.byId('tab'+_this.tabId).resize();
				});
			});
		},
		generateNextLevelContents: function(item, viewId, headerLevel, paragraphNrArr, parentId, previousParagrphHasRightFloat){
			var _this = this;
			//Create an ordinary HTML page recursivly by obtaining data from the server
			var storedHeader = item[this.headerAttrId];
			var storedRtf = item[this.paragraphAttrId];

			//Header
			var paragraphNrStr = paragraphNrArr.length==0?'':paragraphNrArr.join('.');
			var headerNode = domConstruct.create('h'+headerLevel, {style: {'clear': previousParagrphHasRightFloat?'both':'none'}}, this.pane.containerNode);
			if(headerLevel>1) domConstruct.create('span', { innerHTML: paragraphNrStr, style: { 'margin-right':'30px'}}, headerNode);
			var headerSpan = domConstruct.create('span', { 
				innerHTML: storedHeader,
				objectId: item.id,
				parentId: parentId,
				onclick: function(evt){
					_this.closeEditors();
					if(_this.siblingButton.get('checked')){
						_this.siblingButton.set('checked', false);
						_this.editModeButton.set('checked', true);
						var addObj = {
							'id': '',//cid will be added by our restStore exstension, we need a dummy id
							'viewId': item.viewId, 
							'classId': item.classId
						};
						addObj[_this.headerAttrId] = '[header]';
						addObj[_this.paragraphAttrId] = '<p>[paragraph]</p>';
						var newItem = _this.store.add(addObj);
						
						var parentItem = _this.store.get(parentId);
						var pos = parentItem[viewId].indexOf(item.id);
						parentItem[viewId].splice(pos+1, 0, newItem.id);
						_nqDataStore.put(parentItem);
						
						_this.set('parentId');// redraw the page TODO should be using observe
						var newDiv = query('span[objectId="'+newItem.id+'"]')[0];
						_this.replaceHeaderWithEditor(newDiv);
					}
					else if(_this.childButton.get('checked')){
						_this.childButton.set('checked', false);
						_this.editModeButton.set('checked', true);
						var addObj = {
							'id': '',//cid will be added by our restStore exstension, we need a dummy id
							'viewId': item.viewId, 
							'classId': item.classId
						};
						addObj[_this.headerAttrId] = '[new header]';
						addObj[_this.paragraphAttrId] = '<p>new paragraph</p>';
						var newItem = _this.store.add(addObj);
						if(!item[viewId]) item[viewId] = [];
						item[viewId].push(newItem.id);
						_nqDataStore.put(item);
						
						_this.set('parentId');// redraw the page
						var newDiv = query('span[objectId="'+newItem.id+'"]')[0];
						_this.replaceHeaderWithEditor(newDiv);
					}
					else if(_this.deleteButton.get('checked')){
						if(!item[viewId] || item[viewId].length == 0){
							_this.deleteButton.set('checked', false);
							_this.store.remove(item.id);
							
							var parentItem = _this.store.get(parentId);
							var pos = parentItem[viewId].indexOf(item.id);
							parentItem[viewId].splice(pos, 1);
							_nqDataStore.put(parentItem);
							_this.set('parentId');// redraw the page
						}
					}
					else if(_this.editModeButton.get('checked')) {
						 _this.replaceHeaderWithEditor(evt.currentTarget);
					}
				}
			}, headerNode);
			
			on(headerSpan, mouse.enter, function(evt){
				if(_this.editModeButton.get('checked') ||
					   _this.siblingButton.get('checked') ||
					   _this.childButton.get('checked') ||
					   _this.deleteButton.get('checked')){
					domStyle.set(headerSpan, 'border', '1px solid gray');// "backgroundColor", "rgba(250, 250, 121, 0.28)"
				}
			});
			on(headerSpan, mouse.leave, function(evt){
				if(_this.editModeButton.get('checked') ||
					   _this.siblingButton.get('checked') ||
					   _this.childButton.get('checked') ||
					   _this.deleteButton.get('checked')){
					domStyle.set(headerSpan, 'border', '1px none gray');
				}
			});
			
			//Illustration
			if(item.id=="846/1213"){
				var widgetDomNode = domConstruct.create('div', {
					'class': 'floatright',
					objectId: item.id
				}, this.pane.containerNode);
				
				_this.addWidget(widgetDomNode);

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
					if(_this.editModeButton.get('checked')) {
						_this.closeEditors();
						_this.replaceParagraphWithEditor(evt.currentTarget);
					}
				}
			}, this.pane.containerNode);

			
			//Paragraph
			var paragraphNode = domConstruct.create('div', {
				innerHTML: storedRtf, 
				objectId: item.id,
				onclick: function(evt){
					if(_this.editModeButton.get('checked')) {
						_this.closeEditors();
						_this.replaceParagraphWithEditor(evt.currentTarget);
					}
				}
			}, this.pane.containerNode);

			on(paragraphNode, mouse.enter, function(evt){
				if(_this.editModeButton.get('checked')) {
					domStyle.set(paragraphNode, 'border', '1px solid gray');
				}
			});
			on(paragraphNode, mouse.leave, function(evt){
				if(_this.editModeButton.get('checked')) {
					domStyle.set(paragraphNode, 'border', '1px none gray');
				}
			});

			if(item.classId==80) return; //folder
			
			//Get the sub- headers/paragraphs
			return when(this.store.getChildren(item, [846]), function(children){
				var previousParagrphHasRightFloat = false;
				for(var i=0;i<children.length;i++){
					var childItem = children[i];
					paragraphNrArr[headerLevel-1] = i+1;
					_this.generateNextLevelContents(childItem, viewId, headerLevel+1, paragraphNrArr, item.id, previousParagrphHasRightFloat);
					paragraphNrArr.splice(headerLevel,100);//remove old shit
					previousParagrphHasRightFloat = childItem[_this.paragraphAttrId].indexOf('floatright')==-1?false:true;
				}
			});
		},
		replaceHeaderWithEditor: function(replaceDiv){
			var _this = this;
			var objectId = domAttr.get(replaceDiv,'objectId');
			var item = this.store.get(objectId);
			var storedHeader = item[this.headerAttrId];
			var textDijit = new ValidationTextBox({
				objectId: objectId,
			    'type': 'text',
			    'trim': true,
			    'value': storedHeader,
			    //'style':{ 'width':'90%', 'background': 'rgba(0,0,255,0.04)', 'border-style': 'none'},
			    'style':{width:'90%','background': 'rgba(250, 250, 121, 0.28)', 'border-style': 'none'},//rgba(0,0,255,0.04)
				'placeHolder': 'Paragraph Header',
				'onChange': function(evt){
					when(_this.store.get(objectId), function(item){
						item[_this.headerAttrId] = textDijit.get('value');
						_this.store.put(item);
					});
			    }
			}, domConstruct.create('input'));
			domConstruct.place(textDijit.domNode, replaceDiv, "replace");
			textDijit.focus();			
		},
		replaceParagraphWithEditor: function(replaceDiv){
			var _this = this;
			var objectId = domAttr.get(replaceDiv,'objectId');
			var item = this.store.get(objectId);
			var storedRtf = item[this.paragraphAttrId];
			// Create toolbar and place it at the top of the page
			var toolbar = new Toolbar();
			this.editorToolbarDivNode.appendChild(toolbar.domNode);
			//Paragraph
			var editorDijit = new Editor({
				objectId: objectId,
				'height': '', //auto grow
			    'minHeight': '30px',
			    'extraPlugins': this.extraPlugins,
//			    'value': storedRtf,
				'toolbar': toolbar,
				focusOnLoad: true,
				'onChange': function(evt){
					when(_this.store.get(objectId), function(item){
						item[_this.paragraphAttrId] = editorDijit.get('value');
						_this.store.put(item);
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
			editorDijit.set('value', storedRtf);
			domConstruct.place(editorDijit.domNode, replaceDiv, "replace");
			editorDijit.startup();			
		},
		closeEditors: function(){
			var _this = this;
			registry.byClass("dijit.form.ValidationTextBox",this.pane.containerNode).forEach(function(tb){
				domConstruct.create('span', { 
					innerHTML: tb.get('value'),
					objectId: tb.objectId,
					onclick: function(evt){
						if(_this.editModeButton.get('checked')) {
							_this.closeEditors();
							_this.replaceHeaderWithEditor(evt.currentTarget);
						}
					}
				}, tb.domNode, 'replace');
				tb.destroy();
			});
			registry.byClass("dijit.Editor",this.pane.containerNode).forEach(function(editor){
				domConstruct.create('div', {
					innerHTML: editor.get('value'), 
					objectId: editor.objectId,
					onclick: function(evt){
						if(_this.editModeButton.get('checked')) {
							_this.closeEditors();
							_this.replaceParagraphWithEditor(evt.currentTarget);
						}
					}
				}, editor.domNode, 'replace');
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
