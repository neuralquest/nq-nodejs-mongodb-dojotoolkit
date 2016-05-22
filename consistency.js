var Deferred = require("promised-io/promise").Deferred;
var all = require("promised-io/promise").all;
var when = require("promised-io/promise").when;
var utils = require('./public/app/utils');
var Documents = require('./models/documents');
var tv4 = require("tv4");
var ObjectID = require('mongodb').ObjectID;
var merge = require('merge'), original, cloned;

function check(){
    var checkPromises = [];
    //checkPromises.push(cleanup());
    checkPromises.push(findOrphans());
    checkPromises.push(validateObjects());
    //checkPromises.push(validateAssocs());
    //checkPromises.push(assocsUnique());
    //checkPromises.push(validateObjectAssoc());
    return all(checkPromises).then(function(checkArr){
        return {consistencyCheck:checkArr};
    });
}
function findOrphans(){
    return Documents.find().then(function(objectsArr){
        var classPromises = [];
        objectsArr.forEach(function(doc) {
            var docId = ObjectID(doc._id).toString();
            classPromises.push(Documents.getParentClass(docId));
        });
        return all(classPromises).then(function(classPromisesArr){
            var results = [];
            var index = 0;
            classPromisesArr.forEach(function(parent) {
                var doc = objectsArr[index];
                var docId = ObjectID(doc._id).toString();
                if(docId != "56f86c6a5dde184ccfb9fc6a"){//do not check 'Problem Domain'
                    if(!parent) results.push({noParentFound:doc});
                }
                index++;
            });
            return {
                id: 1,
                name: 'Find Orphans',
                rule: 'All objects and classes must be a child of a class',
                exceptions: 'Does not apply to the root class: Problem Domain',
                count: results.length,
                invalid: results};
        });
    });
}
function validateObjects(){
    return Documents.find({docType:'object'}).then(function(objectsArr){
        var classPromises = [];
        var results = [];
        objectsArr.forEach(function(objDoc) {
            var docId = ObjectID(objDoc._id).toString();
            classPromises.push(Documents.getParentClass(docId).then(function(parentClass){
                var inheritedClassSchema = {
                    $schema: "http://json-schema.org/draft-04/schema#",
                    properties:{},
                    required:[],
                    additionalProperties: false
                };
                return collectClassSchemas(parentClass, inheritedClassSchema).then(function(res){
                    var validations = tv4.validateMultiple(objDoc, inheritedClassSchema);
                    if(!validations.valid) {
                        var errors = [];
                        validations.errors.forEach(function (error) {
                            errors.push({
                                message: error.message,
                                dataPath: error.dataPath,
                                schemaPath: error.schemaPath,
                                expected: error.params.expected,
                                type: error.params.type
                            });
                        });
                        results.push({object: objDoc, schema: inheritedClassSchema, results: errors});
                    }
                    return true;
                });
            }));
        });
        return all(classPromises).then(function(res){
            return {
                id: 2,
                name: 'Validate Objects against inherited class schema',
                rule: 'All documents of docType object, must conform the the inherited schema of its class',
                exceptions: 'Does not apply to the class schema',
                count: results.length,
                invalid: results};
        });
    });
}
function collectClassSchemas(classObj, inheritedClassSchema) {
    //combine the the two class.properties, there should be no overlap. If there is, the parent is leading
    merge.recursive(inheritedClassSchema.properties, classObj.properties);
    //combine the to class.required arrays. There should be no overlap
    if(classObj.required) inheritedClassSchema.required = inheritedClassSchema.required.concat(inheritedClassSchema.required, classObj.required);
    var docId = ObjectID(classObj._id).toString();
    return Documents.getParentClass(docId).then(function(parentClass){
        if(parentClass) return collectClassSchemas(parentClass, inheritedClassSchema);
        else return true;//no parent, we are at the root
    });
}











