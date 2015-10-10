/*
* Copyright (c) 2011 Google Inc.
*
* Licensed under the Apache License, Version 2.0 (the "License"); you may not
* use this file except in compliance with the License. You may obtain a copy of
* the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
* WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
* License for the specific language governing permissions and limitations under
* the License.
*/
var serverPath = '//resistence-1094.appspot.com/';

var participants_list = [];
var currentIteration = 0;
var roles = ['Bad', 'Good', 'Good', 'Bad', 'Good', 'Good'];

var Participant = function(id, displayName) {
  this.id = id;
  this.displayName = displayName;
  this.role = null;
}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex ;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function advanceLeader() {
  var ids = participants_list.sort(function(a, b) {
    if (a.id > b.id) {
      return 1;
    } else if (a.id < b.id) {
      return -1;
    } else {
      return 0;
    }
  });
  console.log("ids", ids);
  var leader_index = currentIteration % ids.length;

  gapi.hangout.data.submitDelta({'leader': ids[leader_index].id});
  currentIteration += 1;
}

function assignRoles() {
  // master assigns roles
  var participants = shuffle(participants_list);
  for (var i = 0; i < participants.length; i++) {
    participants[i].role = roles[i];
    console.log('finished role');
  }

  gapi.hangout.data.submitDelta({'state': 'Assigned Roles'});
  gapi.hangout.data.submitDelta({'participants': JSON.stringify(participants_list)});

  advanceLeader();
}

function updateTeam() {
  // update who's going on the mission

  gapi.hangout.data.submitDelta({'state': 'Voting'});
}

function calculateTeamVote() {
  // calculte votes and send it to frondend

  gapi.hangout.data.submitDelta({'state': 'Display Voting Result'});

}

function postTeamVoting() {
  // if more than 50% vote for mission
  gapi.hangout.data.submitDelta({'state': 'Mission'});

  // else
  // advance leader
  gapi.hangout.data.submitDelta({'state': 'Choosing Team'});
}

function calculateMissionVote() {
  // fail or succeed a mission
  // update score

  gapi.hangout.data.submitDelta({'state': 'Mission Result'});
}

function advanceMission() {
  // change the leader
  // advance to next mission

  // if < 3 wins/losses
  gapi.hangout.data.submitDelta({'state': 'Choosing Team'});

  // else
  submitDelta({'state': 'End Game'});
}

function setUpDivForIndexInParticipants(element, participant_index) {
  participant_data = participants_list[participant_index]
  element.data("player", participant_data.id);
  setText(element.find("#name"), participant_data.displayName);
}

var forbiddenCharacters = /[^a-zA-Z!0-9_\- ]/;
function setText(element, text) {
  element.innerHTML = typeof text === 'string' ?
      text.replace(forbiddenCharacters, '') :
      '';
}

function updateStateUi(state) {
  var currentState = state['state'];
  var id = gapi.hangout.getLocalParticipantId();
  var masterId = gapi.hangout.data.getState()['master']

  if (currentState == 'Not Started') {
    $('#game_setup_top').show();
    $('#game_start').show();
    $('#game_information').hide();
    $('#game_board').hide();
    
    if (id == masterId) {
      $('#start_game_button').show();
    } else {
      $('#start_game_button').hide();
      for (var i = 0; i < participants_list.length; i++) {
        if (participants_list[i].id == masterId) {
          $('#non_master_text').innerText = "Waiting for " + participants_list[i].displayName + " to start the game";
        }
      }
    }
  } else {
    $('#game_setup_top').hide();
    $('#game_start').hide();
    $('#game_information').show();
    $('#game_board').show();

    $('#mission').hide();
    $('#voteParticipants').hide();
    $('#leader').hide()

    var id = gapi.hangout.getLocalParticipantId();

    if (currentState == 'Assigned Roles') {
      participants_list = JSON.parse(gapi.hangout.data.getState()['participants'])
      console.log("parsed", participants_list);
      
      var roleElement = document.getElementById('role');
      var myIndex;
      for (var i = 0; i < participants_list.length; i++) {
        if (id == participants_list[i].id) {
          setText(roleElement, participants_list[i].role);
          myIndex = i;
        }
      }

      for (var i = 0; i < participants_list.length; i++) {
        setUpDivForPlayer($('.player-' + i.toString()), (myIndex + i) % participants_list.length);
      }

      gapi.hangout.data.submitDelta({'state': 'Choosing Team'});
    } else if (currentState == 'Choosing Team') {
      // display the leader and hide all other crowns

      var leaderId = gapi.hangout.data.getState()['leader'];
      $('.crown').hide()
      $("[data-player='" + leaderId + "']").find('.crown').show();

      if (id == gapi.hangout.data.getState()['leader']) {
        $('.check').show();
        $('#leader').show();
      } else {
        $('.check').hide();
      }
    } else if (currentState == 'Voting') {
      // show yes/no 
    } else if (currentState == 'Display Voting Result') {
      // show div to display result
    } else if (currentState == 'Mission') {
      // if on mission, see voting for mission
      // else see nothing
    } else if (currentState == 'Mission Result') {
      // show div displaying mission result
    } else if (currentState == 'End Game') {
      // show who won
    } else {
      // There shouldn't be any thing here
      console.log("Wrong state", currentState);
    }
  }
}

function updateParticipants(participants) {
  console.log("updating");
  var new_participants = [];
  for (var i = 0; i < participants.length; i++) {
    var id = participants[i]['id'];
    var displayName = participants[i]['person']['displayName'];
    var participant = new Participant(id, displayName);
    if (i == 0) {
       gapi.hangout.data.submitDelta({'master': id});
    }
    new_participants.push(participant);
  }
  participants_list = new_participants;
  console.log("participants", participants_list);

  var participantsListElement = document.getElementById('participants');
  setText(participantsListElement, participants.length.toString())

  // handle when someone leaves hangout
}

// A function to be run at app initialization time which registers our callbacks
function init() {
  console.log('Init app.');

  var apiReady = function(eventObj) {
    if (eventObj.isApiReady) {
      console.log('API is ready');

      gapi.hangout.data.submitDelta({'state': '' + 'Not Started'});

      gapi.hangout.data.onStateChanged.add(function(eventObj) {
        updateStateUi(eventObj.state);
      });
      gapi.hangout.onParticipantsChanged.add(function(eventObj) {
        updateParticipants(eventObj.participants);
      });

      updateStateUi(gapi.hangout.data.getState());
      updateParticipants(gapi.hangout.getParticipants());

      gapi.hangout.onApiReady.remove(apiReady);
    }
  };

  // This application is pretty simple, but use this special api ready state
  // event if you would like to any more complex app setup.
  gapi.hangout.onApiReady.add(apiReady);
}

gadgets.util.registerOnLoadHandler(init);

$(document).ready(function() {
  $('#start_game_button').click(assignRoles);
})
