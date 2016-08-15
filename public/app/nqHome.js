define(['dojo/_base/declare', 'dojo/dom-construct', "dojo/promise/all", 'dojo/when', 'dijit/registry', 'dijit/layout/ContentPane',
        'dijit/Toolbar', 'dijit/form/ValidationTextBox', 'dijit/Editor', "app/nqWidgetBase", "dojo/dom-attr"],
	function(declare, domConstruct, all, when, registry, ContentPane,
			Toolbar, ValidationTextBox, Editor, nqWidgetBase, domAttr){

	return declare("nqHome", [nqWidgetBase], {
        buildRendering: function(){
            this.inherited(arguments);
            domAttr.set(this.pane.containerNode, 'style', {'padding-left': '10px', 'padding-right': '10px'});
        },
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
            domConstruct.create('h1', {innerHTML: 'What?'}, self.pane.containerNode);
            domConstruct.create('p', {innerHTML: item.what}, self.pane.containerNode);
            domConstruct.create('h1', {innerHTML: 'Why?'}, self.pane.containerNode);
            domConstruct.create('p', {innerHTML: item.why}, self.pane.containerNode);
            domConstruct.create('h1', {innerHTML: 'How?'}, self.pane.containerNode);
            domConstruct.create('p', {innerHTML: item.how}, self.pane.containerNode);
        }
	});
});
