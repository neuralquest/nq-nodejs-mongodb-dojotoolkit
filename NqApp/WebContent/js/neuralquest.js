require([
'dojo/_base/array', 'dojo/dom-style', 'dojo/_base/fx', 'dojo/ready', 'dojo/topic', "dojo/on", 'dojo/hash', 'dijit/registry', 
'dojo/dom', 'dojo', 'dojo/_base/lang', 'dojo/_base/declare','dojo/_base/array', 'dojo/dom-construct', 
'dojo/_base/declare', 'dojo/store/Observable', 'dojo/store/Cache', 'dojo/store/JsonRest', 'dojo/store/Memory',
'dijit/tree/dndSource', 'dojo/Deferred', 'dojo/when', 'dojo/query', 'dijit/layout/BorderContainer', 
'dijit/layout/TabContainer', 'dijit/layout/ContentPane', 'dijit/layout/AccordionContainer', "dojo/cookie", 
'nq/nqProcessChart', 'nq/nqClassChart', 'nq/nqForm', 'nq/nqTable', 'nq/nqJsonRest', 'nq/nqTree', 'nq/nqObjectStoreModel', 'nq/nqDocument', 'nq/nqCache',
"dojo/Deferred", 'dojo/promise/instrumentation', 'dojox/html/styles', 'dojo/query!css2'], 
function(arrayUtil, domStyle, fx, ready, topic, on, hash, registry,
		dom, dojo, lang, declare, array, domConstruct,
		declare, Observable, Cache, JsonRest, Memory, 
		dndSource, Deferred, when, query, BorderContainer, 
		TabContainer, ContentPane, AccordionContainer, cookie, 
		nqProcessChart, nqClassChart, nqForm, nqTable, nqJsonRest, nqTree, nqObjectStoreModel, nqDocument, nqCache,
		Deferred, instrumentation, styles) {
	
	_nqMemoryStore = Observable(new Memory({}));
	_nqDataStore = new nqCache(new nqJsonRest({target:"data/"}), _nqMemoryStore);
	var _transaction = _nqDataStore.transaction();
	_nqSchemaMemoryStore = new Memory();
	_nqSchemaStore = Cache(new JsonRest({target:"schema/"}), _nqSchemaMemoryStore);
	/*
*/
	//////////////////////////////////////////////////////////////////////////////
	// Initialize
	//////////////////////////////////////////////////////////////////////////////
	ready( function() {
		fx.fadeOut({node: 'loadingOverlay',	onEnd: function(node){domStyle.set(node, 'display', 'none');}}).play();
		topic.subscribe("/dojo/hashchange", interpritHash);
		on(registry.byId('cancelButtonId'), 'click', function(event){_transaction.abort();});
		on(registry.byId('saveButtonId'), 'click', function(event){_transaction.commit();});
		on(registry.byId('helpButtonId'), 'change', function(val){
			dojox.html.insertCssRule('.helpTextInvisable', 'display:'+val?"block":"none"+';', 'nq.css');
		});


		//Load the schema in its entirety 
		var viewId = getState(0).viewId;
		if(!viewId) viewId = 842;
		var query = _nqSchemaStore.query({viewId: viewId});
		when(query, function(objects){
//			fx.fadeOut({node: 'loadingOverlay',	onEnd: function(node){domStyle.set(node, 'display', 'none');}}).play();
			if(hash() == "") {
				var neuralquestState = cookie('neuralquestState');
				if(neuralquestState) hash(neuralquestState, true);
				else hash("842.1784.824.846.1866", true);
			}
			else interpritHash();
		});
	});
	//////////////////////////////////////////////////////////////////////////////
	// Interprit the Hash Change
	//////////////////////////////////////////////////////////////////////////////
	function interpritHash(hash, lvl){
		var level = lvl?lvl:0;
		var state = getState(level);
		if(!state.viewId) return true;
		var PAGE_MODEL_VIEWS_ID = 538;
		var ACCORTAB_ATTR_ID = 2149;
		var ACCORDION_ID = 1777;
		var WIDGETS_VIEW_ID = 2378;
		var parentViewPane = null;
		if(!state.viewIdPreviousLevel) parentViewPane = registry.byId('placeholder');
		else parentViewPane = registry.byId('slave'+state.viewIdPreviousLevel);
		return when(_nqDataStore.get(PAGE_MODEL_VIEWS_ID+'/'+state.viewId), function(viewObj){
			var viewPanePaneCreated = null;
			if(viewObj[ACCORTAB_ATTR_ID]==ACCORDION_ID) viewPanePaneCreated = createAccordionInBorderContainer(parentViewPane, viewObj, state.tabId, level);
			else viewPanePaneCreated = createTabs(parentViewPane, viewObj, state.tabId, level);
			return when((viewPanePaneCreated), function(selectedTabObj){//returns the selected tab!
				parentViewPane.resize();//this is a must
				//when(createNqWidget(selectedTabObj, level), function(widgets){
					when(_nqDataStore.getChildren(selectedTabObj, [WIDGETS_VIEW_ID]), function(widgets){
						for(var i=0;i<widgets.length;i++){
							var widgetObj = widgets[i];
							when(createNqWidget(widgetObj, selectedTabObj, viewObj, level), function(widget){
								widget.set('selectedObjIdPreviousLevel', state.selectedObjectIdPreviousLevel);
								return widget;
							}, errorDialog);
						}
						return widgets;
					}, errorDialog);
				//}, errorDialog);
				//We do not have to wait for the widgets to be completed. Instead we can continue with a recurssive call to interpritHash
				return when(interpritHash(hash, level+1), function(result){
					return result;
				}, errorDialog);
			}, errorDialog);
		}, errorDialog);
	}	
	//////////////////////////////////////////////////////////////////////////////
	// Add an accordion container in a border container
	//////////////////////////////////////////////////////////////////////////////
	function createAccordionInBorderContainer(parentContentPane, viewObj, selectedTabId, level){
		var ACCORTAB_VIEW_ID = 1802;
		return when(_nqDataStore.getChildren(viewObj, [ACCORTAB_VIEW_ID]), function(tabs){
			var selectedTabObj = tabs[0];
			// if the border container already exists we can simply return the tabs
			if(registry.byId('borderContainer'+viewObj.id.split('/')[1])) {
				for(var i=0;i<tabs.length;i++){
					var tt = tabs[i];
					var ttId = tt.id.split('/')[1];
					if(ttId == selectedTabId) selectedTabObj=tt; 
				}
				return selectedTabObj;
			}
			// We're filling a slave, clean it first. It may have been used by another view before
			arrayUtil.forEach(parentContentPane.getChildren(), function(childWidget){
				if(childWidget.destroyRecursive) childWidget.destroyRecursive();
			});
					
			var design = 'sidebar';//obtain horizontal, vertical, none from viewDef?
			var borderContainer = new BorderContainer( {
				'id' : 'borderContainer'+viewObj.id.split('/')[1],
				'region' : 'center',
				'design' : design,
				'persist' : true,
				//'class': 'noOverFlow'
				'style' : {width: '100%', height: '100%', overflow: 'hidden', padding: '0px', margin: '0px'}
			});
			var leftPane = new ContentPane( {
				'id' : 'master'+viewObj.id.split('/')[1],
				'region' : 'leading',
				'class' : 'backgroundClass',
				'splitter' : true,
				//'class': 'noOverFlow',
				'style' : {width: '200px',overflow: 'hidden',padding: '0px', margin: '0px'}
			});
			var centerPane = new ContentPane( {
				'id' : 'slave'+viewObj.id.split('/')[1],
				'region' : 'center',
				'class' : 'backgroundClass',
				//'content' : '<p>Loading...</p>',
				//'class': 'noOverFlow'
				'style' : {overflow: 'hidden',padding: '0px', margin: '0px'}
			});
			borderContainer.addChild(leftPane);
			borderContainer.addChild(centerPane);
			parentContentPane.containerNode.appendChild(borderContainer.domNode); //appendChild works better than attaching through create
			//createviewPanePane(leftPane, 0, viewObj.id);
			//createviewPanePane(centerPane, level+1);
		
			var accordianContainer;
			if(tabs.length==1){// this is really only to have palce to store viewPane+viewObj.id. Is there a better way?
				accordianContainer = new ContentPane( {
					'id' : 'viewPane'+viewObj.id.split('/')[1],
					'region' : 'center',
//					'style' : {width: '100%',height: '100%',overflow: 'hidden',padding: '0px', margin: '0px'}
				});
			}
			else {
				accordianContainer = new AccordionContainer( {
					'id' : 'viewPane'+viewObj.id.split('/')[1],
					'region' : 'center',
					'duration' : 0,//animation screws out layout. Is there a better solution?
					//'persist' : true,//cookies override our hash tabId
					'class': 'noOverFlow'
//					'style' : {width: '100%',height: '100%',overflow: 'hidden',padding: '0px', margin: '0px'}
				});
			}
			leftPane.addChild(accordianContainer);
			var TAB_TITLE_ATTR = 1803;
			for(var i=0;i<tabs.length;i++){
				var tab = tabs[i];
				var tabId = tab.id.split('/')[1];
				if(tabId==selectedTabId) selectedTabObj = tab;//use this one for the return value.
				var tabPane = new ContentPane( {
					'id' : 'tab'+tabId,
//					'viewPane': viewObj.id,
					'title' : tab[TAB_TITLE_ATTR],
					'selected' : tabId==selectedTabId?true:false,
					'class' : 'backgroundClass'
				});
				accordianContainer.addChild(tabPane);
				//when we create a tab we can know if we have to create a border container in it. 
				/*
				var childTabsArr = _nqSchemaMemoryStore.query({parentViewId: tab.id, entity: 'tab'});//get the tabs
				if(childTabsArr.length>0){
					if(tab.containerType == 'Accordion') createAccordionInBorderContainer(tabPane, tab.id, selectedTabId, level);
					else createTabs(tabPane, tab.id, selectedTabId, level);
				}*/
				accordianContainer.watch("selectedChildWidget", function(name, oval, nval){
				    //console.log("selected child changed from ", oval.title, " to ", nval.title);
				    var tabId = (nval.id).substring(3);//why is this called so offten? probably cant hurt
				    setHashTabId(level, tabId, viewObj.id.split('/')[1]); // this will trigger createNqWidget
				});
			}
			borderContainer.startup();
			return selectedTabObj;
		}, errorDialog);
	}
	//////////////////////////////////////////////////////////////////////////////
	// Add a tab container
	//////////////////////////////////////////////////////////////////////////////
	function createTabs(patentPane, viewObj, selectedTabId, level){
		var ACCORTAB_VIEW_ID = 1802;
		return when(_nqDataStore.getChildren(viewObj, [ACCORTAB_VIEW_ID]), function(tabs){
			var selectedTabObj = tabs[0];//use this one for the return value.
			// if the ContentPane already exists we can simply return the tabs
			if(registry.byId('viewPane'+viewObj.id.split('/')[1])) {
				for(var i=0;i<tabs.length;i++){
					var tt = tabs[i];
					var ttId = tt.id.split('/')[1];
					if(ttId == selectedTabId) selectedTabObj=tt; 
				}
				return selectedTabObj;
			}
			// We're filling a slave, clean it first. It may have been used by another view before
			arrayUtil.forEach(patentPane.getChildren(), function(childWidget){
				if(childWidget.destroyRecursive) childWidget.destroyRecursive();
			});

			var container;
			if(tabs.length==1){// this is really only to have palce to store viewPane+viewId. Is there a better way?
				container = new ContentPane( {
					'id' : 'viewPane'+viewObj.id.split('/')[1],
					'region' : 'center'
				});
			}
			else {
				container = new TabContainer( {
					'id' : 'viewPane'+viewObj.id.split('/')[1],
					//'persist' : true,//cookies override our hash tabId
					'region' : 'center'
				});
			}
			var TAB_TITLE_ATTR = 1803;
			for(var i=0;i<tabs.length;i++){
				var tab = tabs[i];
				var tabId = tab.id.split('/')[1];
				if(tabId==selectedTabId) selectedTabObj = tab;//use this one for the return value.
				var tabPane = new ContentPane( {
					'id' : 'tab'+tabId,
	//				'viewPane': viewObj.id,
					'title' : tab[TAB_TITLE_ATTR],
					'selected' : tabId==selectedTabId?true:false,
					'class' : 'backgroundClass',
					'style' : {overflow: 'hidden', padding: '0px', margin: '0px', width: '100%', height: '100%'}
				});
				container.addChild(tabPane);
				container.watch("selectedChildWidget", function(name, oval, nval){
				    //console.log("selected child changed from ", oval.title, " to ", nval.title);
				    var tabId = (nval.id).substring(3);//why is this called so offten? probably cant hurt
				    setHashTabId(level, tabId, viewObj.id.split('/')[1]); // this will trigger createNqWidget
				});
				//when we create a tab we can know if we have to create a border container in it. 
				/*
				var childTabsArr = _nqSchemaMemoryStore.query({parentViewId: tab.id, entity: 'tab'});//get the tabs
				if(childTabsArr.length>0){
					if(tab.displayType = 'Sub Accordion'){
						createAccordionInBorderContainer(tabPane, tab.id, selectedTabId, level);
					}
					else createTabs(tabPane, tab.id, selectedTabId, level);
				}*/
			};
			patentPane.addChild(container);
			container.startup();
			if(tabs.length>1) container.resize();
			
			return selectedTabObj;
		}, errorDialog);
	}	
	//////////////////////////////////////////////////////////////////////////////
	// Add the Widget to the Tap Pane and Provide Data For It
	//////////////////////////////////////////////////////////////////////////////
	function createNqWidget(widgetObj, tabObj, viewObj, level){
		var createDeferred = new Deferred();
//console.log('widgetObh', widgetObj);		
		var DISPLAYTYPE_ATTR = 745;
		var ROOT_ATTR = 1804;
		var DOCUMENT_DISPTYPE_ID = 1865;
		var FORM_DISPTYPE_ID = 1821;
		var TABLE_DISPTYPE_ID = 1780;
		var TREE_DISPTYPE_ID = 1779;
		var PROCESS_MODEL_DISPTYPE_ID = 1924;
		var CLASS_MODEL_DISPTYPE_ID = 1782;

		var widgetId = widgetObj.id.split('/')[1];
		var tabId = tabObj.id.split('/')[1];
		var viewId = viewObj.id.split('/')[1];
		
		var state = getState(level);
//		if(!state.tabId) return;
		var tabNode = dom.byId('tab'+tabId);

		// if the widget already exists we can simply return widgets
		var widget = registry.byId('nqWidget'+widgetId);
		
//		var disp = widgetObj[DISPLAYTYPE_ATTR];
		if(widget) return widget;

//		var viewDef = _nqSchemaMemoryStore.get(viewId);
//		var widgetId = widgetObj.id.split('/')[1];
//		var widgetDef = _nqSchemaMemoryStore.get(widgetId);
		viewsArr = _nqSchemaMemoryStore.query({parentWidgetId: widgetId, entity: 'view'});//get the views that belong to this wdiget	
		var viewIdsArr = [];
		for(var i=0;i<viewsArr.length;i++){
			viewIdsArr.push(viewsArr[i].id);
		}


		switch(widgetObj[DISPLAYTYPE_ATTR]){
		case DOCUMENT_DISPTYPE_ID:
			widget = new nqDocument({
				id: 'nqWidget'+widgetId,
				store: _nqDataStore,
				createDeferred: createDeferred, //tell us when your done by returning the widget
				//widgetObj: widgetObj,
				//viewObj: viewObj,
				tabId: tabId // used by resize
			}, domConstruct.create('div'));
			tabNode.appendChild(widget.domNode);
			break;	
		/*case DOCUMENT_DISPTYPE_ID: 
			if(widget) widget.set('parentId', state.selectedObjectIdPreviousLevel);
			else {
				widget = new nqDocument({
					id: 'nqWidget'+widgetId,
					store: _nqDataStore,
					createDeferred: createDeferred, //tell us when your done by returning the widget
					//widgetObj: widgetObj,
					//viewObj: viewObj,
					tabId: tabId // used by resize
				}, domConstruct.create('div'));
				tabNode.appendChild(widget.domNode);
				//widget.startup();
				widget.set('parentId', state.selectedObjectIdPreviousLevel);
			}
			break;	*/
		case FORM_DISPTYPE_ID: 
			widget = new nqForm({
				id: 'nqWidget'+widgetId,
				store: _nqDataStore,
				createDeferred: createDeferred, //tell us when your done by returning the widget
				//widgetObj: widgetObj,
				viewObj: viewObj,
				//viewDef: viewDef
			}, domConstruct.create('div'));
			tabNode.appendChild(widget.domNode);
			break;	
		case TABLE_DISPTYPE_ID:
			widget = new nqTable({
				id: 'nqWidget'+widgetId,
				store: _nqDataStore,
				createDeferred: createDeferred, //tell us when your done by returning the widget
				widgetObj: widgetObj,
				//viewObj: viewObj,
				viewIdsArr: viewIdsArr,
				selectedObjIdPreviousLevel: state.selectedObjectIdPreviousLevel,//dgrid needs an initial query
				//widgetDef: widgetDef,
				//viewDef: viewDef,
				viewsArr: viewsArr,
				level: level, // used by onClick
				tabId: tabId, // used by onClick
				query: query
			}, domConstruct.create('div'));
			tabNode.appendChild(widget.domNode);
			break;
		/*case TABLE_DISPTYPE_ID:
			var query = {parentId: state.selectedObjectIdPreviousLevel, joinViewAttributes: viewIdsArr};
			if(widget){
				var curQuery = widget.get("query");
				if(curQuery.parentId != state.selectedObjectIdPreviousLevel || curQuery.joinViewAttributes != viewIdsArr) widget.set("query", query);
			}
			else {
				widget = new nqTable({
					id: 'nqWidget'+widgetId,
					store: _nqDataStore,
					createDeferred: createDeferred, //tell us when your done by returning the widget
					widgetObj: widgetObj,
					viewObj: viewObj,
					viewIdsArr: viewIdsArr,
					widgetDef: widgetDef,
					viewDef: viewDef,
					viewsArr: viewsArr,
					level: level, // used by onClick
					tabId: tabId, // used by onClick
					query: query
				}, domConstruct.create('div'));
				tabNode.appendChild(widget.domNode);
				widget.startup();
			}
			break;*/
		case TREE_DISPTYPE_ID:
			widget = new nqTree({
				viewIdsArr: viewIdsArr,
				id: 'nqWidget'+widgetId,
				store: _nqDataStore,
				createDeferred: createDeferred, //tell us when your done by returning the widget
				widgetObj: widgetObj,
				viewObj: viewObj,
				level: level, // used by onClick
				tabId: tabId, // used by onClick
				parentId: widgetObj[ROOT_ATTR]
			}, domConstruct.create('div'));
			tabNode.appendChild(widget.domNode);
			break;	
		/*case TREE_DISPTYPE_ID:
			var query;
			if(widgetObj[ROOT_ATTR]) query = {'id': widgetObj[ROOT_ATTR]};
			else{
				var objId = state.selectedObjectIdPreviousLevel.split('/')[1];
				query = {id: viewsArr[0].id+'/'+objId};
			}
			if(widget){
				var curQuery = widget.model.query;
				if(curQuery.Id != query.Id) {
					widget.destroy();
					widget = null;
				}
			}
			if(!widget)	{
				var treeModel = new nqObjectStoreModel({
					childrenAttr: viewIdsArr,
					store : _nqDataStore,
					query : query
				});
				var widget = new nqTree({
					id: 'nqWidget'+widgetId,
					store: _nqDataStore,
					widgetObj: widgetObj,
					viewObj: viewObj,
					model: treeModel,
					dndController: dndSource,
					betweenThreshold: 5, 
					persist: 'true',
					viewsArr: viewsArr,
					level: level, // used by onClick
					tabId: tabId // used by onClick
				}, domConstruct.create('div'));
				
				widget.onLoadDeferred.then(function(){
					//fullPage.resize();
					widget.resize();//need this for lazy loaded trees
					var nextState = getState(level+1);
					if(state.selectedObjId == 824) widget.set('paths', [['846/810','846/2016','846/2020', '846/824']]);
					else if(state.selectedObjId && nextState.viewId) widget.set('selectedItem', nextState.viewId+'/'+state.selectedObjId);	
				});
				tabNode.appendChild(widget.domNode);
				widget.startup();
			}
			break;*/
		case PROCESS_MODEL_DISPTYPE_ID: 
			widget = new nqProcessChart({
				id: 'nqWidget'+widgetId,
				store: _nqDataStore,
				//widgetObj: widgetObj,
				createDeferred: createDeferred, //tell us when your done by returning the widget
				//viewObj: viewObj,
				tabId: tabId, // used by resize
				orgUnitRootId: '850/494', // Process Classes
				orgUnitViewId: '1868',
				orgUnitNameAttrId: '1926',
				stateRootId: '2077/443',
				stateViewId: '2077',
				stateNameAttrId: '2081'
				//skyboxArray: [ 'img/Neuralquest/space_3_right.jpg', 'img/Neuralquest/space_3_left.jpg', 'img/Neuralquest/space_3_top.jpg' ,'img/Neuralquest/space_3_bottom.jpg','img/Neuralquest/space_3_front.jpg','img/Neuralquest/space_3_back.jpg']
			}, domConstruct.create('div'));
			tabNode.appendChild(widget.domNode);
			widget.startup();
			break;
/*		case PROCESS_MODEL_DISPTYPE_ID: 
			if(!widget){
				widget = new nqProcessChart({
					id: 'nqWidget'+widgetId,
					store: _nqDataStore,
					widgetObj: widgetObj,
					createDeferred: createDeferred, //tell us when your done by returning the widget
					viewObj: viewObj,
					orgUnitRootId: '850/494', // Process Classes
					orgUnitViewId: '1868',
					orgUnitNameAttrId: '1926',
					stateRootId: '2077/443',
					stateViewId: '2077',
					stateNameAttrId: '2081'
					//skyboxArray: [ 'img/Neuralquest/space_3_right.jpg', 'img/Neuralquest/space_3_left.jpg', 'img/Neuralquest/space_3_top.jpg' ,'img/Neuralquest/space_3_bottom.jpg','img/Neuralquest/space_3_front.jpg','img/Neuralquest/space_3_back.jpg']
				}, domConstruct.create('div'));
				tabNode.appendChild(widget.domNode);
				widget.startup().then(function(res){
					widget.setSelectedObjectId(state.selectedObjectIdPreviousLevel);
				});
			}
			else widget.setSelectedObjectId(state.selectedObjectIdPreviousLevel);
			break;*/
		case CLASS_MODEL_DISPTYPE_ID: 
			widget = new nqClassChart({
				id: 'nqWidget'+widgetId,
				store: _nqDataStore,
				createDeferred: createDeferred, //tell us when your done by returning the widget
				//widgetObj: widgetObj,
				//viewObj: viewObj,
				tabId: tabId, // used by resize
				XYAxisRootId: '844/67', // Process Classes
				viewId: viewId,
				nameAttrId: 852,
				ZYAxisRootId: '844/53', //Attributes
				skyboxArray: [ 'img/Neuralquest/space_3_right.jpg', 'img/Neuralquest/space_3_left.jpg', 'img/Neuralquest/space_3_top.jpg' ,'img/Neuralquest/space_3_bottom.jpg','img/Neuralquest/space_3_front.jpg','img/Neuralquest/space_3_back.jpg']
			}, domConstruct.create('div'));
			tabNode.appendChild(widget.domNode);
			widget.startup();
			break;
/*		case CLASS_MODEL_DISPTYPE_ID: 
			if(!widget){
				widget = new nqClassChart({
					id: 'nqWidget'+widgetId,
					store: _nqDataStore,
					createDeferred: createDeferred, //tell us when your done by returning the widget
					widgetObj: widgetObj,
					viewObj: viewObj,
					XYAxisRootId: '844/67', // Process Classes
					viewId: viewId,
					nameAttrId: 852,
					ZYAxisRootId: '844/53', //Attributes
					skyboxArray: [ 'img/Neuralquest/space_3_right.jpg', 'img/Neuralquest/space_3_left.jpg', 'img/Neuralquest/space_3_top.jpg' ,'img/Neuralquest/space_3_bottom.jpg','img/Neuralquest/space_3_front.jpg','img/Neuralquest/space_3_back.jpg']
				}, domConstruct.create('div'));
				tabNode.appendChild(widget.domNode);
				widget.startup().then(function(res){
					widget.setSelectedObjectId(state.selectedObjectIdPreviousLevel);
				});
			}
			else widget.setSelectedObjectId(state.selectedObjectIdPreviousLevel);
			break;*/
		};
		return createDeferred.promise;
	}	
	//////////////////////////////////////////////////////////////////////////////
	//Helpers
	//////////////////////////////////////////////////////////////////////////////
	lang.setObject("nq.getState", getState);//make the function globally accessable
	function getState(level){
		var hashArr = hash().split('.');
		return {
			viewId: hashArr[level*3+0],
			tabId: hashArr[level*3+1],
			selectedObjId: hashArr[level*3+2],
			selectedObjectIdPreviousLevel: hashArr[level*3+0]+'/'+hashArr[level*3-1],
			viewIdPreviousLevel: hashArr[level*3-3]
		};
	}
	function setHashTabId(level, tabId, viewId){
		var hashArr = hash().split('.');
		if(hashArr[level*3+1] == tabId) return;//same
		cookie('viewPane'+viewId+'_selectedChild', tabId);//set the cookie
		
		hashArr[level*3+1] = tabId;
		
		var viewsArr = _nqSchemaMemoryStore.query({parentTabId: tabId, entity: 'view'});//get the views		 
		if(viewsArr.length>0) hashArr[(level+1)*3+0] = viewsArr[0].id;
		else hashArr = hashArr.slice(0,level*3+2);

		//remove anything following this tab in the hash since it is nolonger valid
		hashArr = hashArr.slice(0,level*3+2);
		var newHash = hashArr.join('.');
		//newHash = newHash.replace(/,/g,'.');
		hash(newHash, true);// update history, instead of adding a new record			
	}
	lang.setObject("nq.setHashViewId", setHashViewId);//make the function globally accessable
	function setHashViewId(level, viewId, tabId, selectedObjId){
		//var tabPane = registry.byId('tab'+tabId);
		//document.title = 'NQ - '+(tabPane?tabPane.title+' - ':'')+this.getLabel(item);

		
		var hashArr = hash().split('.');
		hashArr[level*3+1] = tabId;//it may have changed
		hashArr[level*3+2] = selectedObjId;//it will have changed
		if(hashArr[(level+1)*3+0] != viewId){//if its changed
			//remove anything following this level in the hash since it is nolonger valid
			hashArr = hashArr.slice(0,(level+1)*3+0);
			
			hashArr[(level+1)*3+0] = viewId;
			
			//if there is a cookie for this acctab, use if to set the hash tabId (we can prevent unnessasary interperitHash())//FIXME remove set tabId
			/*var cookieValue = cookie('viewPane'+viewId+'_selectedChild');
			if(cookieValue) hashArr[(level+1)*3+1] = cookieValue.substr(3);
			else{//find the first tab and use it
				var tabsArr = _nqSchemaMemoryStore.query({parentViewId: viewId, entity: 'tab'});//get the tabs		 
				if(tabsArr.length>0) hashArr[(level+1)*3+1] = tabsArr[0].id;
			}
			var tabsArr = _nqSchemaMemoryStore.query({parentViewId: viewId, entity: 'tab'});//get the tabs		 
			if(tabsArr.length>0) hashArr[(level+1)*3+1] = tabsArr[0].id;*/
		}

		var newHash = hashArr.join('.');
		cookie('neuralquestState', newHash);
		hash(newHash);			
	}
	lang.setObject("nq.errorDialog", errorDialog);//make the function globally accessable
	function errorDialog(err){
		new dijit.Dialog({
			title: "Interprit Hash Error", 
			extractContent: true, 
			content: err.responseText?err.responseText:err.message
		}).show();
		console.error(err); 
	};
});
