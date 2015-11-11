var db = require('../db');
var Deferred = require("promised-io/promise").Deferred;

exports.findById = function(id) {
    var collection = db.get().collection('items');
    var deferred = new Deferred();
    collection.findOne({_id: id}, function(err, doc) {
        if (err) deferred.reject(err);
        else deferred.resolve(doc);
    });
    return deferred.promise;
};
exports.findOne = function(query){
    var collection = db.get().collection('items');
    var deferred = new Deferred();
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
    var collection = db.get().collection('items');
    var deferred = new Deferred();
    collection.insert([doc],{},
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
};
exports.update = function(doc, unset) {
    var collection = db.get().collection('items');
    var deferred = new Deferred();
    var id = doc._id;
    delete doc._id;
    var updateObj = {};
    if(unset) updateObj = {$set:doc, $unset: unset};
    updateObj = {$set:doc};
    collection.update({_id: id}, updateObj,
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
};
exports.remove = function(id) {
    var collection = db.get().collection('items');
    var deferred = new Deferred();
    collection.remove({_id: id},
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
};
exports.find = function(query) {
    var collection = db.get().collection('items');
    var deferred = new Deferred();
    collection.find(query).toArray(
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
};
exports.getNextSequence = function(name) {
    var collection = db.get().collection('counters');
    var deferred = new Deferred();
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
