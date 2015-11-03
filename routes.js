'use strict';
var postData = require('./postData');
var getData = require('./getData');
var consistency = require('./consistency');

exports = module.exports = function(app, passport) {


    app.get("/data", function (req, res, next) {
        getData.get().then(function(items){
            res.json(items);
        }, function(err){
            next(err);
        });
    });
    app.post("/data", function (req, res, next) {
        postData.update(req.body).then(function(items){
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
        consistency.check().then(function(items){
            res.json(items);
        }, function(err){
            next(err);
        });
    });

    app.post('/login',
        passport.authenticate('local'),
        function(req, res) {
            // If this function gets called, authentication was successful.
            res.json({username: req.user.username});
        });
    app.get('/logout', function(req, res) {
        req.logout();
        res.json({username:null});
    });
    app.post('/signup', function(req, res, next) {
        var Users = require('./models/users');
        Users.signup(req).then(function (result) {
            if(result.failed) res.json(result);
            else{
                req._passport.instance.authenticate('local', function(err, user, info) {
                    // If this function gets called, authentication was successful.
                    if (err) { return next(err) }
                    req.logIn(user, function(err) {
                        if (err) { return next(err); }
                        res.json({username: req.user.username});
                    });
                })(req, res, next);
            }
        }, function (err) {
            next(err);
        });
    });


    app.get('/login/google',
        passport.authenticate('google',{
            callbackURL: '/account/settings/google/callback/',
            scope: ['profile email']
        }));
    app.get('/account/settings/google/callback/', function(req, res) {
        req._passport.instance.authenticate('google', { callbackURL: '/account/settings/google/callback/' }, function(err, user, info) {
            if (!info || !info.profile) {
                return res.redirect('/account/settings/');
            }

            User.findOne({ 'google.id': info.profile.id, _id: { $ne: req.user.id } }, function(err, user) {
                if (err) {
                    return next(err);
                }

                if (user) {
                    renderSettings(req, res, next, 'Another user has already connected with that Google account.');
                }
                else {
                    req.app.db.models.User.findByIdAndUpdate(req.user.id, { 'google.id': info.profile.id }, function(err, user) {
                        if (err) {
                            return next(err);
                        }

                        //res.redirect('/account/settings/');
                        res.json({username:req.user.username});
                    });
                }
            });
        })(req, res, next);
        // If this function gets called, authentication was successful.

    });
    app.get('/auth/google/disconnect/', function(req, res) {
        req.logout();
        res.json({username:null});
    });




};
