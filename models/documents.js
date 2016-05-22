var db = require('../db');
var Deferred = require("promised-io/promise").Deferred;

exports.findById = function(id) {
    var collection = db.get().collection('documents');
    var deferred = new Deferred();
    collection.findOne({_id: id}, function(err, doc) {
        if (err) deferred.reject(err);
        else deferred.resolve(doc);
    });
    return deferred.promise;
};
exports.findOne = function(query){
    var collection = db.get().collection('documents');
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
    var collection = db.get().collection('documents');
    var deferred = new Deferred();
    collection.insert([doc],{},
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
};
exports.update = function(doc, unset) {
    var collection = db.get().collection('documents');
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
    var collection = db.get().collection('documents');
    var deferred = new Deferred();
    collection.remove({_id: id},
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
};
exports.find = function(query) {
    var collection = db.get().collection('documents');
    var deferred = new Deferred();
    collection.find(query).toArray(
        function(err, value) {
            if (err) deferred.reject(err);
            else deferred.resolve(value);
        });
    return deferred.promise;
};
exports.getParentClass = function(id) {
    var collection = db.get().collection('documents');
    var deferred = new Deferred();
    collection.find({docType:'class', children: id}).toArray(
        function(err, parentsArr) {
            if(err) deferred.reject(err);
            else {
                if(parentsArr.length>1) deferred.reject(new Error('More than one parent found'));
                else if(parentsArr.length==1) deferred.resolve(parentsArr[0]);
                else if(parentsArr.length==0  && id == "56f86c6a5dde184ccfb9fc6a") deferred.resolve(null);
                else deferred.reject(new Error('doc is an orphan'));
            }
        });
    return deferred.promise;
};
