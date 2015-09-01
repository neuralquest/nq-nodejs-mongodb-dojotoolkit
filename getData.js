var Promise = require('promise');
var config = require('./config');

function getItem(db, viewId, itemId, callback){
    var itemsColl = db.collection('items');

    itemsColl.findOne({_id:Number(itemId)}, function(err, item){
        if(item) item._viewId = viewId;
        callback(err, item);
    });
}
function getItemsByParentId(db, viewId, parentId, callback){
    getView(db, viewId, function(err, view){
        if(err) callback(err, null);
        else {
            var projection = {};
            var attrRefs = view.attrRefs;
            for(var i=0;i<attrRefs.length;i++) {
                var attrRef = attrRefs[i];
                projection[attrRef.name] = 1;
            }
            console.log('projection', projection);
            getItemsByAssocTypeAndDestClass(db, parentId, view.toMannyAssociations, view.mapsTo, function (err, itemsArr) {
                //console.log('itemsArr', itemsArr);
                if(item) item._viewId = viewId;
                callback(err, item);
            });
        }
    });
}
function getItemsByParentIdAndParentView(db, parentViewId, parentId, callback){
    getItemsByAssocTypeAndDestClass(db, parentViewId, 'many to many', config.constants.VIEW_CLASS, function(err, viewsArr) {
        //console.log('viewsArr', viewsArr);
        if (err) callback(err);
        else {
            var viewsPromisses = [];
            for(var i=0;i<viewsArr.length;i++){
                var view = viewsArr[i];
                viewsPromisses.push(new Promise(function(resolve, reject){
                    getItemsByAssocTypeAndDestClass(db, parentId, view.toMannyAssociations, view.mapsTo, function (err, itemsArr) {
                        //console.log('itemsArr', itemsArr);
                        if(err) reject(err);
                        else resolve(itemsArr);
                    });
                }));
            }
            Promise.all(viewsPromisses).then(function(viewsItemsArr){
                //console.log('viewsItemsArr', viewsItemsArr);
                var results = [];
                for(var i=0; i<viewsItemsArr.length;i++){
                    var itemsArr = viewsItemsArr[i];
                    for(var j=0; j<itemsArr.length;j++){
                        var item = itemsArr[j];
                        item._viewId = viewsArr[i]._id;
                        results.push(item);
                    }
                }
                /*for(var i=0; i<viewsItemsArr.length;i++){
                    results = results.concat(viewsItemsArr[i]);
                }*/
                callback(null, results);
            });
        }
    });
}
function getItemsByAssocTypeAndDestClass(db, parentId, type, destClassId, callback){
    var assocsColl = db.collection('assocs');
    var itemsColl = db.collection('items');
    if(type == 'ordered'){
        assocsColl.find({$and:[{source: parentId},{type:'ordered'}]}).toArray(function(err, assocsArr) {
            var isAPromises = [];
            for(var i=0;i<assocsArr.length;i++){
                var assoc = assocsArr[i];
                isAPromises.push(new Promise(function(resolve, reject){
                    isA(assocsColl, assoc.dest, destClassId, function(err, isADestClass) {
                        //console.log('first isADestClassArr isADestClassArr', isADestClass);
                        if(err) reject(err);
                        else if(isADestClass) resolve(isADestClass);
                        else resolve(null);
                    })
                }));
            }
            Promise.all(isAPromises).then(function(isADestClassArr){
                //console.log('isADestClassArr', isADestClassArr);
                var count = 0;
                var firstId = null;
                for(var i=0;i<isADestClassArr.length;i++) {
                    if(isADestClassArr[i]) {
                        firstId = isADestClassArr[i];
                        count += 1;
                    }
                }
                if(count>1) reject(new Error("More than one 'ordered' found"));
                else if(count==1){
                    var itemsArr = [];
                    var assocsArr = [];
                    assocsArr.push(assoc);
                    itemsColl.findOne({_id:firstId}, function(err, item) {
                        //console.log('err', err, 'next item', item);
                        if(err) return callback(err);
                        itemsArr.push(item);
                        getNextAssocs(db, firstId, assocsArr, itemsArr, function(err, assocsArr, itemsArr) {
                            //console.log('err', err, 'assocArr', assocsArr, 'itemsArr', itemsArr);
                            callback(err, itemsArr);
                        });
                    });
                }
                else callback(null, []);
            });
        })
    }
    else if(type == 'instantiations'){
        assocsColl.find({$and:[{dest: destClassId},{type:'parent'}]}).toArray(function(err, assocsArr) {
            if(err) callback(err);
            else {
                var itemPromises = [];
                for (var i = 0; i < assocsArr.length; i++) {
                    var assoc = assocsArr[i];
                    itemPromises.push(new Promise(function (resolve, reject) {
                        itemsColl.findOne({_id: assoc.source}, function (err, item) {
                            if (err) reject(err);
                            else resolve(item);
                        });
                    }));
                }
                Promise.all(itemPromises).then(function (itemsArr) {
                    //console.log('itemsArr', itemsArr);
                    callback(null, itemsArr);
                });
            }
        });
    }
    else{
        assocsColl.find({$and:[{source: parentId},{type:type}]}).toArray(function(err, assocsArr) {
            if(err) callback(err);
            else{
                var isAPromises = [];
                for(var i=0;i<assocsArr.length;i++){
                    var assoc = assocsArr[i];
                    isAPromises.push(new Promise(function(resolve, reject){
                        isA(assocsColl, assoc.dest, destClassId, function(err, isADestClass) {
                            //console.log('isADestClass', isADestClass);
                            if(err) reject(err);
                            else if(isADestClass) resolve(isADestClass);
                            else resolve(null);
                         })
                    }));
                }
                Promise.all(isAPromises).then(function(isADestClassArr){
                    //console.log('isADestClassArr', isADestClassArr);
                    var itemPromises = [];
                    for(var i=0;i<isADestClassArr.length;i++){
                        var isA = isADestClassArr[i];
                        if(isA){
                            itemPromises.push(new Promise(function(resolve, reject){
                                itemsColl.findOne({_id:isA}, function(err, item) {
                                    if(err) reject(err);
                                    else resolve(item);
                                });
                            }));
                        }
                    }
                    Promise.all(itemPromises).then(function(itemsArr){
                        //console.log('itemsArr', itemsArr);
                        callback(null, itemsArr);
                    });
                });
            }
        })
    }
}
function isA(assocsColl, itemId, destClassId, callback, originalId){
    if(itemId == destClassId) return itemId;
    if(!originalId) originalId = itemId;
    //console.log('call to is a assoc',itemId, destClassId);
    assocsColl.findOne({$and:[{source: itemId},{type:'parent'}]}, function(err, assoc) {
        //console.log('is a assoc',assoc);
        if(err) return callback(err);
        //console.log('parent assoc', assoc);
        else if(assoc){
            if(assoc.dest == destClassId) callback(null, originalId);
            else isA(assocsColl, assoc.dest, destClassId, callback, originalId);
        }
        else return callback(null,null);
    })
}
function getNextAssocs(db, itemId, assocsArr, itemsArr, callback){
    var assocsColl = db.collection('assocs');
    var itemsColl = db.collection('items');
    assocsColl.findOne({$and:[{source: itemId},{type:'next'}]}, function(err, assoc) {
        //console.log('err', err, 'next assoc', assoc);
        if(err) return callback(err);
        if(assoc){
            assocsArr.push(assoc);
            itemsColl.findOne({_id:assoc.dest}, function(err, item) {
                //console.log('err', err, 'next item', item);
                if(err) return callback(err);
                itemsArr.push(item);
                getNextAssocs(db, assoc.dest, assocsArr, itemsArr, callback)
            })

        }
        else return callback(null, assocsArr, itemsArr);
    })
}
function getView(db, viewId, callback){
    var assocsColl = db.collection('assocs');
    var itemsColl = db.collection('items');
    itemsColl.findOne({_id:viewId}, function(err, view) {
        if(err) callback(err);
        else{
            isA(assocsColl, viewId, config.constants.VIEW_CLASS, function(err, isADestClass) {
                if(err) callback(err);
                else {
                    if(isADestClass){
                        getItemsByAssocTypeAndDestClass(db, viewId, 'ordered', config.constants.ATTRREF_CLASS, function(err, attrRefArr) {
                            if(err) callback(err);
                            else {
                                view.attrRefs = attrRefArr;
                                callback(null, view);
                            }
                        })
                    }
                    else callback(view + ' is not a view');
                }
            })
        }
    });
}


module.exports.getItem = getItem;
//module.exports.getItemsByQuery = getItemsByQuery;
module.exports.getItemsByParentId = getItemsByParentId;
module.exports.getItemsByParentIdAndParentView = getItemsByParentIdAndParentView;
module.exports.getItemsByAssocTypeAndDestClass = getItemsByAssocTypeAndDestClass;
