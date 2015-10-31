var dbAccessors = require('./dbAccessors');
var bCrypt = require('bcrypt-nodejs');

function validate(req, userName, password){
    var usersColl = req.db.collection('users');
    return dbAccessors.find({username: userName}, usersColl).then(function(usersArr){
        if(usersArr.length == 0) return {failed:{reason:'Invalid user name and or password'}};
        else if (usersArr.length == 1) {
            var user = usersArr[0];
            if(!isValidPassword(user, password)) return {failed:{reason:'Invalid user name and or password'}};
            else return {success: userName};
        }
        else throw (new Error("Duplicate username in users collection"));
    });
}
function signup(req){
    var body = req.body;
    var usersColl = req.db.collection('users');
    return dbAccessors.find({username: body.username}, usersColl).then(function(usersArr){
        if(usersArr.length == 0) {
            //TODO validate password
            //TODO validate email
            var newUser = {username:body.username, password:createHash(body.password), email:body.email};
            return dbAccessors.insert(user, newUser).then(function(result){
                return {success: userName};
            });
        }
        else return {failed:{reason:'Sorry, the user name is already in use'}};
    });
}
var isValidPassword = function(user, password){
    return bCrypt.compareSync(password, user.password);
};
// Generates hash using bCrypt
var createHash = function(password){
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};
module.exports.validate = validate;
module.exports.signup = signup;