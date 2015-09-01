var config = require('./config');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressMongoDb = require('express-mongo-db');
var app = express();
var getData = require('./getData');
var mysql2Mango = require('./mysql2Mango');
app.config = config;


app.use(expressMongoDb(config.mongodb.uri));// Get database
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
//app.use(logger('dev'));//Disable logging for static content requests by loading the logger middleware after the static middleware:

app.get("/items", function (req, res) {
    var itemsColl = req.db.collection('items');
    itemsColl.find().toArray(function(err, itemsArr) {
        if(err) res.status(500).send(err);
        else res.json(itemsArr);
    });
});
app.get("/assocs", function (req, res) {
    var assocsColl = req.db.collection('assocs');
    assocsColl.find().toArray(function(err, assocsArr) {
        if(err) res.status(500).send(err);
        else res.json(assocsArr);
    });
});
app.get("/item/*/*", function (req, res) {
    var reqs = req.path.split('/');
    var viewId = Number(reqs[reqs.length-2]);
    var itemId = Number(reqs[reqs.length-1]);

    getData.getItem(req.db, viewId, itemId, function(err, item){
        if(err) res.status(500).send(err);
        else res.json(item);
    });
});
app.get("/item", function (req, res) {
    console.log('req.query', req.query);
    var parentViewId = Number(req.query.parentViewId);
    var viewId = Number(req.query.viewId);
    var parentId = Number(req.query.parentId);
    var itemId = Number(req.query.itemId);
    var destClassId = Number(req.query.destClassId);
    var type = req.query.type;
    if(viewId && itemId){
        getData.getItem(req.db, viewId, itemId, function(err, item){
            if(err) res.status(500).send(err);
            else res.json(item);
        });
    }
    else if(viewId && parentId){
        getData.getItemsByParentId(req.db, viewId, parentId, function(err, itemsArr){
            if(err) res.status(500).send(err);
            else res.json(itemsArr);
        });
    }
    else if(parentViewId && parentId) {
        getData.getItemsByParentIdAndParentView(req.db, parentViewId, parentId, function(err, itemsArr){
            if(err) res.status(500).send(err);
            else res.json(itemsArr);
        });
    }
    else if(parentId && type && destClassId) {
        getData.getItemsByAssocTypeAndDestClass(req.db, parentId, type, destClassId, function(err, itemsArr){
            if(err) res.status(500).send(err);
            else res.json(itemsArr);
        });
    }
    else res.status(500).send(new Error('Invalid query:' + req.json(query)));
});
app.get("/prefetch", function (req, res) {
    mysql2Mango.getPublicData(res, pool);
});
app.get("/transform", function (req, res) {
    mysql2Mango.transform(req, res);
});
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        console.log(err);
        res.status(err.status || 500);
        res.type('html');
        res.send('<h3>'+err.message+'</h3><p>'+err+'</p>');
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    console.log(err);
    res.status(err.status || 500);
    res.type('html');
    res.send('<h3>'+err.message+'</h3>');
});


module.exports = app;
