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
    "dojox/editor/plugins/SafePaste",

    "app/nqLocalImage"

        //'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins',"dijit._editor.plugins.FontChoice", 'dijit/WidgetSet'
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
	function(declare, domConstruct, all, when, registry, ContentPane,
			Toolbar, ValidationTextBox, Editor, nqWidgetBase, on, domGeometry, 
			has, ToggleButton, dom, attr, domProp, NodeList,
			nqClassChart, domStyle, query, mouse, css3){

	return declare("nqDocument", [nqWidgetBase], {
        buildRendering: function(){
            this.inherited(arguments);
            //domStyle.set(this.pane.containerNode, 'padding-left' , '10px');
            //domStyle.set(this.pane.containerNode, 'padding-right' , '10px');
        },
		setDocId: function(id){
			if(id.length == 0) return;
			var self = this;
			//load the data
            var collection = this.store.filter({_id: id});
            collection.fetch().then(function(children){
                self.buildPage(children[0]);
            });
            collection.on('update', function(event){
                collection.fetch().then(function(children){
                    self.buildPage(children[0]);
                });
            });
		},
        buildPage: function(item){
            var self = this;
			//Header

            var headerDiv = domConstruct.create('div', {style:{position: 'relative'}}, self.pane.containerNode);
            domConstruct.create('img', {src:item.iconSrc, width: '100%', height: '150px'}, headerDiv);
			domConstruct.create('div', {innerHTML: item.name,
                style:{
                    position: 'absolute',
                    top: '40%',
                    width: '100%',
                    'text-align':'center',
                    'font-size': '40px',
                    'font-weight': 'bold',
                    color: 'white'
                }}, headerDiv);
            var docDiv = domConstruct.create('div', {style:{'padding-left': '10px', 'padding-right': '10px'}}, self.pane.containerNode);
            domConstruct.create('h1', {innerHTML: 'What?'}, docDiv);
            domConstruct.create('p', {innerHTML: item.what}, docDiv);
            domConstruct.create('h1', {innerHTML: 'Why?'}, docDiv);
            domConstruct.create('p', {innerHTML: item.why}, docDiv);
            domConstruct.create('h1', {innerHTML: 'How?'}, docDiv);
            domConstruct.create('p', {innerHTML: item.how}, docDiv);
        }
	});
});
