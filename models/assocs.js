var db = require('../db');
var Deferred = require("promised-io/promise").Deferred;

exports.findById = function(id) {
    var deferred = new Deferred();
    var collection = db.get().collection('assocs');
    collection.findOne({_id: id}, function(err, doc) {
        if (err) deferred.reject(err);
        else deferred.resolve(doc);
    });
    return deferred.promise;
};
exports.insert = function(doc) {
    var deferred = new Deferred();
    var collection = db.get().collection('assocs');
    delete doc._id;
    collection.insert([doc],{},
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
};
exports.update = function(doc) {
    var deferred = new Deferred();
    var collection = db.get().collection('assocs');
    var id = doc._id;
    delete doc._id;
    collection.update({_id: id}, {$set:doc},
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
};
exports.remove = function(id) {
    var deferred = new Deferred();
    var collection = db.get().collection('assocs');
    collection.remove({_id: id},
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
};
exports.find = function(query) {
    var deferred = new Deferred();
    var collection = db.get().collection('assocs');
    collection.find(query).toArray(
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
};
exports.aggregate = function(query) {
    var deferred = new Deferred();
    var collection = db.get().collection('assocs');
    collection.aggregate(query,
//        function(resultArr, err) {
        function(err, resultArr) {
            if (err) deferred.reject(err);
            else deferred.resolve(resultArr);
        }
    );
    return deferred.promise;
};

