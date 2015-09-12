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
		getWidgetProperties: function(widgetId){
			var self = this;
			var VIEW_CLASS_TYPE = 74;
			return self.store.get(widgetId).then(function(widget){
				//recursively get all of the views that belong to this widget
				return self.store.getItemsByAssocTypeAndDestClass(widgetId, 'manyToMany', VIEW_CLASS_TYPE).then(function(dbViewsArr) {
                    var viewsArr = JSON.parse(JSON.stringify(dbViewsArr));// mustn't update the the actual database dbViewsArr object.
					viewsArr.forEach(function(view){
						var properties = [];
						for(var attrName in view.schema){
                            var attrProp = view.schema[attrName];
                            var dijitType = '';
                            if(attrProp.type == 'String'){
                                if(attrProp.enum) dijitType = 'Select';
                                else if(attrProp.media && attrProp.media.mediaType == 'text/html') dijitType = 'RichText';
                                else dijitType = attrProp.type;
                            }
                            else dijitType = attrProp.type;
                            var propObj = {
                                dijitType: dijitType,
								field: attrName, // for dgrid
								name: attrName, //for input
								assocType: '',
								attrClassType: attrName,
								label: attrProp.title,
								helpText: attrProp.description,
								required: attrProp.required,
								editable: attrProp.readOnly?false:true,
								trim: true,
								default: attrProp.default,
                                invalidMessage: attrProp.invalidMessage,
								editOn: 'dblclick',  // for dgrid
								autoSave: true, // for dgrid
								sortable: true,
								style: 'width:100%'// for forms (grids will have a specific width)
							};
                            if(dijitType == 'Select'){
                                //propObj.enum = attrProp.enum;
                                var data = [];
                                data.push({id:-1,label:'[not selected]'} );
                                attrProp.enum.forEach(function(value){
                                    data.push({id:value,label:value});
                                });
                                var selectStore = new Memory({data: data});
                                propObj.editorArgs = {
                                    name: attrName,
                                    store: selectStore,
                                    style: "width:99%;",
                                    labelAttr: 'label',
                                    maxHeight: -1, // tells _HasDropDown to fit menu within viewport
                                    fetchProperties: { sort : [ { attribute : "name" }]},
                                    queryOptions: { ignoreCase: true }//doesnt work
                                    //value: 749
                                };
                                propObj.get = function(item){
                                    var value = item[this.name];
                                    if(!value) return -1;//dropdown will display [not selected]
                                    return value;
                                };
                                //width: attrRef[WIDTH_ATTR_ID]+'em',
                                propObj.columnWidth = '8em';
                                propObj.nullValue = -1;
                            }
                            else if(dijitType == 'RichText'){
                                var toolbar = new Toolbar({
                                    //'style': {'display': 'none'}
                                });
                                propObj.editorArgs = {
                                    'toolbar': toolbar,
                                    'addStyleSheet': 'css/editor.css',
                                    'extraPlugins': self.extraPlugins,
                                    //'maxHeight': -1
                                };
                                propObj.get = function(item){
                                    var value = item[attrName];
                                    if(!value) return '<p>[no text]</p>';//editor will crash if it does not have a value
                                    return value;
                                };
                                propObj.height = '';//auto-expand mode
                                propObj.columnWidth = '100%';
                                propObj.nullValue = '<p>[no text]</p>';                             }
                            else if(dijitType == 'Date'){
                                propObj.columnWidth = '6em';
                                propObj.nullValue = null;
                            }
                            else if(dijitType = 'Number'){
                                //property.editorArgs.constraints = {
                                //minimum: attrRef[MINIMUM_ATTR_ID],
                                //maximum: attrRef[MAXIMUM_ATTR_ID],
                                //places: 0
                                //}
                                propObj.columnWidth = '5em';
                                propObj.nullValue = null;                            }
                            else if(dijitType == 'Boolean'){
                                propObj.columnWidth = '3em';
                                propObj.nullValue = null;
                            }
                            else{ // String
                                propObj.dijitType = 'String';//default
                                propObj.editorArgs = {
                                    //maxLength: attrRef[MAXLENGTH_ATTR_ID],
                                    //minLength: attrRef[MINLENGTH_ATTR_ID],
                                    //regRex: attrRef[REGEX_ATTR_ID], //e.g. email "[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}"
                                };
                                propObj.columnWidth = '10em';
                                propObj.nullValue = '[no value]';
                            }
                            properties.push(propObj);
						}
						view.properties = properties;
					});
					widget.views = viewsArr;
					//console.log('widget',widget);
					return widget;
				})
			});
		},
        getViewProperties: function(view){
            this.getAttrRefPropertiesFromAncestors(Number(view.mapsTo), function(classAtrrArr){
                var properties = [];
                for(var attrName in view.schema){
                    var attrProp = view.schema[attrName];
                    var dijitType = '';
                    if(attrProp.type == 'String'){
                        if(attrProp.enum) dijitType = 'Select';
                        else if(attrProp.media && attrProp.media.mediaType == 'text/html') dijitType = 'RichText';
                        else dijitType = attrProp.type;
                    }
                    else dijitType = attrProp.type;
                    var propObj = {
                        dijitType: dijitType,
                        field: attrName, // for dgrid
                        name: attrName, //for input
                        assocType: '',
                        attrClassType: attrName,
                        label: attrProp.title,
                        helpText: attrProp.description,
                        required: attrProp.required,
                        editable: attrProp.readOnly?false:true,
                        trim: true,
                        default: attrProp.default,
                        invalidMessage: attrProp.invalidMessage,
                        editOn: 'dblclick',  // for dgrid
                        autoSave: true, // for dgrid
                        sortable: true,
                        style: 'width:100%'// for forms (grids will have a specific width)
                    };
                    if(dijitType = 'Select'){
                        var selectStore = new Memory({data: attrProp.enum});
                        propObj.editorArgs = {
                            name: property.field,
                            store: selectStore,
                            style: "width:99%;",
                            labelAttr: 'name',
                            maxHeight: -1, // tells _HasDropDown to fit menu within viewport
                            fetchProperties: { sort : [ { attribute : "label" }]},
                            queryOptions: { ignoreCase: true }//doesnt work
                            //value: 749
                        };
                    }
                    properties.push(propObj);
                }
                view.properties = properties;
            });

        },
        getAttrRefPropertiesFromAncestors: function(classId){
            var self = this;
            var parentClassesPromises = [];
            parentClassesPromises.push(self.store.get(classId));// Get the first one
            return self.store.followAssocType(Number(view.mapsTo), 'parent', parentClassesPromises).then(function(parentClassesArr){
                var classAtrrArr = [];
                return all(parentClassesArr).then(function(classesArr){
                    var classAtrrArr = [];
                    classesArr.forEach(function(classItem) {
                        for(classAttr in classItem){
                            //console.log('classAttr', classAttr);
                            if(classAttr.charAt(0)=='_') classAtrrArr.push(classAttr);
                        }
                    });
                    return classAtrrArr;
                });
            });
  		},

		/*getPermittedClassesforWidget: function(widgetId){
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
		},*/
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
