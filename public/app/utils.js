var all = require("promised-io/promise").all;
var when = require("promised-io/promise").when;
var Items = require('../../models/items');
var Assocs = require('../../models/assocs');


function getCombinedSchemaForView(view) {
    /* summary:  Used to create a JSON schema based on the view schema in combination with class attributes inherited through view.mapsTo.
     //          The same method is used server side to validate updates.
     // view: Object
     //          The starting point for our schema
     // returns: Object
     //          The schema object.
     */
//    var self = this;
    var classSchemaPromise = null;
    if(view.mapsTo) classSchemaPromise = getAttrPropertiesFromAncestors(view.mapsTo);
    else classSchemaPromise = CLASSSCHEMA;//No mapsTo means we're asking for a class (meta schema)

    return when(classSchemaPromise, function(classSchema){
        var schema = {
            $schema: "http://json-schema.org/draft-04/schema#",
            type: 'object',
            properties: {
                _id: classSchema.properties._id,
                type: classSchema.properties.type
            },
            required: classSchema.required,
            additionalProperties: false
        };
        for(var attrPropName in view.schema){
            var viewAttrProp = view.schema[attrPropName];
            var newProp = classSchema.properties[attrPropName];
            if(!newProp) {
                //throw new Error('cant find classAttrProp');
                console.warn('classAttrProp not found',viewAttrProp);
                newProp = viewAttrProp;
                continue;
            }
            //set the references
            newProp.viewId = view._id;
            newProp.viewMapsTo = view.mapsTo;
            //set the defaults
            if(newProp.enum && viewAttrProp.enum){
                var newEnum = [];
                //assert that the values are permitted
                viewAttrProp.enum.forEach(function (enumValue){
                    if(newProp.enum[enumValue]) newEnum.push(enumValue);
                    else console.warn('classAttrProp not found', viewAttrProp, enumValue);
                });
                newProp.enum = newEnum;
            }
            if(viewAttrProp.pattern) newProp.pattern = viewAttrProp.pattern;
            if(viewAttrProp.invalidMessage) newProp.invalidMessage = viewAttrProp.invalidMessage;
            if(viewAttrProp['#ref']) newProp['#ref'] = viewAttrProp['#ref'];
            if(viewAttrProp.readOnly) newProp.readOnly = true;
            if(viewAttrProp.hidden) newProp.hidden = true;
            if(viewAttrProp.title) newProp.title = viewAttrProp.title;
            if(viewAttrProp.default) newProp.default = viewAttrProp.default;
            if(viewAttrProp.description) newProp.description = viewAttrProp.description;
            if(viewAttrProp.style) newProp.default = viewAttrProp.style;
            if(viewAttrProp.columnWidth) newProp.columnWidth = viewAttrProp.columnWidth;
            if(viewAttrProp.maxLength && newProp.maxLength && viewAttrProp.maxLength < newProp.maxLength) newProp.maxLength = viewAttrProp.maxLength;
            if(viewAttrProp.minLength && newProp.minLength && viewAttrProp.minLength > newProp.minLength) newProp.minLength = viewAttrProp.minLength;
            if(viewAttrProp.maximum && newProp.maximum && viewAttrProp.maximum < newProp.maximum) newProp.maximum = viewAttrProp.maximum;
            if(viewAttrProp.minimum && newProp.minimum && viewAttrProp.minimum > newProp.minimum) newProp.minimum = viewAttrProp.minimum;
            if(viewAttrProp.places && newProp.places && viewAttrProp.places < newProp.places) newProp.places = viewAttrProp.places;

            if(newProp.media && newProp.media.mediaType == 'text/html') newProp.nullValue = '<p>[no text]</p>';
            else if(newProp.enum) newProp.nullValue = '[not selected]';
            else if(newProp.type == 'String') newProp.nullValue = '[null]';
            else if(newProp.type == 'Number') newProp.nullValue = '[null]';
            else if(newProp.type == 'Date') newProp.nullValue = '[no date selected]';
            else if(newProp.type == 'Boolean') newProp.nullValue = 'false';
            else newProp.nullValue = '[null]';
            schema.properties[attrPropName] = newProp;

            if(view.schema.required){
                view.schema.required.forEach(function(requiredAttr){
                    var index = schema.required.indexOf(requiredAttr);
                    if(index == -1) schema.required.push(requiredAttr);
                });
            }
        }
        return schema;
    });
}
function getAttrPropertiesFromAncestors(classId){
    return collectAllByAssocType(Number(classId), 'parent').then(function(parentClassesArr){
        var schema = {
            $schema: "http://json-schema.org/draft-04/schema#",
            type: 'object',
            properties: {},
            additionalProperties: false
        };
        var required = [];
        parentClassesArr.forEach(function(classItem) {
            if(classItem.schema){
                if(classItem.schema.properties){
                    for(var classAttr in classItem.schema.properties){
                        schema.properties[classAttr] = classItem.schema.properties[classAttr];
                    }
                }
                if(classItem.schema.required) required = required.concat(classItem.schema.required)
            }
        });
        if(required.length>0) schema.required = required;
        return schema;
    });
}
function collectAllByAssocType(itemId, assocType) {
    /* summary: Use to navigate the data graph following the given association type, gathering all items along the way.
     //          If ASSOCPROPERTIES specifies that an association type should return one particular item type, other types will be ignored.(e.g. subclasses, instantiations)
     //          Will write an error if it finds more than one occurrence when ASSOCPROPERTIES specifies that only one is allowed.
     //          Returns an array of items, starting with the first one (get(itemId)).
     //          Will preserve the order in the case of a linked list.
     //          Examples: Get all objects in a linked list by 'next', get all ancestor classes by 'parent', get all subclasses by 'subclass'.
     // itemId: Number
     //          The id of the item we're starting with.
     // assocType: String
     //          The association type to be followed.
     // returns: Array
     //          An array of all the items found along the way.
     */
    //TODO loop protection
    if(!itemId || !assocType || !ASSOCPROPERTIES[assocType]) throw (new Error('Invalid parameters'));
//    var self = this;
    return Items.findById(itemId).then(function(item){
        var type = ASSOCPROPERTIES[assocType].type;
        if(type && item._type != type) return [];
        //console.log('item', item);
        var query  = normalizeAssocQuery(itemId, assocType);
        return Assocs.find(query).then(function(collection){
            var itemPromises = [];
            var count = 0;
            collection.forEach(function (assoc) {
                count ++;
                if(!ASSOCPROPERTIES[assocType].pseudo) itemPromises.push(Items.findById(assoc.dest));
                else itemPromises.push(Items.findById(assoc.source));
            });
            if(ASSOCPROPERTIES[assocType].cardinality == 'one' && count>1) console.error('more than one found');
            return all(itemPromises).then(function(classesArr){
                //console.log('classesArr',classesArr);
                var subclassesPromises = [];
                classesArr.forEach(function(childItem){
                    subclassesPromises.push(collectAllByAssocType(childItem._id, assocType));
                });
                return all(subclassesPromises).then(function(subclassesArr){
                    var results = [];
                    results.push(item);
                    subclassesArr.forEach(function(subArr){
                        subArr.forEach(function(subClass){
                            results.push(subClass);
                        });
                    });
                    //console.log('results', results);
                    return results;
                });
            });
        });

    });
}
function normalizeAssocQuery(itemId, type) {
    var assocProps = ASSOCPROPERTIES[type];
    if(assocProps.pseudo) {
        return {dest: itemId, type: assocProps.inverse};
    }
    else return {source: itemId, type: type};
}
WIDGETS_ATTRCLASS = 99;
ACCORDIONTABS_ATTRCLASS = 90;
VIEW_CLASS_TYPE = 74;
ASSOCPROPERTIES = {
    parent: {
        inverse :'children',
        pseudo : false,
        cardinality: 'one',
        icon: 3},
    mapsTo: {
        inverse :'mappedToBy',
        pseudo : false,
        cardinality: 'one',
        icon: 5},
    default: {
        inverse :'defaultOf',
        pseudo : false,
        cardinality: 'one',
        icon: 6},
    oneToOne: {
        inverse :'oneToOneReverse',
        pseudo : false,
        cardinality: 'one',
        icon: 7},
    ordered: {
        inverse :'orderedParent',
        pseudo : false,
        cardinality: 'many',
        icon: 8},
    next: {
        inverse :'previous',
        pseudo : false,
        cardinality: 'one',
        icon: 9},
    manyToMany: {
        inverse :'manyToManyReverse',
        pseudo : false,
        cardinality: 'many',
        icon: 10},
    oneToMany: {
        inverse :'manyToOne',
        pseudo : false,
        icon: 11},
    owns: {
        inverse :'ownedBy',
        pseudo : false,
        cardinality: 'many',
        icon: 12},
    subclasses: {
        inverse :'parent',
        pseudo : true,
        cardinality: 'many',
        icon: 15,
        type : 'class'},
    instantiations: {
        inverse :'parent',
        pseudo : true,
        cardinality: 'many',
        icon: 15,
        type : 'object'},
    children: {
        inverse :'parent',
        pseudo : true,
        cardinality: 'many',
        icon: 15},
    allSubclasses: {
        inverse :'parent',
        pseudo : true,
        cardinality: 'many',
        icon: 15},
    mappedToBy: {
        inverse :'mapsTo',
        pseudo : true,
        cardinality: 'many',
        icon: 17},
    defaultOf: {
        inverse :'default',
        pseudo : true,
        cardinality: 'many',
        icon: 18},
    oneToOneReverse: {
        inverse :'oneToOne',
        pseudo : true,
        icon: 19},
    orderedParent: {
        inverse :'ordered',
        pseudo : true,
        cardinality: 'one',
        icon: 20},
    previous: {
        inverse :'next',
        pseudo : true,
        cardinality: 'one',
        icon: 21},
    manyToManyReverse: {
        inverse :'manyToMany',
        pseudo : true,
        cardinality: 'many',
        icon: 22},
    manyToOne: {
        inverse :'oneToMany',
        pseudo : true,
        cardinality: 'one',
        icon: 23},
    ownedBy: {
        inverse :'owns',
        pseudo : true,
        cardinality: 'one',
        icon: 24},
    associations: {
        inverse :'associations',
        pseudo : true,
        cardinality: 'many',
        icon: 11},
    byAssociationType: {
        inverse :'byAssociationType',
        pseudo : true,
        cardinality: 'many',
        icon: 24}
};
CLASSSCHEMA = {
    $schema: "http://json-schema.org/draft-04/schema#",
    type: 'object',
    properties: {
        _id : {
            type: "number",
            readOnly : true,
            minimum : 0,
            places : 0},
        name : {
            type: "string",
            readOnly : false},
        type : {
            type : "string",
            readOnly : true,
            enum : ['class']},
        description : {
            type : "string",
            readOnly : false,
            media : {
                mediaType : "text/html"
            }},
        schema : {
            type : "object",
            readOnly : false}
    },
    required: ['_id', 'name', 'type'],
    additionalProperties: false
};

module.exports.getCombinedSchemaForView = getCombinedSchemaForView;
module.exports.getAttrPropertiesFromAncestors = getAttrPropertiesFromAncestors;
module.exports.collectAllByAssocType = collectAllByAssocType;