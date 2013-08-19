define(['dojo/_base/declare', 'dojo/dom-construct', 'dojo/when', 'dojo/_base/array', 'dijit/registry', 'dijit/layout/ContentPane', 
        'dijit/Toolbar', 'dijit/form/ValidationTextBox', 'dijit/Editor', "dijit/_WidgetBase", "dojo/on", "dojo/dom-geometry", "dojo/sniff", "dijit/form/Button",
        
        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins', 
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
	function(declare, domConstruct, when, arrayUtil, registry, ContentPane, 
			Toolbar, ValidationTextBox, Editor, _WidgetBase, on, domGeometry, has, Button){

	var ContentWidget = declare("NqContentWidget", [_WidgetBase], {
		extraPlugins: {},
		state: {},
		editMode: false,
		objectId: null,
		
		buildRendering: function(){
			this.inherited(arguments);
			this.domNode = domConstruct.create("div");
			this.toolbarDivNode = domConstruct.create('div', {},this.domNode);//placeholder for the toolbars
			// Create toolbar and place it at the top of the page
			var _this = this;
			var toolbar = new Toolbar({});
			var button1 = new Button({
				label: 'Edit',
				iconClass: 'editIcon',
				onClick: function(){
					_this.editMode = true;
					_this.setSelectedObjectId();
				}
			});
			toolbar.addChild(button1);
			var button2 = new Button({
				label: 'Annotations',
				iconClass: 'annoIcon'				
			});
			toolbar.addChild(button2);
			var button3 = new Button({
				label: 'Rules',
				iconClass: 'rulesIcon'				
			});
			toolbar.addChild(button3);
			var button4 = new Button({
				label: 'ToDo',
				iconClass: 'todoIcon'				
			});
			toolbar.addChild(button4);
			this.toolbarDivNode.appendChild(toolbar.domNode);
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
//			if(this.editMode) this.toolbar.set('style', {'display': ''});
			this.wipeClean();
			var viewId = this.state.viewId;
			var _this = this;
			var toolbarDivNode = this.toolbarDivNode;
			var containerNode = this.pane.containerNode;
			var extraPlugins = this.extraPlugins;
			when(_nqDataStore.get(this.objectId), function(item){
				if(_this.editMode) when(generateNextLevelContentsEditMode(containerNode, item, viewId, 1, [], toolbarDivNode, extraPlugins), function(item){
					//_this.startup();
				});
				else generateNextLevelContents(containerNode, item, viewId, 1, []);
//				_this.startup();
			});
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
		}
	});


	function generateNextLevelContents(node, item, viewId, headerLevel, paragraphNrArr){
		//Create an ordinary HTML page recursivly by obtaining data from the server
		var storedHeader = item[873];
		var storedRtf = item[959];

		//Header
		var paragraphStr = paragraphNrArr.length==0?'':paragraphNrArr.join('.')+' ';
		var headerNode = domConstruct.create('h'+headerLevel, null, node);
		if(headerLevel>1) domConstruct.create('span', { innerHTML: paragraphStr, style: { display:'inline-block','min-width':'3em' }}, headerNode);
		if(storedHeader) domConstruct.create('span', { innerHTML: storedHeader}, headerNode);

		//Paragraph
		if(storedRtf) domConstruct.create('div', {innerHTML: storedRtf}, node);
		//if(storedRtf) domConstruct.place(storedRtf, node);

		if(item.classId==80) return;
		
		//Get the sub- headers/paragraphs
		when(_nqDataStore.getChildren(item, [846]), function(children){
			for(var i=0;i<children.length;i++){
				var childItem = children[i];
				paragraphNrArr[headerLevel-1] = i+1;
				generateNextLevelContents(node, childItem, viewId, headerLevel+1, paragraphNrArr);
			}
			//fullPage.resize();//doesn't help
		});

	}
	function generateNextLevelContentsEditMode(node, item, viewId, headerLevel, paragraphNrArr, toolbarDivNode, extraPlugins){
		//Create an Editable HTML page recursivly by obtaining data from the server
		var storedHeader = item[873];
		var storedRtf = item[959];
		
		//Header
		var paragraphStr = paragraphNrArr.length==0?'':paragraphNrArr.join('.')+' ';
		var headerNode = domConstruct.create('h'+headerLevel, null, node);
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
				when(_nqDataStore.get(item.id), function(item){
					item[873] = textDijit.get('value');
					_nqDataStore.put(item);
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
			onClick: function(){
				_this.editMode = false;
				_this.setSelectedObjectId();
			}
		});
		toolbar.addChild(button1);
		toolbarDivNode.appendChild(toolbar.domNode);
		//Paragraph
		var editorDijit = new Editor({
			'height': '', //auto grow
//		    'minHeight': '30px',
		    'extraPlugins': extraPlugins,
//		    'value': storedRtf,
			'toolbar': toolbar,
			'onChange': function(evt){
				when(_nqDataStore.get(item.id), function(item){
					item[959] = editorDijit.get('value');
					_nqDataStore.put(item);
			});},
			'onFocus': function(evt){
				var widgets = registry.findWidgets(toolbarDivNode);
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
		node.appendChild(editorDijit.domNode);

//		editorDijit.startup();
		if(item.classId==80) return;

		//Get the sub- headers/paragraphs
		return when(_nqDataStore.getChildren(item, [846]), function(children){
			for(var i=0;i<children.length;i++){
				var childItem = children[i];
				paragraphNrArr[headerLevel-1] = i+1;
				generateNextLevelContentsEditMode(node, childItem, viewId, headerLevel+1, paragraphNrArr, toolbarDivNode);
			}
		});
	
	};
	return ContentWidget;
});
