define(['dojo/_base/declare',  'dojo/dom-construct', "dijit/_WidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry",
        'dojo/_base/array', 'dojo/dom-attr', "dojo/Deferred", "dojo/promise/all", "dojo/when", 'dijit/registry', 'dojo/store/Memory',
        'dijit/Toolbar', 'dijit/form/Select', 'dijit/form/DateTextBox',  'dijit/form/NumberTextBox', 'dijit/form/CheckBox', 'dijit/Editor', 'dijit/form/CurrencyTextBox', 'dijit/form/ValidationTextBox', ],
	function(declare, domConstruct, _WidgetBase, ContentPane, domGeometry, 
			arrayUtil, domAttr, Deferred, all, when, registry, Memory,
			Toolbar, Select, DateTextBox, NumberTextBox, CheckBox, Editor, CurrencyTextBox, ValidationTextBox){
	return declare("nqWidgetBase", [_WidgetBase], {
		readOnly: false,
		store: null,
		widgetDef: {},
		viewDef: {},
		parentId: null,
		viewId: null,
		selectedObjIdPreviousLevel: null,
		selectedObjIdThisLevel: null,
		
		createDeferred: null,
		setSelectedObjIdPreviousLevelDeferred: new Deferred(),
		
		setSelectedObjIdPreviousLevel: function(value){
			this.selectedObjIdPreviousLevel = value;
			return this;
		},
		setSelectedObjIdThisLevel: function(value){
			this.selectedObjIdThisLevel = value;
		},

		buildRendering: function(){
			this.inherited(arguments);
			this.domNode = domConstruct.create("div");
			this.headerDivNode = domConstruct.create('div', {}, this.domNode);//placeholder for header
			this.pageToolbarDivNode = domConstruct.create('div', {'style' : { 'display': 'none', 'min-height': '23px'} }, this.headerDivNode);//placeholder for the page toolbar
			this.editorToolbarDivNode = domConstruct.create('div', {'style' : { 'display': 'none', 'min-height': '23px'} }, this.headerDivNode);//placeholder for the editor toolbar
			this.pageHelpTextDiv = domConstruct.create('div', {'class': 'helpTextInvisable', 'style' : { 'padding': '10px'} }, this.headerDivNode);//placeholder for the helptext
			this.pageHelpTextDiv.innerHTML = this.widgetDef.description;
			this.pane = new ContentPane( {
//				'class' : 'backgroundClass',
				'doLayout' : 'true',
//				'content': 'Some Conetent',
				'style' : { 'overflow': 'auto', 'padding': '10px', 'margin': '0px', width: '100%', height: '100%', background:'transparent'}
			},  domConstruct.create('div'));
			this.domNode.appendChild(this.pane.domNode);
			this.own(this.pane);

		},
		/*postCreate: function(){
			//only do this if we're displaying in a tab 
			this.inherited(arguments);
			var PRIMARY_NAMES = 69;
			var self = this;
			when(this.store.getOneByAssocTypeAndDestClass(this.widgetId, ATTRIBUTE_ASSOC, PRIMARY_NAMES), function(nameCellId){
				if(nameCellId) when(self.store.getCell(nameCellId), function(nameCell){
					if(nameCell && nameCell.name!=''){
						domConstruct.create('h1', {innerHTML: nameCell.name}, self.pane.domNode);
						//this.pane.domNode.appendChild(this.pane.domNode);
					}
				});
			});
		},*/
		resize: function(changeSize){
			this.inherited(arguments);
			if(!changeSize) return;
			var hDiv = dojo.position(this.headerDivNode);
			if(hDiv) changeSize.h -= hDiv.h;
			this.pane.resize(changeSize);
		},
		startup: function(){
			//console.log('startup CALLED', this.id);
			dojo.forEach(registry.findWidgets(this.domNode), function(widget) {
				widget.startup();
			});
			this.pane.resize();
		},
		getAttrRefProperties: function(viewId){
			//console.log('viewId', viewId);
			var ATTRREF_CLASS_TYPE = 63;
			var self = this;			
			//if(viewId==2378) debugger;
			return when(this.store.getManyByAssocTypeAndDestClass(viewId, ORDERED_ASSOC, ATTRREF_CLASS_TYPE), function(attrRefs){
				//console.log('attrRefs', attrRefs);
				var promisses = [];
				promisses.push({field: 'id', label: 'id', hidden: false});
				promisses.push({field: 'viewId', label: 'viewId', hidden: false});
				promisses.push({field: 'classId', label: 'classId', hidden: false});
				for(var i=0;i<attrRefs.length;i++){
					var attrRef = attrRefs[i];
					promisses.push(self.makeProperties(attrRef));
				};
				return all(promisses);
			});
		},
		makeProperties: function(attrRefId){
			var CLASS_TYPE = 0;
			var PERTMITTEDVALUE_CLASS = 58;
			var TOONEASSOCS_TYPE = 81;
			var PRIMARY_NAMES = 69;
			var ATTRIBUTE_ACCESS = 59;
			var DESCRIPTION = 77;
			var PERMITTEDVAULE_CLASS_ID = 58;
			var RTF_CLASS_ID = 65;
			var DATE_CLASS_ID = 52;
			var STRING_CLASS_ID = 54;
			var INTEGER_CLASS_ID = 55;
			var NUMBER_CLASS_ID = 56;
			var BOOLEAN_CLASS_ID = 57;
			var CLASSNAME_CLASS_ID = 101;
			var CLASS_TYPE = 0;
			var BUILDASSOCTYPE_ATTR_ID = 2085;
			var NAME_ATTR_ID = 544;
			var HLEPTEXT_ATTR_ID = 1405;
			var ACCESS_ATTR_ID = 554;
			var PLACEHOLDER_ATTR_ID = 0;
			var DEFAULT_ATTR_ID = 0;
			var WIDTH_ATTR_ID = 0;
			var INVALIDMESSAGE_ATTR_ID = 0;
			var MAXLENGTH_ATTR_ID = 0;
			var CURRENCY_ATTR_ID = 0;
			var REGEX_ATTR_ID = 0;
			var MINIMUM_ATTR_ID = 0;
			var MAXIMUM_ATTR_ID = 0;
			var PLACES_ATTR_ID = 0;
			var FRACTIONAL_ATTR_ID = 0;

			var MODIFY_VALUE_ID = 289;
			var MANDATORY_VALUE_ID = 290;
			var PERMITTEDVAULE_CLASS_ID = 58;

			
			var self = this;
			var attrPromises = [];
			//get the label that this attribute reference has as an attribute
			attrPromises[0] = this.store.getOneByAssocTypeAndDestClass(attrRefId, ATTRIBUTE_ASSOC, PRIMARY_NAMES);
			//get the assocication type that this attribute reference has as an attribute
			attrPromises[1] = this.store.getOneByAssocTypeAndDestClass(attrRefId, ATTRIBUTE_ASSOC, TOONEASSOCS_TYPE);
			//get the attribute class that this attribute reference maps to
			//attrPromises[2] = this.store.getOneByAssocTypeAndDestClass(attrRefId, MAPSTO_ASSOC, ATTRIBUTE);
			attrPromises[2] = this.store.getOneByAssocType(attrRefId, MAPSTO_ASSOC, CLASS_TYPE, false);
			//get the attribute access that this attribute reference has as an attribute
			attrPromises[3] = this.store.getOneByAssocTypeAndDestClass(attrRefId, ATTRIBUTE_ASSOC, ATTRIBUTE_ACCESS);
			//get the helptext that this attribute reference has as an attribute
			attrPromises[4] = this.store.getOneByAssocTypeAndDestClass(attrRefId, ATTRIBUTE_ASSOC, DESCRIPTION);
			return when(all(attrPromises), function(propertiesArr){
				if(!propertiesArr[1]) throw new Error('Attribute Reference '+attrRefId+' must have an association type as an attribute ');
				var labelId = propertiesArr[0];
				var assocType = propertiesArr[1];
				if(!propertiesArr[2]) throw new Error('Attribute Reference '+attrRefId+' must map to one class ');
				var destClassId = propertiesArr[2];
				var access = propertiesArr[3];
				var helptextId = propertiesArr[4];

				var attrPromises = [];
				//get the label that this attribute reference has as an attribute
				attrPromises[0] = self.store.getCell(labelId);
				//get the parent of the attribute class that this attribute reference maps to
				////////////////////Exception for the cell name as used by the class model///////////////////
				if(destClassId == CLASSNAME_CLASS_ID) attrPromises[1] = destClassId;
				else attrPromises[1] = self.store.getOneByAssocType(destClassId, PARENT_ASSOC, CLASS_TYPE, true, false);
				attrPromises[2] = self.store.isA(destClassId, PERMITTEDVAULE_CLASS_ID);
				//get the helptext that this attribute reference has as an attribute
				if(helptextId) attrPromises[3] = self.store.getCell(helptextId);
				return when(all(attrPromises), function(propsArr){
					var label = propsArr[0].name;
					var permittedValue = propsArr[2];
					var helptext = propsArr[3]?propsArr[3].name:'<a href="#842.1787.846.538.1857.873.537">Edit Helptext</a>';
					var attrClassType = (permittedValue||assocType!=ATTRIBUTE_ASSOC)?PERMITTEDVAULE_CLASS_ID:propsArr[1];
					var permRes = null;
					if(permittedValue) permRes = self.store.getManyCellsByAssocType(destClassId, SUBCLASSES_PASSOC, OBJECT_TYPE, true);
					else if(assocType!=ATTRIBUTE_ASSOC) permRes = self.store.getManyCellsByAssocType(destClassId, SUBCLASSES_PASSOC, CLASS_TYPE, true);
					else permRes = true;
					return when(permRes, function(nameValuePairs){
						var property = {
							field: attrRefId.toString(), // for dgrid
							name: attrRefId.toString(), //for input
							assocType: assocType,
							attrClassType: attrClassType,
							label: label,
							helpText: helptext,
							required: access==MANDATORY_VALUE_ID?true:false,
							editable: access==MODIFY_VALUE_ID||MANDATORY_VALUE_ID?true:false,
							trim: true,
							//default: attrRef[DEFAULT_ATTR_ID],
							//width: attrRef[WIDTH_ATTR_ID]+'em',
							//width: '30em',
							//style: {width: '30em'}, causes editor to crash
							//invalidMessage: attrRef[INVALIDMESSAGE_ATTR_ID],
							//currency: attrRef[CURRENCY_ATTR_ID],
							editOn: 'dblclick',  // for dgrid
							autoSave: true, // for dgrid
							sortable: true
						};
						switch(attrClassType){
						case PERMITTEDVAULE_CLASS_ID: 
							//property.editor = 'Select';
							var selectStore = new Memory({data: nameValuePairs});
							property.editorArgs = {
									name: property.field,
									store: selectStore, 
									style: "width:99%;",
									labelAttr: 'name',
									maxHeight: -1, // tells _HasDropDown to fit menu within viewport
									fetchProperties: { sort : [ { attribute : "name" }]},
									queryOptions: { ignoreCase: true }//doesnt work
									//value: 749
							};
							break;	
						case RTF_CLASS_ID: 
							//property.editor = 'RTFEditor';
							var toolbar = new Toolbar({
								//'style': {'display': 'none'}
							});
							property.editorArgs = {
									'toolbar': toolbar, 
									'addStyleSheet': 'css/editor.css',
									'extraPlugins': self.extraPlugins,
									//'maxHeight': -1
							};					
							property.get = function(item){
								var value = item[property.name];
								if(!value) return '<p></p>';//editor will crash if it does not have a value
								return value;
							}
							break;	
						case DATE_CLASS_ID:
							//property.editor = 'DateTextBox';
							break;	
						case STRING_CLASS_ID:
							property.editor = 'text';
							property.editorArgs = {
								//maxLength: attrRef[MAXLENGTH_ATTR_ID],
								//minLength: attrRef[MINLENGTH_ATTR_ID],
								//regRex: attrRef[REGEX_ATTR_ID], //e.g. email "[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}"
							}
							break;	
						case INTEGER_CLASS_ID: 
							property.editor = 'number';
							property.editorArgs.constraints = {
								//minimum: attrRef[MINIMUM_ATTR_ID],
								//maximum: attrRef[MAXIMUM_ATTR_ID],
								//places: attrRef[PLACES_ATTR_ID],
								//fractional: attrRef[FRACTIONAL_ATTR_ID]
							}
							break;	
						case NUMBER_CLASS_ID: 
							property.editor = 'number';
							property.editorArgs.constraints = {
								//minimum: attrRef[MINIMUM_ATTR_ID],
								//maximum: attrRef[MAXIMUM_ATTR_ID],
								places: 0
							}
							break;	
						case BOOLEAN_CLASS_ID: 
							property.editor = 'radio';
							break;
						default:
							property.editor = 'text';
						};
						return property;
					});							
				});

			});	
		},

		extraPlugins:[
     		'|',
     		'foreColor','hiliteColor',
     	    '|',
     		'createLink', 'unlink', 'insertImage',
     	    '|',
     /*	    {name: 'dojox.editor.plugins.TablePlugins', command: 'insertTable'},
     	   	{name: 'dojox.editor.plugins.TablePlugins', command: 'modifyTable'},
     	    {name: 'dojox.editor.plugins.TablePlugins', command: 'InsertTableRowBefore'},
     	    {name: 'dojox.editor.plugins.TablePlugins', command: 'InsertTableRowAfter'},
     	    {name: 'dojox.editor.plugins.TablePlugins', command: 'insertTableColumnBefore'},
     	    {name: 'dojox.editor.plugins.TablePlugins', command: 'insertTableColumnAfter'},
     	    {name: 'dojox.editor.plugins.TablePlugins', command: 'deleteTableRow'},
     	    {name: 'dojox.editor.plugins.TablePlugins', command: 'deleteTableColumn'},
     	    {name: 'dojox.editor.plugins.TablePlugins', command: 'colorTableCell'},
     	    {name: 'dojox.editor.plugins.TablePlugins', command: 'tableContextMenu'},
     	    {name: 'dojox.editor.plugins.TablePlugins', command: 'ResizeTableColumn'},
     	    '|',*/
     		'viewsource'
         ],	

	});
});