function validateAssocs(){
    return Assocs.find({}).then(function(assocsArr){
        var itemsPromises = [];
        assocsArr.forEach(function(assoc) {
            itemsPromises.push(Items.findById(assoc.source));
            itemsPromises.push(Items.findById(assoc.dest));
        });
        return all(itemsPromises).then(function(itemsArr){
            var results = [];
            var index = 0;
            for(var i = 0;i<assocsArr.length; i=i+2){
                var assoc = assocsArr[i];
                if(!ASSOCPROPERTIES[assoc.type]) results.push({invalidType:assoc});
                var sourceItem = itemsArr[i+0];
                var destItem = itemsArr[i+1];
                if(!sourceItem) results.push({assocSourceNotFound:assoc});
                if(!destItem) results.push({assocDestNotFound:assoc});
                //if(!destItem) Assocs.remove(assoc._id);
            }
            return {
                id: 2,
                name: 'Validate Associations',
                rule: 'The source and dest of associations must point to existing items. The type must be valid',
                exceptions: false,
                count: results.length,
                invalid: results};
        });
    });
}
function assocsUnique(){
    var query = [
        {$group:{
            _id: {source: '$source', type: '$type', dest: '$dest'},
            count: { $sum : 1}
        }}];
    return Assocs.aggregate(query).then(function(resultArr){
        var results = [];
        resultArr.forEach(function(assocCount) {
            if(assocCount.count > 1) results.push(assocCount);
        });
        return {
            id: 3,
            name: 'Unique Associations',
            rule: 'The combination of source, dest and type of associations must be unique',
            exceptions: false,
            count: results.length,
            invalid: results};
    });
}
function validateObjectAssoc(){
    return Items.find({type:'object'}).then(function(itemsArr){
        var assocPromises = [];
        itemsArr.forEach(function(item) {
            assocPromises.push(Assocs.find({source: item._id}));
        });
        return all(assocPromises).then(function(assocPromisesArrArr){
            var validateAssocPronises = [];
            assocPromisesArrArr.forEach(function(assocPromisesArr){
                assocPromisesArr.forEach(function(assoc){
                    validateAssocPronises.push(validateAssocByClassModel(assoc));
                });
            });
            return all(validateAssocPronises).then(function(validateAssocArr){
                var results = [];
                validateAssocArr.forEach(function(validatedAssoc){//get rid of null values
                    if(validatedAssoc) results.push(validatedAssoc)
                });
                return {
                    id: 4,
                    name: 'Validate Object Associations',
                    rule: 'All object associations must have a corresponding class association',
                    exceptions: 'Does not apply parent, next',
                    count: results.length,
                    invalid: results};
            });
        });
    });
}
function validateAssocByClassModel(assoc){
    if(assoc.type == 'parent' || assoc.type == 'next') return null;

    var ancestorPromises = [];
    ancestorPromises[0] = utils.collectAllByAssocType(assoc.source, 'parent');
    ancestorPromises[1] = utils.collectAllByAssocType(assoc.dest, 'parent');
    return all(ancestorPromises).then(function(ancestorPromisesArr){
        var sourceAncestors = ancestorPromisesArr[0];
        var destAncestors = ancestorPromisesArr[1];
        var classAssocPromises = [];
        for(var i = 1;i<sourceAncestors.length;i++){
            var sourceAncestor = sourceAncestors[i];
            classAssocPromises.push(Assocs.find({source: sourceAncestor._id, type: assoc.type}));
        }
        return all(classAssocPromises).then(function(classAssocPromisesArr){
            if(assoc.source == 494 && assoc.type == 'oneToMany' && assoc.dest == 1531){
                var i = 0;
            }
            var foundClassAssocArr = [];
            classAssocPromisesArr.forEach(function(classAssocArr) {
                classAssocArr.forEach(function(classAssoc){
                    var classAssocDestId = classAssoc.dest;
                    for(var i = 1;i<destAncestors.length;i++){
                        var destClassId = destAncestors[i]._id;
                        if(classAssocDestId === destClassId) {
                            foundClassAssocArr.push(classAssoc);
                        }
                    }
                });
            });
            if(foundClassAssocArr.length == 0) {
                //make the output smaller
                var sourcesArr = [];
                sourceAncestors.forEach(function(ancestor){
                    if(ancestor.type == 'object') sourcesArr.push('O '+ancestor._id+' - '+ancestor.name);
                    else sourcesArr.push('C '+ancestor._id+' - '+ancestor.name);
                });
                var destsArr = [];
                destAncestors.forEach(function(ancestor){
                    if(ancestor.type == 'object') destsArr.push('O '+ancestor._id+' - '+ancestor.name);
                    else destsArr.push('C '+ancestor._id+' - '+ancestor.name);
                });
                var assocText = assoc.source+' '+assoc.type+' '+assoc.dest;
                return {noCorrespondingClassAssoc: {objectAssoc:assocText, from: sourcesArr, to: destsArr}};
            }
            if(foundClassAssocArr.length > 1) return {moreThanOneCorrespondingClassAssoc: {objectAssoc:assoc, classAssocs:foundClassAssocArr}};
            return null;
        });
    });
}

function cleanup(){
    //var db = require('./db');
    //var newitems = db.get().collection('newitems');
    return Items.find({type:'class'}).then(function(itemsArr){
        itemsArr.forEach(function(item) {
            var newClass = {_id: item._id, type:'class', name:item.name};
            var properties = JSON.parse(JSON.stringify(item));
            var required = [];
            var propsFound = false;
            for(var attrName in properties){
                if(attrName.charAt(0) == '_') delete properties[attrName];
                else {
                    propsFound = true;
                    var itemProp = properties[attrName];
                    itemProp.type = itemProp.type.toLowerCase();
                    if (itemProp.required) {
                        required.push(attrName);
                        delete itemProp.attrName;
                    }
                }
            }
            var schema = {};
            if(propsFound){
                schema.properties = properties;
                if(required.length>0) schema.required = required;
            }
            if(propsFound) newClass.schema = schema;
            console.log(newClass);
            //Items.remove({_id: newClass._id});
            //Items.insert(newClass);
            var id = newClass._id;
            delete newClass._id;
            Items.update({_id: id}, newClass);

        });
        return {success:true};
    });

}
/*function cleanup(){
    var removeArr = [59,60,66,69,77,91,94,100,101,102,106,107,109,63];
    var collectedPromises = [];
    removeArr.forEach(function(itemId){
        collectedPromises.push(utils.collectAllByAssocType(itemId, 'children'));
    });
    return all(collectedPromises).then(function(collectedPromisesArrArr){
        var results = [];
        collectedPromisesArrArr.forEach(function(collectedPromisesArr) {
            collectedPromisesArr.forEach(function(item){
                results.push(item);
                var itemId = item._id;
                assocsColl.remove({source: itemId});
                assocsColl.remove({dest: itemId});
                itemsColl.remove({_id: itemId});
            });
        });
        return results
    });

}*/
module.exports.check = check;
