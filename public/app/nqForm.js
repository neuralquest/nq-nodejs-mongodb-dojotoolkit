define(['dojo/_base/declare', "app/nqWidgetBase","dojo/when"],
    function(declare, nqWidgetBase, when){
        return declare("nqForm", [nqWidgetBase],{
            _setDocIdAttr: function(docId){
                this.inherited(arguments);
                var self = this;
                if(!this.docId) return;
                var docCol = this.store.filter({_id: this.docId});
                docCol.on('update', function(event){
                    docCol.fetch().then(function(docsArr){
                        var doc = docsArr[0];
                        self.setFromValues(self.schema.properties, doc, self.pane.containerNode);
                    });
                });
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
                        when(self.store.amAuthorizedToUpdate(doc), function(updateAllowed) {
                            if(self.amAuthorizedToUpdate != updateAllowed) newFormNeeded = true;
                            self.amAuthorizedToUpdate = updateAllowed;
                            if(newFormNeeded) self.renderForm(schema.properties, self.pane.containerNode);
                            self.setFromValues(schema.properties, doc, self.pane.containerNode);
                        });
                    });
                });
            }
        });
    });
