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
app.use(logger('dev'));//Disable logging for static content requests by loading the logger middleware after the static middleware:

app.get("/item/*/*", function (req, res) {
    getData.getItem(req, res);
});
app.get("/item", function (req, res) {
    getData.getItemsByQuery(req, res);
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
