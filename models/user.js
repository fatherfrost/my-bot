var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var User = new Schema({
  username: String,
  score: Number
});

module.exports =  mongoose.model('User', User)