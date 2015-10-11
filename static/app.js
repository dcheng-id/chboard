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
var roles = ['Spy', 'Resistance Member', 'Resistance Member', 'Spy', 'Resistance Member', 'Resistance Member', 'Spy', 'Resistance Member', 'Resistance Member', 'Spy'];

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

function voteDown() {
  var id = gapi.hangout.getLocalParticipantId();
  var voteDict = JSON.parse(gapi.hangout.data.getState()['voteDict']);
  voteDict['downVote'].push(id);
  gapi.hangout.data.submitDelta({'voteDict': JSON.stringify(voteDict)});
}

function voteUp() {
  var id = gapi.hangout.getLocalParticipantId();
  var voteDict = JSON.parse(gapi.hangout.data.getState()['voteDict']);
  voteDict['upVote'].push(id);
  gapi.hangout.data.submitDelta({'voteDict': JSON.stringify(voteDict)});
}

function failMission() {
  var id = gapi.hangout.getLocalParticipantId();
  var missionDict = JSON.parse(gapi.hangout.data.getState()['missionDict']);
  missionDict['failure'].push(id);
  gapi.hangout.data.submitDelta({'missionDict': JSON.stringify(missionDict)});
}

function passMission() {
  var id = gapi.hangout.getLocalParticipantId();
  var missionDict = JSON.parse(gapi.hangout.data.getState()['missionDict']);
  missionDict['success'].push(id);
  gapi.hangout.data.submitDelta({'missionDict': JSON.stringify(missionDict)});
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

  console.log("LEADER: ", ids[leader_index]);

  gapi.hangout.data.submitDelta({'leader': ids[leader_index].id, 'state': 'Choosing Team'});
  currentIteration += 1;
}

function assignRoles() {
  // master assigns roles
  var participants = shuffle(participants_list);
  for (var i = 0; i < participants.length; i++) {
    participants[i].role = roles[i];
  }

  gapi.hangout.data.submitDelta({'state': 'Assigned Roles', 'participants': JSON.stringify(participants_list), 'failuresEachRound': JSON.stringify([])});
}

function updateTeam() {
  // update who's going on the mission
  // Since this will enter us into voting need to submit
  // deltas to initialize voting arrays
  var voteDict = { "downVote": [], "upVote": [] };
  var missionDict = { "success": [], "failure": [] };
  var proposedTeam = []

  $("input:checkbox:checked").each(function(){
    proposedTeam.push($(this).parent('div').attr('player'));
  });

  gapi.hangout.data.submitDelta({'voteDict': JSON.stringify(voteDict), 'missionDict': JSON.stringify(missionDict), 'state': 'Voting', 'proposedTeam': JSON.stringify(proposedTeam)});
}

function calculateTeamVote() {
  // calculte votes and send it to frondend
  var id = gapi.hangout.getLocalParticipantId();
  var masterId = gapi.hangout.data.getState()['master'];
  if (id == masterId) {
    var voteDict = JSON.parse(gapi.hangout.data.getState()['voteDict']);
    if (voteDict['downVote'].length + voteDict['upVote'].length == participants_list.length) {
      gapi.hangout.data.submitDelta({'state': 'Display Voting Result'});
    }
  }
  
}

function postTeamVoting() {
  // if more than 50% vote for mission
  $('#votingResult').hide();
  var id = gapi.hangout.getLocalParticipantId();
  var masterId = gapi.hangout.data.getState()['master'];
  if (id == masterId) {
    var voteDict = JSON.parse(gapi.hangout.data.getState()['voteDict']);
    if (voteDict['upVote'].length > voteDict['downVote'].length) {
      gapi.hangout.data.submitDelta({'state': 'Mission'});
    } else {
      advanceLeader();
    }
  }
}

function calculateMissionVote() {
  // fail or succeed a mission
  // update score
  var id = gapi.hangout.getLocalParticipantId();
  var masterId = gapi.hangout.data.getState()['master'];
  if (id == masterId) {
    var proposedTeam = JSON.parse(gapi.hangout.data.getState()['proposedTeam']);
    var missionDict = JSON.parse(gapi.hangout.data.getState()['missionDict']);
    var failuresEachRound = JSON.parse(gapi.hangout.data.getState()['failuresEachRound']);
    if (missionDict['failure'].length + missionDict["success"].length == proposedTeam.length) {
      failuresEachRound.push(missionDict['failure'].length)
      gapi.hangout.data.submitDelta({'state': 'Mission Result', 'failuresEachRound': JSON.stringify(failuresEachRound)});
    }
  }
}

