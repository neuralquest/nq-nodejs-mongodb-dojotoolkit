define(['dojo/_base/declare', 'dojo/_base/array', 'dijit/form/Select', 'dijit/Toolbar', 'dijit/form/DateTextBox',  'dijit/form/NumberTextBox', 
        'dijit/form/CheckBox', 'dijit/Editor', 'dijit/form/CurrencyTextBox', 'dijit/form/ValidationTextBox', 'dojo/dom-construct', "dojo/on", 
        "dojo/when", "dojo/query", 'dijit/registry', "app/nqWidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/sniff", "dojo/_base/lang",
        "dojo/promise/all", "dojo/html", 'dojo/store/Memory', "dojo/dom-style","dojo/dom-attr",

        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins', 
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
	function(declare, arrayUtil, Select, Toolbar, DateTextBox, NumberTextBox, 
			CheckBox, Editor, CurrencyTextBox, ValidationTextBox, domConstruct, on, 
			when, query, registry, nqWidgetBase, ContentPane, domGeometry, has, lang, 
			all, html, Memory, domStyle, domAttr){
   
	return declare("nqForm", [nqWidgetBase], {
		postCreate: function(){
            this.inherited(arguments);
            var self = this;
            var tableNode = domConstruct.create('table', {style: 'border-spacing:5px;'}, this.pane.containerNode);
            return self.store.get(self.widgetId).then(function(widget){
                self.widget = widget;
                self.headerDivNode.innerHTML = '<h1>'+widget.name+'</h1>';
                self.pageHelpTextDiv.innerHTML = widget.description;
                return self.store.getItemsByAssocTypeAndDestClass(self.widgetId, 'manyToMany', VIEW_CLASS_TYPE).then(function(viewsArr) {
                    self.view = viewsArr[0]//for now assume only one view
                    return self.store.getCombinedSchemaForView(self.view).then(function(schema) {
                        self.enrichSchema(schema);
                        for(var attrName in schema){
                            var attribute = schema[attrName];
                            var row = domConstruct.create("tr", null, tableNode);
                            //the label
                            domConstruct.create("td", {innerHTML: (attribute.label), style: "padding: 3px"}, row);
                            if(attribute.dijitType == 'RichText'){//place the editor on a new row with colspan 2
                                row = domConstruct.create("tr", null, tableNode);
                            }
                            var tdDom = domConstruct.create("td", {style: "padding: 3px; border-width:1px; border-color:lightgray; border-style:solid;"}, row);
                            //the dijit
                            var dijit = null;
                            if(attribute.dijitType == 'Select') {
                                dijit = new Select(attribute.editorArgs, domConstruct.create('div'));
                            }
                            else if(attribute.dijitType == 'RichText') {
                                dijit = new Editor(attribute, domConstruct.create('div', {name: attribute.name}));/*setting the name wont be done autoamticly*/
                                //						dijit.addStyleSheet('css/editor.css');
                                dijit.on("NormalizedDisplayChanged", function(event){
                                    var height = domGeometry.getMarginSize(this.editNode).h;
                                    if(has("opera")){
                                        height = this.editNode.scrollHeight;
                                    }
                                    //console.log('height',domGeometry.getMarginSize(this.editNode));
                                    //this.resize({h: height});
                                    domGeometry.setMarginBox(this.iframe, { h: height });
                                });
                                //dijit.destroy = function(){console.log('destroyed editor')};
                                domAttr.set(tdDom, 'colspan', '2');
                            }
                            else if(attribute.dijitType == 'Number') {
                                dijit = new NumberTextBox(attribute, domConstruct.create('input'));
                            }
                            else if(attribute.dijitType == 'Date') {
                                dijit = new DateTextBox(attribute, domConstruct.create('input'));
                            }
                            else if(attribute.dijitType == 'String'){
                                dijit = new ValidationTextBox(attribute, domConstruct.create('input'));
                            }
                            if(dijit){
                                self.own(dijit);
                                tdDom.appendChild(dijit.domNode);
                                dijit.attributeReferenceId = attribute.name;
                                self.pane.own(dijit.on('change', function(value){
                                    //self.item[this.attributeReferenceId] = value;
                                    //self.store.put(self.item);
                                }));
                                //dijit.startup();will be call after add child and then from widget base
                            }
                            domConstruct.create("td", { innerHTML: (attribute.description), style: "padding: 3px", 'class': 'helpTextInvisable'}, row);
                        };
                        self.createDeferred.resolve(self);//ready to be loaded with data
                        return self;
                    });
                });
            }, nq.errorDialog);
		},
		setSelectedObjIdPreviousLevel: function(value){
			//load the data
			//if(this.selectedObjIdPreviousLevel == value) return this;
			this.selectedObjIdPreviousLevel = value;
			
			var self = this;

			var collection = this.store.filter({itemId:this.selectedObjIdPreviousLevel});
			collection.on('update', function(event){
				var obj = event.target;
				self.onChange(obj);
			});	
			var children = collection.fetch();
			self.item = children[0];
			for(attrRefId in self.item){
				var attrQuery = "[name='"+attrRefId+"']";
				query(attrQuery).forEach(function(input){
					var wid = registry.getEnclosingWidget(input);
					var value = self.item[attrRefId];
					var widType = wid.declaredClass;
					/*console.log('widType', widType);
					if(!value){
						//if(widType == "dijit.form.Select") value = -1;
						if(widType == "dijit.form.ValidationTextBox") value = '[no value]';
						if(widType == "dijit.form.NumberTextBox") value = 'null';
						if(widType == "dijit.Editor") value = '<p>[no text]</p>';
					}*/
					wid.set('value',value, false);// do not fire change
				});
		    }
			self.setSelectedObjIdPreviousLevelDeferred.resolve(self);
			return this.setSelectedObjIdPreviousLevelDeferred.promise;
		}
	});

});
