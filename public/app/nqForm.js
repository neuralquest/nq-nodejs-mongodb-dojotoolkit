define(['dojo/_base/declare', "dojo/_base/lang", "app/nqWidgetBase","dojo/when",  "dojo/dom-attr", "dijit/form/ToggleButton", "dojo/dom-style"],
    function(declare, lang, nqWidgetBase, when, domAttr, ToggleButton, domStyle){
        return declare("nqForm", [nqWidgetBase],{
            editMode: false,
            buildRendering: function(){
                var self = this;
                this.inherited(arguments);
                domAttr.set(this.pane.containerNode, 'style', {'padding-left': '10px', 'padding-right': '10px', 'max-width':'800px'});
                if(!this.editMode) {
                    var editButton = new ToggleButton({
                        value: false,
                        showLabel: false,
                        label: 'Edit',
                        iconClass: 'editIcon',
                        //style : {position: 'absolute', right: '0px', top: '0px'},
                        onChange: function (value) {
                            self.editMode = value;
                            self.buildPage();
                        }
                    });
                    this.editorToolbarDivNode.appendChild(editButton.domNode);
                    //initially show the toolbar div
                    domStyle.set(this.editorToolbarDivNode, 'display', 'block');
                }
            },
            _setDocIdAttr: function(docId) {
                if (docId == this.docId) return;
                var self = this;
                this.inherited(arguments);
                if(!this.docId) return;
                if('rootQuery' in this.schema) {
                    this.docCol = this.store.getCollectionForSubstitutedQuery(this.schema.rootQuery, this.docId, this.docId);
                    this.own(this.docCol.on('update', function(event){
                        self.buildPage();
                    }));
                    this.buildPage();
                }
                else this.buildPage();
            },
            buildPage: function(){
                var self = this;
                if(this.docCol) this.docCol.fetch().then(function(docsArr){
                    var doc = docsArr.length>0?docsArr[0]:{};
                    self.renderNewForm(self.schema.properties, doc, self.pane.containerNode);
                });
                else self.renderNewForm(self.schema.properties, {}, self.pane.containerNode);
            }
        });
    });
