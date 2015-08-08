var express = require('express');
var mysql = require('mysql');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var prefetch = require('./prefetch');

var app = express();

var pool = mysql.createPool({
    connectionLimit: 100, //important
    host: 'localhost',
    user: 'web383_nqapp',
    password: 'entropy',
    database: 'web383_nqdata',
    debug: false
});

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get("/prefetch", function (req, res) {
    prefetch.prefetch(res, pool);
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
        res.status(err.status || 500);
        res.type('html');
        res.send('<h3>'+err.message+'</h3><p>'+err+'</p>');
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.type('html');
    res.send('<h3>'+err.message+'</h3>');
});


module.exports = app;
