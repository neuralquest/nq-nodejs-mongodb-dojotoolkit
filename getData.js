var Promise = require('promise');
var config = require('./config');

function getItem(req, res){
    var itemsColl = req.db.collection("items");
    var reqs = req.path.split('/');
    var viewId = reqs[reqs.length-2];
    var itemId = reqs[reqs.length-1];
    //console.log('itemId' ,itemId);

    var item = itemsColl.findOne({_id:Number(itemId)}, function(err, item){
        if(err) res.status(500).send(err);
        else res.json(item);
    });

}
function getItemsByQuery(req, res){
    var assocsColl = req.db.collection("assocs");
    var itemsColl = req.db.collection("items");
    //console.log('req.query', req.query);
    var sourceId = Number(req.query.sourceId);
    var destClassId = Number(req.query.destClassId);
    getItemsByAssocTypeAndDestClass(assocsColl, itemsColl, sourceId, req.query.type, destClassId, function(err, itemsArr){
        if(err) res.status(500).send(err);
        else res.json(itemsArr);
    });
}
function getItemsByAssocTypeAndDestClass(assocsColl, itemsColl, sourceId, type, destClassId, callback){
    if(type == 'ordered'){
        assocsColl.find({$and:[{source: sourceId},{type:'ordered'}]}).forEach(function(assoc) {
            isA(assocsColl, assoc.dest, destClassId, function(err, isADestClass) {
                //console.log('err', err, 'isADestClass', isADestClass);
                if(err) return callback(err);
                if(isADestClass) {
                    var itemsArr = [];
                    var assocsArr = [];
                    assocsArr.push(assoc);
                    itemsColl.findOne({_id:assoc.dest}, function(err, item) {
                        //console.log('err', err, 'next item', item);
                        if(err) return callback(err);
                        itemsArr.push(item);
                        getNextAssocs(assocsColl, itemsColl, assoc.dest, assocsArr, itemsArr, function(err, assocsArr, itemsArr) {
                            //console.log('err', err, 'assocArr', assocsArr, 'itemsArr', itemsArr);
                            if(err) return callback(err);
                            callback(null, itemsArr);
                        });
                    });
                }
            });
        })
    }
    else{
        assocsColl.find({$and:[{source: sourceId},{type:type}]}).toArray(function(err, assocsArr) {
            if(err) res.status(500).send(err);
            else{
                var isAPromises = [];
                var itemPromises = [];
                //console.log('many assocsArr', assocsArr);
                for(var i=0;i<assocsArr.length;i++){
                    assoc = assocsArr[i];
                    isAPromises.push(new Promise(function(resolve, reject){
                        isA(assocsColl, assoc.dest, destClassId, function(err, isADestClass) {
                            var itemId = assoc.dest;
                            if(err) reject(err);
                            else {
                                if(isADestClass) itemPromises.push(new Promise(function(resolve, reject){
                                    itemsColl.findOne({_id:itemId}, function(err, item) {
                                        if(err) reject(err);
                                        else resolve(item);
                                    });
                                }));
                                resolve(isADestClass);
                            }
                        })
                    }));
                }
                //console.log('isAPromises', isAPromises);
                Promise.all(isAPromises).then(function(isADestClassArr){
                    console.log('isADestClassArr isADestClassArr', isADestClassArr);
                    Promise.all(itemPromises).then(function(itemsArr){
                        console.log('itemsArr itemsArr', itemsArr);
                        callback(null, itemsArr);
                    },callback(err));
                },callback(err));
            }
        })
    }
}
function isA(assocsColl, sourceId, destClassId, callback){
    assocsColl.findOne({$and:[{source: sourceId},{type:'parent'}]}, function(err, assoc) {
        if(err) return callback(err);
        //console.log('parent assoc', assoc);
        if(assoc){
            if(assoc.dest == destClassId) callback(null, true);
            else isA(assocsColl, assoc.dest, destClassId, callback);
        }
        else return callback(null,false);
    })
}
function getNextAssocs(assocsColl, itemsColl, sourceId, assocsArr, itemsArr, callback){
    assocsColl.findOne({$and:[{source: sourceId},{type:'next'}]}, function(err, assoc) {
        //console.log('err', err, 'next assoc', assoc);
        if(err) return callback(err);
        if(assoc){
            assocsArr.push(assoc);
            itemsColl.findOne({_id:assoc.dest}, function(err, item) {
                //console.log('err', err, 'next item', item);
                if(err) return callback(err);
                itemsArr.push(item);
                getNextAssocs(assocsColl, itemsColl, assoc.dest, assocsArr, itemsArr, callback)
            })

        }
        else return callback(null, assocsArr, itemsArr);
    })
}
function getView(assocsColl, itemsColl, view, callback){
    itemsColl.findOne({_id:view}, function(err, mysql2Mango) {
        if(err) callback(err);
        else{
            isA(assocsColl, view, config.VIEW_CLASS, function(err, isADestClass) {
                if(err) callback(err);
                else {
                    if(isADestClass){
                        getItemsByAssocTypeAndDestClass(assocsColl, itemsColl, view, 'ordered', config.ATTRREF_CLASS, function(err, attrRefArr) {
                            if(err) callback(err);
                            else {
                                view.attrRefs = attrRefArr;
                                callback(null, view)
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
module.exports.getItemsByQuery = getItemsByQuery;
