define([
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/_base/declare',
    'dojo/request',
    'dstore/Store',
    'dstore/SimpleQuery',
    'dstore/QueryResults'
], function (lang, arrayUtil, declare, request, Store, SimpleQuery, QueryResults) {
    return declare(Store, {

        //TODO Copied from http://dstorejs.io/tutorials/demo/GistStore.js

        apiUrl: 'https://api.github.com',

        headers: {
            Accept: 'application/vnd.github.v3+json'
        },

        // oAuthToken: String
        //		An OAuth token for the current user. Required for `put` and `remove` operations.
        oAuthToken: null,

        _request: function (target, options) {
            options = lang.mixin({ handleAs: 'json' }, options);

            options.headers = lang.mixin(
                this.headers,
                this.oAuthToken && { Authorization: 'token ' + this.oAuthToken },
                options.headers
            );

            return request(this.apiUrl + target, options);
        },

        _createSortQuerier: SimpleQuery.prototype._createSortQuerier,

        get: function (id) {
            // TODO: Share knowledge of the /gists/ URL instead of repeating for every CRUD method
            return this._request('/gists/' + encodeURIComponent(id), {
                method: 'GET'
            });
            // TODO: maybe return promise property if there is one or return something without a
            // `response` property
        },

        add: function (object) {
            return this._request('/gists', {
                method: 'POST',
                data: object
            });
        },

        put: function (object) {
            return this._request('/gists/' + encodeURIComponent(object.id), {
                method: 'PATCH',
                data: object
            });
        },

        remove: function (id) {
            return this._request('/gists/' + encodeURIComponent(id), {
                method: 'DELETE'
            });
        },

        fetch: function () {
            var queryLog = this.queryLog || [];
            var owner;
            var since;
            var serverFilter;
            for (var i = 0; i < queryLog.length; i++) {
                if (queryLog[i].type === 'filter') {
                    checkFilter(queryLog[i].normalizedArguments[0]);
                    if (serverFilter) {
                        queryLog[i].serverFilter = true;
                    }
                }
            }
            function checkFilter(filter) {
                // check the filter to see if the user or since is specified
                if (filter.type === 'eq' || filter.type === 'gte') {
                    // it is a filter for equivalence (or greater than or equal, which should used be for since)
                    var name = filter.args[0];
                    var value = filter.args[1];
                    if (name === 'owner') {
                        owner = value;
                        serverFilter = true;
                    }
                    if (name === 'since') {
                        since = value;
                        filter.args = [];
                        serverFilter = true;
                    }
                }
                if (filter.type === 'and') {
                    // need to check each part
                    checkFilter(filter.args[0], filter.args[1]);
                }
            }
            var target = owner ? '/users/' + encodeURIComponent(owner) + '/gists' : '/gists/public';
            return new QueryResults(this._request(target, {
                query: since ? { since: since.toISOString() } : null
            }).then(function (data) {
                // iterate through the query log, applying each querier
                for (var i = 0, l = queryLog.length; i < l; i++) {
                    var logEntry = queryLog[i];
                    if (!logEntry.serverFilter) {
                        data = logEntry.querier(data);
                    }
                }
                return data;
            }));
        },

        fetchRange: function (kwArgs) {
            var start = kwArgs.start,
                end = kwArgs.end,
                data = this.fetch();

            return new QueryResults(data.then(function (data) {
                return data.slice(start, end);
            }), {
                totalLength: data.then(function (data) {
                    return data.length;
                })
            });
        }
    });
});