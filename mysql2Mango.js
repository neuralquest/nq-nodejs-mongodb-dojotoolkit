var Promise = require('promise');
var mysql = require('mysql');
var getData = require('./getData');
var pool = mysql.createPool({
    connectionLimit: 100, //important
    host: 'localhost',
    user: 'web383_nqapp',
    password: 'entropy',
    database: 'web383_nqdata',
    debug: false
});
function transform(req, res){
    pool.getConnection(function(err,connection){
        if (err) {
            console.log(err);
            if(connection) connection.release();
            res.json({"code" : 100, "status" : "Error in connection database"});
            return;
        }

        console.log('connected as id ' + connection.threadId);

        var assocsColl = req.db.collection("assocs");
        assocsColl.find({$and:[{type:'parent'}, {dest: 74},]}).toArray(function(err, assocsArr) {
            for(var i=0;i<assocsArr.length;i++) {
                var assoc = assocsArr[i];
                processView(req.db, assoc.source)
            }
        });
return;
        //Get the objects and their attributes.
        connection.query("select c1.id as icon, c2.id as id, a2.type as type, c4.name as attrName, c3.name as attrValue , c3.id as attrId   "+
            "		from cell c1, assoc a1, cell c2 "+
            "		LEFT JOIN (assoc a2, cell c3, assoc a3, cell c4) "+
            "		on (a2.fk_source = c2.id  "+
            "		and a2.type in(4,5) " +
            "		and a2.fk_dest = c3.id "+
            "		and a3.fk_source = c3.id  "+
            "		and a3.type = 3  "+
            "		and a3.fk_dest = c4.id) "+
            "	where c1.id  in(67,80,70,86,84,110,71,103,51,89,97,98,62,78,85,96,63,74,90,99,79,80,108,95) "+
            "	and a1.fk_dest = c1.id  "+
            "	and a1.type = 3  "+
            "	and a1.fk_source = c2.id "+
            "	and c2.type = 1 "+
            "   order by id; ",function(err,cells){
            //console.log('cells', cells);
            if(!err) {
                var newCells = [];
                var newCell = {};
                for(var i in cells) {
                    var cellPart = cells[i];
                    //console.log('newCell', newCell, 'cellPart', cellPart);
                    if (newCell._id != cellPart.id) {
                        if (newCell._id) newCells.push(newCell);
                        //console.log('newCell', newCell);
                        newCell = {_id: cellPart.id, _type: 'object', _icon:cellPart.icon};
                    }
                    if(cellPart.type == 4 && cellPart.attrName) {
                        var camelAttr = camelize(cellPart.attrName);
                        if(camelAttr == 'primaryNames') camelAttr = 'name';
                        newCell[camelAttr] = cellPart.attrValue;
                    }
                    else if(cellPart.type == 5) {
                        newCell.mapsTo = cellPart.attrId;
                    }
                }
                //Get the classes and their attributes
                connection.query("select c1.id as id, c1.type as type, c1.name as name, c2.name as attrName, c3.name as attrType, c4.name as permittedValue "+
                    "            from cell c1 "+
                    "            LEFT JOIN (assoc a2, cell c3, assoc a1, cell c2 "+
                    "				LEFT JOIN (assoc a3, cell c4) "+
                    "				on (c2.id in(58,59,57,66,91,92,94,83,72,73,81,87) "+
                    "               and a3.fk_dest = c2.id  "+
                    "				and a3.type = 3  "+
                    "				and a3.fk_source = c4.id)) "+
                    "            on (a1.fk_source = c1.id  "+
                    "            and a1.type = 4  "+
                    "            and a1.fk_dest = c2.id "+
                    "            and a2.fk_source = c2.id  "+
                    "            and a2.type = 3  "+
                    "            and a2.fk_dest = c3.id) "+
                    " where c1.id in(67,80,70,86,84,110,71,103,51,89,97,98,62,78,85,96,63,74,90,99,79,80,108,95," +
                    "60,61,68,69,82,100,109,64,59,57,66,91,92,94,77,107,101,102,106) "+
                    " order by id; ",function(err,cells){
                    if(!err) {
                        var previousId = 0;
                        var newCell = {};
                        var permValueAttrName = null;
                        var permittedValues = [];
                        for(var i in cells){
                            var cellPart = cells[i];
                            if(permValueAttrName && permValueAttrName != cellPart.attrName){
                                var camelAttr = camelize(permValueAttrName);
                                newCell[camelAttr] = {type: "String", enum:permittedValues};
                                permittedValues = [];
                                permValueAttrName = null;
                            }
                            if(previousId != cellPart.id){
                                if(previousId!=0){
                                    newCells.push(newCell);
                                    //console.log('newCell', newCell);
                                }
                                newCell = {_id:cellPart.id, _type:'class', _name:cellPart.name/*, icon:cellPart.id*/ };
                                permittedValues = [];
                                permValueAttrName = null;
                                previousId = cellPart.id;
                            }
                            if(cellPart.permittedValue){
                                permittedValues.push(cellPart.permittedValue);
                                permValueAttrName = cellPart.attrName;
                            }
                            else if(cellPart.attrName){
                                var camelAttr = camelize(cellPart.attrName);
                                if(camelAttr == 'primaryNames') camelAttr = 'name';
                                var attrType = cellPart.attrType;
                                if(attrType == 'Integer') attrType = 'Number';
                                if(attrType == 'RTF') attrType = 'String';
                                newCell[camelAttr] = {type: attrType};
                            }
                        }
                        newCells.push(newCell);
                        //console.log(req.db);

                        req.db.collection('items').drop();
                        var itemsColl = req.db.collection("items");
                        itemsColl.insert(newCells);
                        req.db.collection('assocs').drop();
                        var assocsColl = req.db.collection("assocs");

                        connection.query("select assoc.fk_source as fk_source, cell.name as type, assoc.fk_dest as fk_dest " +
                            " from assoc, cell " +
                            " where assoc.type = cell.id " +
                            " and assoc.type != 4",function(err,assocs) {
                            if (!err) {
                                //console.log('all assocs', assocs);
                                for (var i in assocs) {
                                    var assoc = assocs[i];
                                    processAssoc(assoc, itemsColl, assocsColl)
                                }
                            }
                            else console.log('error',err)
                            res.send('done');
                            connection.release();
                        });

                        //res.json(newCells);
                    }
                });
            }
        });

        connection.on('error', function(err) {
            res.json({"code" : 100, "status" : "Error in connection database"});
            return;
        });
    });
}
function processAssoc(assoc, itemsColl, assocsColl){
    //console.log('callAssoc',assoc);
    var sourceId = assoc.fk_source;
    var destId = assoc.fk_dest;
    var itemPromisses = [];
    itemPromisses.push(new Promise(function(resolve, reject){
        itemsColl.findOne({_id:sourceId}, function(err, item){
            if(err) {
                console.log('err', err);
                reject(err);
            }
            else  resolve(item);
        })
    }));
    itemPromisses.push(new Promise(function(resolve, reject){
        itemsColl.findOne({_id:destId}, function(err, item){
            if(err) {
                console.log('err', err);
                reject(err);
            }
            else resolve(item);
        })
    }));
    Promise.all(itemPromisses).then(function(items){
        //console.log('ITEMS', items);
        var source = items[0];
        var dest = items[1];
        if(source && dest){
            var camelType = camelize(assoc.type);
            var newAssoc = {source:source._id, type:camelType, dest:dest._id};
            assocsColl.insert(newAssoc);

        }
    });
}
function processView(db, viewId){
    var itemsColl = db.collection("items");
    itemsColl.findOne({_id:viewId}, function(err, view) {
        if (err) return callback(err);
        else{
            processParents(db, view);
        }
    });
}
function processParents(db, view){
    var itemsColl = db.collection("items");
    var attrObj = {};
    getParents(db, view.mapsTo, attrObj, function(err, parentAttrsObj) {
        //console.log('view', view.mapsTo);
        //console.log('parentAttrsObj', parentAttrsObj);
        getData.getItemsByAssocTypeAndDestClass(db, view._id, 'ordered', 63, function (err, attrRefsArr) {
            //console.log('attrRefsArr', attrRefsArr);
            if (err) reject(err);
            else {
                var classPromisses = [];
                for (var j = 0; j < attrRefsArr.length; j++) {
                    var attrRef = attrRefsArr[j];
                    //console.log('attrRef', attrRef);
                    classPromisses.push(new Promise(function (resolve, reject) {
                        //console.log('mapsTo', attrRef.mapsTo);
                        itemsColl.findOne({_id: attrRef.mapsTo}, function (err, item) {
                            if (err) {
                                console.log('err', err);
                                reject(err);
                            }
                            else  resolve(item);
                        })
                    }));
                }
                Promise.all(classPromisses).then(function (attrClassesArr) {
                    console.log('view', view, 'attrRefsArr', attrRefsArr,'parentAttrsObj', parentAttrsObj);
                    if(view.mapsTo==63){
                        var a=1;
                    }

                    var schema = {};
                    for (var j = 0; j < attrRefsArr.length; j++) {
                        var attrRef = attrRefsArr[j];
                        var attrType = attrClassesArr[j];
                        if(!attrType ||attrType._type == 'object') continue;
                        var camelAttr = camelize(attrType._name);
                        if (camelAttr == 'primaryNames') camelAttr = 'name';

                        //console.log('camelAttr',camelAttr,'parentAttrsObj[camelAttr]',parentAttrsObj[camelAttr]);

                        var props = {
                            type: parentAttrsObj[camelAttr]?parentAttrsObj[camelAttr].type:'String',
                            required: false,
                            readOnly: false,
                            title: attrRef.name,
                            description: 'attribute description'
                        };
                        if(parentAttrsObj[camelAttr]&&parentAttrsObj[camelAttr].enum) props.enum = parentAttrsObj[camelAttr].enum
                        //var attr = {attrRef.name: props};
                        schema[camelAttr] = props;
                    }
                    view.schema = schema;
                    console.log('schema', schema);
                    itemsColl.update({_id: view._id}, view);
                });
            }
        });
    });
}
function getParents(db, itemId, attrObj, callback){
    var assocsColl = db.collection('assocs');
    var itemsColl = db.collection('items');
    itemsColl.findOne({_id:itemId}, function(err, item) {
        if(err) return callback(err);
        else{
            for(var attr in item){
                if(attr.charAt(0)!='_') attrObj[attr] = item[attr];
            }
            assocsColl.findOne({$and:[{source: itemId},{type:'parent'}]}, function(err, assoc) {
                //console.log('err', err, 'next assoc', assoc);
                if(err) return callback(err);
                else if(assoc){
                    getParents(db, assoc.dest, attrObj, callback)
                }
                else return callback(null, attrObj);
            })
        }
    })
}
function XgetParents(db, itemId, itemsArr, callback){
    var assocsColl = db.collection('assocs');
    var itemsColl = db.collection('items');
    assocsColl.findOne({$and:[{source: itemId},{type:'parent'}]}, function(err, assoc) {
        //console.log('err', err, 'next assoc', assoc);
        if(err) return callback(err);
        if(assoc){
            itemsColl.findOne({_id:assoc.dest}, function(err, item) {
                //console.log('err', err, 'next item', item);
                if(err) return callback(err);
                itemsArr.push(item);
                getParents(db, assoc.dest, itemsArr, callback)
            })

        }
        else return callback(null, itemsArr);
    })
}
function getPublicData(res, pool){
    pool.getConnection(function(err,connection){
        if (err) {
            console.log(err);
            if(connection) connection.release();
            res.json({"code" : 100, "status" : "Error in connection database"});
            return;
        }

        console.log('connected as id ' + connection.threadId);

        connection.query("CALL prefetch_public()",function(err,rows){
            connection.release();
            if(!err) {
                res.json({cell:rows[0], assoc:rows[1]});
            }
        });

        connection.on('error', function(err) {
            res.json({"code" : 100, "status" : "Error in connection database"});
            return;
        });
    });
}

function camelize(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
        if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
        return index == 0 ? match.toLowerCase() : match.toUpperCase();
    });
}
module.exports.transform = transform;
module.exports.getPublicData = getPublicData;
