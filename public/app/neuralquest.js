require([
'dojo/_base/array', 'dojo/dom-style', 'dojo/_base/fx', 'dojo/ready', 'dojo/topic', "dojo/on", 'dojo/hash', 'dijit/registry', 
'dojo/dom', 'dojo', 'dojo/_base/lang', 'dojo/_base/declare','dojo/_base/array', 'dojo/dom-construct',
'dojo/Deferred', 'dojo/when', "dojo/promise/all", 'dojo/query', 'dijit/layout/BorderContainer',
'dijit/layout/TabContainer', 'dijit/layout/ContentPane', 'dijit/layout/AccordionContainer', "dojo/cookie", "dojo/request",
'app/nqDocStore', 'app/nqProcessChart', 'app/nqClassChart', 'app/nqForm', 'app/nqTable', 'app/nqTree','app/nqDocument','app/nqTreeGrid',
"dojo/json","dijit/Dialog","dijit/form/Form","dijit/form/TextBox","dijit/form/Button","dojo/dom-attr",'dojox/html/styles', 'dojo/query!css2'],
function(arrayUtil, domStyle, fx, ready, topic, on, hash, registry,
		dom, dojo, lang, declare, array, domConstruct,
		Deferred, when, all, query, BorderContainer,
		TabContainer, ContentPane, AccordionContainer, cookie, request,
        nqDocStore, nqProcessChart, nqClassChart, nqForm, nqTable, nqTree, nqDocument, nqTreeGrid,
		JSON, Dialog,Form,TextBox,Button,domattr,styles, css2) {

    var nqStore = new nqDocStore();
    var userName = null;
    ready(function () {
        request.get('/hello').then(function (data) {
            userName = data == '' ? null : data;
            domattr.set('userNameDiv', 'innerHTML', data);
        }, errorDialog);
        topic.subscribe("/dojo/hashchange", interpretHash);
        on(registry.byId('loginButtonId'), 'click', function (event) {
            login();
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
        var slaveContentPane = registry.byId('placeholder');
        var widPromise = drawBorderContainer(slaveContentPane, getState(0).pageId, 0);
        when(widPromise, function(res){
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
                    widget.setDocId(state.docIdPreviousLevel);
                    //widget.setSelectedObjIdThisLevel(state.docId);
                });
            }
        },nq.errorDialog);
    }
    function drawBorderContainer(parentContentPane, pageId, level) {
        if(!pageId) return false;
        return nqStore.get(pageId).then(function (pageObj) {
            if(registry.byId(pageId)){// this page is already drawn, but the next level might need drawing
                var tabsPromises = [];
                if(pageObj.divider == 'Horizontal' || pageObj.divider == 'Vertical'){
                    var slaveContentPane = registry.byId('slave.'+pageId);
                    tabsPromises.push(drawBorderContainer(slaveContentPane,  getState(level+1).pageId, level + 1));//Draw the next level into the center pane
                }
                var tabNum = 0;
                if(pageObj.tabs) pageObj.tabs.forEach(function (tabObj) {
                    //Does the tabObj have a pageId (instead of widgets)?. It wont be empty but the next level might be. Let drawBorderContainer find out.
                    var tabPane = registry.byId(pageId+'.'+tabNum);
                    if(tabObj.pageId) tabsPromises.push(drawBorderContainer(tabPane, tabObj.pageId, level));
                    tabNum++;
                });
                return all(tabsPromises);
            }
            parentContentPane.destroyDescendants(false);
            var tabsPromisies = [];
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
                tabsPromisies.push(drawAccordionsOrTabs(pageObj, leftPane, level));//Fill the left pane with tabs/accordions as needed
                tabsPromisies.push(drawBorderContainer(centerPane,  getState(level+1).pageId, level + 1));//Draw the next level into the center pane
            }
            else {
                //There is no border container at this level, so go ahead and use the parent content pane
                tabsPromisies.push(drawAccordionsOrTabs(pageObj, parentContentPane, level));//Fill the parent content pane with tabs/accordions as needed
                //return true;
            }
            return all(tabsPromisies);
        });
    }
    function drawAccordionsOrTabs(pageObj, parentContentPane, level) {
        var tabsPromises = [];
        //Is there only one tab? skip the tab container and just use the parent content pane
        if (pageObj.tabs.length <= 1) {
            var tabPane = new ContentPane({
                id: pageObj._id,
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
        return nqStore.get(pageId).then(function(pageObj){
            var widgetPromises = [];
            var widNum = 0;
            var tabObj = pageObj.tabs[tabPane.tabNum];
            if(!tabObj.widgets) return false;
            tabObj.widgets.forEach(function (widget) {
                widgetPromises.push(nqStore.getSchemaForView(widget.viewId).then(function(schema){
                    var parms = {
                        id: pageId + '.' + tabPane.tabNum + '.' + widNum,
                        pageId: pageId,
                        tabNum: tabPane.tabNum,
                        widNum: widNum,
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
                    widNum++;
                }));
            });
            return all(widgetPromises);
        });
    }

    //////////////////////////////////////////////////////////////////////////////
    //Helpers
    //////////////////////////////////////////////////////////////////////////////
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
        console.log(indent, wid0.id, wid0.declaredClass, wid0.region);
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
            if(w0Arr.length >1) throw new Error('too many');
            if(w0Arr.length ==1){
                var wid1 = w0Arr[0];
                if(wid1.declaredClass.substring(0,13) == 'dijit.layout.'){
                    return getSelectedTabRecursive(wid1, indent+'-');
                }
            }
        }
        return wid0;
    }
});