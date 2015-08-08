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
//				'style' : { 'overflow': 'auto', 'padding': '0px', 'margin': '0px', width: '100%', height: '100%', background:'transparent'}
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
		getAttrRefPropertiesForWidget: function(widgetId){
			var self = this;			
			//recursivily get all of the views that belong to this widget
			return when(self.store.getManyByAssocType(widgetId, MANYTOMANY_ASSOC, OBJECT_TYPE, true), function(viewIdsArr){
				self.viewIdsArr = viewIdsArr;
				var promisses = [];
				for(var i=0;i<viewIdsArr.length;i++){
					var viewId = viewIdsArr[i];
					promisses.push(self.getAttrRefPropertiesForView(viewId));
				}
				return when(all(promisses), function(arrayOfArrays){
					var results = [];//create a sparsely populated array with the viewId as index
					for(var i=0;i<viewIdsArr.length;i++){
						var viewId = viewIdsArr[i];
						var attrRefProperties = arrayOfArrays[i];
						results[viewId] = attrRefProperties;
					}
					return results;
				});
				return when(all(promisses), function(arrayOfArrays){
					var merged = [];
					return merged.concat.apply(merged, arrayOfArrays);
				});
	
			});
		},
		getAttrRefPropertiesForView: function(viewId){
			//console.log('viewId', viewId);
			var ATTRREF_CLASS_TYPE = 63;
			var self = this;			
			//if(viewId==2378) debugger;
			return when(this.store.getManyByAssocTypeAndDestClass(viewId, ORDERED_ASSOC, ATTRREF_CLASS_TYPE), function(attrRefs){
				//console.log('attrRefs', attrRefs);
				var promisses = [];
				for(var i=0;i<attrRefs.length;i++){
					var attrRef = attrRefs[i];
					promisses.push(self.makeProperties(attrRef));
				};
				return when(all(promisses), function(results){
					/*results.push({field: 'id', name: 'id', label: 'id', readonly:true, hidden: false});
					results.push({field: 'viewId', name: 'viewId', label: 'viewId', readonly:true,  hidden: false});
					results.push({field: 'classId', name: 'classId', label: 'classId', readonly:true,  hidden: false});*/
					return results;
				});
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
			//get the association type that this attribute reference has as an attribute
			attrPromises[1] = this.store.getOneByAssocTypeAndDestClass(attrRefId, ATTRIBUTE_ASSOC, TOONEASSOCS_TYPE);
			//get the attribute class that this attribute reference maps to
			//attrPromises[2] = this.store.getOneByAssocTypeAndDestClass(attrRefId, MAPSTO_ASSOC, ATTRIBUTE);
			attrPromises[2] = this.store.getOneByAssocType(attrRefId, MAPSTO_ASSOC, CLASS_TYPE, false);
			//get the attribute access that this attribute reference has as an attribute
			attrPromises[3] = this.store.getOneByAssocTypeAndDestClass(attrRefId, ATTRIBUTE_ASSOC, ATTRIBUTE_ACCESS);
			//get the helptext that this attribute reference has as an attribute
			attrPromises[4] = this.store.getOneByAssocTypeAndDestClass(attrRefId, ATTRIBUTE_ASSOC, DESCRIPTION);
			return when(all(attrPromises), function(propertiesArr){
				var labelId = propertiesArr[0];
				if(!propertiesArr[1]) return {label:'[undefined assocType]'};//fail gracefully
				var assocType = propertiesArr[1];
				//if(!propertiesArr[2]) return {label:'[undefined mapsTo]'};//fail gracefully
				var destClassId = propertiesArr[2];
				var access = propertiesArr[3];
				var helptextId = propertiesArr[4];

				var attrPromises = [];
				//get the label that this attribute reference has as an attribute
				attrPromises[0] = self.store.getCell(labelId);
				//get attribute class type (parent of)
				if(destClassId){
					////////////////////Exception for the cell name as used by the class model///////////////////
					if(destClassId == CLASSNAME_CLASS_ID) attrPromises[1] = destClassId;
					else attrPromises[1] = self.store.getOneByAssocType(destClassId, PARENT_ASSOC, CLASS_TYPE, true, false);
					//find out if the destination class is a permitted value 
					attrPromises[2] = self.store.isA(destClassId, PERMITTEDVAULE_CLASS_ID);					
				}
				else{//fail gracefully
					attrPromises[1] = STRING_CLASS_ID; //attribute class type to default
					attrPromises[2] = false;//the destination class is not a permitted value
				}
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
							sortable: true,
							style: 'width:100%'// for forms (grids will have a specific width)
						};
						switch(attrClassType){
						case PERMITTEDVAULE_CLASS_ID: 
							//property.editor = 'Select';
							nameValuePairs.push({id:-1,name:'[not selected]'} );
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
							/*property.editorArgs.set = function(attr, value){
								if(attr=='value'&&!value) return -1;
								return value;
								var value = item[property.name];
								if(!value) return -1;//dropdown will display [not selected]
								return value;
							};*/
							property.get = function(item){
								var value = item[property.name];
								if(!value) return -1;//dropdown will display [not selected]
								return value;
							};
							//width: attrRef[WIDTH_ATTR_ID]+'em',
							property.columnWidth = '8em';
							property.nullValue = -1;
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
								if(!value) return '<p>[no text]</p>';//editor will crash if it does not have a value
								return value;
							};
							property.height = '';//auto-expand mode
							property.columnWidth = '100%';
							property.nullValue = '<p>[no text]</p>';
							break;	
						case DATE_CLASS_ID:
							//property.editor = 'DateTextBox';
							property.columnWidth = '6em';
							property.nullValue = null;
							break;	
						case STRING_CLASS_ID:
							property.editor = 'text';
							property.editorArgs = {
								//maxLength: attrRef[MAXLENGTH_ATTR_ID],
								//minLength: attrRef[MINLENGTH_ATTR_ID],
								//regRex: attrRef[REGEX_ATTR_ID], //e.g. email "[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}"
							};
							property.columnWidth = '10em';
							property.nullValue = '[no value]';
							break;	
						case INTEGER_CLASS_ID: 
							property.editor = 'number';
							//property.editorArgs.constraints = {
								//minimum: attrRef[MINIMUM_ATTR_ID],
								//maximum: attrRef[MAXIMUM_ATTR_ID],
								//places: attrRef[PLACES_ATTR_ID],
								//fractional: attrRef[FRACTIONAL_ATTR_ID]
							//}
							property.columnWidth = '5em';
							property.nullValue = null;
							break;	
						case NUMBER_CLASS_ID: 
							property.editor = 'number';
							//property.editorArgs.constraints = {
								//minimum: attrRef[MINIMUM_ATTR_ID],
								//maximum: attrRef[MAXIMUM_ATTR_ID],
								//places: 0
							//}
							property.columnWidth = '5em';
							property.nullValue = null;
							break;
						case BOOLEAN_CLASS_ID: 
							property.editor = 'radio';
							property.columnWidth = '3em';
							property.nullValue = null;
							break;
						default:
							property.editor = 'text';
							property.columnWidth = '10em';
							property.nullValue = null;
						};
						return property;
					});							
				});

			});	
		},
		getPermittedClassesforWidget: function(widgetId){
			var self = this;
			//recursivily get all of the views that belong to this widget
			return when(this.store.getManyByAssocType(widgetId, MANYTOMANY_ASSOC, OBJECT_TYPE, true), function(viewIdsArr){
				var promisses = [];
				for(var i=0;i<viewIdsArr.length;i++){
					var viewId = viewIdsArr[i];
					promisses.push(self.getPermittedClassesforView(viewId));
				}
				return when(all(promisses), function(arrayOfArrays){
					var results = [];//create a sparsely populated array with the viewId as index
					for(var i=0;i<viewIdsArr.length;i++){
						var viewId = viewIdsArr[i];
						var permittedClassesId = arrayOfArrays[i];
						results[viewId] = permittedClassesId;
					}
					return results;
				});
			});
		},
		getPermittedClassesforView: function(viewId){
			var self = this;
			return when(this.store.getManyByAssocType(viewId, MANYTOMANY_ASSOC, OBJECT_TYPE, false), function(viewIdArr){
				var promisses = [];
				for(var i=0;i<viewIdArr.length;i++){
					subViewId = viewIdArr[i];
					promisses.push(self.getPermittedClassesforSubView(viewId, subViewId));
				}
				return when(all(promisses), function(arrayOfArrays){
					var merged = [];
					return merged.concat.apply(merged, arrayOfArrays);
				});
			});				

		},	
		getPermittedClassesforSubView: function(viewId, subViewId){
			var PRIMARY_NAMES = 69;
			var SUBCLASSES_PASSOC = 15;
			var ASSOCS_CLASS_TYPE = 94;
			var CLASS_TYPE = 0;
			
			var self = this;
			
			var results = [];
			
			var attrPromises = [];
			//get the assocication type that this view has as an attribute
			attrPromises[0] = self.store.getOneByAssocTypeAndDestClass(subViewId, ATTRIBUTE_ASSOC, ASSOCS_CLASS_TYPE);
			//get the class that this view maps to
			attrPromises[1] = self.store.getOneByAssocType(subViewId, MAPSTO_ASSOC, CLASS_TYPE, false);
			//get the name of the view
			attrPromises[2] = self.store.getOneByAssocTypeAndDestClass(viewId, ATTRIBUTE_ASSOC, PRIMARY_NAMES);
			//get the name of the subView
			attrPromises[3] = self.store.getOneByAssocTypeAndDestClass(subViewId, ATTRIBUTE_ASSOC, PRIMARY_NAMES);
			return when(all(attrPromises), function(arr){
				//if(!arr[0]) throw new Error('View '+subViewId+' must have an association type as an attribute ');
				var assocType = arr[0];
				var assocName = self.store.getCell(assocType).name;//TODO will fail if it is asysnc
				//if(!arr[1]) throw new Error('View '+subViewId+' must map to one class ');
				//if(arr[1].length!=1) console.log('View '+subViewId+' should map to one class ');
				var destClassId = arr[1];
				if(!destClassId) return [];//fail gracefully
				var viewNameId = arr[2];
				var viewName = self.store.getCell(viewNameId).name;//TODO will fail if it is asysnc
				var subViewNameId = arr[3];
				var subViewName = self.store.getCell(subViewNameId).name;//TODO will fail if it is asysnc
				//get the subclasses as seen from the destClass
				return when(self.store.getManyCellsByAssocType(destClassId, SUBCLASSES_PASSOC, CLASS_TYPE, true), function(subClassArr){
					subClassArr.push(self.store.getCell(destClassId));//TODO should getManyByAssocType also return destClassId?
					for(var j=0;j<subClassArr.length;j++){
						var subClassCell = subClassArr[j];
						var subClassId = subClassCell.id;
						var subClassName = subClassCell.name;
						//console.log(subClass);
						results.push({
							viewId:viewId, 
							viewName: viewName, 
							subViewId: subViewId, 
							subViewName: subViewName, 
							assocType: assocType, 
							assocName: assocName, 
							subClassId: subClassId, 
							subClassName: subClassName
						});
					}
					return results;
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
