var config = require('./config');

function update(req, callback){
    var itemsColl = req.db.collection('items');
    var assocsColl = req.db.collection('assocs');
    var body = req.body;

    var idMap = [];
    if(body.itemsColl){
        if(body.itemsColl.add) {
            var newItems = body.itemsColl.add;
            newItems.forEach(function (item) {
                var clientId = item._id;
                var realId =  getNextSequence(req.db,"itemsColl");
                idMap[realId] = clientId;
                item._id = realId;
                //itemsColl.insert(item);
                //TODO
            });
        }
        if(body.itemsColl.update) {
            var updateItems = body.itemsColl.update;
            updateItems.forEach(function (item) {
                //itemsColl.update({_id: item._id}, item);
            });
        }
        if(body.itemsColl.delete) {
            var deleteItems = body.itemsColl.delete;
            deleteItems.forEach(function (id) {
                //itemsColl.remove({_id: id});
            });
        }
    }
    if(body.assocsColl){
        if(body.assocsColl.add) {
            var newAssocs = body.assocsColl.add;
            newAssocs.forEach(function (assoc) {
                if(idMap[assoc.source]) assoc.source = idMap[assoc.source];
                if(idMap[assoc.dest]) assoc.dest = idMap[assoc.dest];
                //assocsColl.insert(assoc);
            });
        }
        if(body.assocsColl.update) {
            var updateAssocs = body.assocsColl.update;
            updateAssocs.forEach(function (assoc) {
                if(idMap[assoc.source]) assoc.source = idMap[assoc.source];
                if(idMap[assoc.dest]) assoc.dest = idMap[assoc.dest];
                //assocsColl.update({_id: assoc._id}, assoc);
            });
        }
        if(body.assocsColl.delete) {
            var deleteAssocs = body.assocsColl.delete;
            deleteAssocs.forEach(function (id) {
                //assocsColl.remove({_id: id});
            });
        }
        return callback(null, [{done:'OK'}]);
    }
}
function getNextSequence(db,name) {
    var counters = db.collection('counters');

    counters.findAndModify({
        query: { _id: name},
        update: {$inc: { seq: 1 }},
        new: true},
        function(err, ret) {
        if (err) {
            console.log('err', err);
        }
        else {
            console.log('updated', ret);
        }
    });
/*
 counters.findAndModify(
 name,
 {$inc: { seq: 1 }},
 //'remove': true,
 function(err, ret) {
 if (err) {
 console.log('err', err);
 }
 else {
 console.log('updated', ret);
 }
 });

    var ret = counters.findAndModify(
        {
            query: { _id: name },
            update: { $inc: { seq: 1 } },
            new: true
        }
    );
    return ret.seq;
    */
}

module.exports.update = update;
