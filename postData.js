var all = require("promised-io/promise").all;
var when = require("promised-io/promise").when;
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

/*
        //collect updates in arrays for group update
        var addItemsArr = [];
        var updateItemsArr = [];
        var deleteItemsArr = [];
        var addAssocsArr = [];
        var updateAssocsArr = [];
        var deleteAssocsArr = [];
        body.forEach(function(updateObj){
            if(updateObj.collection == 'items' && updateObj.action == 'add') {
                addItemsArr.push(updateObj.item);
                //associate with the user
                addAssocsArr.push({source:user._id, type:'owns', dest:updateObj.item._id});
            }
            if(updateObj.collection == 'items' && updateObj.action == 'update') updateItemsArr.push(updateObj.item);
            if(updateObj.collection == 'items' && updateObj.action == 'delete') deleteItemsArr.push(updateObj.id);
            if(updateObj.collection == 'assocs' && updateObj.action == 'add') addAssocsArr.push(updateObj.assoc);
            if(updateObj.collection == 'assocs' && updateObj.action == 'update') updateAssocsArr.push(updateObj.assoc);
            if(updateObj.collection == 'assocs' && updateObj.action == 'delete') deleteAssocsArr.push(updateObj.id);
        });

        var writePromises = [];
        if(addItemsArr.length>0) writePromises.push(Items.insert(addItemsArr));
        if(updateItemsArr.length>0) writePromises.push(Items.update(updateItemsArr));//, unset
        if(deleteItemsArr.length>0) writePromises.push(Items.remove(deleteItemsArr));
        if(addAssocsArr.length>0) writePromises.push(Items.insert(addAssocsArr));
        if(updateAssocsArr.length>0) writePromises.push(Items.update(updateAssocsArr));
        if(deleteAssocsArr.length>0) writePromises.push(Items.insert(deleteAssocsArr));
*/
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
        //remove properties not in the schema
        for(var attrName in doc) {
            if(action == 'update' && attrName == '_id') continue;
            if(action == 'add' && attrName == 'type') continue;
            if(!schemaObj.properties[attrName]) delete doc[attrName];
        }
        if(action == 'update') {
            //We are only updating specific items, so get rid of required array
            delete schemaObj.required;
        }
        //Validate the value against the schema
        var valid = tv4.validate(doc, schemaObj);
        if(!valid) throw (new Error("Invalid attribute in item: "+tv4.error));

        //Validate the associations
        return doc;
    });
}

module.exports.update = update;
