var unirest = require('unirest');
var mongoose = require('mongoose');
var config = require('./config');
var User = require('./models/user');
var waterfall = require('async-waterfall');

mongoose.connect(config.database);

var DEFAULT_TIMEOUT = 60;
var DEBUG = true;

var BOT_TOKEN = "497986204:AAGIqUnRtafwaM-5JliwWusNfHCrNICXYDI";
var BASE_URL = "https://api.telegram.org/bot" + BOT_TOKEN + "/";
var POLLING_URL = BASE_URL + "getUpdates?offset=:offset&timeout=" + DEFAULT_TIMEOUT; 
var SEND_MESSAGE_URL = BASE_URL + "sendMessage" 


var max_offset = 0; 

var questions = [
{
	q : "Birds can fly.",
	correct : true,
	answered_by : []
},
{
	q : "1 + 1 equals 3",
	correct : false,
	answered_by : []
},
{
	q : "Salapatov loves cognac",
	correct : true,
	answered_by : []
},
{
	q : "sanya dont have ps4",
	correct : true,
	answered_by : []
}
,
{
	q : "Danya didn't zapushil v pyatnicu",
	correct : true,
	answered_by : []
}
];

var active_questions = [];

poll(max_offset);

function poll(offset) {
	var url = POLLING_URL.replace(":offset", offset);

	if (DEBUG) console.log("Polling now.");

	unirest.get(url)
	.end(function(response) {
		if (DEBUG) console.log("Starting new request to " + url);

            var body = response.raw_body;
            if (response.status == 200) {

            	var jsonData = JSON.parse(body);
            	var result = jsonData.result;
            	if (DEBUG) console.log(JSON.stringify(result));

                if (result.length > 0) {
                	for (i in result) {
                    	if (runCommand(result[i].message)) continue;
                    }
                    max_offset = parseInt(result[result.length - 1].update_id) + 1;
                }
            }

            poll(max_offset);
        });
};

var getquestion = function(message) {
	var question = questions[randomInt(questions.length - 1)];
	
	var answer = {
		chat_id : message.chat.id,
		text : question.q,
		reply_markup : JSON.stringify({
			keyboard : [["/true", "/false"]],
			resize_keyboard : true,
			one_time_keyboard : true
		})
	};

	unirest.post(SEND_MESSAGE_URL)
	.send(answer)
	.end(function (response) {
	});

	active_questions[message.chat.id] = question;
}

var answerquestion = function(message) {
	var userid = message.chat.id;
	var player = message.from.username;
	var question = active_questions[userid];
	var answer = {};

	if (!question) return false;
	if (DEBUG) console.log ("User's answer: " + message.text);
	var useranswer = (message.text == "/true") ? true : false;
	if (useranswer == question.correct) {
		question.answered_by.push(userid);
		console.log(player);
		User.findOne({username: player}, function(err, user){
			if (err) console.log("ERROR FINDING USER");
			if (user) {
				user.score++;
				user.save();				
			}
			if (!user) {
				var user = new User();
				user.username = message.from.username;
				user.score = 1;
				user.save(function (err) {
					if (err) {
						console.log(err);
					}
				});
			}
		})
		answer = {
			chat_id : message.chat.id,
			text : "You were right!",
            reply_markup : JSON.stringify({
                hide_keyboard : true
            })
		};
	}
	else {
		answer = {
			chat_id : message.chat.id,
			text : "Sorry, your answer was wrong. Try again!"
		};
	}

	unirest.post(SEND_MESSAGE_URL)
	.send(answer)
	.end(function (response) {
	});

	active_questions[userid] = null;

	return true;
}

// Define available commands and map them to functions which should be executed
// Our bot would accept command "/get", "/true" and "/false"
var COMMANDS = {
	"get" : getquestion,
	"true" : answerquestion,
	"false" : answerquestion
};

function runCommand(message) {
	var msgtext = message.text;

    // Validate message text whether it actually is a command
    if (msgtext.indexOf("/") != 0) return false; // no slash at beginning? --> no command --> return

    // Only interpret the text after the preceeding slash and to the first blank space as command, i.e. extract "mycommand" out of "/mycommand First argument"
    var command = (msgtext.indexOf(" ") == -1) ? msgtext.substring(1, msgtext.length) : msgtext.substring(1, msgtext.indexOf(" "));
    if (DEBUG) console.log("command is " + command);

    // Check whether the command exists, i.e. we have a mapping for it
    if (COMMANDS[command] == null) return false; // not a valid command?

    // Actually run the corresponding function
    COMMANDS[command](message);
    return true;
}

// Returns a random integer between 0 and max
function randomInt(max) {
	return Math.round((Math.random() * max));
}