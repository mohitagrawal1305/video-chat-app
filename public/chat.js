const socketIO = io();
const divVideoChatLobby = document.getElementById("video-chat-lobby");
const actionsWrapper = document.getElementById("actions-wrapper");
const divVideoChat = document.getElementById("video-chat-room");
const joinButton = document.getElementById("join");
const userVideo = document.getElementById("user-video");
const peerVideo = document.getElementById("peer-video");
const roomInput = document.getElementById("roomName");

const muteButton = document.getElementById("mute");
const hideCameraButton = document.getElementById("hideCamera");
const leaveRoomButton = document.getElementById("leaveRoom");

let isCreator = false;
let rtcPeerConnection;
let userStream;
let isMuted = false;
let isCameraHidden = false;
const iceServers = {
    iceServers: [
        {urls: "stun:stun.services.mozilla.com"},
        {urls: "stun:stun.l.google.com:19302"},
    ],
};

const buttonClick = () => {
    if( roomInput.value === '' ) {
        alert('Enter room name');
    } else {
        socketIO.emit('join', roomInput.value);
    }
};


joinButton.addEventListener('click', buttonClick);


const handleOnicecandidate = (event) => {
    console.log('onicecandidate', event);
    if(event.candidate) {
        socketIO.emit('candidate', event.candidate, roomInput.value);
    }
    
};

const handleOntrack = (event) => {
    // this function will be called when peer sends media stream
    console.log('handleOntrack');
   // const peerVideo = document.createElement('video');
	
    peerVideo.srcObject = event.streams[0];
    peerVideo.onloadedmetadata = function(e) {
        peerVideo.play();
    };
   // divVideoChat.appendChild(peerVideo);
};

const displayUserVideo = (successCallback = () => {}) => {
    console.log('displayUserVideo');
    navigator.mediaDevices.getUserMedia({audio: true, video: { width: 500, height: 500 }})
        .then(function(stream) {
            userStream = stream;
            userVideo.srcObject = stream;
            userVideo.onloadedmetadata = function(e) {
                userVideo.play();
            };
            divVideoChatLobby.style.display = 'none';
            actionsWrapper.style.display = 'flex';
            successCallback();
        })
        .catch(function(err) {
            console.log(err.name + ": " + err.message);
            alert("Couldn't Access User Media");
        });

};

socketIO.on('roomCreated', () => {
    isCreator = true;
    displayUserVideo();
});

socketIO.on('roomJoined', () => {
    isCreator = false;
    displayUserVideo(() => {
        // let others know that I am ready.
        socketIO.emit('ready', roomInput.value);
    });
});

socketIO.on('roomFull', () => {
    alert('Room is full, you can\'t join right now');
});

socketIO.on('ready', () => {
    if(isCreator) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = handleOnicecandidate;
        rtcPeerConnection.ontrack = handleOntrack;
        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream); // audio track
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream); // video track
        rtcPeerConnection.createOffer()
            .then((offer) => {
                rtcPeerConnection.setLocalDescription(offer);
                socketIO.emit('offer', offer, roomInput.value);
            })
            .catch(console.error);
    }
});
socketIO.on('candidate', (candidate) => {
    const icecandidate = new RTCIceCandidate(candidate);
    rtcPeerConnection.addIceCandidate(icecandidate);
});

socketIO.on('offer', (offer) => {
    if(!isCreator) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = handleOnicecandidate;
        rtcPeerConnection.ontrack = handleOntrack;
        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream ); // audio track
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream ); // video track
        rtcPeerConnection.setRemoteDescription(offer);
        rtcPeerConnection.createAnswer()
            .then((answer) => {
                rtcPeerConnection.setLocalDescription(answer);
                socketIO.emit('answer', answer, roomInput.value);
            })
            .catch(console.error);
    }
});

socketIO.on('answer', (answer) => {
    rtcPeerConnection.setRemoteDescription(answer);
});


const toggleMute = () => {
    isMuted = !isMuted;
    muteButton.textContent = isMuted ? 'Un Mute' : 'Mute'
    userStream.getAudioTracks()[0].enabled = !isMuted;
};

const toggleCamera = () => {
    isCameraHidden = !isCameraHidden;
    hideCameraButton.textContent = isCameraHidden ? 'Show Camera' : 'Hide Camera';
    userStream.getVideoTracks()[0].enabled = !isCameraHidden;
};

const onLeaveRoom = () => {
    socketIO.emit('leave', roomInput.value);
    divVideoChatLobby.style.display = 'block';
    actionsWrapper.style.display = 'none';
    if(userVideo.srcObject) {
        userVideo.srcObject.getTracks().forEach( track => track.stop());
    }
    if(peerVideo.srcObject) {
        peerVideo.srcObject.getTracks().forEach( track => track.stop());
    }

    if(rtcPeerConnection) {
        rtcPeerConnection.ontrack = null;
        rtcPeerConnection.onicecandidate = null;
        rtcPeerConnection.close();
        rtcPeerConnection = null;
    }

};
muteButton.addEventListener('click', toggleMute);
hideCameraButton.addEventListener('click', toggleCamera);
leaveRoomButton.addEventListener('click', onLeaveRoom);

socketIO.on('leave', () => {
    isCreator = true;
    if(peerVideo.srcObject) {
        peerVideo.srcObject.getTracks().forEach(track => track.stop());
    }

    if(rtcPeerConnection) {
        rtcPeerConnection.ontrack = null;
        rtcPeerConnection.onicecandidate = null;
        rtcPeerConnection.close();
        rtcPeerConnection = null;
    }
});

window.onbeforeunload = onLeaveRoom;