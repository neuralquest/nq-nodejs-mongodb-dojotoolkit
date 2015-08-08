/**
 * Created by cjong on 26-7-2015.
 */
function sendPublicData(res, pool){
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



module.exports.prefetch = sendPublicData;
