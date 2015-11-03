var Deferred = require("promised-io/promise").Deferred;
var all = require("promised-io/promise").all;
var when = require("promised-io/promise").when;
var utils = require('./public/app/utils');
var Items = require('./models/items');
var Assocs = require('./models/assocs');
var tv4 = require("tv4");

function check(){
    var checkPromises = [];
    checkPromises.push(cleanup());
    /*checkPromises.push(findOrphans());
    checkPromises.push(validateAssocs());
    checkPromises.push(assocsUnique());
    checkPromises.push(validateObjectAssoc());
    checkPromises.push(validateObjectAttributes());*/
    return all(checkPromises).then(function(checkArr){
        return {consistencyCheck:checkArr};
    });
}
function findOrphans(){
    return Items.find({}).then(function(itemsArr){
        var assocsPromises = [];
        itemsArr.forEach(function(item) {
             assocsPromises.push(Assocs.find({source: item._id, type: 'parent'}));
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
                    if(assocsArr.length == 1) parentPromises.push(Items.findById(assocsArr[0].dest));
                    //if(assocsArr.length == 0) Items.remove(item._id);
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
                    id: 1,
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
    return Items.find({_type:'object'}).then(function(itemsArr){
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
    return Items.find({_type:'object'}).then(function(itemsArr){
        var assocPromises = [];
        itemsArr.forEach(function(item) {
            assocPromises.push(Assocs.find({source: item._id, type:'parent'}));
        });
        return all(assocPromises).then(function(assocsArrArr){
            var attrPropertiesPromises = [];
            assocsArrArr.forEach(function(assocsArr){
                assocsArr.forEach(function(assoc){
                    attrPropertiesPromises.push(utils.getAttrPropertiesFromAncestors(assoc.dest));
                });
            });
            return all(attrPropertiesPromises).then(function(attrPropertiesArr){
                var results = [];
                var index = 0;
                attrPropertiesArr.forEach(function(schema){
                    var obj = itemsArr[index];
                    var validations = tv4.validateMultiple(obj, schema);
                    if(!validations.valid){
                        var errors = [];
                        validations.errors.forEach(function(error){
                            errors.push({
                                message:error.message,
                                dataPath:error.dataPath
                            });
                        });
                        delete validations.stack;
                        results.push({object:obj, schema:schema, results:errors});
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
    return Items.find({_type:'class'}).then(function(itemsArr){
        itemsArr.forEach(function(item) {
            var newClass = {_id: item._id, type:'class', name:item._name};
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
        });
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
