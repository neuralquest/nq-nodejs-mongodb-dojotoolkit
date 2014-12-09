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

			var PERMITTEDVAULE_CLASS_ID = 58;
			var RTF_CLASS_ID = 65;
			var DATE_CLASS_ID = 52;
			var STRING_CLASS_ID = 54;
			var INTEGER_CLASS_ID = 55;
			var NUMBER_CLASS_ID = 56;
			var BOOLEAN_CLASS_ID = 57;
			var CLASSNAME_CLASS_ID = 101;
			
			var item = null;
			var tableNode = domConstruct.create('table', {style: 'border-spacing:5px;'}, this.pane.containerNode);
			var self = this;
			when(this.getAttrRefProperties(this.viewId), function(propertiesArr){
				for(var i=0;i<propertiesArr.length;i++){
					var property = propertiesArr[i];
				
					var row = domConstruct.create("tr", null, tableNode);
					
					//the label
					domConstruct.create("td", {innerHTML: (property.label), style: "padding: 3px"}, row);
					
					//the dijit
					var tdDom = domConstruct.create("td", {style: "padding: 3px; border-width:1px; border-color:lightgray; border-style:solid;"}, row);/*background: rgba(249, 249, 182, 0.5)*/
					var dijit = null;
					switch(property.attrClassType){
					case PERMITTEDVAULE_CLASS_ID: //defect not being called
						dijit = new Select(property.editorArgs, domConstruct.create('div'));
						break;	
					case RTF_CLASS_ID:
						self.editorToolbarDivNode.appendChild(property.editorArgs.toolbar.domNode);
						//initially show the toolbar div
						//domStyle.set(self.editorToolbarDivNode, 'display' , '');

						/*property.height = '';//auto grow
						property.extraPlugins = self.extraPlugins;
						property.toolbar = toolbar;
						//self.own(toolbar);
						//property.styleSheet = 'css/editor.css';
						property.value = '<p></p>';
						dijit = new Editor(property, domConstruct.create('div'));*/
						dijit = new Editor(property.editorArgs, domConstruct.create('div'));
//						dijit.addStyleSheet('css/editor.css');
						dijit.on("NormalizedDisplayChanged", function(event){
							var height = domGeometry.getMarginSize(dijit.domNode).h;
							if(has("opera")){
								height = this.editNode.scrollHeight;
							}
							this.resize({h: height});
						});
						//dijit.destroy = function(){console.log('destroyed editor')};
							
						break;	
					case DATE_CLASS_ID:
						dijit = new DateTextBox(property, domConstruct.create('input'));
						break;	
					case STRING_CLASS_ID:
						property.type = 'text';
						dijit = new ValidationTextBox(property, domConstruct.create('input'));
						break;	
					case INTEGER_CLASS_ID: 
						dijit = new NumberTextBox(property, domConstruct.create('input'));
						break;	
					case NUMBER_CLASS_ID: 
						dijit = new NumberTextBox(property, domConstruct.create('input'));
						break;	
					case BOOLEAN_CLASS_ID: 
						dijit = new CheckBox(property, domConstruct.create('input'));
						break;
					case CLASSNAME_CLASS_ID:
						property.type = 'text';
						dijit = new ValidationTextBox(property, domConstruct.create('input'));
						break;
					default:
						//domAttr.set(tdDom, 'name', property.field); // set
						//tdDom.set('name', property.name);
						//property.type = 'text';
						dijit = new ValidationTextBox(property, domConstruct.create('input'));
						break;
					};
					if(dijit){
						self.own(dijit);
						tdDom.appendChild(dijit.domNode);
						dijit.attributeReferenceId = property.name;
						self.pane.own(dijit.on('change', function(value){
							self.item[this.attributeReferenceId] = value;
							self.store.put(self.item);
						}));
						//dijit.startup();will be call after add child and then from widget base
					}
					//else html.set(tdDom, 'unknown attribute type: '+property.attrClassType); 
					
					//the help text
					domConstruct.create("td", { innerHTML: (property.helpText), style: "padding: 3px", 'class': 'helpTextInvisable'}, row);
				}
				
				self.createDeferred.resolve(self);//ready to be loaded with data

			}, nq.errorDialog);
		},
		setSelectedObjIdPreviousLevel: function(value){
			//load the data
			//if(this.selectedObjIdPreviousLevel == value) return this;
			this.selectedObjIdPreviousLevel = value;
			
			var self = this;

			var q = {itemId:this.selectedObjIdPreviousLevel, viewId:this.viewId};
			var collection = this.store.filter(q);
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
					wid.set('value',self.item[attrRefId], false);// do not fire change
				});
		    }
			self.setSelectedObjIdPreviousLevelDeferred.resolve(self);
			return this.setSelectedObjIdPreviousLevelDeferred.promise;
		}
	});

});
