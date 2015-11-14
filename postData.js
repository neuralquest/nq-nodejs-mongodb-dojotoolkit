var all = require("promised-io/promise").all;
var when = require("promised-io/promise").when;
var consistency = require('./consistency');
var utils = require('./public/app/utils');
var Items = require('./models/items');
var Assocs = require('./models/assocs');
var tv4 = require("tv4");
var idMap = {};

function update(req){
    var user = req.user;
    var body = req.body;

    //Validate the items, will also issue new id's in case of add. That's why we have to validate items before assocs
    var itemValidationPromises = [];
    body.forEach(function(updateObj){
        if(updateObj.collection == 'items'){
            itemValidationPromises.push(itemIsValid(updateObj));
        }
    });
    return all(itemValidationPromises).then(function(resultsArr1){
        //Validate the associations
        var assocValidationPromises = [];
        body.forEach(function(updateObj){
            if(updateObj.collection == 'assocs'){
                assocValidationPromises.push(assocIsAllowed(updateObj));
            }
        });
        return all(assocValidationPromises).then(function(resultsArr2){
            //return resultsArr2; //return after validation
            //All is well, start updating
            var writePromises = [];
            body.forEach(function(updateObj){
                if(updateObj.collection == 'items' && updateObj.action == 'add') {
                    writePromises.push(Items.insert(updateObj.item));
                    //associate with the user
                    //TODO
                    //writePromises.push(Assocs.insert({source:user._id, type:'owns', dest:updateObj.item._id}));
                }
                if(updateObj.collection == 'items' && updateObj.action == 'update') {
                    //TODO $unset
                    writePromises.push(Items.update(updateObj.item));
                }
                if(updateObj.collection == 'items' && updateObj.action == 'delete') {
                    writePromises.push(Items.remove(updateObj.id));
                    //will also disassociate the user
                    writePromises.push(Assocs.removeReferences(updateObj.id));
                }
                if(updateObj.collection == 'assocs' && updateObj.action == 'add') {
                    writePromises.push(Assocs.insert(updateObj.assoc));
                }
                if(updateObj.collection == 'assocs' && updateObj.action == 'update') {
                    writePromises.push(Assocs.update(updateObj.assoc));
                }
                if(updateObj.collection == 'assocs' && updateObj.action == 'delete') {
                    //writePromises.push(Assocs.remove(updateObj.id));
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
    });
}
function itemIsValid(updateObj) {
    if(updateObj.action == 'delete') return true;
    var item = updateObj.item;
    var id = updateObj.id;
    var viewId = updateObj.viewId;
    var action = updateObj.action;
    //Get the view
    return Items.findById(viewId).then(function(view){
        //TODO
        // If add, update, delete, is allowed?
        var viewPromises = [];
        //Get a new id, if we're adding
        if(action == 'add') viewPromises.push(Items.getNextSequence('itemsColl'));
        else viewPromises.push(false);
        //Assert that the user is allowed to use the view
        viewPromises.push(true);
        //Validate item against view mapsTo
        viewPromises.push(true);
        //Get the schema for the view
        viewPromises.push(utils.getCombinedSchemaForView(view));
        return all(viewPromises).then(function(viewPromisesArr){
            var schema = viewPromisesArr[3];
            //remove properties not in the schema
            for(var attrName in item) {
                if(action == 'update' && attrName == '_id') continue;
                if(action == 'add' && attrName == 'type') continue;
                if(!schema.properties[attrName]) delete item[attrName];
            }
            if(action == 'add') {
                idMap[id] = item;
                item._id = viewPromisesArr[0];
            }
            if(action == 'update') {
                //We are only updating specific items, so get rid of required array
                delete schema.required;
            }
            //Validate the value against the schema
            var valid = tv4.validate(item, schema);
            if(!valid) throw (new Error("Invalid attribute in item: "+tv4.error));
            return item;
        });
    });

}
function assocIsAllowed(updateObj) {
    if(updateObj.action == 'delete') return true;
    var assoc = updateObj.assoc;
    var action = updateObj.action;

    if(!ASSOCPROPERTIES[assoc.type]) throw (new Error("Association type is invalid"));
    if(action === 'add') delete assoc._id;

    var sourceId = assoc.source;
    var assocType = assoc.type;
    var destId = assoc.dest;

    var itemsPromises = [];
    if(idMap[sourceId]) {
        itemsPromises[0]  = idMap[sourceId];
        assoc.source = idMap[sourceId]._id;
    }
    else itemsPromises[0] = Items.findById(sourceId);

    if(idMap[destId]) {
        itemsPromises[1]  = idMap[destId];
        assoc.dest = idMap[destId]._id;
    }
    else itemsPromises[1] = Items.findById(destId);

    return all(itemsPromises).then(function(ancestorPromisesArr){
        var sourceItem = ancestorPromisesArr[0];
        var destItem = ancestorPromisesArr[1];

        if(sourceItem._type === 'class' && destItem._type === 'class'){
            //TODO if we're doing an add, the (ancestor) association must not already exist
            if(assoc.type === 'next') throw (new Error("'next' not allowed for Class to Class association"));
        }
        if(sourceItem._type === 'object' && destItem._type === 'object'){
            //TODO find a way to validate next
            var inValid = consistency.validateAssocByClassModel(assoc);
            if(inValid) throw (new Error("Object to Object association not allowed"));
        }
        if(sourceItem._type === 'class' && destItem._type === 'object'){
            if(assoc.type != 'default') throw (new Error("Only 'default' is allowed as Class to Object association"));
        }
        if(sourceItem._type === 'object' && destItem._type === 'class'){
            if(assoc.type != 'parent') throw (new Error("Only 'parent' is allowed as Object to Class association"));
        }
        //remove properties that dont belong
        for(var attrName in assoc) {
            if(attrName != '_id' && attrName != 'source' && attrName != 'dest' && attrName != 'type') delete assoc[attrName];
        }

        return assoc;
    });
}

module.exports.update = update;
