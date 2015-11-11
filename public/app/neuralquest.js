require([
'dojo/_base/array', 'dojo/dom-style', 'dojo/_base/fx', 'dojo/ready', 'dojo/topic', "dojo/on", 'dojo/hash', 'dijit/registry', 
'dojo/dom', 'dojo', 'dojo/_base/lang', 'dojo/_base/declare','dojo/_base/array', 'dojo/dom-construct',
'dojo/Deferred', 'dojo/when', "dojo/promise/all", 'dojo/query', 'dijit/layout/BorderContainer',
'dijit/layout/TabContainer', 'dijit/layout/ContentPane', 'dijit/layout/AccordionContainer', "dojo/cookie", "dojo/request",
'app/nqStore', 'dstore/RequestMemory', 'app/nqProcessChart', 'app/nqClassChart', 'app/nqForm', 'app/nqTable', 'app/nqTree','app/nqDocument',
"dojo/json","dijit/Dialog","dijit/form/Form","dijit/form/TextBox","dijit/form/Button","dojo/dom-attr",'dojox/html/styles', 'dojo/query!css2'],
function(arrayUtil, domStyle, fx, ready, topic, on, hash, registry,
		dom, dojo, lang, declare, array, domConstruct,
		Deferred, when, all, query, BorderContainer,
		TabContainer, ContentPane, AccordionContainer, cookie, request,
		nqStore, RequestMemory, nqProcessChart, nqClassChart, nqForm, nqTable, nqTree, nqDocument,
		JSON, Dialog,Form,TextBox,Button,domattr,styles, css2) {

    nqStore = new nqStore();
    var userName = null;

	ready( function() {
		request.get('/hello').then(function(data){
			userName = data==''?null:data;
			domattr.set('userNameDiv', 'innerHTML', data);
		},errorDialog);
        topic.subscribe("/dojo/hashchange", interpretHash);
		on(registry.byId('loginButtonId'), 'click', function(event){login();});
		on(registry.byId('cancelButtonId'), 'click', function(event){nqStore.abort();});
		on(registry.byId('saveButtonId'), 'click', function(event){nqStore.commit();});
		on(registry.byId('helpButtonId'), 'change', function(value){
			if(value) dojox.html.insertCssRule('.helpTextInvisable', 'display:block;', 'nq.css');
			else dojox.html.removeCssRule('.helpTextInvisable', 'display:block;', 'nq.css');
		});

		/*when(nqDataStore.preFetch(), function(results){
		}, errorDialog);*/
        fx.fadeOut({node: 'loadingOverlay', onEnd: function(node){domStyle.set(node, 'display', 'none');}}).play();
        //domStyle.set('loadingOverlay', 'display', 'none');

        if(hash() == "") {
            var neuralquestState = cookie('neuralquestState');
            if(neuralquestState) hash(neuralquestState, true);
            else hash(".842.1784.702.2485", true);
        }
        else interpretHash();
	});
	function interpretHash(_hash){
		// summary:
		//		Interpret the hash change. The hash consists of sets of threes: viewId.tabId.selectedObjectId.
		//		Each set is interpreted consecutively.
		//		This method is initially called by on hash change and subsequently by ourselves with incrementing level
		// hash: String
		//		The current hash
		// lvl: Number
		//		The level we are currently processing. Defaults to 0 as is the case when we are called by on hash change topic
		// returns: Promise
		//		All of the page elements of the underlaying levels are completed 
		//var currentHash = hash();		
		//console.log('hash', _hash);
		when(drawFramesRecursive(0), function(result){
            setTimeout(function(){// Let the browser display thread catchup.
                var hashArr = hash().split('.');
                var levels = Math.ceil(hashArr.length/3);//determine the number of levels, rounded to the highest integer
                var widgetPromises = [];
                for(var level = levels-1; level>=0; level--){//we start at the highest level and work our way down (user experience)
                    widgetPromises.push(drawWidgets(level));
                }
                return all(widgetPromises).then(function(widgetsArrArr){
                    setTimeout(function(){// Let the browser display thread catchup.
                        var level = levels-1;
                        widgetsArrArr.forEach(function(widgetsArr){
                            var state = getState(level);
                            widgetsArr.forEach(function(widget){
                                widget.setSelectedObjIdPreviousLevel(state.selectedObjectIdPreviousLevel);
                                widget.setSelectedObjIdThisLevel(state.selectedObjId);
                            });
                            level = level -1;
                        });
                    },10);
                }, errorDialog);
            },50);
		}, errorDialog);
	}
	function drawFramesRecursive(level){
		var state = getState(level);
		//console.log('state', state);
		if(!state.viewId) return false;//nothing left to display
		// if the view pane already exists we can simply go on to the next level
		if(registry.byId('viewPane'+state.viewId)) return drawFramesRecursive(level+1);		
		// We're filling a slave, clean it first. It may have been used by another view before
		var parentContentPane; 
		if(!state.viewIdPreviousLevel) parentContentPane = registry.byId('placeholder');
		else parentContentPane = registry.byId('slave'+state.viewIdPreviousLevel);
		if(!parentContentPane) parentContentPane = registry.byId('slave'+state.tabIdPreviousLevel);
		if(!parentContentPane) return false; 
		parentContentPane.destroyDescendants(false);
		
		//are we creating an accordion container in a border container or a tab container?
		return nqStore.get(state.viewId).then(function(view){
            console.log('level', level, view);
			var viewPaneCreated;
			if(view.accordionOrTab=='Accordion in Border Container') viewPaneCreated = createAccordionInBorderContainer(state.viewId, parentContentPane, level);
			else viewPaneCreated = createTabs(state.viewId, parentContentPane, level);
			return when(viewPaneCreated, function(newParentContentPane){
				parentContentPane.resize();//this is a must
				return drawFramesRecursive(level+1);//try the next level
			});
		});
	}
    function drawWidgets(level){
        var state = getState(level);
        var selectedTabId = getSelectedTabRecursive(state.viewId);
        return nqStore.getItemsByAssocTypeAndDestClass(selectedTabId, 'ordered', WIDGETS_ATTRCLASS).then(function(widgetsArr){
            var widgetPromises = [];
            widgetsArr.forEach(function(widget){
                widgetPromises.push(createNqWidget(widget, selectedTabId, state.viewId, level));
            });
            return all(widgetPromises);
        });
    }
	function getSelectedTabRecursive(paneId){
		var tabContainer = registry.byId('viewPane'+paneId);
		if(!tabContainer) return false;
		var tabId;
		if(tabContainer.selectedChildWidget) tabId = tabContainer.selectedChildWidget.id;
		else tabId = tabContainer.containerNode.firstChild.id;
		if(!tabId) return false;
		var subTab = getSelectedTabRecursive(tabId.substring(3));
		if(subTab) return subTab;// there's a selected tab below us, so return it's id
		else return tabId.substring(3);//we are at the bottom, so return our id		
	}
	function createAccordionInBorderContainer(parentViewOrTabId, parentContentPane, level){
		// summary:
		//		Add an accordion container in a border container to the parent content pane
		//		The right side of the border container can be used to display content based on a selected object on the left side.
		//		If there is only one accordion, then no container is drawn, just a content  pane.
		//		Will return immediately if its already been created
		// parentContentPane: ContentPane
		//		The content pane we will be drawing in
		// viewId: Number
		//		
		// selectedTabId: Number
		//		The id of the accordion widget that should be selected according to the hash
		// level: Number
		//		The level we are curently processing (used to update the hash after something has been clicked)
		// returns: Promise
		//		The promise will result in the id of the selected accordion

		var state = getState(level);
		var viewId = state.viewId;
		return nqStore.getItemsByAssocTypeAndDestClass(parentViewOrTabId, 'ordered', ACCORDIONTABS_ATTRCLASS).then(function(tabsArr){
			if(tabsArr.length==0) return false;
					
			var design = 'sidebar';//obtain horizontal, vertical, none from viewDef?
			var borderContainer = new BorderContainer( {
				'id' : 'borderContainer'+parentViewOrTabId,
				'region' : 'center',
				'design' : design,
				'persist' : true,
				//'class': 'noOverFlow'
				'style' : {width: '100%', height: '100%', overflow: 'hidden', padding: '0px', margin: '0px'}
			});
			var leftPane = new ContentPane( {
				'id' : 'master'+parentViewOrTabId,
				'region' : 'leading',
				'class' : 'backgroundClass',
				'splitter' : true,
				//'class': 'noOverFlow',
				'style' : {width: '200px',overflow: 'hidden',padding: '0px', margin: '0px'}
			});
			var centerPane = new ContentPane( {
				'id' : 'slave'+parentViewOrTabId,
				'region' : 'center',
				'class' : 'backgroundClass',
				//'content' : '<p>Loading...</p>',
				//'class': 'noOverFlow'
				'style' : {overflow: 'hidden',padding: '0px', margin: '0px'}
			});
			borderContainer.addChild(leftPane);
			borderContainer.addChild(centerPane);
			//parentContentPane.addChild(borderContainer);
			parentContentPane.containerNode.appendChild(borderContainer.domNode); //appendChild works better than attaching through create
		
			var accordianContainer;
			if(tabsArr.length==1){// this is really only to have palce to store viewPane+viewObj.id. Is there a better way?
				accordianContainer = new ContentPane( {
					'id' : 'viewPane'+parentViewOrTabId,
					'region' : 'center',
					'style' : {width: '100%',height: '100%',overflow: 'hidden',padding: '0px', margin: '0px'}
				});
			}
			else {
				accordianContainer = new AccordionContainer( {
					'id' : 'viewPane'+parentViewOrTabId,
					'region' : 'center',
					'duration' : 0,//animation screws out layout. Is there a better solution?
					//'persist' : true,//cookies override our hash tabId
					'class': 'noOverFlow',
					'style' : {width: '100%',height: '100%',overflow: 'hidden',padding: '0px', margin: '0px'}
				});
			}
			leftPane.addChild(accordianContainer);
			for(var i=0;i<tabsArr.length;i++){
				var tab = tabsArr[i];
				//console.log('accId', tab, 'parentViewOrTabId', parentViewOrTabId, 'level',level);
				var tabPane = new ContentPane( {
					'id' : 'tab'+tab._id,
					'title' : tab.name,
					'selected' : tab._id==state.tabId?true:false,
					'class' : 'backgroundClass',
					'style' : {overflow: 'hidden', padding: '0px', margin: '0px', width: '100%', height: '100%'}
				});
				accordianContainer.addChild(tabPane);
				accordianContainer.watch("selectedChildWidget", function(name, oval, nval){
					//console.log("selected child changed from ", oval.title, " to ", nval.title);
					var tabId = (nval.id).substring(3);//why is this called so offten? probably cant hurt
					setHashTabId(level, tabId, viewId); // this will trigger createNqWidget
				});
			};

			//parentContentPane.addChild(container);
			//parentPane.addChild(container);
			accordianContainer.startup();
			borderContainer.startup();
			//if(tabsArr.length>1) accordianContainer.resize();

			return centerPane;


		});
	}
	function createTabs(parentViewOrTabId, parentContentPane, level){
		// summary:
		//		Add a tab container to the parent content pane
		//		If there is only one tab, then no container is drawn, just a content  pane.
		//		Will return immediately if its already been created
		// parentContentPane: ContentPane
		//		The content pane we will be drawing in
		// viewId: Number
		//		
		// selectedTabId: Number
		//		The id of the tab widget that should be selected accoording to the hash
		// level: Number
		//		The level we are curently processing (used to update the hash after something has been clicked)
		// returns: Promise
		//		The promise will result in the id of the selected tab
		
		//get the Display Type id that this widget has as an attribute

		var state = getState(level);
		var viewId = state.viewId;
 		return nqStore.getItemsByAssocTypeAndDestClass(parentViewOrTabId, 'ordered', ACCORDIONTABS_ATTRCLASS).then(function(tabsArr){
			if(tabsArr.length==0) return false;
			
			var container;
			if(tabsArr.length==1){// this is really only to have palce to store viewPane+viewId. Is there a better way?
				container = new ContentPane( {
					'id' : 'viewPane'+parentViewOrTabId,
					'region' : 'center'
                    });
			}
			else {
				container = new TabContainer( {
					'id' : 'viewPane'+parentViewOrTabId,
					//'persist' : true,//cookies override our hash tabId
					'region' : 'center'
				});
			}
			parentContentPane.addChild(container);
			container.startup();
            var selectedFound = false;
			var subTabPromisses = [];
			for(var i=0;i<tabsArr.length;i++){
				var tab = tabsArr[i];
				if(tab._id==state.tabId) selectedFound = tab._id;
				//console.log('tabId', tabId, 'parentViewOrTabId', parentViewOrTabId, 'level',level);
				var tabPane = new ContentPane( {
					'id' : 'tab'+tab._id,
					'title' : tab.name,
					//'selected' : tab._id==state.tabId?true:false,
					'class' : 'backgroundClass',
					'style' : {overflow: 'auto', padding: '0px', margin: '0px', width: '100%', height: '100%'}
				});
				container.addChild(tabPane);
				container.watch("selectedChildWidget", function(name, oval, nval){
					//console.log("selected child changed from ", oval.title, " to ", nval.title);
					var tabId = (nval.id).substring(3);//why is this called so often? probably cant hurt
					setHashTabId(level, tabId, viewId); // this will trigger createNqWidget
				});
                //are we creating an accordion container in a border container or a tab container?
                var subTabPromise;
                if(tab.accordionOrTab=='Accordion in Border Container')  subTabPromise = createAccordionInBorderContainer(tab._id, tabPane, level);
                else subTabPromise = when(createTabs(tab._id, tabPane, level), function(subTabIsSelected){
                    if(subTabIsSelected){
                        container.selectChild(registry.byId('tab'+subTabIsSelected));
                        return parentViewOrTabId;
                    }
                    return false;//not selected or there are no subTabs
                });
				subTabPromisses.push(subTabPromise);
			};
            if(selectedFound && container.selectChild) container.selectChild(registry.byId('tab'+selectedFound));//must be set programaticaly
			return when(all(subTabPromisses), function(result){
				//tell the super tabPane that it should select itsself because its subtab is also selected
				if(selectedFound) return parentViewOrTabId;
				else return false;
			});
            //return container;
			return when(all(subTabPromisses));
		});
	}
	function createNqWidget(widget, tabId, viewId, level) {
        // summary:
        //		Add a nqWidget to the content pane, depending on DISPLAYTYPE_ATTR
        //		Will return immediately if its already been created
        // widgetId: Number
        //		The id of the widget that the selected tab is requesting
        // tabId: Number
        //		The currently selected tab (used to update the hash after something has been clicked)
        // viewId: Number
        //		The id of the view that the selected object is requesting
        // level: Number
        //		The level we are curently processing (used to update the hash after something has been clicked)
        // returns: Deferred
        //		The deferred will result in the widget after it has been created, or immediately if it is already there

        // if the widget already exists we can simply it
        var widgetObj = registry.byId('nqWidget' + widget._id);
        if (widgetObj) return widgetObj;
        var tab = registry.byId('tab' + tabId);

        var state = getState(level);
        var tabNode = dom.byId('tab' + tabId);
        var createDeferred = new Deferred();

        if (widget.displayTypes == 'Document'){
            widgetObj = new nqDocument({
                id: 'nqWidget' + widget._id,
                store: nqStore,
                createDeferred: createDeferred, //tell us when your done by returning the widgetObj
                widgetId: widget._id,
                tabId: tabId // used by resize
            }, domConstruct.create('div'));
            tab.addChild(widgetObj);
        }
        if (widget.displayTypes == 'Form'){
            widgetObj = new nqForm({
                id: 'nqWidget'+widget._id,
                store: nqStore,
                createDeferred: createDeferred, //tell us when your done by returning the widgetObj
                widgetId: widget._id,
                //viewId: viewId,
            }, domConstruct.create('div'));
            tab.addChild(widgetObj);
        }
        if (widget.displayTypes ==  'Table'){
            widgetObj = new nqTable({
                id: 'nqWidget'+widget._id,
                store: nqStore,
                createDeferred: createDeferred, //tell us when your done by returning the widgetObj
                widgetId: widget._id,
                //selectedObjIdPreviousLevel: state.selectedObjectIdPreviousLevel,//dgrid needs an initial query
                level: level, // used by onClick
                tabId: tabId, // used by onClick
                query: query
            }, domConstruct.create('div'));
            tab.addChild(widgetObj);
        }
        if (widget.displayTypes == 'Tree'){
            widgetObj = new nqTree({
                id: 'nqWidget'+widget._id,
                store: nqStore,
                createDeferred: createDeferred, //tell us when your done by returning the widgetObj
                widgetId: widget._id,
                //selectedObjIdPreviousLevel: state.selectedObjectIdPreviousLevel,//tree needs an initial query
                level: level, // used by onClick
                tabId: tabId, // used by onClick
            }, domConstruct.create('div'));
            tab.addChild(widgetObj);
            //widgetObj.startup();
            //createDeferred.resolve(widgetObj);
        }
        if (widget.displayTypes == 'Process Model'){
            widgetObj = new nqProcessChart({
                id: 'nqWidget'+widget._id,
                store: nqStore,
                createDeferred: createDeferred, //tell us when your done by returning the widgetObj
                //viewObj: viewObj,
                tabId: tabId, // used by resize
            }, domConstruct.create('div'));
            tab.addChild(widgetObj);
            //widgetObj.startup();
        }
        if (widget.displayTypes == '3D Class Model'){
            widgetObj = new nqClassChart({
                id: 'nqWidget'+widget._id,
                store: nqStore,
                createDeferred: createDeferred, //tell us when your done by returning the widgetObj
                viewId: viewId,
                tabId: tabId, // used by resize
                //skyboxArray: [ 'img/Neuralquest/space_3_right.jpg', 'img/Neuralquest/space_3_left.jpg', 'img/Neuralquest/space_3_top.jpg' ,'img/Neuralquest/space_3_bottom.jpg','img/Neuralquest/space_3_front.jpg','img/Neuralquest/space_3_back.jpg']
            }, domConstruct.create('div'));
            tab.addChild(widgetObj);
            //widgetObj.startup();
        }
        return createDeferred.promise;
	}	
	//////////////////////////////////////////////////////////////////////////////
	//Helpers
	//////////////////////////////////////////////////////////////////////////////
	lang.setObject("nq.getState", getState);//make the function globally accessable
	function getState(level){
		var hashArr = hash().split('.');
		return {
            viewIdPreviousLevel: parseInt(hashArr[level*3-2]),
            tabIdPreviousLevel: parseInt(hashArr[level*3-1]),
            selectedObjectIdPreviousLevel: hashArr[level*3-0],
            viewId: parseInt(hashArr[level*3+1]),
            tabId: parseInt(hashArr[level*3+2]),
            selectedObjId: parseInt(hashArr[level*3+3])
		};
	}
	function setHashTabId(level, tabId, viewId){
		var hashArr = hash().split('.');
		if(hashArr[level*3+2] == tabId) return;//same
        //set our tabId in the hash array
		hashArr[level*3+2] = tabId;
		//remove anything following this tab in the hash since it is no longer valid
		hashArr = hashArr.slice(0,level*3+3);
        //see if there is a cookie for our tab
        var tabCookieStr = cookie('tabId'+tabId);
        //if, append it to our hash array
        if(tabCookieStr) hashArr = hashArr.concat(JSON.parse(tabCookieStr));
		var newHash = hashArr.join('.');
		//newHash = newHash.replace(/,/g,'.');
		hash(newHash, true);// update history, instead of adding a new record			
	}
	lang.setObject("nq.setHashViewId", setHashViewId);//make the function globally accessable
	function setHashViewId(level, viewId, tabId, selectedObjId){
		//var tabPane = registry.byId('tab'+tabId);
		//document.title = 'NQ - '+(tabPane?tabPane.title+' - ':'')+this.getLabel(item);

        var hashArr = hash().split('.');
        //get everything in the hash array fom the tabId onwards
        var arrFromTab = hashArr.slice(level*3+3);
        //store it as a cookie, setHashTabId to use later on
        console.log('hash',JSON.stringify(arrFromTab));
        cookie('tabId'+tabId, JSON.stringify(arrFromTab));
		
//		hashArr[level*3+2] = tabId;//it may have changed
        //set our selectedObjId in the hash array
		hashArr[level*3+3] = selectedObjId;//it will have changed
		if(hashArr[(level+1)*3+1] != viewId){//if its changed
			//remove anything following this level in the hash since it is no longer valid
			hashArr = hashArr.slice(0,(level+1)*3+1);
            //set our viewId in the hash array
			hashArr[(level+1)*3+1] = viewId;

            //see if there is a cookie for our view
			//var viewVookieStr = cookie(viewId);
            //if
			//if(cookieValue) hashArr[(level+1)*3+2] = cookieValue.substr(3);
			/*else{//find the first tab and use it
				var tabsArr = _nqSchemaMemoryStore.query({parentViewId: viewId, entity: 'tab'});//get the tabs		 
				if(tabsArr.length>0) hashArr[(level+1)*3+2] = tabsArr[0].id;
			}
			var tabsArr = _nqSchemaMemoryStore.query({parentViewId: viewId, entity: 'tab'});//get the tabs		 
			if(tabsArr.length>0) hashArr[(level+1)*3+2] = tabsArr[0].id;*/
		}

		var newHash = hashArr.join('.');
		cookie('neuralquestState', newHash);
		hash(newHash);			
	}
    /*var breadcrums = {};
    function mergeHashWithBreadcrumObj(i, crumPart){
        var hashArr = hash().split('.');
        if(i<hashArr.length-1) {
            var hashPart = hashArr[i];
            var crum = crumPart[hashPart];
            if(!crum) {
                crumPart[hashPart] = true;
            }
            mergeHashWithBreadcrumObj(i+1, crum);
        }
    }
    function breadcrumsObjToAugmentedHash(i, crumPart){
        var hashArr = hash().split('.');
        if(i<hashArr.length-1) {
            var hashPart = hashArr[i];
            if(crumPart[hashPart]) {
                var newHashArr = breadcrumsObjToAugmentedHash(i+1, crumPart[hashPart]);
                newHashArr.unshift(hashPart);
                return newHashArr;
            }
            else return [hashPart];
        }
        else {
            for(hashPart in crumPart){
                var newHashArr = breadcrumsObjToAugmentedHash(i+1, crumPart[hashPart]);
                newHashArr.unshift(hashPart);
                return newHashArr;//we only want the first one
            }
            return [];
        }
    }*/
	lang.setObject("nq.errorDialog", errorDialog);//make the function globally accessable
	function errorDialog(err) {
        var content, title;
        if(err.response){
            title = err.message;
            if(err.response.text)content = err.response.text;
            else content = err.response;
        }
        else{
            title = 'Client Error';
            content = err.message;
        }
        var dlg = new dijit.Dialog({
            title: title,
            extractContent: true,//important in the case of server response, it'll screw up your css.
            onClick: function (evt) {
                this.hide();
            },//click anywhere to close
            content: content
        });
        dlg.show();
		//throw err.stack;//extremely useful for asycronons errors, stack otherwise gets lost
		if(!err.response) throw err.stack;//extremely useful for asycronons errors, stack otherwise gets lost
	};
    lang.setObject("nq.login", login);//make the function globally accessable
    function login() {
        var form = new Form();

        var tableNode = domConstruct.create('table', {style: 'border-spacing:5px;'}, form.containerNode);

        var row1 = domConstruct.create("tr", {style:"display:none"}, tableNode);
        var tdDom0 = domConstruct.create("td", {innerHTML: ('Error'), colspan:2, style: "padding: 3px; background-color:yellow" }, row1);

        var row2 = domConstruct.create("tr", null, tableNode);
        domConstruct.create("td", {innerHTML: ('User Name'), style: "padding: 3px"}, row2);
        var tdDom1 = domConstruct.create("td", {style: "padding: 3px; border-width:1px; border-color:lightgray; border-style:solid;"}, row2);
        var userNameTextBox = new TextBox({name:'username', placeHolder: "Name", regExp:"\w{4,20}"}).placeAt(tdDom1);

        var row3 = domConstruct.create("tr", null, tableNode);
        domConstruct.create("td", {innerHTML: ('Password'), style: "padding: 3px"}, row3);
        var tdDom2 = domConstruct.create("td", {style: "padding: 3px; border-width:1px; border-color:lightgray; border-style:solid;"}, row3);
        new TextBox({name:'password', type:'password' ,placeHolder: "Password" , minlength:4, maxlength:40 }).placeAt(tdDom2);

        var row4 = domConstruct.create("tr", {}, tableNode);
        domConstruct.create("td", {innerHTML: ('Password'), style: "padding: 3px"}, row4);
        var tdDom3 = domConstruct.create("td", {style: "padding: 3px; border-width:1px; border-color:lightgray; border-style:solid;"}, row4);
        new TextBox({name:'password2', type:'password', placeHolder: "Again, for verification" }).placeAt(tdDom3);

        var row5 = domConstruct.create("tr", {}, tableNode);
        domConstruct.create("td", {innerHTML: ('Email'), style: "padding: 3px"}, row5);
        var tdDom4 = domConstruct.create("td", {style: "padding: 3px; border-width:1px; border-color:lightgray; border-style:solid;"}, row5);
        new TextBox({name:'email',placeHolder: "In case you forget your password" }).placeAt(tdDom4);

        var row6 = domConstruct.create("tr", null, tableNode);
        domConstruct.create("td", {innerHTML: ('Social Media Login'), style: "padding: 3px"}, row6);
        var tdDom5 = domConstruct.create("td", {}, row6);
        var googleLogin = new Button({label: "Google Login"}).placeAt(tdDom5);

        var row7 = domConstruct.create("tr", null, tableNode);
        domConstruct.create("td", {}, row7);
        var tdDom6 = domConstruct.create("td", {}, row7);
        var facebookLogin = new Button({label: "Facebook Login", disabled:true}).placeAt(tdDom6);

        var row8 = domConstruct.create("tr", null, tableNode);
        domConstruct.create("td", {}, row8);
        var tdDom8 = domConstruct.create("td", {}, row8);
        var twitterLogin = new Button({label: "Twitter Login", disabled: true}).placeAt(tdDom8);

        var row9 = domConstruct.create("tr", null, tableNode);
        domConstruct.create("td", {innerHTML: ('New to Neuralquest?'), style: "padding: 3px"}, row9);
        var tdDom9 = domConstruct.create("td", {}, row9);
        var createAccount = new Button({label: "Sign-up" }).placeAt(tdDom9);

        var row10 = domConstruct.create("tr", null, tableNode);
        domConstruct.create("td", {innerHTML: ("I'm Getting Old"), style: "padding: 3px"}, row10);
        var tdDom10 = domConstruct.create("td", {}, row10);
        var sendMeANewOne = new Button({label: "Send me a new password" }).placeAt(tdDom10);

        var row11 = domConstruct.create("tr", {style:"float: right;"}, tableNode);
        var tdDom11 = domConstruct.create("td", {colspan:2}, row11);
        var loginButton = new Button({label: "Login", iconClass:'saveIcon'}).placeAt(tdDom11);
        var cancelButton = new Button({label: "Cancel", iconClass:'cancelIcon'}).placeAt(tdDom11);
        //domConstruct.create("img", {src:"app/resources/img/Neuralquest/neuralquest.png", align:"middle", width:"160px", height:"24px"}, row11);

        createAccount.on("click", function(){
            domStyle.set(row4, 'display', '');
            domStyle.set(row5, 'display', '');
			domStyle.set(row6, 'display', 'none');
			domStyle.set(row7, 'display', 'none');
			domStyle.set(row8, 'display', 'none');
			//domStyle.set(row9, 'display', 'none');
			domStyle.set(row10, 'display', 'none');
		});
        loginButton.on("click", function(){
            request.post('/login', {
                headers: {'Content-Type': 'application/json; charset=UTF-8'},//This is not the default!!
                data: JSON.stringify(form.get('value'))
            }).then(function(data){
                userName = data==''?null:data;
                domattr.set('userNameDiv', 'innerHTML', data);
				//TODO refresh the page
				dia.hide();
            },function(error){
				var msg = '';
				if(error.response.status == 401) msg = 'Invalid user name/password';
				else msg = error.response.text;
                domStyle.set(row1, 'display', '');
                domattr.set(tdDom0, 'innerHTML', msg);
				userName = null;
				domattr.set('userNameDiv', 'innerHTML', '');
            });
        });
		googleLogin.on("click", function(){
			request.get('/login/google').then(function(data){
                userName = data==''?null:data;
                domattr.set('userNameDiv', 'innerHTML', data);
				//TODO refresh the page
				dia.hide();
			},function(error){
				var msg = '';
				if(error.response.status == 400) msg = 'Google login failed';
				else msg = error.response.text;
				domStyle.set(row1, 'display', '');
				domattr.set(tdDom0, 'innerHTML', msg);
			});
		});
		createAccount.on("click", function(){
            request.post('/signup', {
                headers: {'Content-Type': 'application/json; charset=UTF-8'},//This is not the default!!
                data: JSON.stringify(form.get('value'))
            }).then(function(data){
                userName = data==''?null:data;
                domattr.set('userNameDiv', 'innerHTML', data);
                //TODO refresh the page
                dia.hide();
            },function(error){
				var msg = '';
				if(error.response.status == 401) msg = 'Invalid user name/password';
				else msg = error.response.text;
				domStyle.set(row1, 'display', '');
				domattr.set(tdDom0, 'innerHTML', msg);
            });
        });
        cancelButton.on("click", function(){dia.hide();});

        var dia = new Dialog({
            content: form,
            title: "Neuralquest Login"
            //style: "width: 300px; height: 300px;"
        });
        form.startup();
        dia.show();
    }
	
//    var transaction = transactionalCellStore.transaction();
//    transactionalCellStore.put(someUpdatedProduct);
 //   ... other operations ...
//    transaction.commit();	
	lang.setObject("nq.test", test);//make the function globally accessable
    function test(){

        nqStore.get(1784).then(function(item){
            console.log('item', item);
            item.name = 'xxxxx';
            console.log('new', item);
            nqStore.put(item);
        });






        /*
        var cookieCrumsStr = cookie('neuralquestCrums');
        var cookieCrumsObj = {};
        if(undefined != cookieCrumsStr) cookieCrumsObj = JSON.parse(cookieCrumsStr);
        mergeHashWithBreadcrumObj(0, cookieCrumsObj);
        console.log('cookieCrumsObj', cookieCrumsObj);
        cookie('neuralquestCrums', JSON.stringify(cookieCrumsObj));
        */



		/*nqStore.get(1784).then(function(item){
			console.log('item', item);
			item.name = 'xxxxx';
			console.log('new', item);
			nqStore.put(item);
		});*/
    }


	WIDGETS_ATTRCLASS = 99;
	ACCORDIONTABS_ATTRCLASS = 90;
	VIEW_CLASS_TYPE = 74;
	USERS_CLASS_TYPE = 51;
	ASSOCPROPERTIES = {
        parent: {
            inverse :'children',
            pseudo : false,
            cardinality: 'one',
            icon: 3},
        mapsTo: {
            inverse :'mappedToBy',
            pseudo : false,
            cardinality: 'one',
            icon: 5},
        default: {
            inverse :'defaultOf',
            pseudo : false,
            cardinality: 'one',
            icon: 6},
        oneToOne: {
            inverse :'oneToOneReverse',
            pseudo : false,
            cardinality: 'one',
            icon: 7},
        ordered: {
            inverse :'orderedParent',
            pseudo : false,
            cardinality: 'many',
            icon: 8},
        next: {
            inverse :'previous',
            pseudo : false,
            cardinality: 'one',
            icon: 9},
        manyToMany: {
            inverse :'manyToManyReverse',
            pseudo : false,
            cardinality: 'many',
            icon: 10},
        oneToMany: {
            inverse :'manyToOne',
            pseudo : false,
            icon: 11},
        owns: {
            inverse :'ownedBy',
            pseudo : false,
            cardinality: 'many',
            icon: 12},
        subclasses: {
            inverse :'parent',
            pseudo : true,
            cardinality: 'many',
            icon: 15,
            type : 'class'},
        instantiations: {
            inverse :'parent',
            pseudo : true,
            cardinality: 'many',
            icon: 15,
            type : 'object'},
        children: {
            inverse :'parent',
            pseudo : true,
            cardinality: 'many',
            icon: 15},
        allSubclasses: {
            inverse :'parent',
            pseudo : true,
            cardinality: 'many',
            icon: 15},
        mappedToBy: {
            inverse :'mapsTo',
            pseudo : true,
            cardinality: 'many',
            icon: 17},
        defaultOf: {
            inverse :'default',
            pseudo : true,
            cardinality: 'many',
            icon: 18},
        oneToOneReverse: {
            inverse :'oneToOne',
            pseudo : true,
            icon: 19},
        orderedParent: {
            inverse :'ordered',
            pseudo : true,
            cardinality: 'one',
            icon: 20},
        previous: {
            inverse :'next',
            pseudo : true,
            cardinality: 'one',
            icon: 21},
        manyToManyReverse: {
            inverse :'manyToMany',
            pseudo : true,
            cardinality: 'many',
            icon: 22},
        manyToOne: {
            inverse :'oneToMany',
            pseudo : true,
            cardinality: 'one',
            icon: 23},
        ownedBy: {
            inverse :'owns',
            pseudo : true,
            cardinality: 'one',
            icon: 24},
        associations: {
            inverse :'associations',
            pseudo : true,
            cardinality: 'many',
            icon: 11},
        byAssociationType: {
            inverse :'byAssociationType',
            pseudo : true,
            cardinality: 'many',
            icon: 24}
    };
    CLASSSCHEMA = {
        $schema: "http://json-schema.org/draft-04/schema#",
        type: 'object',
        properties: {
            _id : {
                type: "number",
                readOnly : true,
                minimum : 0,
                places : 0},
            name : {
                type: "string",
                readOnly : false},
            type : {
                type : "string",
                readOnly : true,
                enum : ['class']},
            description : {
                type : "string",
                readOnly : false,
                media : {
                    mediaType : "text/html"
                }},
            schema : {
                type : "object",
                readOnly : false}
        },
        required: ['_id', 'type'],
        additionalProperties: false
    };
});