function advanceMission() {
  $('#missionResult').hide();
  if (isMaster()) {
    // change the leader
    // advance to next mission

    // if < 3 wins/losses
    var failuresEachRound = JSON.parse(gapi.hangout.data.getState()['failuresEachRound']);
    var fail = numberOfFailedRounds(failuresEachRound);
    var pass = failuresEachRound.length - fail;

    if (fail < 3 && pass < 3) {
      advanceLeader();
    } else {
      gapi.hangout.data.submitDelta({'state': 'End Game'});
    }
  }
}

function numberOfFailedRounds(failuresEachRound) {
  var fail = 0;
  var pass = 0;

  for (var i = 0; i < failuresEachRound.length; i++) {
    if (failuresEachRound[i] == 0 || (failuresEachRound[i] == 1 && participants_list.length > 6 && i == 3)) {
      pass += 1;
    } else {
      fail += 1;
    }
  }

  return fail;
}

function isMaster() {
  var id = gapi.hangout.getLocalParticipantId();
  var masterId = gapi.hangout.data.getState()['master'];
  return id == masterId;
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
  var masterId = gapi.hangout.data.getState()['master'];

  if (currentState == 'Not Started') {
    $('#initial_game_state').show();
    $('#control_panel').hide();
    $('#game_board').hide();
    $('#game_information').hide();
    
    if (id == masterId) {
      $('#start_game_button').show();
    } else {
      $('#start_game_button').hide();
      for (var i = 0; i < participants_list.length; i++) {
        if (participants_list[i].id == masterId) {
          var nonMasterTextElement = document.getElementById('non_master_text');
          setText(nonMasterTextElement, "Waiting for " + participants_list[i].displayName + " to start the game");
        }
      }
    }                   
  } else {
    $('#initial_game_state').hide();
    $('#control_panel').show();
    $('#game_board').show();
    $('#game_information').show();
    $('#mission').hide();
    $('#voteParticipants').hide();
    $('#leader').hide();
    $('#missionResult').hide();
    $('.shield').hide();
    $('.check').hide()

    if (currentState == 'Assigned Roles') {
      participants_list = JSON.parse(gapi.hangout.data.getState()['participants'])
      console.log("parsed", participants_list);

      var sorted_participants = participants_list.sort(function(a, b) {
        if (a.id > b.id) {
          return 1;
        } else if (a.id < b.id) {
          return -1;
        } else {
          return 0;
        }
      });
      
      var roleElement = document.getElementById('role');
      var myIndex;
      for (var i = 0; i < participants_list.length; i++) {
        if (id == sorted_participants[i].id) {
          setText(roleElement, sorted_participants[i].role);
          myIndex = i;
        }
      }

      var flavorText = "";
      if (participants_list[myIndex].role == "Spy" && participants_list.length > 3) {
        flavorText = "Your teammates are: ";
        for (var j = 0; j < participants.length; j++) {
          if (j != i && participants[j].role == "Spy") {
            flavorText = flavorText + participants[j].displayName + " ";
          }
        }
      } else if (participants_list[myIndex].role != "Spy") {
        flavorText = "You are blinded by the light."
      }
      var flavor = document.getElementById('flavor');

      setText(flavor, flavorText);

      if (isMaster()) {
        advanceLeader();
      };
    } else if (currentState == 'Choosing Team') {
      // display the leader and hide all other crowns

      var leaderId = gapi.hangout.data.getState()['leader'];
      $('.crown').hide();
      console.log("leaderFind, ", $("[player='" + leaderId + "']"));
      console.log(leaderId);
      $("[player='" + leaderId + "']").find('.crown').show();

      if (id == gapi.hangout.data.getState()['leader']) {
        $('.check').show();
        $('#leader').show();
      }
    } else if (currentState == 'Voting') {
      var proposedTeam = JSON.parse(gapi.hangout.data.getState()['proposedTeam']);
      for (var i = 0; i < proposedTeam.length; i++) {
        $("[player='" + proposedTeam[i] + "']").find('.shield').show();
      }
      
      var voteDict = JSON.parse(gapi.hangout.data.getState()['voteDict']);
      if (voteDict['downVote'].indexOf(id) == -1 && voteDict['upVote'].indexOf(id) == -1) {
        $('#voteParticipants').show();
      } else {
        $('#voteParticipants').hide();
      }

      calculateTeamVote();
    } else if (currentState == 'Display Voting Result') {
      // show div to display result
      $('#votingResult').show();
      var voteDict = JSON.parse(gapi.hangout.data.getState()['voteDict']);
      var yesList = [];
      var noList = [];
      for (var i = 0; i < participants_list.length; i++) {
        if (voteDict['upVote'].indexOf(participants_list[i].id) != -1) {
          yesList.push(participants_list[i].displayName);
        }
        if (voteDict['downVote'].indexOf(participants_list[i].id) != -1) {
          noList.push(participants_list[i].displayName);
        }
      }

      var resultElement = document.getElementById('result');

      $('#yes').html(yesList.join('<br>'));
      $('#no').html(noList.join('<br>'));

      if (yesList.length > noList.length) {
        setText(resultElement, "Team Approved");
      } else {
        setText(resultElement, "Team Rejected");
      }
    } else if (currentState == 'Mission') {
      // if on mission, see voting for mission
      // else see nothing
      var proposedTeam = JSON.parse(gapi.hangout.data.getState()['proposedTeam']);
      for (var i = 0; i < proposedTeam.length; i++) {
        if (id == proposedTeam[i]) {
          var missionDict = JSON.parse(gapi.hangout.data.getState()['missionDict']);
          if (missionDict['success'].indexOf(id) == -1 && missionDict['failure'].indexOf(id) == -1) {
            $('#mission').show();
          } else {
            $('#mission').hide();
          }
        }
      }
      calculateMissionVote();
    } else if (currentState == 'Mission Result') {
      // show div displaying mission result
      var failuresEachRound = JSON.parse(gapi.hangout.data.getState()['failuresEachRound']);
      $('#missionResult').show();
      $('#number_fails').html("Number of fails: " + failuresEachRound[failuresEachRound.length - 1].toString());

      for (var i = 0; i < failuresEachRound.length; i++) {
        $('#circle-' + (i + 1).toString()).css('display', 'block');
        if (failuresEachRound[i] == 0 || (failuresEachRound[i] == 1 && participants_list.length > 6 && i == 3)) {
          $('#circle-' + (i + 1).toString()).css('background-color', 'blue');
        } else {
          $('#circle-' + (i + 1).toString()).css('background-color', 'red');
        }
      }
    } else if (currentState == 'End Game') {
      // show who won
      $('#end_game_state').show();
      var gameResultElement = document.getElementById('game_result');
      console.log("ITS OVER");
      var failuresEachRound = JSON.parse(gapi.hangout.data.getState()['failuresEachRound']);
      var fail = numberOfFailedRounds(failuresEachRound);
      var pass = failuresEachRound.length - fail;
      window.alert("FAILS: " + fail.toString() + ", " + "SUCCESS: " + pass.toString())
    } else {
      // There shouldn't be any thing here
      console.log("Wrong state", currentState);
    }
  }
}

