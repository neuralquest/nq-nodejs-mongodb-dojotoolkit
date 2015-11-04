var config = require('./config');
var Deferred = require("promised-io/promise").Deferred;
var all = require("promised-io/promise").all;
var when = require("promised-io/promise").when;
var consistency = require('./consistency');
var utils = require('./public/app/utils');
var Items = require('./models/items');
var Assocs = require('./models/assocs');
var tv4 = require("tv4");
var idMap = {};

function update(req){
    var user = req.session.user;
    if(!user || user.username != 'cjong') {
        var err = new Error('Not authorized for update');
        err.status = 401;
        throw err;
    }
    var body = req.body;
    var itemValidationPromises = [];
    if(body.itemsColl){
        for(var action in body.itemsColl){
            var items = body.itemsColl[action];
            items.forEach(function(item) {
                itemValidationPromises.push(itemIsValid(item, action));
            });
        }
    }
    return all(itemValidationPromises).then(function(resultsArr1){
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
            return resultsArr2;
            var writePromises = [];
            if(body.itemsColl){
                if(body.itemsColl.add) {
                    var newItems = body.itemsColl.add;
                    newItems.forEach(function (item) {
                        writePromises.push(Items.insert(item));
                    });
                }
                if(body.itemsColl.update) {
                    var updateItems = body.itemsColl.update;
                    updateItems.forEach(function (item) {
                        writePromises.push(Items.update(item));
                    });
                }
                if(body.itemsColl.delete) {
                    var deleteItems = body.itemsColl.delete;
                    deleteItems.forEach(function (id) {
                        writePromises.push(Items.remove(id));
                    });
                }
            }
            if(body.assocsColl){
                if(body.assocsColl.add) {
                    var newAssocs = body.assocsColl.add;
                    newAssocs.forEach(function (assoc) {
                        writePromises.push(Items.insert(assoc, assocsColl));
                    });
                }
                if(body.assocsColl.update) {
                    var updateAssocs = body.assocsColl.update;
                    updateAssocs.forEach(function (assoc) {
                        writePromises.push(Items.update(assoc, assocsColl));
                    });
                }
                if(body.assocsColl.delete) {
                    var deleteAssocs = body.assocsColl.delete;
                    deleteAssocs.forEach(function (id) {
                        writePromises.push(Items.remove(id, assocsColl));
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
        //Assert that the user is allowed to use the view
        viewPromises.push(true);
        //Validate item against view mapsTo
        viewPromises.push(true);
        //Get the schema for the view
        viewPromises.push(utils.getCombinedSchemaForView(view));
        return all(viewPromises).then(function(viewPromisesArr){
            var schema = viewPromisesArr[2];
            var idPromise = [];
            if(action == 'add') idPromise = Items.getNextSequence('itemsColl');
            else idPromise = false;
            return when(idPromise, function(newId){
                //remove properties not in the schema
                for(var attrName in item) {
                    if(action == 'update' && attrName == '_id') continue;
                    if(action == 'add' && attrName == 'type') continue;
                    if(!schema.properties[attrName]) delete item[attrName];
                }
                if(action == 'add') {
                    idMap[item._id] = item;
                    item._id = newId;
                }
                if(action == 'update') {
                    delete schema.required;
                }
                //Validate the value against the schema
                var valid = tv4.validate(item, schema);
                if(!valid) throw (new Error("Invalid attribute in item: "+tv4.error));
                return item;
            });
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
            // if we're doing an add, the (ancestor) association must not exist
            if(assoc.type === 'next') throw (new Error("'next' not allowed for Class to Class association"));
        }
        if(sourceItem._type === 'object' && destItem._type === 'object'){
            var valid = consistency.validateAssocByClassModel(assoc);
            if(valid) throw (new Error("Object to Object association not allowed"));
            /*if(assoc.type === 'next') return assoc;
            if(assoc.type === 'ordered') return assoc;
            var ancestorPromises = [];
            //Get the ancestors of the assoc source
            ancestorPromises.push(utils.collectAllByAssocType(sourceId, 'parent'));
            //Get the ancestors of the assoc dest
            ancestorPromises.push(utils.collectAllByAssocType(destId, 'parent'));

            // if we're doing an add, the association must not exist
            //For each of the source ancestors, see if there is an assoc of the same type that has a dest in dest ancestors
            var sourceAncestorsArr = ancestorPromisesArr[0];
            throw (new Error("Object to Object association not allowed"));
            */
        }
        if(sourceItem._type === 'class' && destItem._type === 'object'){
            if(assoc.type != 'default') throw (new Error("Only 'default' is allowed as Class to Object association"));
        }
        if(sourceItem._type === 'object' && destItem._type === 'class'){
            if(assoc.type != 'parent') throw (new Error("Only 'parent' is allowed as Object to Class association"));
        }
        return assoc;
    });
}

module.exports.update = update;
