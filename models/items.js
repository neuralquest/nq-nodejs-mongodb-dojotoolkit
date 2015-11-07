var db = require('../db');
var Deferred = require("promised-io/promise").Deferred;

exports.findById = function(id) {
    var deferred = new Deferred();
    var collection = db.get().collection('items');
    collection.findOne({_id: id}, function(err, doc) {
        if (err) deferred.reject(err);
        else deferred.resolve(doc);
    });
    return deferred.promise;
};
exports.findOne = function(query){
    var deferred = new Deferred();
    var collection = db.get().collection('items');
    collection.find(query).toArray(function(err, usersArr) {
        if (err) deferred.reject(err);
        else {
            if(!usersArr || usersArr.length == 0) deferred.resolve(null);
            else if(usersArr.length == 1) deferred.resolve(usersArr[0]);
            else throw (new Error("Duplicate found in collection"));
        }
    });
    return deferred.promise;
};
exports.insert = function(doc) {
    var deferred = new Deferred();
    var collection = db.get().collection('items');
    collection.insert([doc],{},
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
};
exports.update = function(doc, unset) {
    var deferred = new Deferred();
    if(!unset) unset = {};
    var collection = db.get().collection('items');
    var id = doc._id;
    delete doc._id;
    collection.update({_id: id}, {$set:doc, $unset: unset},
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
};
exports.remove = function(id) {
    var deferred = new Deferred();
    var collection = db.get().collection('items');
    collection.remove({_id: id},
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
};
exports.find = function(query) {
    var deferred = new Deferred();
    var collection = db.get().collection('items');
    collection.find(query).toArray(
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
};
exports.getNextSequence = function(name) {
    var deferred = new Deferred();
    var collection = db.get().collection('counters');
    collection.findAndModify(
        {_id: name},
        [],
        {$inc: { seq: 1 }},
        {new: true},
        function(err, WriteResult) {
            if (err) deferred.reject(err);
            else deferred.resolve(WriteResult.value.seq);
        });
    return deferred.promise;
};
