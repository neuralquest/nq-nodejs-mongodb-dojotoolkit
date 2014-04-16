define(['dojo/_base/declare',  'dojo/dom-construct', "dijit/_WidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry",
        'dojo/_base/array', 'dojo/dom-attr', "dojo/Deferred", "dojo/promise/all", "dojo/when",
        'dijit/Toolbar', 'dijit/form/Select', 'dijit/form/DateTextBox',  'dijit/form/NumberTextBox', 'dijit/form/CheckBox', 'dijit/Editor', 'dijit/form/CurrencyTextBox', 'dijit/form/ValidationTextBox', ],
	function(declare, domConstruct, _WidgetBase, ContentPane, domGeometry, 
			arrayUtil, domAttr, Deferred, all, when,
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
		setSelectedObjIdThisLevelDeferred: new Deferred(),
		
		_setSelectedObjIdPreviousLevelAttr: function(value){
			this.selectedObjIdPreviousLevel = value;
			return this;
		},
		_getSelectedObjIdPreviousLevelAttr: function(){ 
			return this.selectedObjIdPreviousLevel;
		},
		_setSelectedObjIdThisLevelAttr: function(value){
			this.selectedObjIdThisLevel = value;
			return this;
		},
		_getSelectedObjIdIdAttr: function(){ 
			return this.selectedObjIdThisLevel;
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
		},
		resize: function(changeSize){
			this.inherited(arguments);
			if(!changeSize) return;
			var hDiv = dojo.position(this.headerDivNode);
			if(hDiv) changeSize.h -= hDiv.h;
			this.pane.resize(changeSize);
		},
		startup: function(){
			arrayUtil.forEach(this.pane.getChildren(), function(widget){
				if(widget.startup) widget.startup();
			});
			this.pane.resize();
			//return this.startupDeferred;
		},
		getAttrRefProperties: function(viewObj){
			var ATTRREFERENCE_VIEW_ID = 537;

			var self = this;
			return when(this.store.getChildren(viewObj, [ATTRREFERENCE_VIEW_ID]), function(attrRefs){
				var promisses = [];
				for(var i=0;i<attrRefs.length;i++){
					var attrRef = attrRefs[i];
					promisses.push(self.makeProperties(attrRef));
				};
				return all(promisses);
			}, nq.errorDialog);
		},
		makeProperties: function(attrRef){
			var CLASS_MODEL_VIEW_ID = 844;
			var MAPSTO_ATTR_ID = 571;
			var ASSOCIATIONS_VIEW_ID = 1613;
			var PARENTASSOC_ID = 3;			
			var PERMITTEDVAULE_CLASS_ID = '58';
			
			var mapsToAttrClass = attrRef[MAPSTO_ATTR_ID];
			var attrClassId = CLASS_MODEL_VIEW_ID+'/'+mapsToAttrClass;
			var self = this;
			return when(this.store.get(attrClassId), function(attrClass){
				var attrClassType = 0;
				if(attrClass[ASSOCIATIONS_VIEW_ID] && attrClass[ASSOCIATIONS_VIEW_ID][PARENTASSOC_ID]) {
					attrClassType = attrClass[ASSOCIATIONS_VIEW_ID][PARENTASSOC_ID][0];
					attrClassType = attrClassType.split('/')[1];
				}
				if(attrClassType==PERMITTEDVAULE_CLASS_ID){
					return when(self.getIdNamePairs(attrClass), function(nameValuePairs){
						return self.makeProperiesObjects(attrRef, attrClassType, nameValuePairs);
					}, nq.errorDialog);	
				}
				else return self.makeProperiesObjects(attrRef, attrClassType, []);
			}, nq.errorDialog);	
		},
		makeProperiesObjects: function(attrRef, attrClassType, nameValuePairs){
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
			
			var property = {
					field: attrRef.id.split('/')[1], // for dgrid
					name: attrRef.id.split('/')[1], //for input
					attrClassType: attrClassType,
					label: attrRef[NAME_ATTR_ID],
					//helpText: attrRef[HLEPTEXT_ATTR_ID],
					helpText: 'undefined',
					required: attrRef[ACCESS_ATTR_ID]==MANDATORY_VALUE_ID?true:false,
					editable: attrRef[ACCESS_ATTR_ID]==MODIFY_VALUE_ID||MANDATORY_VALUE_ID?true:false,
					trim: true,
					//placeholder: attrRef[PLACEHOLDER_ATTR_ID],
					//'default': attrRef[DEFAULT_ATTR_ID],
					//width: attrRef[WIDTH_ATTR_ID]+'em',
					width: '30em',
//					style: {width: '30em'}, causes editor to crash
					//invalidMessage: attrRef[INVALIDMESSAGE_ATTR_ID],
					//maxLength: attrRef[MAXLENGTH_ATTR_ID],
					//minLength: attrRef[MINLENGTH_ATTR_ID],
					//currency: attrRef[CURRENCY_ATTR_ID],
					//regRex: attrRef[REGEX_ATTR_ID], //e.g. email "[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}"
					constraints: {
						//minimum: attrRef[MINIMUM_ATTR_ID],
						//maximum: attrRef[MAXIMUM_ATTR_ID],
						//places: attrRef[PLACES_ATTR_ID],
						//fractional: attrRef[FRACTIONAL_ATTR_ID]
					},
					permittedValues: nameValuePairs,
					//permittedValues:[{ id:0, name:'undefined'}], 
					editOn: 'click',  // for dgrid
					autoSave: true // for dgrid
				};
			return property;
		},
		getIdNamePairs: function(attrClass){
			var SUBCLASSES_PASSOC = 15;		//TO MANY
			var OBJECT_TYPE = 1;
			var OBJVALUE_ATTR_ID = 852;
			var permittedObjsArr = [];
			return when(this.store.getManyByAssocType(attrClass, SUBCLASSES_PASSOC, OBJECT_TYPE, true, false), function(permittedObjsArr){
				var pairsArr = [];
				for(var j=0;j<permittedObjsArr.length;j++){
					var obj = permittedObjsArr[j];
					pairsArr.push({id:obj.id, name:obj[OBJVALUE_ATTR_ID]});
				}
				return pairsArr;
			});
		},/*
		destroy: function(){
			arrayUtil.forEach(this.pane.getChildren(), function(widget){
				//if(widget.destroyRecursive) widget.destroyRecursive();
			});
			this.inherited(arguments);
		}
		replaceContentsWithEditor: function(fillDiv, editorType, objectId){
			if(editorType == 'string'){
				var self = this;
				var value = domAttr.get(fillDiv, 'innerHTML');
				var textDijit = new ValidationTextBox({
					objectId: objectId,
				    'type': 'text',
				    'trim': true,
				    'value': value,
				    //'style':{ 'width':'90%', 'background': 'rgba(0,0,255,0.04)', 'border-style': 'none'},
				    'style':{width:'90%','background': 'rgba(250, 250, 121, 0.28)', 'border-style': 'none'},//rgba(0,0,255,0.04)
					'placeHolder': 'Paragraph Header',
					'onChange': function(evt){
						when(self.store.get(objectId), function(item){
							item[self.headerAttrId] = textDijit.get('value');
							self.store.put(item);
						});
				    }
				}, domConstruct.create('input'));
				domConstruct.place(textDijit.domNode, fillDiv);
				textDijit.focus();			
			}
		},
		formatGridDate: function(theDate, rowIndex) {
			var rowdata = this.grid.getItem(rowIndex);
			var theDate = new Date(parseInt(rowdata.datefieldname));
			theDateString = dojo.date.locale.format(theDate, {selector: 'date', datePattern: 'MM/dd/yyyy' });
			return theDateString;
		},
*/
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
