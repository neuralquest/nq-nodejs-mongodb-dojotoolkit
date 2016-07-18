require([
'dojo/_base/array', 'dojo/dom-style', 'dojo/_base/fx', 'dojo/ready', 'dojo/topic', "dojo/on", 'dojo/hash', 'dijit/registry', 
'dojo/dom', 'dojo', 'dojo/_base/lang', 'dojo/_base/declare','dojo/_base/array', 'dojo/dom-construct',
'dojo/Deferred', 'dojo/when', "dojo/promise/all", 'dojo/query', 'dijit/layout/BorderContainer',
'dijit/layout/TabContainer', 'dijit/layout/ContentPane', 'dijit/layout/AccordionContainer', "dojo/cookie", "dojo/request",
'app/nqDocStore', 'app/nqProcessChart', 'app/nqClassChart', 'app/nqForm', 'app/nqTable', 'app/nqTree','app/nqDocument','app/nqTreeGrid','app/nqHome',
"dojo/json","dijit/Dialog","dijit/form/Form","dijit/form/TextBox","dijit/form/Button","dojo/dom-attr",'dojox/html/styles', 'dojo/query!css2'],
function(arrayUtil, domStyle, fx, ready, topic, on, hash, registry,
		dom, dojo, lang, declare, array, domConstruct,
		Deferred, when, all, query, BorderContainer,
		TabContainer, ContentPane, AccordionContainer, cookie, request,
        nqDocStore, nqProcessChart, nqClassChart, nqForm, nqTable, nqTree, nqDocument, nqTreeGrid, nqHome,
		JSON, Dialog,Form,TextBox,Button,domattr,styles, css2) {

    var nqStore = new nqDocStore();
    var user = {};
    ready(function () {
        request.get('/hello').then(function (data) {
            user = dojo.fromJson(data);
            var userName = user.name?user.name:'';
            domattr.set('userNameDiv', 'innerHTML', userName);
        }, errorDialog);
        topic.subscribe("/dojo/hashchange", interpretHash);
        on(registry.byId('loginButtonId'), 'click', function (event) {
            setHash(null,"576668623c6d3cd598a5a389",0,0,1);// is the log in page
        });
        on(registry.byId('cancelButtonId'), 'click', function (event) {
            nqStore.abort();
        });
        on(registry.byId('saveButtonId'), 'click', function (event) {
            nqStore.commit();
        });
        on(registry.byId('helpButtonId'), 'change', function (value) {
            if (value) dojox.html.insertCssRule('.helpTextInvisable', 'display:block;', 'nq.css');
            else dojox.html.removeCssRule('.helpTextInvisable', 'display:block;', 'nq.css');
        });

        if (hash() == "") {
            var neuralquestState = cookie('neuralquestState');
            //if(neuralquestState) hash(neuralquestState, true);
            hash(".56f89f625dde184ccfb9fc76....5700046f5dde184ccfb9fc7c", true);
        }
        else interpretHash();
    });
    function interpretHash(_hash) {
        when(drawFramesRecursive(0), function(res){
            var hashArr = hash().split('.');
            var levels = Math.ceil(hashArr.length/4);//determine the number of levels, rounded to the highest integer
            for(var level = 0; level<levels; level++) {
                var state = getState(level);
                //var tabPane = registry.byId(state.pageId+'.'+state.tabNum);
                //Finding the right tab pane to draw in is hard.
                //There may be multiple layers of sub-pages, each with their own tab/border containers.
                //So we just ask dojo which deepest tab is currently selected (if any).
                var tabPane = getSelectedTabRecursive(registry.byId(state.pageId));//This will poke through sub-pages
                var widgetsArr = registry.findWidgets(tabPane.containerNode);
                widgetsArr.forEach(function (widget) {
                    //widget.setDocId(state.docIdPreviousLevel);
                    widget.set('docId',state.docIdPreviousLevel);
                    widget.set('selectedId',state.docId);
                    //widget.setSelectedObjIdThisLevel(state.docId);
                });
            }
        },nq.errorDialog);
    }
    function drawFramesRecursive(level){
        var state = getState(level);
        //console.log('state', state);
        if(!state.pageId) return false;//nothing left to display
        if(registry.byId(state.pageId)) return drawFramesRecursive(level+1); // if the page already exists we can simply go on to the next level
        var parentContentPane;
        //if(level == 0) parentContentPane = registry.byId('placeholder');
        //else parentContentPane = registry.byId('slave.'+state.pageIdPreviousLevel);
        //if(!parentContentPane) parentContentPane = registry.byId('slave'+state.tabIdPreviousLevel);
        if(level == 0) parentContentPane = registry.byId('placeholder');
        else {
            var pageObj = nqStore.cachingStore.getSync(state.pageIdPreviousLevel);
            if(pageObj.tabs && pageObj.tabs[state.tabNumPreviousLevel] && pageObj.tabs[state.tabNumPreviousLevel].pageId){
                var subPageId = pageObj.tabs[state.tabNumPreviousLevel].pageId;
                var subPageObj = nqStore.cachingStore.getSync(subPageId);
                if(subPageObj.divider == 'Horizontal' || subPageObj.divider == 'Vertical') {
                    parentContentPane = registry.byId('slave.'+subPageObj._id);
                }
            }
            else parentContentPane = registry.byId('slave.'+state.pageIdPreviousLevel);
        }
        if(!parentContentPane) return false;

        return when(drawBorderContainer(parentContentPane, state.pageId, level), function(res){
            return drawFramesRecursive(level+1);
        });
    }
    function drawBorderContainer(parentContentPane, pageId, level) {
        if(!pageId) return false;
        return nqStore.get(pageId).then(function (pageObj) {
            parentContentPane.destroyDescendants(false);
            if(pageObj.divider == 'Horizontal' || pageObj.divider == 'Vertical') {
                var borderContainer = new BorderContainer({
                    'region': 'center',
                    'design': pageObj.divider == 'Vertical' ? 'sidebar' : 'headline',
                    'persist': true,
                    //'class': 'noOverFlow'
                    'style': {width: '100%', height: '100%', overflow: 'hidden', padding: '0px', margin: '0px'}
                });
                var leftPane = new ContentPane({
                    'region': pageObj.divider == 'Vertical' ? 'leading' : 'top',
                    'class': 'backgroundClass',
                    'splitter': true,
                    //'class': 'noOverFlow',
                    'style': {width: '200px', overflow: 'hidden', padding: '0px', margin: '0px'}
                });
                var centerPane = new ContentPane({
                    'id' : 'slave.'+pageId,
                    //slaveOf: pageId,
                    'region': 'center',
                    'class': 'backgroundClass',
                    //'class': 'noOverFlow'
                    'style': {overflow: 'hidden', padding: '0px', margin: '0px'}
                });
                borderContainer.addChild(leftPane);
                borderContainer.addChild(centerPane);
                parentContentPane.containerNode.appendChild(borderContainer.domNode); //appendChild works better than attaching through create
                borderContainer.startup();//this is a must
                parentContentPane.resize();//this is a must
                return drawAccordionsOrTabs(pageObj, leftPane, level);//Fill the left pane with tabs/accordions as needed
            }
            else {
                //There is no border container at this level, so go ahead and use the parent content pane
                return drawAccordionsOrTabs(pageObj, parentContentPane, level);//Fill the parent content pane with tabs/accordions as needed
            }
        });
    }
    function drawAccordionsOrTabs(pageObj, parentContentPane, level) {
        //console.log('drawAccordionsOrTabs', pageObj.name, parentContentPane.id);
        var tabsPromises = [];
        //Is there only one tab? skip the tab container and just use the parent content pane
        if (pageObj.tabs.length <= 1) {
            var tabPane = new ContentPane({
                //id: pageObj._id+'.0',
                id: pageObj._id,
                region: 'center',
                level: level,
                tabNum: 0,
                title: pageObj.tabs[0].name,
                'class': 'backgroundClass',
                style: {overflow: 'hidden', padding: '0px', margin: '0px', width: '100%', height: '100%'}
            });
            parentContentPane.addChild(tabPane);
            //parentContentPane.id = pageObj._id;
            //parentContentPane.level = level;
            //parentContentPane.tabNum = 0;
            tabsPromises.push(drawWidgets(tabPane));
            //if(tabObj.pageId) tabsPromises.push(drawBorderContainer(tabPane, tabObj.pageId, level));
            //else tabsPromises.push(drawWidgets(tabPane));

        }
        else {
            var container = null;
            var props = {
                id : pageObj._id,
                region: 'center',
                //'class': 'noOverFlow',
                style: {width: '100%', height: '100%', overflow: 'hidden', padding: '0px', margin: '0px'}
                //'persist' : true,//do not use! cookies override our hash tabId
            };
            if(pageObj.accordionOrTab == 'Accordions')container = new AccordionContainer(props);
            else container = new TabContainer(props);

            parentContentPane.addChild(container);
            container.startup();//this is a must
            parentContentPane.resize();//this is a must
            var num = 0;
            pageObj.tabs.forEach(function (tabObj) {
                var state = getState(level);//!!! state gets overwritten, not know why
                var tabPane = new ContentPane({
                    id: pageObj._id+'.'+num,
                    level: level,
                    tabNum: num,
                    title: tabObj.name,
                    'class': 'backgroundClass',
                    style: {overflow: 'hidden', padding: '0px', margin: '0px', width: '100%', height: '100%'}
                });
                container.addChild(tabPane);
                if (num == state.tabNum) container.selectChild(tabPane, false);
                num++;
                if(tabObj.pageId) tabsPromises.push(drawBorderContainer(tabPane, tabObj.pageId, level));
                else tabsPromises.push(drawWidgets(tabPane));
            });

            container.watch("selectedChildWidget", function(name, oval, nval){
                //console.log("selected child changed from ", oval.tabNum, " to ", nval.tabNum);
                nq.setHash(null, pageObj._id, nval.tabNum, null, level);
            });
        }
        return all(tabsPromises);
    }
    function drawWidgets(tabPane) {
        var pageId = tabPane.id.split('.')[0];
        //if(pageId == 'slave') pageId = tabPane.id.split('.')[1];
        return nqStore.get(pageId).then(function(pageObj){
            var widgetPromises = [];
            var widNum = 0;
            var tabObj = pageObj.tabs[tabPane.tabNum];
            if(!tabObj.widgets) return false;
            tabObj.widgets.forEach(function (widget) {
                widgetPromises.push(when(nqStore.getSchemaForView(widget.viewId), function(schema){
                    var parms = {
                        id: pageId + '.' + tabPane.tabNum + '.' + widNum,
                        pageId: pageId,
                        tabNum: tabPane.tabNum,
                        widNum: widNum,
                        widTot: tabObj.widgets.length,
                        level: tabPane.level,
                        widget: widget,
                        store: nqStore,
                        schema: schema
                    };
                    if (widget.displayType == 'Document') {
                        var widgetObj = new nqDocument(parms, domConstruct.create('div'));
                        tabPane.addChild(widgetObj);
                    }
                    else if (widget.displayType == 'Form') {
                        var widgetObj = new nqForm(parms, domConstruct.create('div'));
                        tabPane.addChild(widgetObj);
                    }
                    else if (widget.displayType == 'TreeGrid') {
                        var widgetObj = new nqTreeGrid(parms, domConstruct.create('div'));
                        tabPane.addChild(widgetObj);
                    }
                    else if (widget.displayType == 'Table') {
                        var widgetObj = new nqTable(parms, domConstruct.create('div'));
                        tabPane.addChild(widgetObj);
                    }
                    else if (widget.displayType == 'Tree') {
                        var widgetObj = new nqTree(parms, domConstruct.create('div'));
                        tabPane.addChild(widgetObj);
                    }
                    else if (widget.displayType == '3D Class Model') {
                        var widgetObj = new nqClassChart(parms, domConstruct.create('div'));
                        tabPane.addChild(widgetObj);
                    }
                    else if (widget.displayType == 'HomePage') {
                        var widgetObj = new nqHome(parms, domConstruct.create('div'));
                        tabPane.addChild(widgetObj);
                    }
                    widNum++;
                }));
            });
            return all(widgetPromises);
        });
    }

    //////////////////////////////////////////////////////////////////////////////
    //Helpers
    //////////////////////////////////////////////////////////////////////////////
    lang.setObject("nq.setUser", setUser);//make the function globally accessible
    function setUser(_user){
        user = _user;
        domattr.set('userNameDiv', 'innerHTML', _user.name);
    }
    lang.setObject("nq.getUser", getUser);//make the function globally accessible
    function getUser(){
        return user;
    }
    lang.setObject("nq.getState", getState);//make the function globally accessible
    function getState(level){
        var hashArr = hash().split('.');
        return {
            pageIdPreviousLevel: hashArr[level*4-3],
            tabNumPreviousLevel: parseInt(hashArr[level*4-2])?parseInt(hashArr[level*4-2]):0,
            widgetNumPreviousLevel: parseInt(hashArr[level*4-1])?parseInt(hashArr[level*4-1]):0,
            docIdPreviousLevel: hashArr[level*4],
            pageId: hashArr[level*4+1],
            tabNum: parseInt(hashArr[level*4+2])?parseInt(hashArr[level*4+2]):0,
            widgetNum: parseInt(hashArr[level*4+3])?parseInt(hashArr[level*4+3]):0,
            docId: hashArr[level*4+4]
        };
    }

    lang.setObject("nq.errorDialog", errorDialog);//make the function globally accessible
    function errorDialog(err) {
        var content, title;
        if (err.response) {
            title = err.message;
            if (err.response.text)content = err.response.text;
            else content = err.response;
        }
        else {
            title = 'Client Error';
            content = err.message;
        }
        var dlg = new Dialog({
            title: title,
            extractContent: true,//important in the case of server response, it'll screw up your css.
            onBlur: function() {
                this.hide();
            },
            content: content
        });
        dlg.show();
        if (!err.response) throw err.stack;//extremely useful for asycronons errors, stack otherwise gets lost
    }
    lang.setObject("nq.setHash", setHash);//make the function globally accessible
    function setHash(docId, pageId, tabNum, widNum, level){
        var tabPane = registry.byId(pageId+'.'+tabNum);
        if(tabPane) document.title = 'NQ - '+tabPane?tabPane.title:'';

        var hashArr = hash().split('.');
        var state = getState(level);
        var parsedArr = [];
        if(pageId && tabNum!=null && state.tabNum != tabNum){//The tabNum has changed
            //get everything in the current hash array fom this level onwards
            var arrFromTab = hashArr.slice(level*4+4);
            //Set the cookie for the current tabNum
            cookie(pageId+'.'+state.tabNum, JSON.stringify(arrFromTab));
            //Get the cookie for the new tabNum
            var jsonString = cookie(pageId+'.'+tabNum);
            if(jsonString) parsedArr = JSON.parse(jsonString);
        }

        //remove anything following this level in the hash since it is no longer valid
        hashArr = hashArr.slice(0,level*4+4);

        if(docId) hashArr[level*4+0] = docId;
        if(pageId) hashArr[level*4+1] = pageId;
		if(tabNum!=null) hashArr[level*4+2] = tabNum;
		if(widNum!=null) hashArr[level*4+3] = widNum;

        //Complete the hashArr with the parsed array we found earlier
        //TODO must make sure the hash array is long enough
        hashArr = hashArr.concat(parsedArr);

        var newHash = hashArr.join('.');
        var newHash = newHash.replace(/[.]0[.]/g, "..");//Replace any '.0.' with '..'
        //var newHash = newHash.replace(/.0(?!.*?.0)/, "");//Remove ending '.0'
        //var newHash = newHash.replace(/.(?!.*?.)/, "");//Remove ending '.'doesn't work!
        cookie('neuralquestState', newHash);
        hash(newHash);
    }
    function getSelectedTabRecursive(wid0, indent){
        indent = indent?indent:'';
        //console.log(indent, wid0.id, wid0.declaredClass, wid0.region);
        if(wid0.declaredClass=='dijit.layout.BorderContainer'){
            var w0Arr = registry.findWidgets(wid0.containerNode);
            var wid2 = null;
            w0Arr.forEach(function(wid1) {
                if (wid1.region == 'leading' || wid1.region == 'top') wid2 = wid1;
            });
            return getSelectedTabRecursive(wid2, indent + '-');
        }
        else if(wid0.declaredClass=='dijit.layout.AccordionContainer' || wid0.declaredClass == 'dijit.layout.TabContainer'){
            var wid1 = wid0.selectedChildWidget;
            return getSelectedTabRecursive(wid1, indent+'-');
        }
        else if(wid0.containerNode){
            var w0Arr = registry.findWidgets(wid0.containerNode);
            //if(w0Arr.length >1) throw new Error('too many');
            //if(w0Arr.length ==1){
                var wid1 = w0Arr[0];
                if(wid1.declaredClass.substring(0,13) == 'dijit.layout.'){
                    return getSelectedTabRecursive(wid1, indent+'-');
                }
            //}
        }
        return wid0;
    }

    //userName = data==''?null:data;
    //
    lang.setObject("nq.test", test);//make the function globally accessible
    function test(){
        var filter = {
            "type" : "eq",
            "args" : [
                "_id",
                "57343c283c6d3cd598a5a2e9"
            ]
        };
        var parentDoc = nqStore.cachingStore.getSync("5737875b3c6d3cd598a5a2f3");
        var childrenFilter = nqStore.buildFilter(parentDoc, filter);
        var childrenCollection = nqStore.filter(childrenFilter);
        childrenCollection.fetch().then(function(childObjects) {
            console.log('childrenFilter', childrenFilter);
            console.dir(childObjects);
        });
    }
});