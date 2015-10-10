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
var roles = ['Good', 'Good', 'Good', 'Good', 'Bad', 'Bad'];

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
  var ids = Object.keys(participants_dict).sort();
  var leader_index = ids[currentIteration % ids.length];

  currentIteration += 1;
  gapi.hangout.data.submitDelta({'leader': ids[leader_index]});
}

function assignRoles() {
  // master assigns roles
  var participants = shuffle(participants_list);
  for (var i = 0; i < participants.length; i++) {
    participants[i].role = roles[i];
    gapi.hangout.data.submitDelta({'state': 'Assigned Roles'});
    console.log('finished role');
  }
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

  gapi.hangout.data.submitDelta({'state': 'Display Mission Result'});
}

function advanceMission() {
  // change the leader
  // advance to next mission

  gapi.hangout.data.submitDelta({'state': 'Choosing Team'});
}

var forbiddenCharacters = /[^a-zA-Z!0-9_\- ]/;
function setText(element, text) {
  element.innerHTML = typeof text === 'string' ?
      text.replace(forbiddenCharacters, '') :
      '';
}

function updateStateUi(state) {
  var currentState = state['state'];
  if (currentState == 'Not Started') {
    $('#game_setup_image').show();
    var id = gapi.hangout.getLocalParticipantId();
    if (id == gapi.hangout.data.getState()['master']) {
      $('#game_start').show();
    } else {
      $('#game_start').hide();
    }
    $('#game_information').hide();
    $('#game_board').hide();
  } else {
    $('#game_setup_image').hide();
    $('#game_start').hide();
    $('#game_information').show();
    $('#game_board').show();

    if (currentState == 'Asssigned Roles') {
      var id = gapi.hangout.getLocalParticipantId();
      var roleElement = document.getElementById('role');
      for (var i = 0; i < participants_list.length; i++) {
        if (id == participants_list[i].id) {
          console.log('setting role', participants_list[i].role)
          setText(roleElement, participants_list[i].role);
        }
      }
      gapi.hangout.data.submitDelta({'state': 'Choosing Team'});
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
