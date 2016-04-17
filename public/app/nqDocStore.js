define(['dojo/_base/declare', "dojo/_base/lang", "dojo/_base/array", "dojo/when", "dojo/promise/all", 'dstore/Store', 'dstore/QueryResults',
		'dstore/RequestMemory', 'dijit/registry', 'dojo/aspect','dstore/SimpleQuery', 'dojo/request'],
function(declare, lang, array, when, all, Store, QueryResults,
		 RequestMemory, registry, aspect, SimpleQuery, request){

    return declare("nqDocStore", [RequestMemory, SimpleQuery], {
        target: '/documents',
        idProperty: '_id',

        constructor: function () {
            this.root = this;
        },

        mayHaveChildren: function (object) {
            // summary:
            //		Check if an object may have children
            // description:
            //		This method is useful for eliminating the possibility that an object may have children,
            //		allowing collection consumers to determine things like whether to render UI for child-expansion
            //		and whether a query is necessary to retrieve an object's children.
            // object:
            //		The potential parent
            // returns: boolean
            return true;
            return 'hasChildren' in object ? object.hasChildren : true;
        },

        getRootCollection: function () {
            // summary:
            //		Get the collection of objects with no parents
            // returns: dstore/Store.Collection

            return this.root.filter({ parent: null });
        },

        getChildren: function (object) {
            // summary:
            //		Get a collection of the children of the provided parent object
            // object:
            //		The parent object
            // returns: dstore/Store.Collection

            return this.root.filter({ parent: this.getIdentity(object) });
        }

    });
});
