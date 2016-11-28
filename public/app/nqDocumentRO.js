define(['dojo/_base/declare', "dojo/_base/array",'dojo/dom-construct', "dojo/dom-attr", "dojo/promise/all", "dojo/_base/lang",'dojo/when', "dijit/form/ToggleButton", "dojo/dom-style"],
	function(declare, array, domConstruct, domAttr, all, lang, when, ToggleButton, domStyle){
	return declare("nqDocumentRO", [nqWidgetBase], {
        buildRendering: function(){
            this.inherited(arguments);
            domAttr.set(this.pane.containerNode, 'style', {'padding-left': '10px', 'padding-right': '10px',  'max-width':'800px'});
            /*domAttr.set(this.pane.containerNode, 'style', {
                '-webkit-column-width': '300px', /* Chrome, Safari, Opera * /
                '-moz-column-width': '300px', /* Firefox * /
                'column-width': '300px',
                'max-width':'900px',
                'padding-left': '10px',
                'padding-right': '10px',
                background:'backgroundClass'});*/
            var editButton = new ToggleButton({
                showLabel: false,
                label: 'Edit',
                iconClass: 'editIcon',
                //style : {position: 'absolute', right: '0px', top: '0px'},
                onChange: function(value){
                    this.editMode = value;
                }
            });
            this.editorToolbarDivNode.appendChild(editButton.domNode);
            //initially show the toolbar div
            domStyle.set(this.editorToolbarDivNode, 'display' , 'block');
        },
        _setDocIdAttr: function(docId){
            this.inherited(arguments);
            var self = this;
            if(!this.docId) return;

            var collection = self.store.getCollectionForSubstitutedQuery(self.schema.rootQuery, this.docId, this.docId);
            collection.on('update', function(event){
                collection.fetch().then(function(docsArr){
                    var doc = docsArr[0];
                    self.buildPage(doc);
                });
            });
            collection.fetch().then(function(docsArr){
                var doc = docsArr[0];
                self.buildPage(doc);
            });
            /*var docCol = this.store.filter({_id: this.docId});
            this.own(docCol.on('update', function(event){
                docCol.fetch().then(function(docsArr){
                    var doc = docsArr[0];
                    self.buildPage(doc);
                });
            }));
            docCol.fetch().then(function(docsArr){
                var doc = docsArr[0];
				self.buildPage(doc);
            });*/
        },
        buildPage: function(item){
            var self = this;
			self.pane.destroyDescendants(false);//destroy all the widgets but leave the pane intact
            var docDom = domConstruct.create('div');
            when(self.generateNextLevelContents(docDom, item, 1), function(obj){
				domConstruct.place(docDom, self.pane.containerNode, 'last');
            });
        },
		//Create an ordinary HTML page recursively by obtaining data from the server
        generateNextLevelContents: function(docDom, item, headerLevel){
            var self = this;
            var divDom = domConstruct.create('div', {id: item._id}, docDom);
            //Header
            domConstruct.create(
                'h'+headerLevel,
                {innerHTML: item.name, style: {'clear': headerLevel<3?'both':'none'}},
                divDom
            );
            if(item.insets){
                item.insets.forEach(function(inset){
                    if(inset.media){
                        if(inset.media.mediaType == 'image/png'){
                            domConstruct.create("img", {style:{float :'right', 'margin-left':'10px'}, src: inset.url, width: inset.width}, divDom);
                        }
                        if(inset.media.mediaType == 'widget/3D Class Model'){
                            domConstruct.create("img", {style:{float :'right', 'margin-left':'10px'}, src: inset.url, width: inset.width}, divDom);
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

            var childrenCollection = self.store.getCollectionForSubstitutedQuery(this.schema.query, item, this.docId);
            var correctChildObjArr = [];
            childrenCollection.forEach(function(childObj){
                var position = array.indexOf(item.childDocs, childObj._id);
                correctChildObjArr[position] = childObj;
            });
            var childDocPromises = [];
            correctChildObjArr.forEach(function(childItem){
                childDocPromises.push(self.generateNextLevelContents(docDom, childItem, headerLevel+1));
            });
            return all(childDocPromises);
        }
	});
});
