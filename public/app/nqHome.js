define(['dojo/_base/declare', 'dojo/dom-construct', "dojo/promise/all", 'dojo/when', 'dijit/registry', 'dijit/layout/ContentPane',
        'dijit/Toolbar', 'dijit/form/ValidationTextBox', 'dijit/Editor', "app/nqWidgetBase", "dojo/dom-attr"],
	function(declare, domConstruct, all, when, registry, ContentPane,
			Toolbar, ValidationTextBox, Editor, nqWidgetBase, domAttr){

	return declare("nqHome", [nqWidgetBase], {
        buildRendering: function(){
            this.inherited(arguments);
            domAttr.set(this.pane.containerNode, 'style', {'padding-left': '10px', 'padding-right': '10px', background:'backgroundClass'});
        },
        _setDocIdAttr: function(docId){
            //if(docId == this.docId) return;
            this.inherited(arguments);
            var self = this;
            if(!this.docId) return;
			//load the data
            var docCol = this.store.filter({_id: this.docId});
            docCol.fetch().then(function(docsArr){
                var doc = docsArr[0];
                self.buildPage(doc);
            });
            this.own(docCol.on('update', function(event){
                docCol.fetch().then(function(docsArr){
                    var doc = docsArr[0];
                    self.buildPage(doc);
                });
            }));
		},
        buildPage: function(item){
            var self = this;
            self.pane.destroyDescendants(false);
            if(item.bannerUrl){
                var headerDiv = domConstruct.create('div', {style:{position: 'relative'}}, self.headerDivNode);
                domConstruct.create('img', {src:item.bannerUrl, width: '100%', height: '100px'}, headerDiv);
                domConstruct.create('div', {innerHTML: item.name,class: 'headline'}, headerDiv);
            }
            var desc = item.description?item.description:this.schema.properties.description.default;
            domConstruct.create('div', {innerHTML: desc}, self.pane.containerNode);
            /*domConstruct.create('h1', {innerHTML: 'What?'}, self.pane.containerNode);
            domConstruct.create('p', {innerHTML: item.what}, self.pane.containerNode);
            domConstruct.create('h1', {innerHTML: 'Why?'}, self.pane.containerNode);
            domConstruct.create('p', {innerHTML: item.why}, self.pane.containerNode);
            domConstruct.create('h1', {innerHTML: 'How?'}, self.pane.containerNode);
            domConstruct.create('p', {innerHTML: item.how}, self.pane.containerNode);*/
        }
	});
});
