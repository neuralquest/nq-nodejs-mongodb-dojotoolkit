define(['dojo/_base/declare', "dojo/_base/lang", "dojo/_base/array","dojo/when", "dojo/promise/all", 'dijit/registry',"dojo/request",
		'dstore/RequestMemory', 'dojo/dom-construct'],
function(declare, lang, array, when, all, registry, request,
		 RequestMemory,  domConstruct){

    return declare("nqDocStore", [RequestMemory], {
        target: '/documents',
        idProperty: '_id',
        autoEmitEvents: false,
        transactionArr: [],
        constructor: function () {

        },
        add: function (newDoc, directives) {
            var self = this;
            this.enableTransactionButtons();
            newDoc._id = this.makeObjectId();
            newDoc.$newDoc = true;// Some forms need this to make new docs updatable

            this.transactionArr.push(
                {
                    action: 'add',
                    viewId: directives.viewId,
                    _id: newDoc._id,
                    $queryName: newDoc.$queryName,
                    doc: newDoc
                }
            );
            return this.cachingStore.add(newDoc, directives).then(function(doc){
                self.emit('update', {target:doc, directives:directives});
                if(directives && 'parentId' in directives){
                    var parentObj = self.cachingStore.getSync(directives.parentId);
                    if ('$queryName' in newDoc) {
                        var viewObj = self.cachingStore.getSync(directives.viewId);
                        var query;
                        if (newDoc.$queryName == 'rootQuery') query = self.schema.rootQuery;
                        else query = self.getSubQueryByName(viewObj.query, newDoc.$queryName);
                        if('where' in query && 'operator' in query.where && 'in' == query.where.operator){
                            var operator = query.where.operator;
                            var docProp = query.where.docProp;
                            var value = query.where.value;
                            if(value.substring(0, 1) == '$') {
                                var parentArray = self.getValueByDotNotation2(parentObj, value);
                                //var arrayName = value.substring(1);
                                //if(!parentObj[arrayName]) parentObj[arrayName] = [doc._id];
                                parentArray.push(doc._id);
                                self.put(parentObj, {viewId:directives.viewId}).then(function(item){
                                    return item;
                                });
                            }
                        }
                    }
                }
                return doc;
            });

            return;
            var item = {};
            if(_item) item = _item;
            if(directives.schema){
                item._id = this.makeObjectId();
                self.transactionObj.add[item._id] = item;
                /*for(var propName in directives.schema.properties){
                    var prop = directives.schema.properties[propName];
                    if(prop.default){
                        item[propName]= prop.default;
                    }
                }*/
                if(directives.schema.query && 'isA' in directives.schema.query){
                    item.classId = directives.schema.query['isA'];
                }
                else if(directives.schema.query && 'and' in directives.schema.query){
                    var queryArray = directives.schema.query['and'];
                    var mapsToId = null;
                    if('isA' in queryArray[0]) mapsToId = queryArray[0]['isA'];
                    else if('isA' in queryArray[1]) mapsToId = queryArray[0]['isA'];
                    item.classId = mapsToId;
                }

                var parentObj = null;
                if(directives.parentId){
                    parentObj = this.cachingStore.getSync(directives.parentId);
                    if(directives.schema.childrenQuery && 'in' in directives.schema.childrenQuery){
                        var inObj = directives.schema.childrenQuery['in'];
                        for(var key in inObj){
                            var arrayName = inObj[key];
                            var fkArray = parentObj[arrayName];
                            if(!fkArray) fkArray = [];
                            fkArray.push(item[key]);
                            parentObj[arrayName] = fkArray;
                            //parentObj.hasChildren = true;

                        }
                    }
                    else if(directives.schema.childrenQuery && 'and' in directives.schema.childrenQuery){
                        var queryArray = directives.schema.childrenQuery['and'];
                        debugger;
                    }
                }

                if(directives.ownerId){
                    item.ownerId = directives.ownerId;
                }
                return this.cachingStore.add(item, directives).then(function(item){
                    if(parentObj) return self.put(parentObj).then(function(){
                        return item;
                    });
                    else return item;
                });


            }
        },
        put: function (item, directives) {
            var self = this;
            this.enableTransactionButtons();
            this.transactionArr.push(
                {
                    action: 'update',
                    viewId: directives.viewId,
                    _id: item._id,
                    doc: item
                }
            );
            //if(!directives.viewId) directives.viewId = item._viewId;//TODO pastItem should send viewID in directives
            this.processDirectives(item, directives);
            return this.cachingStore.put(item, directives).then(function(item){
                self.emit('update', {target:item, directives:directives});
                return item;
            });
        },
        remove: function (item, directives) {
            this.enableTransactionButtons();
            if(!item._id in self.transactionObj.add) delete self.transactionObj.add[item._id];
            else {
                delete self.transactionObj.update[item._id];
                self.transactionObj.delete[item._id] = item;
            }
            this.emit('remove', {target:item, directives:directives});
            return this.cachingStore.remove(item, directives);
        },
        processDirectives: function(object, directives){
            if(!directives) return;
            var self = this;
            var viewId = directives.viewId;
            var arrayName = 'childDocs';
            var movingObjectId = object._id;
            var oldParent = directives.oldParent;
            var newParent = directives.parent;
            //var newParentId = directives.parent.id;
            var beforeId = directives.before?directives.before._id:undefined;
            var promises = [];

            if(true == true){
                if(oldParent){
                    if(newParent){ //the 'moving object' is detached from the old parent and attached to the new parent
                        var idx = oldParent[arrayName].indexOf(movingObjectId);
                        if(idx>-1) {
                            oldParent[arrayName].splice(idx,1);
                            //store put old
                            promises.push(self.put(oldParent));
                            if(beforeId) {
                                var beforeIdx = newParent[arrayName].indexOf(beforeId);
                                if(beforeIdx>0) {
                                    newParent[arrayName].splice(beforeIdx,0,movingObjectId);
                                }
                                else {
                                    if(newParent[arrayName]) newParent[arrayName].push(movingObjectId);
                                    else newParent[arrayName] = [movingObjectId];
                                }
                            }
                            else {
                                if(newParent[arrayName]) newParent[arrayName].push(movingObjectId);
                                else newParent[arrayName] = [movingObjectId];
                            }
                            //store put new
                            promises.push(self.put(newParent));
                        }

                    }
                    else{//no new parent means we are detaching the 'moving object' from the old parent
                        var idx = oldParent[arrayName].indexOf(movingObjectId);
                        if(idx>0) {
                            oldParent[arrayName].splice(idx,1);
                            //store put old
                            promises.push(self.put(oldParent));
                        }
                    }
                }
                else if(newParent) {//no oldParent means a new 'moving object' is attached to the new parent
                    if(beforeId) {
                        var beforeIdx = newParent[arrayName].indexOf(beforeId);
                        if(beforeIdx>0) {
                            newParent[arrayName].splice(beforeIdx,0,movingObjectId);
                        }
                        else {
                            if(newParent[arrayName]) newParent[arrayName].push(movingObjectId);
                            else newParent[arrayName] = [movingObjectId];
                        }
                    }
                    else {
                        if(newParent[arrayName]) newParent[arrayName].push(movingObjectId);
                        else newParent[arrayName]= [movingObjectId];
                    }
                    //store put new
                    promises.push(self.put(newParent));
                }
            }
            else{
                if(oldParent){
                    if(newParent){ //the 'moving object' is detached from the old parent and attached to the new parent
                    }
                    else{//no new parent means we are detaching the 'moving object' from the old parent
                    }
                }
                else if(newParent) {//no oldParent means a new 'moving object' is attached to the new parent

                }
            }
            return all(promises);
        },
        getRootCollection: function () {

        },
        getParentClass: function(id) {
            var self = this;
            var parentFilter = self.Filter().contains('children', [id]);
            var parentCollection = self.filter(parentFilter);
            return parentCollection.fetch().then(function(parentsArr){
                if(parentsArr.length>1) throw new Error('More than one parent found');
                else if(parentsArr.length==1) return parentsArr[0];
                else return null;//no parent, we are at the root
            });
        },
        getSchemaForView: function (viewId) {
            if(!viewId) return null;
            var self = this;
            return self.get(viewId).then(function(viewObj){
                if(!viewObj) throw new Error('View Object not found');
                //console.log('viewObj',viewObj);
                var inheritedClassSchemaPromise = {};
                if('rootQuery' in viewObj && 'from' in viewObj.rootQuery && viewObj.rootQuery.from != 'classes') {
                    inheritedClassSchemaPromise = self.getInheritedClassSchema(viewObj.rootQuery.from);
                }//TODO we have to rethink this. what do we do if we have more tahn one query in the array
                else if('query' in viewObj && 'from' in viewObj.query[0] && viewObj.query[0].from != 'classes') {
                    inheritedClassSchemaPromise = self.getInheritedClassSchema(viewObj.query[0].from);
                }
                return when(inheritedClassSchemaPromise, function(inheritedClassSchema){
                    //var properties = viewObj.properties;
                    var inheritedClassProperties = inheritedClassSchema.properties;
                    if(viewObj.query && 'subDoc' in viewObj.query){
                        var subDocName = viewObj.query.subDoc;
                        var subDocItems = inheritedClassSchema.properties[subDocName];
                        inheritedClassProperties = subDocItems.items.properties;
                    }
                    var schema = lang.clone(viewObj);
                    schema.properties = self.mergeProperties(viewObj.properties, inheritedClassSchema.properties);
                    schema.required = [];

                    schema.required = schema.required.concat(schema.required, inheritedClassSchema.required);
                    //console.log('SCHEMA');
                    //console.dir(schema);
                    return schema;
                });
            });
        },
        getAncestors: function(id) {
            var self = this;
            return this.get(id).then(function(classObj){
                if(classObj.parentId) return self.getAncestors(classObj.parentId).then(function(ancestorsArr){
                    ancestorsArr.unshift(classObj);//add to the beginning
                    return ancestorsArr;
                });
                else return [classObj];//no parent, we are at the root
            });
        },
        getInheritedClassSchema: function(id){
            return this.getAncestors(id).then(function(ancestorsArr){
                var inheritedClassSchema = {
                    $schema: "http://json-schema.org/draft-04/schema#",
                    properties:{},
                    required:[],
                    additionalProperties: false
                };
                for(var i = ancestorsArr.length-1; i>=0; i--){
                    var ancestor = ancestorsArr[i];
                    //combine the the two class.properties, there should be no overlap. If there is, the parent is leading
                    //we have to clone otherwise we start messing with the real class
                    lang.mixin(inheritedClassSchema.properties, lang.clone(ancestor.properties));
                    //merge.recursive(inheritedClassSchema.properties, ancestor.properties);
                    //combine the to class.required arrays. There should be no overlap
                    if(ancestor.required) inheritedClassSchema.required = inheritedClassSchema.required.concat(ancestor.required);

                };
                /*ancestorsArr.forEach(function(ancestor){
                    //combine the the two class.properties, there should be no overlap. If there is, the parent is leading
                    //we have to clone otherwise we start messing with the real class
                    lang.mixin(inheritedClassSchema.properties, lang.clone(ancestor.properties));
                    //merge.recursive(inheritedClassSchema.properties, ancestor.properties);
                    //combine the to class.required arrays. There should be no overlap
                    if(ancestor.required) inheritedClassSchema.required = inheritedClassSchema.required.concat(ancestor.required);
                });*/
                return inheritedClassSchema;
            });
        },
        mergeProperties: function(viewProps, classProps) {
            var self = this;
            var properties = {};
            for(var viewPropName in viewProps){
                var viewProp = viewProps[viewPropName];
                if(classProps) {
                    var classProp = classProps[viewPropName];
                    var newProp = {};
                    if(classProp) {
                        if (classProp.type == 'object' && 'properties' in classProp && 'properties' in viewProp) {
                            var subDocClassProps = classProp.properties;
                            var subDocViewProps = viewProp.properties;
                            newProp.properties = self.mergeProperties(subDocViewProps, subDocClassProps);
                            newProp.type = 'object';
                            newProp.title = classProp.title;
                        }
                        else if (classProp.type == 'array' && 'items' in classProp && 'properties' in classProp.items &&
                            'items' in viewProp && 'properties' in viewProp.items) {
                            var subDocClassProps = classProp.items.properties;
                            var subDocViewProps = viewProp.items.properties;
                            var items = self.mergeProperties(subDocViewProps, subDocClassProps);
                            newProp.items = {properties: self.mergeProperties(subDocViewProps, subDocClassProps)};
                            newProp.type = 'array';
                            newProp.title = classProp.title;
                        }
                        else {
                            newProp = lang.clone(classProp);
                            if (classProp.readOnly) newProp.readOnly = classProp.readOnly;
                            else {
                                newProp.readOnly = viewProp.readOnly == undefined ? true : viewProp.readOnly;
                                newProp.readOnlyOnNew = viewProp.readOnlyOnNew == undefined ? true : viewProp.readOnlyOnNew;
                            }
                            if (classProp.maxLength) {
                                if (viewProp.maxLength && viewProp.maxLength < classProp.maxLength) newProp.maxLength = viewProp.maxLength
                            }
                            if (classProp.minLength) {
                                if (viewProp.minLength && viewProp.minLength > classProp.minLength) newProp.minLength = viewProp.minLength
                            }
                            if (classProp.maximum) {
                                if (viewProp.maximum && viewProp.maximum < classProp.maximum) newProp.maximum = viewProp.maximum
                            }
                            if (classProp.minimum) {
                                if (viewProp.minimum && viewProp.minimum > classProp.minimum) newProp.minimum = viewProp.minimum
                            }
                        }
                        if(viewProp.title != undefined) newProp.title = viewProp.title;//the title may be set to null by the view
                        if(viewProp.col) newProp.col = viewProp.col;
                        if(viewProp.row) newProp.row = viewProp.row;
                        if(viewProp.style) newProp.style = viewProp.style;
                        if(viewProp.labelStyle) newProp.labelStyle = viewProp.labelStyle;
                        if(viewProp.default) newProp.default = viewProp.default;
                        if(viewProp.styleColumn) newProp.styleColumn = viewProp.styleColumn;
                        if(viewProp.displayIcon) newProp.displayIcon = viewProp.displayIcon;
                        if(viewPropName=='_id') newProp.type = 'string';// hack so we get id as sting instead of object
                    }
                    else newProp = lang.clone(viewProp);
                    properties[viewPropName] = newProp;
                }
                else properties[viewPropName] = lang.clone(viewProp);
            }
            return properties;
        },
        isASync: function(docId, id) {
            if(!docId || !id) return false;
            var doc = docId;
            if(typeof(docId) == 'string') {
                if(docId == id) return true;
                doc = this.cachingStore.getSync(docId);
            }
            if(!doc) return false;
            if(doc._id === id) return true;
            var parentId = doc.docType=='object'?doc.classId:doc.parentId;
            if(!parentId) return false;
            //var parentDoc =  this.cachingStore.getSync(parentId);
            return this.isASync(parentId, id);
        },
        isA: function(doc, id) {
            var self = this;
            if(doc._id === id) return true;
            var parentId = doc.docType=='object'?doc.classId:doc.parentId;
            if(!parentId) return false;
            return this.get(parentId).then(function(parentDoc){
                return self.isA(parentDoc, id);
            });
        },
        getCollectionForSubstitutedQuery: function(query, parent) {
            var parentObj = parent;
            if(typeof parent == 'string') parentObj = this.cachingStore.getSync(parent);
            var clonedQuery = lang.clone(query);
            this.substituteVariablesInQuery(clonedQuery, parentObj);
            var filter = this.buildFilterFromQuery(clonedQuery);
            return this.filter(filter);
        },
        substituteVariablesInQuery: function(query, parentObj) {
            var self  = this;
            if(Array.isArray(query)){
                for(var i=0;i<query.length;i++){
                    var subQuery = query[i];
                    this.substituteVariablesInQuery(subQuery, parentObj);
                }
            }
            else {
                if('where' in query && 'value' in query.where) {
                    var value = query.where.value;
                    var substitutedValue = self.getValueByDotNotation2(parentObj, value);
                    query.where.value = substitutedValue;
                }
                if('join' in query) this.substituteVariablesInQuery(query.join, parentObj);
            }
        },
        getValueByDotNotation: function(obj, path) {
            var current = obj;
            var pathArr = path.split('.');
            pathArr.forEach(function(part){
                current = current[part];
            });
            return current;
        },
        setValueByDotNotation: function(obj, path, value) {
            var current = obj;
            var pathArr = path.split('.');
            var last = pathArr.pop();
            pathArr.forEach(function(part){
                current = current[part];
            });
            current[last] = value;
        },
        getValueByDotNotation2: function(obj, path) {
            var self = this;
            if(path == "$docId") return obj._id; //TODO replace docId with $self._id
            if(path == "$userId") return nq.getUser()._id;
            if(path == "$ownerId") return nq.getOwner()._id;

            var pos = path.search('==');
            if(pos>-1){
                var leftString = path.substring(0, pos);
                var rightString = path.substring(pos);
                var leftValue = self.getValueByDotNotation2(obj, leftString);
                if(typeof(leftValue) == 'string') leftValue = "'"+leftValue+"'";
                var res = eval(leftValue+rightString);
                return res;
            }
            else if (path.startsWith('$get(')) {
                var internalString = path.substring(path.indexOf('(') + 1, path.lastIndexOf(')'));
                var remainingString = path.substring(path.lastIndexOf(')')+2);
                var internalValue = self.getValueByDotNotation2(obj, internalString);
                var foundObj = self.cachingStore.getSync(internalValue);
                var res = self.getValueByDotNotation2(foundObj, remainingString);
                return res;
            }
            else if (path.startsWith('$isA(')) {
                var leftString = path.substring(path.indexOf('(') + 1, path.indexOf(','));
                var rightString = path.substring(path.indexOf(',') + 1, path.indexOf(')'));
                var leftValue = self.getValueByDotNotation2(obj, leftString);
                var rightValue = self.getValueByDotNotation2(obj, rightString);
                var res = self.isASync(leftValue, rightValue);
                return res;
            }

            var pathArr = path.split('.');
            if(pathArr.length == 1){
                return path;
            }
            var current = path;
            pathArr.forEach(function(part){
                if(!current) return;
                if(part == '$self') current = obj;
                else if(part == '$parent') current = obj;//TODO parent will be removed
                else current = current[part];
            });
            return current;
        },
        buildFilterFromQuery: function(query){
            var self = this;
            return self.Filter(function (obj) {
                if(!query) return false;

                if(!'from' in query) return false;
                if(query.from == 'classes'){
                    if(obj.docType == 'object') return false;
                }
                else {
                    if(obj.docType == 'class') return false;
                    if(!self.isASync(obj, query.from)) return false;
                }

                if('where' in query) {
                    if('operator' in query.where) {
                        var whereClause = query.where;
                        if(whereClause.operator == 'eq'){
                            if(!whereClause.docProp || !whereClause.value) return false;
                            var docValue = self.getValueByDotNotation(obj, whereClause.docProp);
                            if(!docValue) return false;
                            if(docValue != whereClause.value) return false;
                        }
                        else if(whereClause.operator == 'in'){
                            if(!whereClause.docProp || !whereClause.value) return false;
                            var docValue = self.getValueByDotNotation(obj, whereClause.docProp);
                            if(!docValue) return false;
                            var value = whereClause.value;
                            var position = array.indexOf(value, docValue);
                            if(position == -1) return false;
                        }
                        else if(whereClause.operator == 'and') {
                            debugger;
                            return false;
                        }
                        else if(whereClause.operator == 'or') {
                            debugger;
                            return false;
                        }
                    }
                }

                return true;
            });
        },
        getSubQueryByName: function(query, queryName) {
            //This is a duplicate from ObjectStoreModel
            if(Array.isArray(query)){
                for(var i=0;i<query.length;i++){
                    var subQuery = query[i];
                    var foundQuery = this.getSubQueryByName(subQuery, queryName);
                    if(foundQuery) return foundQuery;
                }
            }
            else if(query.queryName == queryName) return query;
            else if('join' in query) return this.getSubQueryByName(query.join, queryName);
        },
        amAuthorizedToUpdate: function(doc){
            return true;
            var user = nq.getUser();
            if(user.id) return user.id;
            return false;
            var userId = "575d4c3f2cf3d6dc3ed83148";
            var ownerFilter = this.Filter().contains('owns', +[doc._id]);
            var ownerCollection = this.filter(ownerFilter);
            return ownerCollection.fetch().then(function(owners){
                console.log('owner of', doc.name, ownerFilter);
                console.dir(owners);
                if(owners[0]._id == userId) return true;
                return false;
            });
        },
        makeObjectId: function() {
            var timestamp = (new Date().getTime() / 1000 | 0).toString(16);
            return timestamp + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, function() {
                    return (Math.random() * 16 | 0).toString(16);
                }).toLowerCase();
        },
        enableTransactionButtons: function () {
            registry.byId('cancelButtonId').set('disabled', false);
            registry.byId('saveButtonId').set('disabled', false);
        },
        commit: function(){
            var self = this;


            request.post('/documents', {
                // send all the operations in the body
                headers: {'Content-Type': 'application/json; charset=UTF-8'},//This is not the default!!
                data: JSON.stringify(self.transactionArr)
            }).then(function(data){
                console.log('data', data);
                self.transactionArr = [];
                var domNode = domConstruct.create("div", {
                    style:{
                        border: '2px solid gray','border-radius': '5px',position: 'fixed','z-index': 2,opacity: 0,
                        'background-color': 'lime',top: '30%',left: '40%',width: '100px',height: '50px'
                    }
                }, 'fullPage');
                domConstruct.create("div", {
                    style:{ 'font-size': '20px','font-weight': 'bold','text-align': 'center', 'margin-top': '15px'},
                    innerHTML: 'Saved'
                }, domNode);
                dojo.fadeIn({
                    node:domNode,duration: 300,
                    onEnd: function(){
                        dojo.fadeOut({
                            node:domNode,duration: 300,delay:300,
                            onEnd: function(){domConstruct.destroy(domNode)}
                        }).play();
                    }}).play();
                registry.byId('cancelButtonId').set('disabled',true);
                registry.byId('saveButtonId').set('disabled',true);
            },function(error){
                nq.errorDialog(error);
            });
        },
        abort: function(){
            registry.byId('cancelButtonId').set('disabled',true);
            registry.byId('saveButtonId').set('disabled',true);
            self.transactionObj = {};
        }
    });
});
