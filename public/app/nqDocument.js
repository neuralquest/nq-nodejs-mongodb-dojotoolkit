define(['dojo/_base/declare', 'dojo/_base/array', "dojo/_base/lang",'dojo/dom-construct', "dojo/dom-attr", "dojo/promise/all", 'dojo/when', 'dijit/registry', 'dijit/layout/ContentPane',
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
        "dojox/editor/plugins/SafePaste"

        //'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins',"dijit._editor.plugins.FontChoice", 'dijit/WidgetSet'
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
    function(declare, array, lang, domConstruct, domAttr, all, when, registry, ContentPane,
             Toolbar, ValidationTextBox, Editor, nqWidgetBase, on, domGeometry,
             has, ToggleButton, dom, attr, domProp, NodeList,
             nqClassChart, domStyle, query, mouse, css3){
	return declare("nqDocument", [nqWidgetBase], {
        buildRendering: function(){
            var self = this;
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
            if(!this.editMode) {
                var editButton = new ToggleButton({
                    showLabel: false,
                    label: 'Edit',
                    iconClass: 'editIcon',
                    //style : {position: 'absolute', right: '0px', top: '0px'},
                    onChange: function (value) {
                        self.editMode = value;
                        self.buildPage();
                    }
                });
            }
            this.editorToolbarDivNode.appendChild(editButton.domNode);
            //initially show the toolbar div
            domStyle.set(this.editorToolbarDivNode, 'display' , 'block');
        },
        _setDocIdAttr: function(docId){
            if (docId == this.docId) return;
            this.inherited(arguments);
            var self = this;
            if(!this.docId) return;
            if(!this.schema.rootQuery) return;

            this.docCol = this.store.getCollectionForSubstitutedQuery(this.schema.rootQuery, this.docId, this.docId);
            this.own(this.docCol.on('update', function(event){
                self.buildPage();
            }));
            this.buildPage();
        },
        buildPage: function(item){
            var self = this;
            self.pane.destroyDescendants(false);//destroy all the widgets but leave the pane intact
            var docDom = domConstruct.create('div');
            this.docCol.fetch().then(function(docsArr){
                var doc = docsArr.length>0?docsArr[0]:{};
                when(self.generateNextLevelContents(docDom, doc, 1), function(obj){
                    if(self.editMode){
                        // Create toolbar and place it at the top of the page
                        var toolbar = new Toolbar();
                        self.editorToolbarDivNode.appendChild(toolbar.domNode);
                        //Paragraph
                        var dijit = new Editor({
                            'height': '', //auto grow
                            'minHeight': '30px',
                            plugins: self.plugins,
                            //'extraPlugins': [{name: 'formatBlock', plainText: true},'viewSource'],
                            'toolbar': toolbar,
                            focusOnLoad: true//,
                            //'onChange': self.interpretPage
                        }, domConstruct.create('div'));
                        self.own(dijit.on('change', dojo.hitch(self,self.interpretPage)));
                        dijit.addStyleSheet('app/resources/editor.css');
                        //Needed for auto sizing, found it in AlwaysShowToolbar in the dijit library
                        self.own(dijit.on('NormalizedDisplayChanged', lang.hitch(dijit, function(event){
                            // summary:
                            //		Updates the height of the editor area to fit the contents.
                            var e = this;
                            if(!e.isLoaded){
                                return;
                            }
                            if(e.height){
                                return;
                            }

                            var height = domGeometry.getMarginSize(e.editNode).h;
                            if(has("opera")){
                                height = e.editNode.scrollHeight;
                            }
                            // console.debug('height',height);
                            // alert(this.editNode);

                            //height maybe zero in some cases even though the content is not empty,
                            //we try the height of body instead
                            if(!height){
                                height = domGeometry.getMarginSize(e.document.body).h;
                            }

                            if(this._fixEnabled){
                                // #16204: add toolbar height when it is fixed aka "stuck to the top of the screen" to prevent content from cutting off during autosizing.
                                // Seems like _updateHeight should be taking the intitial margin height from a more appropriate node that includes the marginTop set in globalOnScrollHandler.
                                height += domGeometry.getMarginSize(this.editor.header).h;
                            }

                            if(height == 0){
                                console.debug("Can not figure out the height of the editing area!");
                                return; //prevent setting height to 0
                            }
                            if(has("ie") <= 7 && this.editor.minHeight){
                                var min = parseInt(this.editor.minHeight);
                                if(height < min){
                                    height = min;
                                }
                            }
                            if(height != this._lastHeight){
                                this._lastHeight = height;
                                // this.editorObject.style.height = this._lastHeight + "px";
                                domGeometry.setMarginBox(e.iframe, { h: this._lastHeight });
                            }
                        })));
                        domConstruct.place(dijit.domNode, self.pane.containerNode, 'last');
                        //domConstruct.place(editorDijit.domNode, replaceDiv, "replace");
                        dijit.startup();
                        //console.log(docDom);
                        dijit.set('value', docDom.innerHTML);
                    }
                    else domConstruct.place(docDom, self.pane.containerNode, 'last');
                });
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

            var childrenCollection = self.store.getCollectionForSubstitutedQuery(this.schema.query[0], item, this.docId);
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
        },
        interpretPage: function(docString){
            var self = this;
            //var docString = self.editorDijit.get('value');
            //var docString = self.editorDijit.editNode.innerHTML;
            var docDom = dojo.toDom(docString);
            //var nl = new NodeList(docDom.childNodes);
            //var h1List = query("h1", docDom);
            docDom.childNodes.forEach(function(dom){
                var nodeName = domProp.get(dom, 'nodeName');
                if(nodeName == 'DIV'){
                    var id = attr.get(dom, 'id');
                    if(id){
                        var update = false;
                        self.store.get(id).then(function(storedItem){
                            var newParagraphParts = [];
                            dom.childNodes.forEach(function(domToUpdate) {
                                var nodeNameToUpdate = domProp.get(domToUpdate, 'nodeName');
                                if(nodeNameToUpdate.charAt(0) == 'H') {
                                    var newText = attr.get(domToUpdate, 'innerHTML');
                                    if(storedItem.name != newText){
                                        update = true;
                                        storedItem.name = newText;
                                    }
                                }
                                else if(nodeNameToUpdate == 'P'){
                                    var newText = attr.get(domToUpdate, 'innerHTML');
                                    if(storedItem.description != newText){
                                        update = true;
                                        storedItem.description = newText;
                                    }
                                }
                                else if(nodeNameToUpdate == 'DIV'){
                                    //newParagraphParts.push(domToUpdate.outerHTML);
                                }
                                //var value = domToUpdate.outerHTML;
                                //console.log(domToUpdate);
                            });
                            /*if(!newParagraphParts.isEqualNode(storedItem.paragraphParts)){
                             update = true;
                             storedItem.paragraphParts = newParagraphParts;
                             }*/
                            if(update) self.store.put(storedItem, {viewId:self.schema._id});
                        });
                    }
                }
            });
        },



        plugins: [
            //'collapsibletoolbar', 'breadcrumb', 'newpage', 'save',
            {name: 'viewSource', stripScripts: true, stripComments: true},
            //'showBlockNodes', '|',{name: 'fullscreen', zIndex: 900},
            'preview', 'print', '|',
            'findreplace', 'selectAll', 'cut', 'copy','paste', 'pastefromword', 'delete', '|', 'undo', 'redo', '|',
            'pageBreak', 'insertHorizontalRule', 'insertOrderedList', 'insertUnorderedList', 'indent', 'outdent', 'blockquote', '|',
            'justifyLeft', 'justifyRight', 'justifyCenter', 'justifyFull', 'toggleDir', '|',
            'bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'foreColor', 'hiliteColor', 'removeFormat', '|',
            'insertEntity', 'smiley', 'createLink', 'insertanchor', 'unlink', 'insertImage', '||',
            //{name: 'nqLocalImage', uploadable: true, uploadUrl: '/upload', baseImageUrl: '/app/resources/Neuralquest'},
            //'fontName', {name: 'fontSize', plainText: true}, {name: 'formatBlock', plainText: true},// '||',

            /*{name: 'dojox.editor.plugins.TablePlugins', command: 'insertTable'},
             {name: 'dojox.editor.plugins.TablePlugins', command: 'modifyTable'},
             {name: 'dojox.editor.plugins.TablePlugins', command: 'InsertTableRowBefore'},
             {name: 'dojox.editor.plugins.TablePlugins', command: 'InsertTableRowAfter'},
             {name: 'dojox.editor.plugins.TablePlugins', command: 'insertTableColumnBefore'},
             {name: 'dojox.editor.plugins.TablePlugins', command: 'insertTableColumnAfter'},
             {name: 'dojox.editor.plugins.TablePlugins', command: 'deleteTableRow'},
             {name: 'dojox.editor.plugins.TablePlugins', command: 'deleteTableColumn'},
             {name: 'dojox.editor.plugins.TablePlugins', command: 'colorTableCell'},
             {name: 'dojox.editor.plugins.TablePlugins', command: 'tableContextMenu'},*/
            //Pretty Print messes with the format of the result
            //{name: 'prettyprint', indentBy: 3, lineLength: 80, entityMap: dojox.html.entities.html.concat(dojox.html.entities.latin)},
            {name: 'dijit._editor.plugins.EnterKeyHandling', blockNodeForEnter: "Br"},
            'normalizeindentoutdent', 'normalizestyle', {name: 'statusbar', resizer: false}, "safepaste"
        ],
	});
});
