define(['dojo/_base/declare', "dojo/_base/lang", "dojo/_base/array", "dojo/when", "dojo/promise/all",
		'dstore/RequestMemory', 'dstore/QueryMethod'],
function(declare, lang, array, when, all,
		 RequestMemory, QueryMethod){

    return declare("nqDocStore", [RequestMemory], {
        target: '/documents',
        idProperty: '_id',
        constructor: function () {
            this.root = this;
        },
        getRootCollection: function () {

        },
        getChildren: function (parent) {

        },
        mayHaveChildren: function(obj) {
            return true;
        },
        dotArray: new QueryMethod({
            type: 'dotArray',
            querierFactory: function(filter){
                return function (parentObjArr) {
                    return parentObjArr[filter.id][filter.arrayName];
                };
            }
        })


    });
});
