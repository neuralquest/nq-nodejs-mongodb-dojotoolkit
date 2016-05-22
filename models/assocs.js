var db = require('../db');
var db = require('../db');
var Deferred = require("promised-io/promise").Deferred;
var ObjectID = require('mongodb').ObjectID;

exports.findById = function(id) {
    var collection = db.get().collection('assocs');
    var deferred = new Deferred();
    var _id = ObjectID.createFromHexString(id);
    collection.findOne({_id: _id}, function(err, doc) {
        if (err) deferred.reject(err);
        else deferred.resolve(doc);
    });
    return deferred.promise;
};
exports.findOne = function(query){
    var collection = db.get().collection('assocs');
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
    var collection = db.get().collection('assocs');
    var deferred = new Deferred();
    delete doc._id;
    collection.insert(doc,{}, function(err, value) {
        if (err) deferred.reject(err);
        else deferred.resolve(value);
    });
    return deferred.promise;
};
exports.update = function(doc) {
    var collection = db.get().collection('assocs');
    var deferred = new Deferred();
    var id = ObjectID.createFromHexString(doc._id);
    delete doc._id;
    collection.update({_id: id}, {$set: doc},function(err, value) {
        if (err) deferred.reject(err);
        else deferred.resolve(value);
    });
    return deferred.promise;
};
exports.remove = function(id) {
    var collection = db.get().collection('assocs');
    var deferred = new Deferred();
    var _id = ObjectID.createFromHexString(id);
    collection.remove({_id: _id}, function(err, value) {
        if (err) deferred.reject(err);
        else deferred.resolve(value);
    });
    return deferred.promise;
};
exports.find = function(query) {
    var collection = db.get().collection('assocs');
    var deferred = new Deferred();
    collection.find(query).toArray(
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
};
exports.aggregate = function(query) {
    var collection = db.get().collection('assocs');
    var deferred = new Deferred();
    collection.aggregate(query, function(err, resultArr) {
        if (err) deferred.reject(err);
        else deferred.resolve(resultArr);
    });
    return deferred.promise;
};
exports.removeReferences = function(id) {
    var collection = db.get().collection('assocs');
    var deferred = new Deferred();
    collection.remove({source: id}, function(err, value1) {
        if (err) deferred.reject(err);
        else {
            collection.remove({dest: id}, function(err, value) {
                if (err) deferred.reject(err);
                else deferred.resolve(value);
            });

        }
    });
    return deferred.promise;
};
