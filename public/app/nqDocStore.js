define(['dojo/_base/declare', "dojo/_base/lang", "dojo/_base/array", "dojo/when", "dojo/promise/all", 'dstore/Store', 'dstore/QueryResults',
		'dstore/RequestMemory', 'dijit/registry', 'dojo/aspect','dstore/SimpleQuery', 'dojo/request'],
function(declare, lang, array, when, all, Store, QueryResults,
		 RequestMemory, registry, aspect, SimpleQuery, request){

    return declare("nqDocStore", [RequestMemory, SimpleQuery], {
        target: '/documents',
        idProperty: '_id'

    });
});
