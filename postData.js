var config = require('./config');
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
    if(!user || user.username != 'cjong') {
        var err = new Error('Not authorized for update');
        err.status = 401;
        throw err;
    }
    var body = req.body;
    var itemValidationPromises = [];
    //Validate the items, will also issue new id's in case of add
    if(body.itemsColl){
        for(var action in body.itemsColl){
            var items = body.itemsColl[action];
            items.forEach(function(item) {
                itemValidationPromises.push(itemIsValid(item, action));
            });
        }
    }
    return all(itemValidationPromises).then(function(resultsArr1){
        //Validate teh associations
        var assocValidationPromises = [];
        if(body.assocsColl){
            for(var action in body.assocsColl){
                var items = body.assocsColl[action];
                items.forEach(function(item) {
                    assocValidationPromises.push(assocIsAllowed(item, action));
                });
            }
        }
        return all(assocValidationPromises).then(function(resultsArr2){
            //return resultsArr2; //return after validation
            //All is well, start updating
            //TODO collect updates in arrays fro group update
            var writePromises = [];
            if(body.itemsColl){
                //Update the items
                if(body.itemsColl.add) {
                    var newItems = body.itemsColl.add;
                    newItems.forEach(function (item) {
                        writePromises.push(Items.insert(item));
                        //associate with the user
                        writePromises.push(Assocs.insert({source:user._id, type:'owns', dest:item._id}));
                    });
                }
                if(body.itemsColl.update) {
                    var updateItems = body.itemsColl.update;
                    updateItems.forEach(function (item) {
                        //TODO determine unset if value null
                        var unset = {};
                        writePromises.push(Items.update(item, unset));
                    });
                }
                if(body.itemsColl.delete) {
                    var deleteItems = body.itemsColl.delete;
                    deleteItems.forEach(function (id) {
                        writePromises.push(Items.remove(id));
                        writePromises.push(Assocs.removeReferences(id));
                    });
                }
            }
            if(body.assocsColl){
                //Update the associations
                if(body.assocsColl.add) {
                    var newAssocs = body.assocsColl.add;
                    newAssocs.forEach(function (assoc) {
                        writePromises.push(Assocs.insert(assoc));
                    });
                }
                if(body.assocsColl.update) {
                    var updateAssocs = body.assocsColl.update;
                    updateAssocs.forEach(function (assoc) {
                        //TODO should not update owner?
                        writePromises.push(Assocs.update(assoc));
                    });
                }
                if(body.assocsColl.delete) {
                    var deleteAssocs = body.assocsColl.delete;
                    deleteAssocs.forEach(function (id) {
                        writePromises.push(Assocs.remove(id));
                    });
                }
            }
            return all(writePromises);
        });
    });
}
function itemIsValid(item, action) {
    //Get the view
    return Items.findById(item._viewId).then(function(view){
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
                idMap[item._id] = item;
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
function assocIsAllowed(assoc, action) {
    //Possibly invert assoc type

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
