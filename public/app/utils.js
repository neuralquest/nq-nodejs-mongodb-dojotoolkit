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
    else classSchemaPromise = METASCHEMA;//No mapsTo means we're asking for a class (meta schema)

    return when(classSchemaPromise, function(classSchema){
        //remove properties not in the view's schema
        for(var attrName in classSchema.properties) {
            if(!view.schema[attrName]) delete classSchema.properties[attrName];
            if(classSchema.required){
                var index = classSchema.required.indexOf(attrName);
                if(index!=-1)array.splice(index, 1);
            }
        }

        var schema = {};
        for(var attrPropName in view.schema){
            //if(attrPropName == 'description') debugger;
            var newProp = {};
            var attrProp = view.schema[attrPropName];
            var classAttrProp = null;
            for(var classAttrName in classSchema){
                //debugger;
                if(attrPropName == classAttrName){
                    classAttrProp = classSchema[attrPropName];
                    break;
                }
            };
            if(!classAttrProp) {
                //throw new Error('cant find classAttrProp');
                console.warn('classAttrProp not found',attrProp);
                classAttrProp = attrProp;
            }
            //set the references
            newProp.type = classAttrProp.type;
            //Exception for class type, they will have no type so we improvise
            if(!newProp.type){
                if(attrPropName=='_id') newProp.type = 'Number';
                if(attrPropName=='_name') newProp.type = 'String';
                if(attrPropName=='_type') {
                    newProp.type = 'String';
                    newProp.enum = attrProp.enum;
                }
            }
            newProp.className = classSchema._name;
            newProp.classId = classSchema._id;
            newProp.viewId = view._id;
            newProp.viewMapsTo = view.mapsTo;
            //set the defaults
            if(classAttrProp.media) newProp.media = classAttrProp.media;
            if(classAttrProp.enum){
                if(attrProp.enum) {
                    var newEnum = [];
                    //assert that the values are permitted
                    attrProp.enum.forEach(function (enumValue){
                        if(classAttrProp.enum[enumValue]) newEnum.push(enumValue);
                        else console.warn('classAttrProp not found', attrProp, enumValue);
                    });
                    //newProp.enum = newEnum;
                    newProp.enum = attrProp.enum;
                }
                else newProp.enum = classAttrProp.enum;
            }
            if(attrProp.pattern) newProp.pattern = attrProp.pattern;
            else if(classAttrProp.pattern) newProp.pattern = classAttrProp.pattern;
            if(attrProp.invalidMessage) newProp.invalidMessage = attrProp.invalidMessage;
            else if(classAttrProp.invalidMessage) newProp.invalidMessage = classAttrProp.invalidMessage;
            if(attrProp['#ref']) newProp['#ref'] = attrProp['#ref'];
            else if(classAttrProp['#ref']) newProp['#ref'] = classAttrProp['#ref'];

            newProp.required = attrProp.required?attrProp.required:classAttrProp.required?classAttrProp.required:false;
            newProp.readOnly = attrProp.readOnly?attrProp.readOnly:classAttrProp.readOnly?classAttrProp.readOnly:false;
            //newProp.hidden = attrProp.hidden?attrProp.hidden:classAttrProp.hidden?classAttrProp.hidden:false;
            //newProp.title = attrProp.title?attrProp.title:classAttrProp.title?classAttrProp.title:'[no title]';
            newProp.default = attrProp.default?attrProp.default:classAttrProp.default?classAttrProp.default:null;
            //newProp.description = attrProp.description?attrProp.description:classAttrProp.description?classAttrProp.description:'<p>[no description <a href="#.842.1787.'+view._id+'.538">provided</a>]</p>';
            //newProp.style = attrProp.style?attrProp.style:classAttrProp.style?classAttrProp.style:'width:100%';
            newProp.nullValue = null;
            //newProp.columnWidth = '10em';
            if(classAttrProp.media && classAttrProp.media.mediaType == 'text/html'){
                //newProp.columnWidth = attrProp.columnWidth?attrProp.columnWidth:classAttrProp.columnWidth?classAttrProp.columnWidth:'100%';
                newProp.maxLength = attrProp.maxLength?attrProp.maxLength:classAttrProp.maxLength?classAttrProp.maxLength:100000;
            }
            else if(classAttrProp.enum){
                //newProp.columnWidth = attrProp.columnWidth?attrProp.columnWidth:classAttrProp.columnWidth?classAttrProp.columnWidth:'8em';
            }
            else if(classAttrProp.type == 'String'){
                //newProp.columnWidth = attrProp.columnWidth?attrProp.columnWidth:classAttrProp.columnWidth?classAttrProp.columnWidth:'10em';
                newProp.maxLength = attrProp.maxLength?attrProp.maxLength:classAttrProp.maxLength?classAttrProp.maxLength:1000000;
                if(attrProp.minLength) newProp.minLength = attrProp.minLength;
                else if(classAttrProp.minLength) newProp.minLength = classAttrProp.minLength;
            }
            else if(classAttrProp.type == 'Number'){
                //newProp.columnWidth = attrProp.columnWidth?attrProp.columnWidth:classAttrProp.columnWidth?classAttrProp.columnWidth:'4em';
                newProp.maximum = attrProp.maximum?attrProp.maximum:classAttrProp.maximum?classAttrProp.maximum:Number.MAX_VALUE;
                newProp.minimum = attrProp.minimum?attrProp.minimum:classAttrProp.minimum?classAttrProp.minimum:Number.MIN_VALUE;
                newProp.places = attrProp.places?attrProp.places:classAttrProp.places?classAttrProp.places:0;
            }
            else if(classAttrProp.type == 'Date'){
                //newProp.columnWidth = attrProp.columnWidth?attrProp.columnWidth:classAttrProp.columnWidth?classAttrProp.columnWidth:'6em';
            }
            else if(classAttrProp.type == 'Boolean'){
                //newProp.columnWidth = attrProp.columnWidth?attrProp.columnWidth:classAttrProp.columnWidth?classAttrProp.columnWidth:'3em';
            }
            schema[attrPropName] = newProp;
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
METASCHEMA = {
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