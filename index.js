var colors = require('colors');
var request = require('request');
var chromecasts = require('chromecasts')();
var inquirer = require('inquirer');

if(!process.argv[2]) {
  console.log(
    'WARNING:'.red,
    'Please provide a valid Client-ID of a Imgur Applications',
    '(https://api.imgur.com/oauth2/addclient)'
  )
  return process.exit();
}

var options = {
  url: 'https://api.imgur.com/3/gallery/hot/viral/0.json',
  headers: {
    'Authorization': 'Client-ID ' + process.argv[2]
  }
};

var data;
var currentPlayer;
var recentVideoIndex = 0;

function exitHandler(options, err) {
  if (err) console.log(err.stack);
  if (options.exit) process.exit();

  if(!currentPlayer) return;
  currentPlayer.stop(function () {
    process.exit();
  });
}

process.on('exit', exitHandler.bind(null, { exit: true }));
process.on('SIGINT', exitHandler.bind(null, { exit: true }));
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));

function playNextVideo() {
  var video = getNextVideo();
  currentPlayer.play(video.mp4, video);
  console.log('PLAY:'.green, video.title);
}

function getNextVideo() {
  if(!data[recentVideoIndex]) {
    process.exit();
  }

  if(!data[recentVideoIndex].mp4) {
    recentVideoIndex++;
    return getNextVideo();
  } else {

    var video = {
      title: data[recentVideoIndex].title,
      type: 'video/mp4',
      mp4: data[recentVideoIndex].mp4
    };

    recentVideoIndex++;

    return video;
  }
}

function getFormattedPlayerList(players) {
  var arr = [];

  for (var i = 0; i < players.length; i++) {
    arr.push(players[i].name + ' (' + players[i].host + ')');
  }

  return arr;
}

function getPlayerByName(players, name) {
  for (var i = 0; i < players.length; i++) {
    if(players[i].name + ' (' + players[i].host + ')' === name) return players[i];
  }
}

chromecasts.on('update', function (player) {
  var players = chromecasts.players;
  var playerList = getFormattedPlayerList(players);

  inquirer.prompt([{
    type: 'list',
    name: 'player',
    message: 'Which player should be used?',
    choices: playerList
  }], function(answers) {
    currentPlayer = getPlayerByName(players, answers.player);

    request(options, function (error, response, body) {
      data = JSON.parse(body).data;
      playNextVideo();
    });

    player.on('status', function (status) {
      if(status.idleReason === 'FINISHED') {
        playNextVideo();
      }
    });
  });
});