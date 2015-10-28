var Deferred = require("promised-io/promise").Deferred;
var all = require("promised-io/promise").all;
var when = require("promised-io/promise").when;
var utils = require('./public/app/utils');
var dbAccessors = require('./dbAccessors');
var itemsColl;
var assocsColl;
var countersColl;
var db;

function check(req){
    db = req.db;
    itemsColl = req.db.collection('items');
    assocsColl = req.db.collection('assocs');
    countersColl = req.db.collection('counters');

    var checkPromises = [];
    checkPromises.push(findOrphans());
    checkPromises.push(validateAssocs());
    checkPromises.push(assocsUnique());
    checkPromises.push(validateObjectAssoc());
    checkPromises.push(validateObjectAttributes());
    return all(checkPromises).then(function(checkArr){
        return {consistencyCheck:checkArr};
    });
}
function findOrphans(){
    return dbAccessors.find({},itemsColl).then(function(itemsArr){
        var assocsPromises = [];
        itemsArr.forEach(function(item) {
             assocsPromises.push(dbAccessors.find({source: item._id, type: 'parent'}, assocsColl));
        });
        return all(assocsPromises).then(function(assocsArrArr){
            var results = [];
            var index = 0;
            var parentPromises = [];
            assocsArrArr.forEach(function(assocsArr) {
                var item = itemsArr[index];
                if(item._id != 67){//do not check 'Problem Domain'
                    if(assocsArr.length > 1) results.push({moreThanOneParentAssoc:item});
                    if(assocsArr.length == 0) results.push({noParentAssoc:item});
                    if(assocsArr.length == 1) parentPromises.push(dbAccessors.findOne(assocsArr[0].dest,itemsColl));
                    //if(assocsArr.length == 0) dbAccessors.remove(item._id, itemsColl);
                }
                if(item._id == 99){
                    var i = 1;
                }
                index++;
            });
            return all(parentPromises).then(function(parentsArr){
                parentsArr.forEach(function(parent) {
                    if(!parent) results.push({parentNotFound:parent});
                    else if(parent._type !== 'class') results.push({parentIsNotAClass:parent});
                });
                return {
                    id: 001,
                    name: 'Find Orphans',
                    rule: 'All objects and classes must have a parent association that points to a class',
                    exceptions: 'Does not apply to the root class: Problem Domain',
                    count: results.length,
                    invalid: results};
            });
        });
    });
}
function validateAssocs(){
    return dbAccessors.find({},assocsColl).then(function(assocsArr){
        var itemsPromises = [];
        assocsArr.forEach(function(assoc) {
            itemsPromises.push(dbAccessors.findOne(assoc.source,itemsColl));
            itemsPromises.push(dbAccessors.findOne(assoc.dest,itemsColl));
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
                //if(!destItem) dbAccessors.remove(assoc._id, assocsColl);
            }
            return {
                id: 002,
                name: 'Validate Associations',
                rule: 'The source and dest of associations must point to existing items. The type must be valid',
                exceptions: false,
                count: results.length,
                invalid: results};
        });
    });
}
function assocsUnique(){
    var deferred = new Deferred();
    assocsColl.aggregate([
        {$group:{
            _id: {source: '$source', type: '$type', dest: '$dest'},
            count: { $sum : 1}
        }}],
        function(err, resultArr) {
            if (err) deferred.reject(err);
            else {
                var results = [];
                resultArr.forEach(function(assocCount) {
                    if(assocCount.count > 1) results.push(assocCount);
                });
                var obj = {
                    id: 3,
                    name: 'Unique Associations',
                    rule: 'The combination of source, dest and type of associations must be unique',
                    exceptions: false,
                    count: results.length,
                    invalid: results};

                deferred.resolve(obj);}
        }
    );
    return deferred;
}
function validateObjectAssoc(){
    return dbAccessors.find({_type:'object'},itemsColl).then(function(itemsArr){
        var assocPromises = [];
        itemsArr.forEach(function(item) {
            assocPromises.push(dbAccessors.find({source: item._id}, assocsColl));
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
    ancestorPromises[0] = utils.collectAllByAssocType(assoc.source, 'parent', db);
    ancestorPromises[1] = utils.collectAllByAssocType(assoc.dest, 'parent', db);
    return all(ancestorPromises).then(function(ancestorPromisesArr){
        var sourceAncestors = ancestorPromisesArr[0];
        var destAncestors = ancestorPromisesArr[1];
        var classAssocPromises = [];
        for(var i = 1;i<sourceAncestors.length;i++){
            var sourceAncestor = sourceAncestors[i];
            classAssocPromises.push(dbAccessors.find({source: sourceAncestor._id, type: assoc.type}, assocsColl));
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
                    if(ancestor._type == 'object') sourcesArr.push('O '+ancestor._id+' - '+ancestor.name);
                    else sourcesArr.push('C '+ancestor._id+' - '+ancestor._name);
                });
                var destsArr = [];
                destAncestors.forEach(function(ancestor){
                    if(ancestor._type == 'object') destsArr.push('O '+ancestor._id+' - '+ancestor.name);
                    else destsArr.push('C '+ancestor._id+' - '+ancestor._name);
                });
                var assocText = assoc.source+' '+assoc.type+' '+assoc.dest;
                return {noCorrespondingClassAssoc: {objectAssoc:assocText, from: sourcesArr, to: destsArr}};
            }
            if(foundClassAssocArr.length > 1) return {moreThanOneCorrespondingClassAssoc: {objectAssoc:assoc, classAssocs:foundClassAssocArr}};
            return null;
        });
    });
}
function validateObjectAttributes(){
    return dbAccessors.find({_type:'object'},itemsColl).then(function(itemsArr){
        var assocPromises = [];
        itemsArr.forEach(function(item) {
            assocPromises.push(dbAccessors.find({source: item._id, type:'parent'}, assocsColl));
        });
        return all(assocPromises).then(function(assocsArrArr){
            var attrPropertiesPromises = [];
            assocsArrArr.forEach(function(assocsArr){
                assocsArr.forEach(function(assoc){
                    attrPropertiesPromises.push(utils.getAttrPropertiesFromAncestors(assoc.dest, db));
                });
            });
            return all(attrPropertiesPromises).then(function(attrPropertiesArr){
                var results = [];
                var index = 0;
                attrPropertiesArr.forEach(function(attrProperties){
                    var obj = itemsArr[index];
                    if(typeof obj._id!=='number' || (obj._id%1)!==0) results.push({idIsNotAnInteger:obj});
                    if(obj._type != 'object' && obj._type != 'class') results.push({invalidItemType:obj});
                    for(var attrName in obj){
                        if(attrName.charAt(0) == '_') continue;
                        var classProp = attrProperties[attrName];
                        var objProp = obj[attrName];
                        if(!classProp) results.push({noclassAttrFor:{attribute:attrName, object:obj}});
                        else{
                            //TODO
                            if(classProp.media && classProp.media.mediaType == 'text/html'){
                            }
                            else if(classProp.enum){
                            }
                            else if(classProp.type == 'String'){
                                //maxLength
                                //minLength
                            }
                            else if(classProp.type == 'Number'){
                                //maximum
                                //minimum
                                //places
                            }
                            else if(classProp.type == 'Date'){
                            }
                            else if(classProp.type == 'Boolean'){
                            }
                        }
                    }
                    index++;
                });
                return {
                    id: 6,
                    name: 'Validate Object Attributes',
                    rule: 'All object attributes must have a corresponding class attribute',
                    exceptions: 'Does not apply to:',
                    count: results.length,
                    invalid: results};
            });
        });
    });
}
function cleanup(){
    var removeArr = [59,60,66,69,77,91,94,100,101,102,106,107,109,63];
    var collectedPromises = [];
    removeArr.forEach(function(itemId){
        collectedPromises.push(utils.collectAllByAssocType(itemId, 'children', db));
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

}
module.exports.check = check;
