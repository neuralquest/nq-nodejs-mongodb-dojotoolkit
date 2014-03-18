define(['dojo/_base/declare', 'dojo/dom-construct', 'dojo/when', 'dojo/_base/array', 'dijit/registry', 'dijit/layout/ContentPane', 
        'dijit/Toolbar', 'dijit/form/ValidationTextBox', 'dijit/Editor', "dijit/_WidgetBase", "dojo/on", "dojo/dom-geometry", 
        "dojo/sniff", "dijit/form/ToggleButton", "dojo/_base/lang", 'dijit/registry', "dojo/dom", "dojo/dom-attr",
        'nq/NqClassChart',
        
        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins', 'dijit/WidgetSet', 
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
	function(declare, domConstruct, when, arrayUtil, registry, ContentPane, 
			Toolbar, ValidationTextBox, Editor, _WidgetBase, on, domGeometry, 
			has, ToggleButton, lang, registry, dom, domAttr,
			NqClassChart){

	return declare("NqDocumentWidget", [_WidgetBase], {
		foreignKey: null,
		extraPlugins: {},
		store: null,
		viewId: '846',
		helpText: 'helpText',
		headerAttrId: 873,
		paragrphAttrId: 959,

		editMode: false,
		normalToolbar: null,
		
		buildRendering: function(){
			this.inherited(arguments);
			this.domNode = domConstruct.create("div");
			this.toolbarDivNode = domConstruct.create('div', {},this.domNode);//placeholder for the toolbars
			// Create toolbar and place it at the top of the page
			this.normalToolbar = new Toolbar({});
			var _this = this;
			var button1 = new ToggleButton({
		        showLabel: true,
		        checked: false,
		        //onChange: function(val){this.set('label',val);},
		        label: 'Edit Mode',
				iconClass: 'editIcon',
		        onChange: function(val){
		        	_this.editMode = val;
		        	if(!val) _this.closeEditors();
				}
			});
			this.normalToolbar.addChild(button1);
			var button2 = new ToggleButton({
		        showLabel: true,
		        checked: true,
		        onChange: function(val){
					if(val) dojox.html.insertCssRule('.floatright', 'display:block;', 'nq.css');
					else dojox.html.insertCssRule('.floatright', 'display:none;', 'nq.css');
				},
				label: 'Images',
				iconClass: 'annoIcon'				
			});
			this.normalToolbar.addChild(button2);
			/*var button3 = new ToggleButton({
		        showLabel: true,
		        checked: false,
		        //onChange: function(val){this.set('label',val);},
				label: 'Rules',
				iconClass: 'rulesIcon'				
			});
			this.normalToolbar.addChild(button3);*/
			var button4 = new ToggleButton({
		        onChange: function(val){
					if(val) dojox.html.insertCssRule('.todofloatright', 'display:block;', 'nq.css');
					else dojox.html.insertCssRule('.todofloatright', 'display:none;', 'nq.css');
				},
				label: 'ToDo',
				iconClass: 'todoIcon'				
			});
			this.normalToolbar.addChild(button4);
			this.toolbarDivNode.appendChild(this.normalToolbar.domNode);
			this.pageHelpTextDiv = domConstruct.create('div', {'class': 'helpTextInvisable', 'style' : { 'padding': '10px'} }, this.domNode);//placeholder for the helptext
			this.pane = new ContentPane( {
				'class' : 'backgroundClass',
				'doLayout' : 'true',
				'style' : { 'overflow': 'auto', 'padding': '10px', 'margin': '0px'}
			},  domConstruct.create('div'));
			this.domNode.appendChild(this.pane.domNode);
		},
		postCreate: function(){
			this.inherited(arguments);
			this.pageHelpTextDiv.innerHTML = this.helpText;
		},
		resize: function(changeSize){
			this.inherited(arguments);
			var positionInfo = dojo.position(this.toolbarDivNode, true);
			changeSize.h -= positionInfo.h;
			this.pane.resize(changeSize);
		},
		_getForeignKeyAttr: function(){ 
			return this.foreignKey;
		},
		_setForeignKeyAttr: function(value){
			this.foreignKey = value;
			this.closeEditors();
			domConstruct.empty(this.pane.domNode);

			var _this = this;
			var viewId = this.viewId;
			when(this.store.get(value), function(item){
				_this.generateNextLevelContents(item, viewId, 1, []);
			});
		},
		generateNextLevelContents: function(item, viewId, headerLevel, paragraphNrArr){
			var _this = this;
			//Create an ordinary HTML page recursivly by obtaining data from the server
			var storedHeader = item[this.headerAttrId];
			var storedRtf = item[this.paragrphAttrId];

			//Header
			var paragraphStr = paragraphNrArr.length==0?'':paragraphNrArr.join('.');
			var headerNode = domConstruct.create('h'+headerLevel, null, this.pane.containerNode);
			if(headerLevel>1) domConstruct.create('span', { innerHTML: paragraphStr, style: { 'margin-right':'30px'}}, headerNode);
			domConstruct.create('span', { 
				innerHTML: storedHeader,
				objectId: item.id,
				onclick: function(evt){
					if(_this.editMode) {
						_this.closeEditors();
						_this.replaceHeaderWithEditor(evt.currentTarget);
					}
				}
			}, headerNode);
			
			
			//Illustration
			if(item.id=="846/1213"){
				var widgetDomNode = domConstruct.create('div', {
					class: 'floatright',
					objectId: item.id
				}, this.pane.containerNode);
				
				_this.addWidget(widgetDomNode);

				domConstruct.create('p', {
					innerHTML: '<b>Page Model</b> example', 
				}, widgetDomNode);
			}
			
			//IFrame
			if(item.id=="846/1510"){
				var widgetDomNode = domConstruct.create('div', {
					style: {width:'300px'},
					class: 'floatright',
					objectId: item.id
				}, this.pane.containerNode);				
				
				var wrapper = domConstruct.create('div', {
					style: {width:'300px', height:'200px', overflow: 'hidden'},
				}, widgetDomNode);
				domConstruct.create('iframe', {
					sandbox:'allow-scripts allow-same-origin',
					src:'http://neuralquest.org'
				}, wrapper);
				domConstruct.create('p', {
					innerHTML: '<b>Iframe</b> example', 
				}, widgetDomNode);
			}
			
			
			//ToDo
			domConstruct.create('div', {
				innerHTML: '<p><b>ToDo:</b> Elaborate</p>', 
				class: 'todofloatright',
				objectId: item.id,
				onclick: function(evt){
					if(_this.editMode) {
						_this.closeEditors();
						_this.replaceParagraphWithEditor(evt.currentTarget);
					}
				}
			}, this.pane.containerNode);

			
			//Paragraph
			domConstruct.create('div', {
				innerHTML: storedRtf, 
				objectId: item.id,
				onclick: function(evt){
					if(_this.editMode) {
						_this.closeEditors();
						_this.replaceParagraphWithEditor(evt.currentTarget);
					}
				}
			}, this.pane.containerNode);
			// cant get this to work
			//on(par, 'çlick', function(evt){alert(evt);});

			if(item.classId==80) return; //folder
			
			//Get the sub- headers/paragraphs
			when(this.store.getChildren(item, [846]), lang.hitch(this, function(children){
				for(var i=0;i<children.length;i++){
					var childItem = children[i];
					paragraphNrArr[headerLevel-1] = i+1;
					this.generateNextLevelContents(childItem, viewId, headerLevel+1, paragraphNrArr);
				}
			}));
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
			    'style':{width:'90%','background': 'rgba(0,0,255,0.04)', 'border-style': 'none'},
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
			var storedRtf = item[this.paragrphAttrId];
			// Create toolbar and place it at the top of the page
			var toolbar = new Toolbar();
			this.toolbarDivNode.appendChild(toolbar.domNode);
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
						item[_this.paragrphAttrId] = editorDijit.get('value');
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
						if(_this.editMode) {
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
						if(_this.editMode) {
							_this.closeEditors();
							_this.replaceParagraphWithEditor(evt.currentTarget);
						}
					}
				}, editor.domNode, 'replace');
				editor.destroy();
			});
		},
		addWidget: function(widgetDomNode){
			widget = new NqClassChart({
				store : this.store,
				XYAxisRootId: '844/78', // Process Classes
			}, domConstruct.create('div'));
			widgetDomNode.appendChild(widget.domNode);
			widget.startup().then(function(res){
				//widget.setForeignKey(state.ForeignKeyPreviousLevel);
			});

		},
		addIframe: function(widgetDomNode){
			domConstruct.create('iframe', {
				src:'http://neuralquest.org'
			}, widgetDomNode);
		}
	});
});
