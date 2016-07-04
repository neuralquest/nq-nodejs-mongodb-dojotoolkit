'use strict';
var postData = require('./postData');
var getData = require('./getData');
var consistency = require('./consistency');
var jstoxml = require('jstoxml');

exports = module.exports = function(app, passport) {
    app.get("/documents", function (req, res) {
        var itemsColl = req.db.collection('documents');
        itemsColl.find().toArray(function(err, itemsArr) {
            if(err) res.status(500).send(err);
            else res.json(itemsArr);
        });
    });
    app.post("/documents", function (req, res, next) {
        if(req.isAuthenticated()) {
            postData.update(req).then(function(items){
                res.json(items);
            }, function(err){
                next(err);
            });
        }
        else{
            var err = new Error('Must be signed in to update');
            err.status = 404;
            next(err);
        }
    });
    app.get("/consistency", function (req, res, next) {
        if(req.isAuthenticated()) {
            consistency.check().then(function(items){
                res.json(items);
            }, function(err){
                next(err);
            });
        }
        else{
            var err = new Error('Must be signed in for consistency check');
            err.status = 404;
            next(err);
        }
    });
    app.get("/file", function (req, res) {
        var pic_id = req.param('id');
        var gfs = req.gfs;
        gfs.files.find({filename: pic_id}).toArray(function (err, files) {
            if (err) {
                res.json(err);
            }
            if (files.length > 0) {
                var mime = 'image/jpeg';
                res.set('Content-Type', mime);
                var read_stream = gfs.createReadStream({filename: pic_id});
                read_stream.pipe(res);
            } else {
                res.json('File Not Found');
            }
        });
    });
    app.post("/upload", function (req, res) {
        var dirname = require('path').dirname(__dirname);
        var filename = req.files.file.name;
        var path = req.files.file.path;
        var type = req.files.file.mimetype;
        var read_stream =  fs.createReadStream(dirname + '/' + path);
        var conn = req.conn;
        var Grid = require('gridfs-stream');
        Grid.mongo = mongoose.mongo;
        var gfs = Grid(conn.db);
        var writestream = gfs.createWriteStream({
            filename: filename
        });
        read_stream.pipe(writestream);
    });
    app.post('/login',
        passport.authenticate('local'), function(req, res, next) {
            // If this function gets called, authentication was successful.
            var returnUser = {name: req.user.name, id: req.user._id};
            res.send(returnUser);
        });
    app.get('/logout', function(req, res) {
        req.logout();
        res.send({});
    });
    app.post('/signup', function(req, res, next) {
        var Users = require('./models/users');
        Users.signup(req).then(function (result) {//should be when
            if (typeof result === 'string') res.status(400).send(result);
            else{
                var user = result.ops[0];
                req.logIn(user, function(err) {
                    if (err) { return next(err); }
                    var returnUser = {name: req.user.name, id: req.user._id};
                    res.status(201).send(returnUser);
                });
            }
        }, function (err) {
            next(err);
        });
    });
    app.get('/hello', function(req, res) {
        var auth = req.isAuthenticated();
        if(auth) {
            var returnUser = {name: req.user.name, id: req.user._id};
            res.send(returnUser);
        }
        else res.send({});
    });
    app.get("/icons.css", function (req, res) {
        var itemsColl = req.db.collection('documents');
        itemsColl.find({"icon":{$ne:null}}).toArray(function(err, docArr) {
            if(err) res.status(500).send(err);
            else {
                var cssStr = "";
                docArr.forEach(function(doc){
                    cssStr += ".icon"+doc._id+" {width: 16px; height: 16px; background-position: center center; background: url('"+doc.icon+"');}\n";
                });
                res.set('Content-Type', 'text/css');
                res.send(cssStr);
            }
        });
    });
    app.get('/sitemap.xml', function(req, res) {
        var sitemapObj = jstoxml.toXML({
            _name: 'urlset',
            _attrs: {
                xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9"
            },
            _content: [
                {url: {
                    loc: 'http://neuralquest.org#.575d4c3f2cf3d6dc3ed83146...575d4c3f2cf3d6dc3ed83148.575d4c3f2cf3d6dc3ed83147..0'
                }},
                {url: {
                    loc: 'http://neuralquest.org#.575d4c3f2cf3d6dc3ed83146...575d4c3f2cf3d6dc3ed83148.575d4c3f2cf3d6dc3ed83147..0'
                }}
            ]
        }, {header: true, indent: '  '});
        var sitemapXml = jstoxml.toXML(sitemapObj, true, '  ');
        res.header('Content-Type', 'application/xml');
        res.send( sitemapXml );
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
                        res.cookie('username', req.user.username);

                        //res.redirect('/account/settings/');
                        //res.json({username:req.user.username});
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
