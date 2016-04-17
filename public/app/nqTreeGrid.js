define(['dojo/_base/declare', 'dojo/_base/array', 'dijit/form/Select', 'dijit/Toolbar', 'dijit/form/DateTextBox',  'dijit/form/NumberTextBox','dijit/form/Textarea',
        'dijit/form/CheckBox', 'dijit/Editor', 'dijit/form/CurrencyTextBox', 'dijit/form/ValidationTextBox',"dijit/form/RadioButton", 'dojo/dom-construct', "dojo/on",
        "dojo/when", "dojo/query", 'dijit/registry', "app/nqWidgetBase", 'dijit/layout/ContentPane', "dojo/dom-geometry", "dojo/sniff", "dojo/_base/lang",
        "dojo/promise/all", "dojo/html", 'dojo/store/Memory', "dojo/dom", "dojo/dom-style","dojo/dom-attr", "dojo/json",
        'dgrid/OnDemandGrid', 'dojox/form/CheckedMultiSelect', "dijit/form/Button",
        'dgrid/Grid',
        'dgrid/Keyboard',
        'dgrid/Selection',
        'dgrid/extensions/DnD',
        'dojo/dnd/Source',
        'dgrid/Tree',

        'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/ViewSource', 'dojox/editor/plugins/TablePlugins',
        /*'dojox/editor/plugins/ResizeTableColumn'*/],
    function(declare, arrayUtil, Select, Toolbar, DateTextBox, NumberTextBox, Textarea,
             CheckBox, Editor, CurrencyTextBox, ValidationTextBox, RadioButton, domConstruct, on,
             when, query, registry, nqWidgetBase, ContentPane, domGeometry, has, lang,
             all, html, Memory, dom, domStyle, domAttr, JSON, OnDemandGrid, CheckedMultiSelect, Button, Grid, Keyboard, Selection, DnD, Source, Tree){

        return declare("nqTreeGrid", [nqWidgetBase],{
            postCreate: function(){
                this.inherited(arguments);
                var self = this;
                if(!self.widget.viewRefs || self.widget.viewRefs.length<1) return;
                var initialized = self.store.get(self.widget.viewRefs[0]).then(function(view){
                    console.log('VIEW:',view);
                    //console.log(JSON.stringify(view));
                    self.view = view;
                    self.headerDivNode.innerHTML = '<h1>'+view.name+'</h1>';
                    //domStyle.set(self.headerDivNode, 'display', 'block');//set the header node, created in the superclass,  to visible
                    self.pageHelpTextDiv.innerHTML = view.description;

                    self.treeGrid = new (declare([ OnDemandGrid, Keyboard, Selection, Tree ]))({
                        collection: self.store,
                        loadingMessage: 'Loading data...',
                        noDataMessage: 'No results found.',
                        height: '',
                        columns: {
                            // Render expando icon and trigger expansion from first column
                            name: {
                                label: 'Name',
                                renderExpando: true,
                                sortable : false
                            },
                            properties: {
                                label:'Properties',
                                renderCell: lang.hitch(self, self.renderForm),
                                sortable : false
                            }
                        }
                    }, domConstruct.create("div", null, self.pane.containerNode));



                    return true;
                });
                when(initialized, function(result){
                    self.createDeferred.resolve(self);//ready to be loaded with data
                }, function(err){self.createDeferred.reject(err)});
            },
            renderForm: function(object, value, node, options){
                var self = this;
                //var par = domConstruct.create("code", {innerHTML:object}, node);
                var formNode = domConstruct.create('table', {style:{'border-spacing':'3px'}}, node);
                self.buildRowCols(self.view.properties, formNode, 0);
                for(var attrName in self.view.properties) {
                    //var attrProps = self.view.properties[attrName];
                    var value = object[attrName];
                    //if(attrProps.type == 'object') value = JSON.stringify(value, null, 4);
                    var dijitId = self.view._id+':'+attrName;
                    var wid = registry.byId(dijitId);
                    if(wid) wid.set('value', value, false);// do not fire change
                    else {
                        var tdDom = dom.byId(dijitId);
                        if(tdDom) tdDom.innerHTML = value;
                    }
                }
            },
            buildRowCols: function(properties, formNode, nestingLevel){
                var self = this;
                //Collect the properties in a three dimensional array:
                //[rows, columns, propertiesList]
                var rowColProperties = [];
                for(var attrName in properties) {
                    var attrProps = properties[attrName];
                    if(!attrProps.row) attrProps.row = 1;
                    if(!attrProps.col) attrProps.col = 1;
                    if(!rowColProperties[attrProps.row]) rowColProperties[attrProps.row] = [];
                    if(!rowColProperties[attrProps.row][attrProps.col]) rowColProperties[attrProps.row][attrProps.col] = [];
                    //rowColProperties[attrProps.row][attrProps.col].push(attrProps);
                    rowColProperties[attrProps.row][attrProps.col].push(attrName);
                }
                for(var i=1;i<rowColProperties.length;i++){//row 0 is invisible
                    var colProperties = rowColProperties[i];
                    //Find the highest length of propertiesList for the columns in this row
                    var maxProperties = 0;
                    for(var j=1;j<colProperties.length;j++){//column 0 is not used
                        var props = colProperties[j];
                        maxProperties = props.length>maxProperties?props.length:maxProperties;
                    }
                    for(var l=0;l<maxProperties;l++){
                        var trDom = domConstruct.create("tr", null, formNode);
                        //For each column in this row
                        for(var j=1;j<colProperties.length;j++){//column 0 is not used
                            var propertiesList = colProperties[j];
                            var attrName = propertiesList[l];
                            var attrProps = properties[attrName];
                            if(attrProps) {
                                attrProps.id = self.view._id+':'+attrName;
                                var style = {
                                    'font-weight': attrProps.bold?'bold':'normal',
                                    'font-size': attrProps.size?attrProps.size:'1em',
                                    'padding-left': (nestingLevel*15+10)+'px'//need px here because different font sizes will have different em
                                };
                                var editableStyle = {
                                    border: 'solid',
                                    'border-color': '#F8F8F8',
                                    'border-width': 'thin',
                                    background: 'transparent'
                                };
                                // The label
                                domConstruct.create("td", {innerHTML: attrProps.title, style: style},trDom);
                                //The input field
                                //{onmouseover:"style['border-color'='blue']", onmouseout:"style['border-color']='red'"}
                                var tdDom = domConstruct.create("td", {id:self.view._id+':'+attrName}, trDom);
                                var dijit = null;
                                if(attrProps.type == 'string'){
                                    if(attrProps.media && attrProps.media.mediaType == 'text/html'){
                                        //domConstruct.create("td", null, trDom);//empty td
                                        var editorRowDom = domConstruct.create("tr", null, formNode);
                                        var editorTdDom = domConstruct.create("td", {colspan: 2, style:{'padding-left': (nestingLevel*15+10)+'px'}}, editorRowDom);
                                        dijit = new Editor({minHeight: '30px', height:''}, domConstruct.create('div', {id: self.view._id+':'+attrName, style:editableStyle}, editorTdDom));//setting the name wont be done autoamticly
                                        dijit.addStyleSheet('app/resources/editor.css');
                                        //Needed for auto sizing, found it in AlwaysShowToolbar in the dijit library
                                        //dijit.startup();//dijit has to be started before we can attach evens
                                        /*dijit.on("NormalizedDisplayChanged", function(event){
                                         // summary:
                                         //		Updates the height of the editor area to fit the contents.
                                         var e = this.editorObject;
                                         //if(!e.isLoaded) return;
                                         if(e.height) return;
                                         var height = domGeometry.getMarginSize(this.domNode).h;
                                         if(has("opera"))height = e.editNode.scrollHeight;
                                         // console.debug('height',height);
                                         // alert(this.editNode);
                                         //height maybe zero in some cases even though the content is not empty,
                                         //we try the height of body instead
                                         if(!height) height = domGeometry.getMarginSize(this.ownerDocumentBody).h;
                                         if(this._fixEnabled){
                                         // #16204: add toolbar height when it is fixed aka "stuck to the top of the screen" to prevent content from cutting off during autosizing.
                                         // Seems like _updateHeight should be taking the intitial margin height from a more appropriate node that includes the marginTop set in globalOnScrollHandler.
                                         height += domGeometry.getMarginSize(this.editor.header).h;
                                         }
                                         if(height == 0){
                                         console.debug("Can not figure out the height of the editing area!");
                                         return; //prevent setting height to 0
                                         }
                                         if(has("ie") <= 7 && this.editor.minHeight){
                                         var min = parseInt(this.editor.minHeight);
                                         if(height < min){
                                         height = min;
                                         }
                                         }
                                         if(height != this._lastHeight){
                                         this._lastHeight = height;
                                         // this.editorObject.style.height = this._lastHeight + "px";
                                         domGeometry.setMarginBox(this.iframe, { h: this._lastHeight });
                                         }
                                         /*var height = domGeometry.getMarginSize(this.domNode).h;
                                         if(has("opera"))
                                         height = this.editNode.scrollHeight;
                                         }
                                         //console.log('height',domGeometry.getMarginSize(this.editNode));
                                         this.resize({h: height});
                                         domGeometry.setMarginBox(this.iframe, { h: height });
                                         * /
                                         });*/
                                    }
                                    else if(attrProps.media && attrProps.media.mediaType == 'image/jpg'){
                                    }
                                    else if(attrProps.media && attrProps.media.mediaType == 'image/webgl'){
                                    }
                                    else if(attrProps.enum){
                                        dijit = self.radioButtonsOrSelect(tdDom, attrProps.enum, attrProps.default);
                                    }
                                    else{
                                        if(attrProps.readOnly == true) {

                                        }
                                        else {
                                            dijit = new ValidationTextBox(attrProps, domConstruct.create("input", null, tdDom));
                                        }
                                    }
                                }
                                else if(attrProps.type == 'number'){
                                    if(attrProps.readOnly == true){
                                        tdDom.innerHTML = '0.00';
                                    }
                                    else {
                                        dijit = new NumberTextBox(attrProps, domConstruct.create("input", null, tdDom));
                                    }
                                }
                                else if(attrProps.type == 'integer'){
                                    if(attrProps.readOnly == true){
                                        tdDom.innerHTML = '0';
                                    }
                                    else {
                                        dijit = new NumberTextBox(attrProps, domConstruct.create("input", null, tdDom));
                                    }
                                }
                                else if(attrProps.type == 'date'){
                                    if(attrProps.readOnly == true){
                                    }
                                    else {
                                        dijit = new DateTextBox(attrProps, domConstruct.create("input", null, tdDom));
                                    }
                                }
                                else if(attrProps.type == 'boolean'){
                                    if(attrProps.readOnly == true){
                                        tdDom.innerHTML = 'false';
                                    }
                                    else {
                                        dijit = new CheckBox(attrProps, domConstruct.create("input", null, tdDom));
                                    }
                                }
                                else if(attrProps.type == 'Xarray'){
                                    if(attrProps.items){
                                        var itemProperties = attrProps.items;
                                        if(itemProperties.properties) {
                                            var attrProps = itemProperties.properties;
                                            self.buildRowCols(attrProps, formNode, nestingLevel+1);
                                        }
                                        else {
                                            var data = [
                                                { name: 'Bob'},
                                                { name: 'Vanna'},
                                                { name: 'Pat'}
                                            ];

                                            // Create a new constructor by mixing in the components
                                            var CustomGrid = declare([Grid, Keyboard, Selection, DnD]);
                                            var columns = [
                                                {
                                                    label : 'Tab Name',
                                                    field : 'name',
                                                    sortable : true
                                                },
                                                {
                                                    label : ' ',
                                                    field : 'deletelink',
                                                    renderCell: lang.hitch(this, function(object, value, node, options) {
                                                        var deleteButton = new Button(
                                                            {
                                                                //label: "D",
                                                                iconClass:'cancelIcon',
                                                                onClick: self.store.remove(this.rowId)
                                                            });
                                                        deleteButton._destroyOnRemove = true;
                                                        deleteButton.placeAt(node);
                                                    }),
                                                    sortable : false
                                                }
                                            ];
                                            // Now, create an instance of our custom grid which
                                            // have the features we added!
                                            var grid = new CustomGrid({
                                                columns: columns,
                                                //showHeader: false,
                                                // for Selection; only select a single row at a time
                                                selectionMode: 'single',
                                                // for Keyboard; allow only row-level keyboard navigation
                                                cellNavigation: false
                                            }, domConstruct.create("div", null, tdDom));
                                            grid.renderArray(data);


                                            /*grid = new OnDemandGrid({
                                             selectionMode: 'single',
                                             showHeader: false,
                                             collection: self.nqStore, // a dstore store
                                             columns: [
                                             { label: 'ID', field: '_id', sortable: false },
                                             { label: 'name', field: 'name' }
                                             ]
                                             }, domConstruct.create("div", null, tdDom));
                                             //domConstruct.create("td", {innerHTML: 'TABLE'}, tdDom);*/
                                        }
                                    }
                                    else if(attrProps.readOnly == true){
                                    }
                                    else {
                                        dijit = new Select(attrProps.editorArgs, domConstruct.create("input", null, tdDom));
                                    }
                                }
                                else if(attrProps.type == 'Xobject'){
                                    if(attrProps.patternProperties){
                                        var patPropObj = attrProps.patternProperties;
                                        for(var attrName in patPropObj) {
                                            domConstruct.create("td", {innerHTML: attrName}, tdDom);
                                            var attrProps = patPropObj[attrName];
                                            if(attrProps.anyOf){
                                                attrProps.anyOf.forEach(function(typeOf){
                                                    self.buildRowCols(typeOf.properties, formNode, nestingLevel+1);
                                                });
                                            }
                                            else self.buildRowCols(attrProps, formNode, nestingLevel+1);
                                        }
                                    }
                                    else if(attrProps.properties){
                                        self.buildRowCols(attrProps.properties, formNode, nestingLevel+1);
                                    }
                                    else if(attrProps.readOnly == true){
                                    }
                                    else {
                                        if(attrProps.media && attrProps.media.mediaType == 'text/json'){
                                        }
                                        else if(attrProps.media && attrProps.media.mediaType == 'text/javascript'){
                                        }
                                        dijit = new Textarea(attrProps, domConstruct.create("td", {class: 'inputClass'}, tdDom));
                                    }
                                }
                                else {
                                }
                                if(dijit){
                                    self.own(dijit);
                                    dijit.startup();
                                    dijit.set('value', attrProps.default, false);

                                    dijit.on('change', function(newValue){
                                        var attrProps = properties[this.name];
                                        if(newValue == attrProps.nullValue) newValue=null;
                                        else{
                                            if(attrProps.type == 'object') newValue = JSON.parse(newValue);
                                        }
                                        self.item._viewId = self.view._id;
                                        self.item[this.name] = newValue;
                                        self.store.put(self.item, {viewId: self.view._id});
                                        console.log('self.item', self.item);
                                    });
                                    dijit.startup();
                                }
                            }
                            else {//Empty row
                                domConstruct.create("td", {colspan:2}, trDom);
                            }
                        }
                    }
                }
                return true;
            },
            radioButtonsOrSelect: function(tdDom, valuesArr, defaultValue){
                if(valuesArr.length == 1){
                    tdDom.innerHTML = valuesArr[0];
                }
                else{
                    var data = [];
                    valuesArr.forEach(function(value){
                        data.push({value:value,label:value});
                    });
                    var selectStore = new Memory({
                        data: data
                    });
                    if(valuesArr.length < 5) {
                        var editorArgs = {
                            id: tdDom.id,
                            store: selectStore,
                            idProperty: "value",
                            labelAttr: "label"
                        };
                        return new CheckedMultiSelect(editorArgs, domConstruct.create("input", null, tdDom));
                    }
                    else{
                        var editorArgs = {
                            id: tdDom.id,
                            //name: attrName,
                            store: selectStore,
                            //style: "width:99%;",
                            idProperty: "value",
                            labelAttr: 'label',
                            maxHeight: -1, // tells _HasDropDown to fit menu within viewport
                            fetchProperties: { sort : [ { attribute : "name" }]},
                            queryOptions: { ignoreCase: true }//doesnt work
                        };
                        return new Select(editorArgs, domConstruct.create("input", null, tdDom));
                    }
                }
            },
            setSelectedObjIdPreviousLevel: function(value){
                var self = this;
                this.store.get(value).then(function(docObj){
                    console.log('OBJECT:',docObj);
                    //console.log(JSON.stringify(docObj));
                    /*for(var attrName in self.schema.properties) {
                        var attrProps = self.schema.properties[attrName];
                        var value = docObj[attrName];
                        if(attrProps.type == 'object') value = JSON.stringify(value, null, 4);
                        var dijitId = self.view._id+':'+attrName;
                        var wid = registry.byId(dijitId);
                        if(wid) wid.set('value', value, false);// do not fire change
                        else {
                            var node = dom.byId(dijitId);
                            //if(node) node.innerHTML = value;
                        }
                    }*/
                });

                //var childrenCollection = self.store.filter(new self.store.Filter().contains('_children.emails', new self.store.Filter().eq('address', 'three@example.com')));

                var storeFilter = new this.store.Filter();
                var rootFilter = storeFilter.eq('_id', value);
                var rootCollection = this.store.filter(rootFilter);
                self.treeGrid.set('collection',rootCollection);


                self.store
                    .filter(new self.store.Filter().eq('_id', value))
                    .select('tabs')
                    .forEach(function(tab){
                        console.log('tab',tab)
                    });


                return;

                childrenQueryResult.forEach(function (item) {
                    console.log(item);
                });

                rootFilter

                var filter = new this.store.Filter();
                var childrenFilter = filter.in('_id', parentItem.childDocs);
                var childrenCollection = this.store.filter(childrenFilter);
                childrenCollection.on('remove, add', function(event){
                    /*var parent = event.parent;
                    var collection = self.childrenCache[parent.id];
                    if(collection){
                        var children = collection.fetch();
                        self.onChildrenChange(parent, children);
                    }*/
                });
                childrenCollection.on('update', function(event){
                    /*var obj = event.target;
                    self.onChange(obj);*/
                });
                var childrenQueryResult = childrenCollection.fetch();
                var childObjects = [];
                childrenQueryResult.forEach(function (item) {
                    childObjects.push(item);
                });
                console.dir(childObjects);
                return;
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
