var db = require('../db');
var all = require("promised-io/promise").all;
var Documents = require('./documents');
var bCrypt = require('bcrypt-nodejs');
var USERS_CLASS = "57343beb3c6d3cd598a5a2e7";


exports.validate = function(username, password) {
    return Documents.find({name: username, isActive:true, type:'object'}).then(function(usersArr) {
        //Get the parents to make sure they are of type Persons
        var promises = [];
        usersArr.forEach(function(user){
            promises.push(Assocs.findOne({source:user._id, type:'parent', dest:USERS_CLASS_TYPE}));
        });
        return all(promises).then(function(assocsArr){
            var numberFound = 0;
            var user = null;
            for(var i= 0; i<assocsArr.length;i++){
                var assoc = assocsArr[i];
                if(assoc){
                    numberFound++;
                    user = usersArr[i];
                }
            }
            if(numberFound == 0) return null;
            else if(numberFound > 1) throw (new Error("Duplicate user name found"));
            else if(!isValidPassword(password, user.password)) return null;
            else return user;
        });
    });
};
exports.signup = function(req){
    var body = req.body;
    //TODO validate password
    //TODO validate email
    return Documents.find({name: body.userId, docType:'object', parentId: USERS_CLASS}).then(function(usersArr) {
        if(usersArr.length == 1) return 'Sorry, the user name is already in use';
        else if(usersArr.length > 1) throw (new Error("Duplicate user name found"));
        else {
            var newUser = {
                name:body.userId,
                isActive:true,
                password:createHash(body.password),
                email:body.email, docType:'object',
                parentId: USERS_CLASS
            };
            return Documents.insert(newUser).then(function(results1){
                return('Success');
            });
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