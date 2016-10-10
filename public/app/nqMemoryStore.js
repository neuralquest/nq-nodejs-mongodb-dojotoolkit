define(['dojo/_base/declare', 'dstore/Memory', 'dstore/QueryMethod'],
    function(declare, Memory, QueryMethod){
        return declare("nqMemoryStore", [Memory], {
            getChildren: new QueryMethod({
                type: 'children',
                querierFactory: function (parent) {
                    var parentId = this.getIdentity(parent);

                    return function (data) {
                        // note: in this case, the input data is ignored as this querier
                        // returns an object's array of children instead

                        // return the children of the parent
                        // or an empty array if the parent no longer exists
                        var parent = this.getSync(parentId);
                        return parent ? parent.children : [];
                    };
                }
            })

        });
    });