var config = require('./config');
var Deferred = require("promised-io/promise").Deferred;
var all = require("promised-io/promise").all;
var itemsColl;
var assocsColl;
var countersColl;
var idMap = [];

function update(req){
    itemsColl = req.db.collection('items');
    assocsColl = req.db.collection('assocs');
    countersColl = db.collection('counters');
    var body = req.body;

    var itemsPromises = [];
    if(body.itemsColl){
        if(body.itemsColl.add) {
            var newItems = body.itemsColl.add;
            newItems.forEach(function (item) {
                itemsPromises.push(addItem(item));
            });
        }
        if(body.itemsColl.update) {
            var updateItems = body.itemsColl.update;
            updateItems.forEach(function (item) {
                itemsPromises.push(updateItem(item));
            });
        }
        if(body.itemsColl.delete) {
            var deleteItems = body.itemsColl.delete;
            deleteItems.forEach(function (id) {
                itemsPromises.push(deleteItem(id));
            });
        }
    }
    return all(itemsPromises).then(function(resultsArr){
        var assocsPromises = [];
        if(body.assocsColl){
            if(body.assocsColl.add) {
                var newAssocs = body.assocsColl.add;
                newAssocs.forEach(function (assoc) {
                    assocsPromises.push(addAssoc(assoc));
                });
            }
            if(body.assocsColl.update) {
                var updateAssocs = body.assocsColl.update;
                updateAssocs.forEach(function (assoc) {
                    assocsPromises.push(updateAssoc(assoc));
                });
            }
            if(body.assocsColl.delete) {
                var deleteAssocs = body.assocsColl.delete;
                deleteAssocs.forEach(function (id) {
                    assocsPromises.push(deleteAssoc(id));
                });
            }
         }
        return all(assocsPromises);
    });
}
function addItem(item) {
    return getNextSequence('itemsColl').then(function(id){
        var deferred = new Deferred();
        idMap[id] = item._id;
        item._id = id;
        itemsColl.insert([item],{},
            function(err, value) {
                if (err) deferred.reject(err);
                else deferred.resolve(value);
            });
        return deferred.promise;
    });
}
function updateItem(item) {
    var deferred = new Deferred();
    assocsColl.update({_id: item._id}, item,{},
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
}
function deleteItem(id) {
    var deferred = new Deferred();
    assocsColl.remove({_id: id},{},
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
}
function addAssoc(assoc) {
    var deferred = new Deferred();
    if(idMap[assoc.source]) assoc.source = idMap[assoc.source];
    if(idMap[assoc.dest]) assoc.dest = idMap[assoc.dest];
    assocsColl.insert([assoc],{},
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
}
function updateAssoc(assoc) {
    var deferred = new Deferred();
    if(idMap[assoc.source]) assoc.source = idMap[assoc.source];
    if(idMap[assoc.dest]) assoc.dest = idMap[assoc.dest];
    assocsColl.update({_id: assoc._id}, assoc,{},
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
}
function deleteAssoc(id) {
    var deferred = new Deferred();
    assocsColl.remove({_id: id},{},
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
}
function getNextSequence(name) {
    var deferred = new Deferred();
    countersColl.findAndModify(
        {_id: name},
        [],
        {$inc: { seq: 1 }},
        {new: true},
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
}

module.exports.update = update;
