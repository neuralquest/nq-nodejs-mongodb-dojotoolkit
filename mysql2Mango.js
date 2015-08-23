var mysql = require('mysql');
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

        connection.query("select c2.id as id, c2.type as type, c4.name as attrName, c3.name as attrValue  "+
            "		from cell c1, assoc a1, cell c2 "+
            "		LEFT JOIN (assoc a2, cell c3, assoc a3, cell c4) "+
            "		on (a2.fk_source = c2.id  "+
            "		and a2.type = 4  "+
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
            if(!err) {
                var newCells = [];
                var newCell = {};
                for(var i in cells) {
                    var cellPart = cells[i];
                    //console.log('newCell', newCell, 'cellPart', cellPart);
                    if (newCell._id != cellPart.id) {
                        if (newCell._id) newCells.push(newCell);
                        //console.log('newCell', newCell);
                        newCell = {_id: cellPart.id, _type: 'object'};
                    }
                    if (cellPart.attrName) {
                        var camelAttr = camelize(cellPart.attrName);
                        if(camelAttr == 'primaryNames') camelAttr = 'name';
                        newCell[camelAttr] = cellPart.attrValue;
                    }
                }
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
                    " where c1.id in(67,80,70,86,84,110,71,103,51,89,97,98,62,78,85,96,63,74,90,99,79,80,108,95) "+
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
                        var assocColl = req.db.collection("assocs");


                        connection.query("select assoc.fk_source as fk_source, cell.name as type, assoc.fk_dest as fk_dest " +
                            " from assoc, cell " +
                            " where assoc.type = cell.id " +
                            " and assoc.type != 4",function(err,assocs) {
                            if (!err) {
                                for (var i in assocs) {
                                    var assoc = assocs[i];
                                    processAssoc(assoc, itemsColl, assocColl)
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
function processAssoc(assoc, itemsColl, assocColl){
    itemsColl.find({$or:[{_id:assoc.fk_source },{_id:assoc.fk_dest }]}).toArray(function (err, array) {
        console.log('array' ,array);
        if(err) console.log(err);
        if(array && array.length==2){
            var newAssoc;
            console.log('array' ,array);
            if(array[0]._id == 842) console.log('array' ,array);
            if(array[0]._id==assoc.fk_source){
                newAssoc = {source:array[0]._id, type:assoc.type, dest:array[1]._id};
            }
            else{
                newAssoc = {source:array[1]._id, type:assoc.type, dest:array[0]._id};
            }
            //console.log('newAssoc' ,newAssoc);
            assocColl.insert(newAssoc);
        }
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
