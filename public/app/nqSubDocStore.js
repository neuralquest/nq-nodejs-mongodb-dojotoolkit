define([
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/_base/declare',
    'dojo/request',
    'dstore/Store',
    'dstore/SimpleQuery',
    'dstore/QueryResults',
    'dojo/Deferred'
], function (lang, arrayUtil, declare, request, Store, SimpleQuery, QueryResults, Deferred) {
    return declare(Store, {
        _createSortQuerier: SimpleQuery.prototype._createSortQuerier,

        get: function (id) {

        },

        add: function (object) {

        },

        put: function (object) {

        },

        remove: function (id) {

        },

        fetch: function () {
            var dataDeferred = new Deferred();
            dataDeferred.resolve(this.data);
            var qr = new QueryResults(dataDeferred.promise);

            var tlDeferred = new Deferred();
            tlDeferred.resolve(this.data.length);
            qr.totalLength = tlDeferred.promise;

            return qr;
        },

        fetchRange: function (kwArgs) {
            var start = kwArgs.start,
                end = kwArgs.end;
            return this.fetch();

        }
    });
});