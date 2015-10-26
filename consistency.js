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
    return all(checkPromises).then(function(checkArr){
        return {consistencyCheck:checkArr};
    });
}
function findOrphans(){
    return dbAccessors.find({},itemsColl).then(function(itemsArr){
        var assocsPromises = [];
        itemsArr.forEach(function(item) {
             //do not check 'Problem Domain'
            if(item._id != 67) assocsPromises.push(dbAccessors.find({source: item._id, type: 'parent'}, assocsColl));
        });
        return all(assocsPromises).then(function(assocsArrArr){
            var results = [];
            var index = 0;
            var parentPromises = [];
            assocsArrArr.forEach(function(assocsArr) {
                var item = itemsArr[index];
                if(assocsArr.length > 1) results.push({moreThanOneParent:item});
                if(assocsArr.length == 0) results.push({noParent:item});
                if(assocsArr.length == 1) parentPromises.push(dbAccessors.findOne(assocsArr[0].dest,itemsColl));
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
                    invalid: results};
            });
        });
    });
}
function validateAssocs(){
    return dbAccessors.find({},assocsColl).then(function(assocsArr){
        var itemsPromises = [];
        assocsArr.forEach(function(assoc) {
            var sourceDestPromises = [];
            sourceDestPromises[0] = dbAccessors.findOne(assoc.source,itemsColl);
            sourceDestPromises[1] = dbAccessors.findOne(assoc.dest,itemsColl);
            itemsPromises.push(sourceDestPromises);
        });
        return all(itemsPromises).then(function(itemsArrArr){
            var results = [];
            var index = 0;
            itemsArrArr.forEach(function(itemsArr) {
                var assoc = assocsArr[index];
                if(!ASSOCPROPERTIES[assoc.type]) results.push({invalidType:assoc});
                var sourceItem = itemsArr[0];
                var destItem = itemsArr[1];
                if(!sourceItem) results.push({assocSourceNotFound:assoc});
                if(!destItem) results.push({assocDestNotFound:assoc});
                index++;
            });
            return {
                id: 002,
                name: 'Validate Associations',
                rule: 'The source and dest of associations must point to existing items. The type must be valid',
                exceptions: false,
                invalid: results};
        });
    });
}
function assocsUnique(){
    var deferred = new Deferred();
    assocsColl.aggregate([
        {$group:{
            _id: {source: '$source', type: '$type', dest: '$dest'}
        }},
        {$group: {
            _id: '$_id.source',
            count: {$sum: 1}
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
                    invalid: results};

                deferred.resolve(obj);}
        }
    );
    return deferred;
}

module.exports.check = check;