function updateParticipants(participants) {
  var new_participants = [];
  for (var i = 0; i < participants.length; i++) {
    var id = participants[i]['id'];
    var displayName = participants[i]['person']['displayName'];
    var participant = new Participant(id, displayName);
    if (i === 0) {
       gapi.hangout.data.submitDelta({'master': id});
    }
    new_participants.push(participant);
  }
  participants_list = new_participants;

  var participantsListElement = document.getElementById('participants');
  setText(participantsListElement, participants.length.toString())

  var playersElement = document.getElementById('players_wrapper');
  var selfElement = document.getElementById('self');
  playersElement.innerHTML = "";
  selfElement.innerHTML = "";

  for (var i = 0; i < participants_list.length; i++) {
    var div = document.createElement('div');
    div.className = ".col-md-4";
    $(div).attr('player', participants_list[i].id);

    var name = document.createElement('p');
    name.className = "name";
    name.innerHTML = participants_list[i].displayName;
    div.appendChild(name);

    var crown = document.createElement('img');
    crown.className = "crown";
    div.appendChild(crown);

    var shield = document.createElement('img');
    shield.className = "shield";
    div.appendChild(shield);

    var checkbox = document.createElement('input');
    checkbox.type = "checkbox";
    checkbox.className = "check";
    div.appendChild(checkbox);

    if (participants[i].id == gapi.hangout.getLocalParticipantId()) {
      selfElement.appendChild(div);
    } else {
      playersElement.appendChild(div);
    }
  }

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
  $('#confirm_voting_result_button').click(postTeamVoting);
  $('#acceptButton').click(voteUp);
  $('#rejectButton').click(voteDown);
  $('#confirmTeam').click(updateTeam);
  $('#confirm_mission_result_button').click(advanceMission);
  $('#missionFail').click(failMission);
  $('#missionPass').click(passMission);
})
