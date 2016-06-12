define(['dojo/_base/declare', "app/nqWidgetBase","dojo/when"],
    function(declare, nqWidgetBase, when){
        return declare("nqForm", [nqWidgetBase],{
            postCreate: function(){
                this.inherited(arguments);
                this.renderForm(this.schema.properties, this.pane.containerNode);
            },
            setDocId: function(id){
                if(id.length == 0) return;
                this.docId = id;
                var self = this;
                var docCol = this.store.filter({_id: id});
                docCol.on('update', function(event){
                    alert('doc update in form');
                    /*var obj = event.target;
                     self.onChange(obj);*/
                });
                docCol.fetch().then(function(docsArr){
                    var doc = docsArr[0];
                    when(self.store.updateAllowed(doc), function(updateAllowed){
                        self.schema.updateAllowed = updateAllowed;
                        self.setFromValues(self.schema.properties, doc, self.pane.containerNode);
                    });
                });
            }
        });
    });
