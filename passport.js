'use strict';
var Users = require('./models/users');
var Items = require('./models/items');
//var ObjectID = require('mongodb').ObjectID;

exports = module.exports = function(app, passport) {
    var LocalStrategy = require('passport-local').Strategy,
    //TwitterStrategy = require('passport-twitter').Strategy,
    //GitHubStrategy = require('passport-github').Strategy,
    //FacebookStrategy = require('passport-facebook').Strategy,
        GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
    //TumblrStrategy = require('passport-tumblr').Strategy;


    passport.use(new LocalStrategy(
        function(username, password, done) {
            Users.validate(username, password).then(function(user){
                if(!user) return done(null, false, { message: 'Invalid user name or password' });
                return done(null, user);
            },function(err){
                return done(err);
            });
        }
    ));

    if (app.config.oauth.twitter.key) {
        passport.use(new TwitterStrategy({
                consumerKey: app.config.oauth.twitter.key,
                consumerSecret: app.config.oauth.twitter.secret
            },
            function(token, tokenSecret, profile, done) {
                done(null, false, {
                    token: token,
                    tokenSecret: tokenSecret,
                    profile: profile
                });
            }
        ));
    }

    if (app.config.oauth.github.key) {
        passport.use(new GitHubStrategy({
                clientID: app.config.oauth.github.key,
                clientSecret: app.config.oauth.github.secret,
                customHeaders: { "User-Agent": app.config.projectName }
            },
            function(accessToken, refreshToken, profile, done) {
                done(null, false, {
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    profile: profile
                });
            }
        ));
    }

    if (app.config.oauth.facebook.key) {
        passport.use(new FacebookStrategy({
                clientID: app.config.oauth.facebook.key,
                clientSecret: app.config.oauth.facebook.secret
            },
            function(accessToken, refreshToken, profile, done) {
                done(null, false, {
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    profile: profile
                });
            }
        ));
    }

    if (app.config.oauth.google.key) {
        passport.use(new GoogleStrategy({
                clientID: app.config.oauth.google.key,
                clientSecret: app.config.oauth.google.secret
            },
            function(accessToken, refreshToken, profile, done) {
                done(null, false, {
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    profile: profile
                });
            }
        ));
    }

    if (app.config.oauth.tumblr.key) {
        passport.use(new TumblrStrategy({
                consumerKey: app.config.oauth.tumblr.key,
                consumerSecret: app.config.oauth.tumblr.secret
            },
            function(token, tokenSecret, profile, done) {
                done(null, false, {
                    token: token,
                    tokenSecret: tokenSecret,
                    profile: profile
                });
            }
        ));
    }

    passport.serializeUser(function(user, done) {
        done(null, user._id);
    });

    passport.deserializeUser(function(id, done) {
        Items.findById(id).then(function(user) {
            done(null, user);
        },function(err){
            done(err, user)
        });
    });
};
