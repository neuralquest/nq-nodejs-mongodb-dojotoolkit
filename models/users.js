var db = require('../db');
var Deferred = require("promised-io/promise").Deferred;
var bCrypt = require('bcrypt-nodejs');

exports.findOne = function(query){
    var deferred = new Deferred();
    var collection = db.get().collection('users');
    collection.find(query).toArray(function(err, usersArr) {
        if (err) deferred.reject(err);
        else {
            if(!usersArr || usersArr.length == 0) deferred.resolve(null);
            else if(usersArr.length == 1) deferred.resolve(usersArr[0]);
            else throw (new Error("Duplicate found in collection"));
        }
    });
    return deferred.promise;
};
/*
exports.validate = function(query){
    var deferred = new Deferred();
    var collection = db.get().collection('users');
    collection.find(query).toArray(function(err, usersArr) {
        if (err) deferred.reject(err);
        else {
            if(usersArr.length == 0) deferred.resolve({failed:{reason:'Invalid user name and or password'}});
            else if (usersArr.length == 1) {
                var user = usersArr[0];
                if(!isValidPassword(user, password)) deferred.resolve({failed:{reason:'Invalid user name and or password'}});
                else deferred.resolve({success: userName});
            }
            else throw (new Error("Duplicate username in users collection"));
        }
    });
    return deferred.promise;
};*/
exports.signup = function(req){
    var deferred = new Deferred();
    var collection = db.get().collection('users');
    var body = req.body;
    collection.find({username: body.username}).toArray(function(err, usersArr) {
        if (err) deferred.reject(err);
        else if(usersArr.length == 0) {
            //TODO validate password
            //TODO validate email
            var newUser = {username:body.username, isActive:'yes', password:createHash(body.password), email:body.email};
            collection.insert([newUser],{},
                function(err, value) {
                    if (err) deferred.reject(err);
                    else deferred.resolve({success: body.username});
                });
        }
        else deferred.resolve({failed:{reason:'Sorry, the user name is already in use'}});
    });
    return deferred.promise;
};
exports.isValidPassword = function(password, passwordHash){
    return bCrypt.compareSync(password, passwordHash);
};
// Generates hash using bCrypt
var createHash = function(password){
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};
