'use strict';
var postData = require('./postData');
var getData = require('./getData');
var consistency = require('./consistency');

exports = module.exports = function(app, passport) {


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
        var Users = require('./models/users');
        Users.signup(req).then(function (result) {
            if(result.failed) res.json(result);
            //else res.redirect('/login');
            else{
                var _req = req;
                passport.authenticate('local'), function(err, user) {
                    if (err) { return next(err) }
                    // If this function gets called, authentication was successful.
                    //req.session.user = req.user.username;
                    res.json({username: _req.user.username});
                };
            }
        }, function (err) {
            next(err);
        });
    });
    app.post('/login',
        passport.authenticate('local'),
        function(req, res) {
            // If this function gets called, authentication was successful.
            //req.session.user = req.user.username;
            res.json({username: req.user.username});
        });
    app.get('/login',
        passport.authenticate('local'),
        function(req, res) {
            // If this function gets called, authentication was successful.
            res.json({username: req.user.username});
        });
    app.get('/logout', function(req, res) {
        req.logout();
        res.json({username:null});
    });


    app.get('/auth/twitter', passport.authenticate('twitter'));
    app.get('/auth/twitter/return',
        passport.authenticate('twitter'),
        function(req, res) {
            // If this function gets called, authentication was successful.
            res.json({username:req.user});
        });
    app.get('/auth/twitter/disconnect');

    app.get('/auth/github', passport.authenticate('github'));
    app.get('/auth/github/return',
        passport.authenticate('github'),
        function(req, res) {
            // If this function gets called, authentication was successful.
            res.json({username:req.user});
        });
    app.get('/auth/github/disconnect');

    app.get('/auth/facebook', passport.authenticate('facebook'));
    app.get('/auth/facebook/return',
        passport.authenticate('facebook'),
        function(req, res) {
            // If this function gets called, authentication was successful.
            res.json({username:req.user});
        });
    app.get('/auth/facebook/disconnect');

    app.get('/auth/google', passport.authenticate('google'));
    app.get('/auth/google/return',
        passport.authenticate('google'),
        function(req, res) {
            // If this function gets called, authentication was successful.
            res.json({username:req.user});
        });
    app.get('/auth/google/disconnect');

    app.get('/auth/tumblr', passport.authenticate('tumblr'));
    app.get('/auth/tumblr/return',
        passport.authenticate('tumblr'),
        function(req, res) {
            // If this function gets called, authentication was successful.
            res.json({username:req.user});
        });
    app.get('/auth/tumblr/disconnect');


};
