var db = require('../db');
var Deferred = require("promised-io/promise").Deferred;
var ObjectID = require('mongodb').ObjectID;
var merge = require('merge'), original, cloned;


exports.findById = function(id) {
    var collection = db.get().collection('documents');
    var deferred = new Deferred();
    var _id = ObjectID.createFromHexString(id);
    collection.findOne({_id: _id}, function(err, doc) {
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
    else updateObj = {$set:doc};
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
exports.getAncestors = function(id) {
    var self = this;
    return this.findById(id).then(function(doc){
        var parentId = doc.parentId;
        if(doc.docType == 'object') parentId = doc.classId;
        if(parentId) return self.getAncestors(parentId).then(function(ancestorsArr){
            ancestorsArr.unshift(doc);//add to the beginning
            return ancestorsArr;
        });
        else return [doc];//no parent, we are at the root
    });
};
exports.getInheritedClassSchema = function(id){
    return this.getAncestors(id).then(function(ancestorsArr){
        var inheritedClassSchema = {
            $schema: "http://json-schema.org/draft-04/schema#",
            properties:{},
            required:[],
            additionalProperties: false
        };
        ancestorsArr.forEach(function(ancestor){
            //combine the the two class.properties, there should be no overlap. If there is, the parent is leading
            merge.recursive(inheritedClassSchema.properties, ancestor.properties);
            //combine the to class.required arrays. There should be no overlap
            if(ancestor.required) inheritedClassSchema.required = inheritedClassSchema.required.concat(ancestor.required);
        });
        return inheritedClassSchema;
    });
};
