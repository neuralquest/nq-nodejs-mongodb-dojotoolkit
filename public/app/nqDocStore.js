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
        getSchemaForView: function (viewId) {
            var self = this;
            return self.get(viewId).then(function(viewObj){
                if(!viewObj) throw new Error('View Object not found');
                console.log('viewObj',viewObj);
                if(!viewObj.mapsToId) throw new Error('View Object does not have a mapsToId');
                return self.get(viewObj.mapsToId).then(function(classObj){
                    if(!classObj) throw new Error('Class Object not found');
                    var combinedClassObj = {properties:{}, required:[]};
                    return self.collectClassSchemas(classObj, combinedClassObj).then(function(res){
                        console.log('combinedClassObj',combinedClassObj);
                        var schema = lang.clone(viewObj);
                        schema.properties = {};
                        schema.required = [];
                        for(var propName in viewObj.properties){
                            var prop = combinedClassObj.properties[propName];
                            if(!prop) debugger;
                            if(!prop) throw new Error('View has a property that is not found in the combined class schema');
                            var viewReadOnly = true;
                            if(viewObj.properties[propName].readOnly != undefined) viewReadOnly = viewObj.properties[propName].readOnly;
                            prop.readOnly = viewReadOnly;
                            schema.properties[propName] = prop;
                        }
                        schema.required = schema.required.concat(schema.required, combinedClassObj.required);
                        console.log(schema);
                        return schema;
                    });
                });
            });
        },
        collectClassSchemas: function (classObj, combinedClassObj) {
            var self = this;
            //combine the the two class.properties, there should be no overlap. If there is, the parent is leading
            lang.mixin(combinedClassObj.properties, classObj.properties);
            //combine the to class.required arrays. There should be no overlap
            combinedClassObj.required = combinedClassObj.required.concat(combinedClassObj.required, classObj.required);
            var parentFilter = self.Filter().contains('children', [classObj._id]);
            var parentCollection = self.filter(parentFilter);
            return parentCollection.fetch().then(function(parentsArr){
                if(parentsArr.length>1) throw new Error('More than one parent found');
                else if(parentsArr.length==1) {
                    return self.collectClassSchemas(parentsArr[0], combinedClassObj);
                }
                else return true;//no parent, we are at the root
            });
        },
        XcollectClassSchemas: function (classId) {
            var self = this;
            return self.get(classId).then(function(classObj){
                if(!classObj) throw new Error('Class Object not found');
                var parentFilter = self.Filter().contains('children', [classObj._id]);
                var parentCollection = self.filter(parentFilter);
                return parentCollection.fetch().then(function(parentsArr){
                    if(parentsArr.length>1) throw new Error('More than one parent found');
                    else if(parentsArr.length==1) {
                        var parentObj = parentsArr[0];
                        return self.collectClassSchemas(parentObj._id).then(function(parentClassObj) {
                            var newObj =  lang.mixin(lang.clone(classObj), parentClassObj);//combine the the two objects, parent is leading
                            console.log('newObj', newObj);
                            return newObj;
                        });
                    }
                    else return classObj;//no parent, we are at the root
                });
            });
        }
    });
});
