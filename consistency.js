var Deferred = require("promised-io/promise").Deferred;
var all = require("promised-io/promise").all;
var when = require("promised-io/promise").when;
var Documents = require('./models/documents');
var tv4 = require("tv4");
var ObjectID = require('mongodb').ObjectID;

function check(){
    var checkPromises = [];

    return rebuild().then(function(res){
        return {documents:res};
    });


    //checkPromises.push(cleanup());
    //checkPromises.push(findOrphans());
    //checkPromises.push(validateObjects());
    return all(checkPromises).then(function(checkArr){
        return {consistencyCheck:checkArr};
    });
}
function findOrphans(){
    return Documents.find().then(function(objectsArr){
        var results = [];
        var classPromises = [];
        objectsArr.forEach(function(doc) {
            var docId = ObjectID(doc._id).toString();
            classPromises.push(Documents.getAncestors(docId).then(function(ancestorsArr){
                var parentId = ObjectID(ancestorsArr[ancestorsArr.length-1]._id).toString();
                if(parentId != "56f86c6a5dde184ccfb9fc6a") results.push({"chainToTheRootIsBroken":ancestorsArr});
                return true;
            }));
        });
        return all(classPromises).then(function(res){
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
            classPromises.push(Documents.getInheritedClassSchema(docId).then(function(inheritedClassSchema){
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
                    results.push({object: objDoc, /*schema: inheritedClassSchema, */results: errors});
                }
                return true;
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
/**/
function rebuild() {
    return Documents.find({}).then(function (objectsArr) {
        var results ={};
        var count = 0;
        objectsArr.forEach(function (doc) {
            var id = doc._id;
            delete(doc._id);
            // 0 - 70 ok
            //if(count>=4 && count<=6)results[id] = doc;
            //if(count==6)results[id] = doc;
            results[id] = doc;
            count++;
        });
        return results;
    });
}
function cleanup1() {

    return Documents.find({docType: 'object'}).then(function (objectsArr) {
        var classPromises = [];
        var results = [];
        objectsArr.forEach(function (objDoc) {
            if (objDoc.classId == '573435c23c6d3cd598a5a2df') {
                if (objDoc.query || objDoc.rootQuery) {
                    if (objDoc.query) {
                        var count = 0;
                        objDoc.query.forEach(function (query) {
                            if (query.where) {
                                var where = query.where;
                                if(where.eq) {
                                    var unsetString = 'query.'+count+'.where.eq';
                                    var unset = {};
                                    unset[unsetString] = 1;
                                    Documents.update(objDoc, unset);
                                }
                                if (where.in) {
                                    var unsetString = 'query.'+count+'.where.in';
                                    var unset = {};
                                    unset[unsetString] = 1;
                                    Documents.update(objDoc, unset);
                                }
                            }
                            count ++;
                        });
                    }
                    if (objDoc.rootQuery && objDoc.rootQuery.where) {
                        var where = objDoc.rootQuery.where;
                        if(where.eq) {
                            var unsetString = 'rootQuery.where.eq';
                            var unset = {};
                            unset[unsetString] = 1;
                            Documents.update(objDoc, unset);
                        }
                        if (where.in) {
                            var unsetString = 'rootQuery.where.in';
                            var unset = {};
                            unset[unsetString] = 1;
                            Documents.update(objDoc, unset);
                        }

                    }
                    //console.log(objDoc);
                    Documents.update(objDoc);
                }
            }
            //delete(objDoc.parentId);
            //Documents.update(objDoc);
            //var unset  = {'parentId': null};
            //Documents.update(objDoc, unset);
            //Documents.insert(objDoc);
            //results.push(objDoc._id);
        });
        /*Documents.findById("570064645dde184ccfb9fc84").then(function(nqObj){
         nqObj.owns = results;
         console.log(nqObj);
         Documents.update(nqObj);
         });*/
        return true;
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
module.exports.check = check;
