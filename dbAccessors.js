var Deferred = require("promised-io/promise").Deferred;
function findOne(id, collection) {
    var deferred = new Deferred();
    collection.findOne({_id: id}, function(err, doc) {
        if (err) deferred.reject(err);
        else deferred.resolve(doc);
    });
    return deferred.promise;
}
function insert(doc, collection) {
    var deferred = new Deferred();
    collection.insert([doc],{},
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
}
function update(doc, collection) {
    var deferred = new Deferred();
    var id = doc._id;
    delete doc._id;
    collection.update({_id: id}, {$set:doc},
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
}
function remove(doc, collection) {
    var deferred = new Deferred();
    collection.remove({_id: doc._id}, doc,{},
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
}
function find(query, collection) {
    var deferred = new Deferred();
    //{$and:[{type:'parent'}, {dest: 74},]}
    collection.find(query).toArray(
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
}
function getNextSequence(name, countersColl) {
    var deferred = new Deferred();
    countersColl.findAndModify(
        {_id: name},
        [],
        {$inc: { seq: 1 }},
        {new: true},
        function(err, WriteResult) {
            if (err) deferred.reject(err);
            else deferred.resolve(WriteResult.value.seq);
        });
    return deferred.promise;
}
module.exports.findOne = findOne;
module.exports.insert = insert;
module.exports.update = update;
module.exports.remove = remove;
module.exports.find = find;
module.exports.getNextSequence = getNextSequence;
