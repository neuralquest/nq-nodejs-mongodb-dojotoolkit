var config = require('./config');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressMongoDb = require('express-mongo-db');
var db = require('./db');
var postData = require('./postData');
var getData = require('./getData');
var consistency = require('./consistency');
var credentials = require('./credentials');
//var mysql2Mango = require('./mysql2Mango');
var app = express();
app.config = config;
app.db = db;
// Connect to Mongo on start
//db.connect(config.mongodb.uri);

db.connect(config.mongodb.uri, function(err) {
    if(err) {
        console.log('Unable to connect to Mongo.');
        //process.exit(1);
    }
    else {
        //app.listen(3000, function() {
            console.log('Listening on port 3000...')
        //})
    }
});/**/
app.use(expressMongoDb(config.mongodb.uri));// Get database//TODO get rid of
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.disable('x-powered-by');
app.set('port', config.port);
app.use(logger('dev'));//Disable logging for static content requests by loading the logger middleware after the static middleware:

// Configuring Passport
var passport = require('passport');
var expressSession = require('express-session');
//var mongoStore = require('connect-mongo')(session);
//var LocalStrategy = require('passport-local').Strategy;
//var GoogleStrategy = require('passport-google').Strategy;
app.use(expressSession({secret: config.cryptoKey}));
/*
app.use(expressSession({
    resave: true,
    saveUninitialized: true,
    secret: config.cryptoKey,
    store: new mongoStore({ url: config.mongodb.uri })
}));
*/
app.use(passport.initialize());
app.use(passport.session());
//app.use(csrf({ cookie: { signed: true } }));

//setup passport
require('./passport')(app, passport);

//setup routes
require('./routes')(app, passport);

/*
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
passport.use(new GoogleStrategy({
        returnURL: 'http://neuralquest.org/auth/google/return',
        realm: 'http://neuralquest.org/',
        passReqToCallback : true
    },
    function(req, identifier, profile, done) {
        credentials.validate(req, username, password).then(function(result){
            if (result.failed) return done(null, false);
            return done(null, username);
        },function(err){
            return done(err);
        });
        User.findOrCreate({ openId: identifier }, function(err, user) {
            done(err, user);
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

//listen up
/*
app.server.listen(app.config.port, function(){
    //and... we're live
    console.log('Server is running on port ' + config.port);
});*/
module.exports = app;
