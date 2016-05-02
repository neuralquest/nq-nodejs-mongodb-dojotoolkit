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
                    var attrProps = parent[attrName];
                    if(Array.isArray(attrProps)) {
                        var childrenArr = parent[attrName];
                        childrenArr.forEach(function(childObj){
                            childObj.arrayName = parent.arrayName?parent.arrayName+'.'+attrName:attrName;
                        });
                        var idx = 0;
                        childrenArr.forEach(function(childObj){
                            var pathInObjArr = [];
                            if(parent.pathInObjArr) pathInObjArr = parent.pathInObjArr.slice(0);//clone
                            pathInObjArr.push({array:attrName,idx:idx});
                            childObj.pathInObjArr = pathInObjArr;
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

        }
    });
});
