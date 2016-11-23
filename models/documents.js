var db = require('../db');
var Deferred = require("promised-io/promise").Deferred;
var when = require("promised-io/promise").when;
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
    doc._id = ObjectID.createFromHexString(doc._id);
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
    //var id = doc._id;
    var id = ObjectID.createFromHexString(doc._id);
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
    var _id = ObjectID.createFromHexString(id);
    collection.remove({_id: _id},
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
exports.getSchemaForView = function(viewId) {
    /* summary:  Used to create a JSON schema based on the view schema in combination with class attributes inherited through view.mapsTo.
     //          The same method is used server side to validate updates.
     // view: Object
     //          The starting point for our schema
     // returns: Object
     //          The schema object.
     */
    if(!viewId) return null;
    var self = this;
    return this.findById(viewId).then(function(viewObj){
    //return self.get(viewId).then(function(viewObj){
        if(!viewObj) throw new Error('View Object not found');
        //console.log('viewObj',viewObj);
        var inheritedClassSchemaPromise = {};
        if('rootQuery' in viewObj && 'from' in viewObj.rootQuery && viewObj.rootQuery.from != 'classes') {
            inheritedClassSchemaPromise = self.getInheritedClassSchema(viewObj.rootQuery.from);
        }
        else if('query' in viewObj && 'from' in viewObj.query && viewObj.query.from != 'classes') {
            inheritedClassSchemaPromise = self.getInheritedClassSchema(viewObj.query.from);
        }
        return when(inheritedClassSchemaPromise, function(inheritedClassSchema){
            //var properties = viewObj.properties;
            var inheritedClassProperties = inheritedClassSchema.properties;
            if(viewObj.query && 'subDoc' in viewObj.query){
                var subDocName = viewObj.query.subDoc;
                var subDocItems = inheritedClassSchema.properties[subDocName];
                inheritedClassProperties = subDocItems.items.properties;
            }
            //var schema = lang.clone(viewObj);
            var schema = viewObj;
            schema.properties = mergeProperties(viewObj.properties, inheritedClassSchema.properties);
            schema.required = [];

            schema.required = schema.required.concat(schema.required, inheritedClassSchema.required);
            //console.log('SCHEMA');
            //console.dir(schema);
            return schema;
        });
    });
};
function mergeProperties(viewProps, classProps) {
    var self = this;
    var properties = {};
    for(var viewPropName in viewProps){
        var viewProp = viewProps[viewPropName];
        if(classProps) {
            var classProp = classProps[viewPropName];
            var newProp = {};
            if(classProp) {
                if (classProp.type == 'object' && 'properties' in classProp && 'properties' in viewProp) {
                    var subDocClassProps = classProp.properties;
                    var subDocViewProps = viewProp.properties;
                    newProp.properties = mergeProperties(subDocViewProps, subDocClassProps);
                    newProp.type = 'object';
                    newProp.title = classProp.title;
                }
                else if (classProp.type == 'array' && 'items' in classProp && 'properties' in classProp.items &&
                    'items' in viewProp && 'properties' in viewProp.items) {
                    var subDocClassProps = classProp.items.properties;
                    var subDocViewProps = viewProp.items.properties;
                    var items = mergeProperties(subDocViewProps, subDocClassProps);
                    newProp.items = {properties: mergeProperties(subDocViewProps, subDocClassProps)};
                    newProp.type = 'array';
                    newProp.title = classProp.title;
                }
                else {
                    //newProp = lang.clone(classProp);
                    newProp = classProp;
                    if (classProp.readOnly) newProp.readOnly = true;
                    else newProp.readOnly = viewProp.readOnly == undefined ? true : viewProp.readOnly;
                    if (classProp.maxLength) {
                        if (viewProp.maxLength && viewProp.maxLength < classProp.maxLength) newProp.maxLength = viewProp.maxLength
                    }
                    if (classProp.minLength) {
                        if (viewProp.minLength && viewProp.minLength > classProp.minLength) newProp.minLength = viewProp.minLength
                    }
                    if (classProp.maximum) {
                        if (viewProp.maximum && viewProp.maximum < classProp.maximum) newProp.maximum = viewProp.maximum
                    }
                    if (classProp.minimum) {
                        if (viewProp.minimum && viewProp.minimum > classProp.minimum) newProp.minimum = viewProp.minimum
                    }
                }
                if(viewProp.title) newProp.title = viewProp.title;
                if(viewProp.col) newProp.col = viewProp.col;
                if(viewProp.row) newProp.row = viewProp.row;
                if(viewProp.default) newProp.default = viewProp.default;
                if(viewProp.styleColumn) newProp.styleColumn = viewProp.styleColumn;
                if(viewPropName=='_id') newProp.type = 'string';
            }
            //else newProp = lang.clone(viewProp);
            else newProp = viewProp;
            properties[viewPropName] = newProp;
        }
        else properties[viewPropName] = lang.clone(viewProp);
    }
    return properties;
}
