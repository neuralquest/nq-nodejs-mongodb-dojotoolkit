var config = require('./config');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressMongoDb = require('express-mongo-db');
var postData = require('./postData');
var getData = require('./getData');
var consistency = require('./consistency');
var credentials = require('./credentials');
//var mysql2Mango = require('./mysql2Mango');
var app = express();
app.config = config;

app.use(expressMongoDb(config.mongodb.uri));// Get database
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(logger('dev'));//Disable logging for static content requests by loading the logger middleware after the static middleware:

// Configuring Passport
var passport = require('passport');
var expressSession = require('express-session');
var LocalStrategy = require('passport-local').Strategy;
app.use(expressSession({secret: 'mySecretKey'}));
app.use(passport.initialize());
app.use(passport.session());


passport.use(new LocalStrategy({
        passReqToCallback : true
    },function(req, username, password, done) {
        credentials.validate(req, username, password).then(function(result){
            if (result.failed) return done(null, false);
            return done(null, username);
        },function(err){
            return done(err);
        });
    }
));
passport.serializeUser(function(user, done) {
    done(null, user);
    //done(null, user._id);
});
passport.deserializeUser(function(id, done) {
    done(null, {username:'username', password:'password'});
    //User.findById(id, function(err, user) {
    //    done(err, user);
    //});
});



app.get("/data", function (req, res, next) {
    getData.get(req).then(function(items){
        res.json(items);
    }, function(err){
        next(err);
    });
});
app.post("/data", function (req, res, next) {
    postData.update(req).then(function(items){
        res.json(items);
    }, function(err){
        next(err);
    });
});
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
app.get("/consistency", function (req, res, next) {
    consistency.check(req).then(function(items){
        res.json(items);
    }, function(err){
        next(err);
    });
});
app.post('/signup', function(req, res, next) {
    credentials.signup(req).then(function (result) {
        if(result.failed) req.json(result);
        else req.redirect('post/login');
    }, function (err) {
        next(err);
    });
});
app.post('/login',
    passport.authenticate('local'),
    function(req, res) {
        // If this function gets called, authentication was successful.
        res.json({username:req.user});
    });
app.get('/logout', function(req, res) {
    req.logout();
    res.json({username:null});
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
        console.log(err.stack);
        res.status(err.status || 500);
        res.type('html');
        res.send('<b>'+err.message+'</b><pre>'+err.stack+'</pre>');
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    console.log(err.stack);
    res.status(err.status || 500);
    res.type('html');
    res.send('<b>'+err.message+'</b>');
});


module.exports = app;
