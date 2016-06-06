define(['dojo/_base/declare', "dojo/_base/lang", "dojo/_base/array", "dojo/when", "dojo/promise/all",
		'dstore/RequestMemory', 'dstore/SimpleQuery', 'dstore/QueryMethod', 'dstore/QueryResults'],
function(declare, lang, array, when, all,
		 RequestMemory, SimpleQuery, QueryMethod, QueryResults){

    return declare("nqDocStore", [RequestMemory], {
        target: '/documents',
        idProperty: '_id',
        constructor: function () {
            this.root = this;
            this.cachingStore.getChildren = function(parent){
                var filter = {};
                for(var attrName in parent){
                    if(attrName == 'structuredDocPathArr') continue;
                    var attrProps = parent[attrName];
                    if(Array.isArray(attrProps)) {
                        var childrenArr = parent[attrName];
                        var idx = 0;
                        childrenArr.forEach(function(childObj){
                            //childObj.arrayName = parent.arrayName?parent.arrayName+'.'+attrName:attrName;

                            var structuredDocPathArr = [];
                            if(parent.structuredDocPathArr) structuredDocPathArr = parent.structuredDocPathArr.slice(0);//clone
                            structuredDocPathArr.push({arrayName:attrName,idx:idx});
                            childObj.structuredDocPathArr = structuredDocPathArr;
                            idx++;
                        });
                        filter = {data: childrenArr}
                    }
                }
                return this.dotArray(filter);
            };
            this.cachingStore.dotArray = new QueryMethod({
                type: 'dotArray',
                querierFactory: function(filter){
                    return function (data) {
                        return filter.data;
                        //return data[filter._id][filter.arrayName];
                    };
                }
            });
            this.mayHaveChildren = function(obj) {
                return true;
            }
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
            if(!viewId) return{};
            var self = this;
            return self.get(viewId).then(function(viewObj){
                if(!viewObj) throw new Error('View Object not found');
                //console.log('viewObj',viewObj);
                var classPromise = null;
                if(viewObj.filter && viewObj.filter.type && viewObj.filter.type == 'isA'){
                    var mapsToId = viewObj.filter.args[0];//TODO should be able to deal with multiple levels
                    classPromise = self.get(mapsToId);
                }
                else classPromise = {};
                return when(classPromise, function(classObj){
                    if(!classObj) throw new Error('Class Object not found');
                    var inheritedClassSchema = {properties:{}, required:[]};
                    return self.collectClassSchemas(classObj, inheritedClassSchema).then(function(res){
                        //console.log('inheritedClassSchema',inheritedClassSchema);
                        var schema = lang.clone(viewObj);
                        schema.properties = {};
                        schema.required = [];
                        for(var propName in viewObj.properties){
                            var prop = inheritedClassSchema.properties[propName];
                            if(!prop) {
                                schema.properties[propName] = lang.clone(viewObj.properties[propName]);
                                //console.log('prop notFound', propName, 'in class', classObj);
                            }
                            else{
                                var viewReadOnly = true;
                                if(viewObj.properties[propName].readOnly != undefined) viewReadOnly = viewObj.properties[propName].readOnly;
                                prop.readOnly = viewReadOnly;
                                schema.properties[propName] = prop;
                            }
                        }
                        schema.required = schema.required.concat(schema.required, inheritedClassSchema.required);
                        //console.log('SCHEMA');
                        //console.dir(schema);
                        return schema;
                    });
                });
            });
        },
        collectClassSchemas: function (classObj, inheritedClassSchema) {
            var self = this;
            //combine the the two class.properties, there should be no overlap. If there is, the parent is leading
            lang.mixin(inheritedClassSchema.properties, classObj.properties);
            //combine the to class.required arrays. There should be no overlap
            if(classObj.required) inheritedClassSchema.required = inheritedClassSchema.required.concat(inheritedClassSchema.required, classObj.required);
            return self.getParentClass(classObj._id).then(function(parentClassObj){
                if(parentClassObj) return self.collectClassSchemas(parentClassObj, inheritedClassSchema);
                else return true;//no parent, we are at the root
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
                ancestorsArr.forEach(function(ancestor){
                    //combine the the two class.properties, there should be no overlap. If there is, the parent is leading
                    lang.mixin(inheritedClassSchema.properties, ancestor.properties);
                    //merge.recursive(inheritedClassSchema.properties, ancestor.properties);
                    //combine the to class.required arrays. There should be no overlap
                    if(ancestor.required) inheritedClassSchema.required = inheritedClassSchema.required.concat(inheritedClassSchema.required, ancestor.required);
                });
                return inheritedClassSchema;
            });
        },
        isASync: function(doc, id) {
            if(doc._id == id) return true;
            if(!doc.parentId) return false;
            var parentDoc =  this.cachingStore.getSync(doc.parentId);
            return this.isASync(parentDoc, id);
        },
        isA: function(doc, id) {
            var self = this;
            if(doc._id == id) return true;
            if(!doc.parentId) return false;
            return this.get(doc.parentId).then(function(parentDoc){
                return self.isA(parentDoc, id);
            });
        },
        getInstances: function(id) {

        },
        getSubclasses: function(id) {

        },
        buildFilter: function(parentObj, docFilter) {
            var self = this;
            var filterType = docFilter.type;
            switch (filterType) {
                case 'eq':
                    var key = docFilter.args[0];
                    var propName = docFilter.args[1];
                    var value = parentObj[propName];
                    return self.Filter().eq(key, value);
                    break;
                case 'and':
                    var firstDocFilter = docFilter.args[0];
                    var secondDocFilter = docFilter.args[1];
                    var firstFilter = this.buildFilter(parentObj, firstDocFilter);
                    var secondFilter = this.buildFilter(parentObj, secondDocFilter);
                    if(firstFilter && secondFilter) return self.Filter().and(firstFilter, secondFilter);
                    break;
                case 'or':
                    var firstDocFilter = docFilter.args[0];
                    var secondDocFilter = docFilter.args[1];
                    var firstFilter = this.buildFilter(parentObj, firstDocFilter);
                    var secondFilter = this.buildFilter(parentObj, secondDocFilter);
                    if(firstFilter && secondFilter) return self.Filter().or(firstFilter, secondFilter);
                    if(firstFilter) return firstFilter;
                    if(secondFilter) return secondFilter;
                    break;
                case 'in':
                    var foreignKey = docFilter.args[0];
                    var idArrName = docFilter.args[1];
                    if(idArrName.substr(0,1) == '$'){
                        debugger;
                    }
                    var idArr = parentObj[idArrName];
                    if(!idArr) return;
                    return this.Filter().in(foreignKey, idArr);
                    break;
                case 'isA':
                    return this.Filter(function(obj){
                        if(obj.docType == 'class') return false;
                        var classId = docFilter.args[0];
                        return self.isASync(obj, classId);
                    });
                    break;
                case 'view':
                    var subViewId = docFilter.args[0];
                    var subView = this.cachingStore.getSync(subViewId);
                    if(subView  && subView.filter){
                        var subViewFilter = subView.filter;
                        return this.buildFilter(parentObj, subViewFilter);
                    }
                    break;
                default:
                    break;
            }
        },
        updateAllowed: function(doc){
            var userId = "570064645dde184ccfb9fc84";
            var ownerFilter = this.Filter().contains('owns', [doc._id]);
            var ownerCollection = this.filter(ownerFilter);
            return ownerCollection.fetch().then(function(owners){
                console.log('owner of', doc.name, ownerFilter);
                console.dir(owners);
                if(owners[0]._id == userId) return true;
                return false;
            });
        }
    });
});
