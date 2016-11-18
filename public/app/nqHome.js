define(['dojo/_base/declare', 'dojo/dom-construct', "app/nqWidgetBase", "dojo/dom-attr"],
	function(declare, domConstruct,  nqWidgetBase, domAttr){

	return declare("nqHome", [nqWidgetBase], {
        buildRendering: function(){
            this.inherited(arguments);
            domAttr.set(this.pane.containerNode, 'style', {
                '-webkit-column-width': '300px', /* Chrome, Safari, Opera */
                '-moz-column-width': '300px', /* Firefox */
                'column-width': '300px',
                'max-width':'900px',
                'padding-left': '10px',
                'padding-right': '10px',
                background:'backgroundClass'});
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
            var desc = item.description?item.description:this.schema.properties.description.default;
            domConstruct.create('div', {innerHTML: desc}, self.pane.containerNode);
        }
	});
});
