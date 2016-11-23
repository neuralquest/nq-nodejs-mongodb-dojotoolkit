var all = require("promised-io/promise").all;
var when = require("promised-io/promise").when;
var Deferred = require("promised-io/promise").Deferred;
var consistency = require('./consistency');
var utils = require('./public/app/utils');
var Documents = require('./models/documents');
var tv4 = require("tv4");
var idMap = {};

function update(req){
    var user = req.user;
    var body = req.body;

    var itemValidationPromises = [];
    body.forEach(function(updateObj){
        itemValidationPromises.push(itemIsValid(updateObj));
    });
    return all(itemValidationPromises).then(function(resultsArr2){
        //return resultsArr2; //return after validation
        //All is well, start updating
        var writePromises = [];
        body.forEach(function(updateObj){
            if(updateObj.action == 'add') {
                writePromises.push(Documents.insert(updateObj.doc));
                //associate with the user
                //TODO
                //writePromises.push(Assocs.insert({source:user._id, type:'owns', dest:updateObj.item._id}));
            }
            if(updateObj.action == 'update') {
                //TODO $unset
                writePromises.push(Documents.update(updateObj.doc));
            }
            if(updateObj.action == 'delete') {
                writePromises.push(Documents.remove(updateObj.id));
                //will also disassociate the user
                //writePromises.push(Assocs.removeReferences(updateObj.id));
            }
        });


        return all(writePromises);

    });
}
function itemIsValid(updateObj) {
    if(updateObj.action == 'delete') return true;
    var doc = updateObj.doc;
    var id = updateObj._id;
    var viewId = updateObj.viewId;
    var action = updateObj.action;
    //Get the view
    return Documents.getSchemaForView(viewId).then(function(schemaObj){
        var deferred = new Deferred();
        //remove properties not in the schema
        if(action == 'add') {
            delete doc.$queryName;
            //for(var attrName in doc) {
            //    if(!schemaObj.properties[attrName]) delete doc[attrName];
            //}
        }
        if(action == 'update') {
            for(var attrName in doc) {
                if(action == 'update' && attrName == '_id') continue;// we have to leave the id in
                if(schemaObj.properties[attrName]) {
                    if(schemaObj.properties.readOnly) delete doc[attrName];
                }
                else delete doc[attrName];
            }
            //We are only updating specific items, so get rid of required array
            delete schemaObj.required;
        }
        //Validate the value against the schema
        var valid = tv4.validate(doc, schemaObj);

        if(valid) deferred.resolve(true);
        else deferred.reject(new Error("Invalid attribute in item: "+tv4.error));

        return deferred.promise;
        //if(!valid) throw (new Error("Invalid attribute in item: "+tv4.error));

        //Validate the associations
        //return doc;
    });
}

module.exports.update = update;
