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
//var mysql2Mango = require('./mysql2Mango');
var app = express();
app.config = config;

app.use(expressMongoDb(config.mongodb.uri));// Get database
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
//app.use(logger('dev'));//Disable logging for static content requests by loading the logger middleware after the static middleware:

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
        var usersColl = req.db.collection('users');
        usersColl.findOne({ username: username }).then(function(user){
            if (!user) {
                return done(null, false, { message: 'User name not found' });
            }
            if (user.password != password) {
                return done(null, false, { message: 'Incorrect password' });
            }
            return done(null, user, { message: 'Login Successful' });
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
    done(null, user);
    //User.findById(id, function(err, user) {
    //    done(err, user);
    //});
});

app.post('/login',
    passport.authenticate('local', {successMessage: true, failureMessage: true})
);


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
app.get("/failedLogin", function (req, res, next) {
    var err = new Error('Failed to Login');
    err.status = 404;
    next(err);
});
app.get("/data", function (req, res, next) {
    getData.get(req).then(function(items){
        res.json(items);
    }, function(err){
        next(err);
    });
});
app.post("/", function (req, res, next) {
    postData.update(req).then(function(items){
        res.json(items);
    }, function(err){
        next(err);
    });
});


/*
app.get("/item/* /*", function (req, res) {
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
*/


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
