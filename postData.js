var config = require('./config');
var Deferred = require("promised-io/promise").Deferred;
var all = require("promised-io/promise").all;
var when = require("promised-io/promise").when;
var utils = require('./public/app/utils');
var Items = require('./models/items');
var Assocs = require('./models/assocs');
var idMap = {};

function update(body){
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
    return Items.findOne(item._viewId).then(function(view){
        //If add, update, delete, is allowed?

        //TODO
        var viewPromises = [];
        //Assert that the user is allowed to use the view
        viewPromises.push(true);
        //Validate item against view mapsTo
        viewPromises.push(true);
        //Get the schema for the view
        viewPromises.push(utils.getCombinedSchemaForView(view, db));
        return all(viewPromises).then(function(viewPromisesArr){
            var schema = viewPromisesArr[2];

            var idPromise = [];
            if(action == 'add') idPromise = Items.getNextSequence('itemsColl');
            else idPromise = false;
            return when(idPromise, function(newId){

                if(action == 'add') {
                    idMap[item._id] = item;
                    item._id = newId;
                    if((item._type != 'object') && (item._type != 'class')) throw (new Error("Invalid type for new item"));
                }
                //Validate the value against the schema
                for(var attrName in schema) {
                    var attrProps = schema[attrName];
                    var value = item[attrName];
                    if(attrProps.readOnly && action == 'update') continue;//TODO delete attr
                    if(attrProps.required) {
                        if(!value && attrProps.default) value = attrProps.default;
                        else if(!value) throw (new Error("Mandatory value missing"));
                    }
                    if(!value) continue;
                    if(attrProps.enum){
                        var values = attrProps.enum;
                        var index = values.indexOf(value);
                        if(index == -1) throw (new Error("Value not in enumeration"));
                    }
                    else if(attrProps['#ref']){
                        throw (new Error("TODO"));
                        var query = attrProps['#ref'];
                        var collection = this.store.filter(query);
                        var index = collection.indexOf(value);
                        if(index == -1) throw (new Error("Value not in collection"));
                    }
                    else if(attrProps.media && attrProps.media.mediaType == 'text/html'){
                        /*html5Lint(value, function(err, results){
                         if(err) throw (new Error(err));
                         });*/
                    }
                    else if(attrProps.type == 'String'){
                        if(value.length > attrProps.maxLength) throw (new Error("String too long"));
                        if(attrProps.minLength && value.length < attrProps.minLength) throw (new Error("String too short"));
                    }
                    else if(attrProps.type == 'Number') {
                        value = Number(value);
                        if(value > attrProps.maximum) throw (new Error("Value too great"));
                        if(attrProps.minimum && value < attrProps.minimum) throw (new Error("Value too small"));
                        //if(attrProps.places && ) throw (new Error("Too many decimal places"));
                    }
                    else if(attrProps.type == 'Date'){
                        throw (new Error("TODO"));
                    }
                    else if(attrProps.type == 'Boolean'){
                        if(value == 'true') newItem[attrName] = true;
                        else newItem[attrName] = false;
                    }
                    else if(attrProps.type == 'Object'){
                        throw (new Error("TODO"));
                    }
                }
                for(var attrName in item) {
                    if(attrName == '_id') continue;
                    if(action == 'add' && attrName == '_type') continue;
                    if(!schema[attrName]) delete item[attrName];
                }
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
    else itemsPromises[0] = Items.findOne(sourceId);
    if(idMap[destId]) {
        itemsPromises[1]  = idMap[destId];
        assoc.dest = idMap[destId]._id;
    }
    else itemsPromises[1] = Items.findOne(destId);

    return all(itemsPromises).then(function(ancestorPromisesArr){
        var sourceItem = ancestorPromisesArr[0];
        var destItem = ancestorPromisesArr[1];

        if(sourceItem._type === 'class' && destItem._type === 'class'){
            // if we're doing an add, the (ancestor) association must not exist
            if(assoc.type === 'next') throw (new Error("'next' not allowed for Class to Class association"));
        }
        if(sourceItem._type === 'object' && destItem._type === 'object'){
            if(assoc.type === 'next') return assoc;
            if(assoc.type === 'ordered') return assoc;
            var ancestorPromises = [];
            //Get the ancestors of the assoc source
            ancestorPromises.push(utils.collectAllByAssocType(sourceId, 'parent', db));
            //Get the ancestors of the assoc dest
            ancestorPromises.push(utils.collectAllByAssocType(destId, 'parent', db));

            // if we're doing an add, the association must not exist
            //For each of the source ancestors, see if there is an assoc of the same type that has a dest in dest ancestors
            var sourceAncestorsArr = ancestorPromisesArr[0];
            throw (new Error("Object to Object association not allowed"));
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
