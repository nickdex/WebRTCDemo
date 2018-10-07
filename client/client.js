var localVideo;
var localStream;
var peerConnection;
var uuid;
var serverConnection;

var peerConnectionConfig = {
  iceServers: [
    { urls: 'stun:stun.stunprotocol.org:3478' },
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

function pageReady() {
  uuid = createUUID();

  localVideo = document.getElementById('localVideo');

  serverConnection = new WebSocket('wss://' + '192.168.0.123' + ':8443');
  serverConnection.onmessage = gotMessageFromServer;

  var constraints = {
    video: true
    //    audio: true,
  };

  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(getUserMediaSuccess)
      .catch(errorHandler);
  } else {
    alert('Your browser does not support getUserMedia API');
  }
}

function getUserMediaSuccess(stream) {
  localStream = stream;
  localVideo.srcObject = stream;
}

function start() {
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  peerConnection.onicecandidate = gotIceCandidate;
  peerConnection.addStream(localStream);
  peerConnection
    .createOffer()
    .then(createdDescription)
    .catch(errorHandler);
}

function gotIceCandidate(event) {
  if (event.candidate != null) {
    serverConnection.send(JSON.stringify({ ice: event.candidate, uuid: uuid }));
  }
}

function gotRemoteStream(event) {
  console.log('got remote stream');
  remoteVideo.srcObject = event.streams[0];
}

function createdDescription(description) {
  console.log('got description');

  peerConnection
    .setLocalDescription(description)
    .then(function() {
      serverConnection.send(
        JSON.stringify({ sdp: peerConnection.localDescription, uuid: uuid })
      );
    })
    .catch(errorHandler);
}

function gotMessageFromServer(message) {
  var signal = JSON.parse(message.data);

  // Ignore messages from ourself
  if (signal.uuid == uuid) return;

  if (signal.sdp) {
    peerConnection
      .setRemoteDescription(new RTCSessionDescription(signal.sdp))
      .then(function() {
        // Only create answers in response to offers
        if (signal.sdp.type == 'offer') {
          peerConnection
            .createAnswer()
            .then(createdDescription)
            .catch(errorHandler);
        }
      })
      .catch(errorHandler);
  } else if (signal.ice) {
    peerConnection
      .addIceCandidate(new RTCIceCandidate(signal.ice))
      .catch(errorHandler);
  }
}

function errorHandler(error) {
  console.log(error);
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }

  return (
    s4() +
    s4() +
    '-' +
    s4() +
    '-' +
    s4() +
    '-' +
    s4() +
    '-' +
    s4() +
    s4() +
    s4()
  );
}
