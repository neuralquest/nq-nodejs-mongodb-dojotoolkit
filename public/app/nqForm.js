define(['dojo/_base/declare', "dojo/_base/lang", "app/nqWidgetBase","dojo/when",  "dojo/dom-attr", "dijit/form/ToggleButton"],
    function(declare, lang, nqWidgetBase, when, domAttr, ToggleButton){
        return declare("nqForm", [nqWidgetBase],{
            buildRendering: function(){
                this.inherited(arguments);
                domAttr.set(this.pane.containerNode, 'style', {'padding-left': '10px', 'padding-right': '10px'});
                var editButton = new ToggleButton({
                    showLabel: true,
                    label: 'Edit',
                    iconClass: 'editIcon',
                    value: false,
                    style : {position: 'absolute', right: '0px', top: '0px'},
                    onChange: function(value){
                        this.editMode = value;
                    }
                });
                this.pane.domNode.appendChild(editButton.domNode);
            },
            _setDocIdAttr: function(docId){
                if(docId == this.docId) return;
                this.inherited(arguments);
                var self = this;
                if(!this.docId) return;
                if('rootQuery' in this.schema){
                    var docCol = self.store.getCollectionForSubstitutedQuery(this.schema.rootQuery, this.docId, this.docId);
                    docCol.fetch().then(function(docsArr){
                        var doc = docsArr[0];
                        var promise;
                        var newFormNeeded = false;
                        if(!self.schema && doc.docType == 'object'){
                            newFormNeeded = true;
                            promise = self.store.getInheritedClassSchema(doc.classId);
                        }
                        else promise = false;
                        when(promise, function(inheritedClassSchema){
                            var schema = self.schema;
                            if(inheritedClassSchema) schema = inheritedClassSchema;
                            when(self.store.amAuthorizedToUpdate(doc), function(owner) {
                                //if(self.amAuthorizedToUpdate != updateAllowed) newFormNeeded = true;
                                //self.amAuthorizedToUpdate = updateAllowed;
                                //if(newFormNeeded) self.renderForm(schema.properties, self.pane.containerNode);
                                //self.setFromValues(schema.properties, doc, self.pane.containerNode);
                                self.renderNewForm(schema.properties, doc, self.pane.containerNode);
                            });
                        });
                    });
                    this.own(docCol.on('update', function(event){
                        docCol.fetch().then(function(docsArr){
                            var doc = docsArr[0];
                            //self.setFromValues(self.schema.properties, doc, self.pane.containerNode);
                            when(self.store.amAuthorizedToUpdate(doc), function(owner) {
                                self.renderNewForm(self.schema.properties, doc, self.pane.containerNode);
                            });
                        });
                    }));
                }
                else self.renderNewForm(self.schema.properties, {}, self.pane.containerNode);

            }
        });
    });
