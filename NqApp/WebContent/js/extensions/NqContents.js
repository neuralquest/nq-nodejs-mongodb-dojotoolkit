define(['dojo/_base/declare', 'dojo/dom-construct', 'dojo/when', 'dojo/_base/array', 'dijit/registry', 'dijit/layout/ContentPane', 
        'dijit/Toolbar', 'dijit/form/ValidationTextBox', 'dijit/Editor', "dijit/_WidgetBase", "dojo/on", "dojo/dom-geometry", 
        "dojo/sniff", "dijit/form/Button", "dojo/_base/lang",
        
        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins', 
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
	function(declare, domConstruct, when, arrayUtil, registry, ContentPane, 
			Toolbar, ValidationTextBox, Editor, _WidgetBase, on, domGeometry, 
			has, Button, lang){

	return declare("NqContentWidget", [_WidgetBase], {
		extraPlugins: {},
		state: {},
		editMode: false,
		objectId: null,
		headerAttrId: 873,
		paragrphAttrId: 959,
		normalToolbar: null,
		
		buildRendering: function(){
			this.inherited(arguments);
			this.domNode = domConstruct.create("div");
			this.toolbarDivNode = domConstruct.create('div', {},this.domNode);//placeholder for the toolbars
			// Create toolbar and place it at the top of the page
			this.normalToolbar = new Toolbar({});
			var button1 = new Button({
				label: 'Edit',
				iconClass: 'editIcon',
				onClick: lang.hitch(this, function(){
					this.editMode = true;
					this.setSelectedObjectId();
					this.startup();
				})
			});
			this.normalToolbar.addChild(button1);
			var button2 = new Button({
				label: 'Annotations',
				iconClass: 'annoIcon'				
			});
			this.normalToolbar.addChild(button2);
			var button3 = new Button({
				label: 'Rules',
				iconClass: 'rulesIcon'				
			});
			this.normalToolbar.addChild(button3);
			var button4 = new Button({
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
			var tabDef = _nqSchemaMemoryStore.get(this.state.tabId);
			this.pageHelpTextDiv.innerHTML = tabDef.description;
		},
		startup: function(){
			arrayUtil.forEach(this.pane.getChildren(), function(widget){
				if(widget.startup) widget.startup();
			});
			this.resize();
		},
		resize: function(changeSize){
			this.inherited(arguments);
			var positionInfo = dojo.position(this.domNode.parentNode, true);
			this.pane.resize(changeSize);
		},
		setSelectedObjectId: function(objectId){
			if(objectId) this.objectId = objectId;
			if(this.editMode) this.normalToolbar.set('style', {'display': 'none'});
			else this.normalToolbar.set('style', {'display': ''});
			this.wipeClean();
			var viewId = this.state.viewId;
			when(this.store.get(this.objectId), lang.hitch(this, function(item){
				if(this.editMode) this.generateNextLevelContentsEditMode(item, viewId, 1, []);
				else this.generateNextLevelContents(item, viewId, 1, []);
			}));
		},
		destroy: function(){
			arrayUtil.forEach(this.pane.getChildren(), function(widget){
				if(widget.destroyRecursive) widget.destroyRecursive();
			});
			//domConstruct.empty(this.pane.domNode);
			this.inherited(arguments);
		},
		wipeClean: function(){
			arrayUtil.forEach(this.pane.getChildren(), function(widget){
				if(widget.destroyRecursive) widget.destroyRecursive();
			});	
			domConstruct.empty(this.pane.domNode);
		},
		generateNextLevelContents: function(item, viewId, headerLevel, paragraphNrArr){
			//Create an ordinary HTML page recursivly by obtaining data from the server
			var storedHeader = item[this.headerAttrId];
			var storedRtf = item[this.paragrphAttrId];

			//Header
			var paragraphStr = paragraphNrArr.length==0?'':paragraphNrArr.join('.')+' ';
			var headerNode = domConstruct.create('h'+headerLevel, null, this.pane.containerNode);
			if(headerLevel>1) domConstruct.create('span', { innerHTML: paragraphStr, style: { display:'inline-block','min-width':'3em' }}, headerNode);
			if(storedHeader) domConstruct.create('span', { innerHTML: storedHeader}, headerNode);

			//Paragraph
			if(storedRtf) domConstruct.create('div', {innerHTML: storedRtf}, this.pane.containerNode);
			//if(storedRtf) domConstruct.place(storedRtf, node);

			if(item.classId==80) return;
			
			//Get the sub- headers/paragraphs
			when(this.store.getChildren(item, [846]), lang.hitch(this, function(children){
				for(var i=0;i<children.length;i++){
					var childItem = children[i];
					paragraphNrArr[headerLevel-1] = i+1;
					this.generateNextLevelContents(childItem, viewId, headerLevel+1, paragraphNrArr);
				}
				//fullPage.resize();//doesn't help
			}));

		},
		generateNextLevelContentsEditMode: function(item, viewId, headerLevel, paragraphNrArr){
			//Create an Editable HTML page recursivly by obtaining data from the server
			var storedHeader = item[this.headerAttrId];
			var storedRtf = item[this.paragrphAttrId];
			
			//Header
			var paragraphStr = paragraphNrArr.length==0?'':paragraphNrArr.join('.')+' ';
			var headerNode = domConstruct.create('h'+headerLevel, null, this.pane.containerNode);
			//var paragraphNode = domConstruct.create('div', { innerHTML: '<div>'+paragraphStr+'</div>', style: { float: 'left', width:'5%' }}, headerNode);
			if(headerLevel>1) domConstruct.create('span', { innerHTML: paragraphStr, style: { display:'inline-block','min-width':'3em' }}, headerNode);
			var textDijit = new ValidationTextBox({
			    'type': 'text',
			    'trim': true,
			    'value': storedHeader,
			    //'style':{ 'width':'90%', 'background': 'rgba(0,0,255,0.04)', 'border-style': 'none'},
			    'style':{width:'90%','background': 'rgba(0,0,255,0.04)', 'border-style': 'none'},
				'placeHolder': 'Paragraph Header',
				'onChange': function(evt){
					when(this.store.get(item.id), function(item){
						item[873] = textDijit.get('value');
						this.store.put(item);
					});
			    }
			}, domConstruct.create('input'));
			headerNode.appendChild(textDijit.domNode);
			//textDijit.startup();
			// Create toolbar and place it at the top of the page
			var toolbar = new Toolbar({
				//ownerDocument: this.ownerDocument,
				//dir: this.dir,
				//lang: this.lang
				'style': {'display': paragraphNrArr.length==0?'':'none'}
			});
			var button1 = new Button({
				label: 'Close',
				//iconClass: 'editIcon',
				onClick: lang.hitch(this, function(){
					this.editMode = false;
					this.setSelectedObjectId();
				})
			});
			toolbar.addChild(button1);
			this.toolbarDivNode.appendChild(toolbar.domNode);
			//Paragraph
			var editorDijit = new Editor({
				'height': '', //auto grow
//			    'minHeight': '30px',
			    'extraPlugins': this.extraPlugins,
//			    'value': storedRtf,
				'toolbar': toolbar,
				'onChange': function(evt){
					when(this.store.get(item.id), function(item){
						item[959] = editorDijit.get('value');
						this.store.put(item);
				});},
				'onFocus': function(evt){
					var widgets = registry.findWidgets(this.toolbarDivNode);
					arrayUtil.forEach(widgets, function(tb) {
						tb.set('style', {'display': 'none'});
					});
					toolbar.set('style', {'display': ''});
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
			editorDijit.set('value', storedRtf);
			this.pane.containerNode.appendChild(editorDijit.domNode);

//			editorDijit.startup();
			if(item.classId==80) return;

			//Get the sub- headers/paragraphs
			return when(this.store.getChildren(item, [846]), lang.hitch(this, function(children){
				for(var i=0;i<children.length;i++){
					var childItem = children[i];
					paragraphNrArr[headerLevel-1] = i+1;
					this.generateNextLevelContentsEditMode(childItem, viewId, headerLevel+1, paragraphNrArr);
				}
			}));
		
		}
	});
});
