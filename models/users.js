var db = require('../db');
var all = require("promised-io/promise").all;
var Items = require('./items');
var Assocs = require('./assocs');
var bCrypt = require('bcrypt-nodejs');

exports.validate = function(username, password) {
    return Items.find({name: username, isActive:true, type:'object'}).then(function(usersArr) {
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
    return Items.find({name: body.username, type:'object'}).then(function(usersArr) {
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
            if(numberFound == 1) return {failed:{reason:'Sorry, the user name is already in use'}};
            else if(numberFound > 1) throw (new Error("Duplicate user name found"));
            else {
                return Items.getNextSequence('itemsColl').then(function(newId){
                    var newUser = {_id: newId, name:body.username, isActive:true, password:createHash(body.password), email:body.email, type:'object'};
                    return Items.insert(newUser).then(function(results1){
                        //Add association to class: Persons
                        var newAssoc = {source:newId, type:'parent', dest:USERS_CLASS_TYPE};
                        return Assocs.insert(newAssoc).then(function(results2){
                            return({success: body.username});
                        });
                    });
                });
            }
        });
    });
};
var isValidPassword = function(password, passwordHash){
    return bCrypt.compareSync(password, passwordHash);
};
// Generates hash using bCrypt
var createHash = function(password){
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};