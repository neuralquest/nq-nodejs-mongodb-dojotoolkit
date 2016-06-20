var db = require('../db');
var all = require("promised-io/promise").all;
var Documents = require('./documents');
var bCrypt = require('bcrypt-nodejs');
var USERS_CLASS = "57343beb3c6d3cd598a5a2e7";


exports.validate = function(username, password) {
    return Documents.find({name: username, isActive:true, docType:'object', parentId: USERS_CLASS}).then(function(usersArr) {
        if(usersArr.length == 0) return null;
        else if(usersArr.length > 1) throw (new Error("Duplicate user name found"));
        else if(!isValidPassword(password, usersArr[0].password)) return null;
        else return usersArr[0];
    });
};
exports.signup = function(req){
    var body = req.body;
    //TODO validate password
    //TODO validate email
    return Documents.find({name: body.username, docType:'object', parentId: USERS_CLASS}).then(function(usersArr) {
        if(usersArr.length == 1) return 'Sorry, the user id is already in use';
        else if(usersArr.length > 1) throw (new Error("Duplicate user name found"));
        else {
            var newUser = {
                name:body.username,
                isActive:true,
                password:createHash(body.password),
                email:body.email,
                docType:'object',
                parentId: USERS_CLASS
            };
            return Documents.insert(newUser);
        }
    });
};
var isValidPassword = function(password, passwordHash){
    return bCrypt.compareSync(password, passwordHash);
};
// Generates hash using bCrypt
var createHash = function(password){
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};