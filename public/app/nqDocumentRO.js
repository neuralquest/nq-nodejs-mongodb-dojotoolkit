define(['dojo/_base/declare', 'dojo/dom-construct', "dojo/dom-attr", "dojo/promise/all", 'dojo/when', 'dijit/registry', 'dijit/layout/ContentPane'],
	function(declare, domConstruct, domAttr, all, when, registry, ContentPane){
	return declare("nqDocumentRO", [nqWidgetBase], {
        buildRendering: function(){
            this.inherited(arguments);
            domAttr.set(this.pane.containerNode, 'style', {'padding-left': '10px', 'padding-right': '10px'});
        },
        _setDocIdAttr: function(docId){
            this.inherited(arguments);
            var self = this;
            if(!this.docId) return;
            var docCol = this.store.filter({_id: this.docId});
            this.own(docCol.on('update', function(event){
                docCol.fetch().then(function(docsArr){
                    var doc = docsArr[0];
                    self.buildPage(doc);
                });
            }));
            docCol.fetch().then(function(docsArr){
                var doc = docsArr[0];
				self.buildPage(doc);
            });
        },
        buildPage: function(item){
            var self = this;
			self.pane.destroyDescendants(false);//destroy all the widgets but leave the pane intact
            var docDom = domConstruct.create('div');
            when(self.generateNextLevelContents(docDom, item, 1, null, false), function(obj){
				domConstruct.place(docDom, self.pane.containerNode, 'last');
            });
        },
		//Create an ordinary HTML page recursively by obtaining data from the server
        generateNextLevelContents: function(docDom, item, headerLevel, parentId, previousParagraphHasRightFloat){
            var self = this;
            var divDom = domConstruct.create('div', {id: item._id}, docDom);
            //Header
            domConstruct.create(
                'h'+headerLevel,
                {innerHTML: item.name, style: {'clear': previousParagraphHasRightFloat?'both':'none'}},
                divDom
            );
            if(item.insets){
                item.insets.forEach(function(inset){
                    if(inset.media){
                        if(inset.media.mediaType == 'img/png'){
                            //image
                            domConstruct.create("img", {style:{float :'right', 'margin-left':'10px'}, src: inset.url, width: 300}, divDom);
                        }
                        if(inset.media.mediaType == 'widget/3D Class Model'){
                            //image
                            domConstruct.create("img", {style:{float :'right', 'margin-left':'10px'}, src: inset.url, width: 300}, divDom);
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
                            var widgetObj = new nqClassChart(parms, domConstruct.create('div'));
                            tabPane.addChild(widgetObj);
                        }
                    }
                });
            }
            var pDom = dojo.toDom(item.description);
            domConstruct.place(pDom, divDom, 'last');

            var childrenFilter = this.store.buildFilterFromQuery(item, this.schema.childrenQuery);
            if(childrenFilter){
                var childrenCollection = this.store.filter(childrenFilter);
                var childDocPromises = [];
                childrenCollection.forEach(function(childItem){
                    var previousParagraphHasRightFloat = false;
                    childDocPromises.push(self.generateNextLevelContents(docDom, childItem, headerLevel+1, item._id, previousParagraphHasRightFloat));
                    //previousParagraphHasRightFloat = childItem.description && childItem.description.indexOf('floatright')==-1?false:true;
                });
                return all(childDocPromises);
            }
            return true;
        }
	});
});
