define(['dojo/_base/declare', 'dojo/dom-construct', "dojo/promise/all", 'dojo/when', 'dijit/registry', 'dijit/layout/ContentPane',
        'dijit/Toolbar', 'dijit/form/ValidationTextBox', 'dijit/Editor', "app/nqWidgetBase"],
	function(declare, domConstruct, all, when, registry, ContentPane,
			Toolbar, ValidationTextBox, Editor, nqWidgetBase){

	return declare("nqHome", [nqWidgetBase], {
        _setDocIdAttr: function(docId){
            //if(docId == this.docId) return;
            this.inherited(arguments);
            var self = this;
            if(!this.docId) return;
			//load the data
            var docCol = this.store.filter({_id: this.docId});
            docCol.on('update', function(event){
                docCol.fetch().then(function(docsArr){
                    var doc = docsArr[0];
                    self.buildPage(doc);
                });
            });
            docCol.fetch().then(function(docsArr){
                var doc = docsArr[0];
                self.buildPage(doc);
            });
		},
        buildPage: function(item){
            var self = this;
            self.pane.destroyDescendants(false);
			//Header
            var headerDiv = domConstruct.create('div', {style:{position: 'relative'}}, self.pane.containerNode);
            domConstruct.create('img', {src:item.bannerUrl, width: '100%', height: '150px'}, headerDiv);
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
