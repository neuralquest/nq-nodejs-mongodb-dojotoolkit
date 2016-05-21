define(['dojo/_base/declare', "app/nqWidgetBase"],
    function(declare, nqWidgetBase){
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
                    self.setFromValues(self.schema.properties, docsArr[0], self.pane.containerNode)
                });
            }
        });
    });
