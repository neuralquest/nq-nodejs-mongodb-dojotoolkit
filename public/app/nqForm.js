define(['dojo/_base/declare', 'dojo/_base/array', 'dijit/form/Select', 'dijit/Toolbar', 'dijit/form/DateTextBox',  'dijit/form/NumberTextBox','dijit/form/Textarea',
        'dijit/form/CheckBox', 'dijit/Editor', 'dijit/form/CurrencyTextBox', 'dijit/form/ValidationTextBox', 'dojo/dom-construct', "dojo/on", 
        "dojo/when", "dojo/query", 'dijit/registry', "app/nqWidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/sniff", "dojo/_base/lang",
        "dojo/promise/all", "dojo/html", 'dojo/store/Memory', "dojo/dom-style","dojo/dom-attr", "dojo/json",

        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins', 
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
	function(declare, arrayUtil, Select, Toolbar, DateTextBox, NumberTextBox, Textarea,
			CheckBox, Editor, CurrencyTextBox, ValidationTextBox, domConstruct, on, 
			when, query, registry, nqWidgetBase, ContentPane, domGeometry, has, lang, 
			all, html, Memory, domStyle, domAttr, JSON ){
   
	return declare("nqForm", [nqWidgetBase], {
		postCreate: function(){
            this.inherited(arguments);
            var self = this;
            var tableNode = domConstruct.create('table', {style: 'border-spacing:5px;'}, this.pane.containerNode);
            var initialized = self.store.get(self.widgetId).then(function(widget){
                self.widget = widget;
                self.headerDivNode.innerHTML = '<h1>'+widget.name+'</h1>';
                domStyle.set(self.headerDivNode, 'display', 'block');
                self.pageHelpTextDiv.innerHTML = widget.description;
                return self.store.getItemsByAssocTypeAndDestClass(self.widgetId, 'manyToMany', VIEW_CLASS_TYPE).then(function(viewsArr) {
                    self.view = viewsArr[0];//for now assume only one view
                    return when(self.store.getCombinedSchemaForView(self.view),function(schema) {
                        self.schema = schema;
                        self.enrichSchema(self.schema);
                        return true;
                    });
                });
            });
            when(initialized, function(result){
                for(var attrName in self.schema.properties){
                    var attrProps = self.schema.properties[attrName];
                    attrProps.id = 'dijit:'+self.view._id+':'+attrName;
                    var row = domConstruct.create("tr", null, tableNode);
                    //the label
                    domConstruct.create("td", {innerHTML: (attrProps.label), style: "padding: 3px"}, row);
                    if(attrProps.media && attrProps.media.mediaType == 'text/html' || attrProps.type == 'object'){//place the editor on a new row with colspan 2
                        row = domConstruct.create("tr", null, tableNode);
                    }
                    var tdDom = domConstruct.create("td", {style: "padding: 3px; border-width:1px; border-color:lightgray; border-style:solid;"}, row);
                    var dijit = null;

                    //create the dijit

                    if(attrProps.enum){
                        attrProps.editorArgs.id = 'dijit:'+self.view._id+':'+attrName;
                        dijit = new Select(attrProps.editorArgs, domConstruct.create('div'));
                    }
                    else if(attrProps['#ref']){
                        attrProps.editorArgs.id = 'dijit:'+self.view._id+':'+attrName;
                        dijit = new Select(attrProps.editorArgs, domConstruct.create('div'));
                    }
                    else if(attrProps.media && attrProps.media.mediaType == 'text/html'){
                        dijit = new Editor(attrProps, domConstruct.create('div', {name: attrProps.name}));/*setting the name wont be done autoamticly*/
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
                        domAttr.set(tdDom, 'colspan', '2');
                    }
                    else if(attrProps.type == 'string'){
                        dijit = new ValidationTextBox(attrProps, domConstruct.create('input'));
                    }
                    else if(attrProps.type == 'number') {
                        dijit = new NumberTextBox(attrProps, domConstruct.create('input'));
                    }
                    else if(attrProps.type == 'date'){
                        dijit = new DateTextBox(attrProps, domConstruct.create('input'));
                    }
                    else if(attrProps.type == 'boolean'){
                        dijit = new CheckBox(attrProps, domConstruct.create('input'));
                    }
                    else if(attrProps.type == 'object'){
                        dijit = new Textarea(attrProps, domConstruct.create('input'));
                        domAttr.set(tdDom, 'colspan', '2');
                    }
                    if(dijit){
                        self.own(dijit);
                        tdDom.appendChild(dijit.domNode);
                        dijit.on('change', function(newValue){
                            if(newValue == attrProps.nullValue) newValue=null;
                            else{
                                if(attrProps.type == 'object') newValue = JSON.parse(newValue);
                            }
                            self.item._viewId = self.view._id;
                            self.item[this.name] = newValue;
                            self.store.put(self.item);
                            console.log('self.item', self.item);
                        });
                    }
                    domConstruct.create("td", { innerHTML: (attrProps.description), style: "padding: 3px", 'class': 'helpTextInvisable'}, row);
                }
                self.createDeferred.resolve(self);//ready to be loaded with data
            }, function(err){self.createDeferred.reject(err)});
        },
		setSelectedObjIdPreviousLevel: function(value){
			//load the data
			//if(this.selectedObjIdPreviousLevel == value) return this;
			this.selectedObjIdPreviousLevel = value;
			
			var self = this;

//            var collection = this.store.filter({itemId:1802});
			var collection = this.store.filter({itemId:this.selectedObjIdPreviousLevel, viewId:self.view._id});
			collection.on('update', function(event){
				var obj = event.target;
                //debugger;
                //self.setSelectedObjIdPreviousLevel();
				//self.onChange(obj);
			});	
			var children = collection.fetch();
//            children = children.value;
			self.item = children;
            for(var attrName in self.schema.properties) {
                var attrProps = self.schema.properties[attrName];
                var value = self.item[attrName];
                if(!value) {
                    if(attrProps.defaultValue) value = attrProps.defaultValue;
                    else value = attrProps.nullValue;
                }
                if(attrProps.type == 'object') value = JSON.stringify(value, null, 4);
                var dijitId = 'dijit:'+self.view._id+':'+attrName;
                var wid = registry.byId(dijitId);
                wid.set('value', value, false);// do not fire change
            }
			self.setSelectedObjIdPreviousLevelDeferred.resolve(self);
			return this.setSelectedObjIdPreviousLevelDeferred.promise;
		}
	});

});
