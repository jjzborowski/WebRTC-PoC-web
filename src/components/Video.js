import React, {
    useRef,
    useEffect,
} from 'react';

const Video = () => {
    const startButton = useRef();
    const callButton = useRef();
    const hangupButton = useRef();
    const localVideo = useRef();
    const remoteVideo = useRef();
    let startTime;
    let localStream;
    let pc1;
    let pc2;
    const offerOptions = {
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1,
    };

    const getName = (pc) => (
        pc === pc1 ? 'pc1' : 'pc2'
    );

    const getOtherPc = (pc) => (
        pc === pc1 ? pc2 : pc1
    );

    // logging utility
    const trace = (arg) => {
        const now = (
            window.performance.now() / 1000
        ).toFixed(3);
        console.log(`${now}: `, arg);
    };

    const gotStream = (stream) => {
        trace('Received local stream');
        localVideo.current.srcObject = stream;
        localStream = stream;
        callButton.current.disabled = false;
    };

    const gotRemoteStream = (event) => {
        remoteVideo.current.srcObject = event.stream;
        trace('pc2 received remote stream');
    };

    const onSetLocalSuccess = (pc) => {
        trace(`${getName(pc)} setLocalDescription complete`);
    };

    const onSetRemoteSuccess = (pc) => {
        trace(`${getName(pc)} setRemoteDescription complete`);
    };

    const onSetSessionDescriptionError = (error) => {
        trace(`Failed to set session description: ${error.toString()}`);
    };

    const onAddIceCandidateError = (pc, error) => {
        trace(`${getName(pc)} failed to add ICE Candidate: ${error.toString()}`);
    };

    const onAddIceCandidateSuccess = (pc) => {
        trace(`${getName(pc)} addIceCandidate success`);
    };

    const onIceCandidate = (pc, event) => {
        getOtherPc(pc)
            .addIceCandidate(event.candidate)
            .then(() => {
                onAddIceCandidateSuccess(pc);
            }, (err) => {
                onAddIceCandidateError(pc, err);
            });
        trace(`${getName(pc)} ICE candidate: \n${event.candidate ? event.candidate.candidate : '(null)'}`);
    };

    const onIceStateChange = (pc, event) => {
        if (pc) {
            trace(`${getName(pc)} ICE state: ${pc.iceConnectionState}`);
            console.log('ICE state change event: ', event);
        }
    };

    const onCreateSessionDescriptionError = (error) => {
        trace(`Failed to create session description: ${error.toString()}`);
    };

    const onCreateAnswerSuccess = (desc) => {
        trace(`Answer from pc2:\n${desc.sdp}`);
        trace('pc2 setLocalDescription start');
        pc2.setLocalDescription(desc)
            .then(() => {
                onSetLocalSuccess(pc2);
            }, onSetSessionDescriptionError);
        trace('pc1 setRemoteDescription start');
        pc1.setRemoteDescription(desc)
            .then(() => {
                onSetRemoteSuccess(pc1);
            }, onSetSessionDescriptionError);
    };

    const onCreateOfferSuccess = (desc) => {
        trace(`Offer from pc1\n${desc.sdp}`);
        trace('pc1 setLocalDescription start');
        pc1.setLocalDescription(desc)
            .then(() => {
                onSetLocalSuccess(pc1);
            }, onSetSessionDescriptionError);
        trace('pc2 setRemoteDescription start');
        pc2.setRemoteDescription(desc)
            .then(() => {
                onSetRemoteSuccess(pc2);
            }, onSetSessionDescriptionError);
        trace('pc2 createAnswer start');
        // Since the 'remote' side has no media stream we need
        // to pass in the right constraints in order for it to
        // accept the incoming offer of audio and video.
        pc2.createAnswer()
            .then(onCreateAnswerSuccess, onCreateSessionDescriptionError);
    };

    const start = () => {
        trace('Requesting local stream');
        startButton.current.disabled = true;
        navigator.mediaDevices
            .getUserMedia({
                audio: true,
                video: true,
            })
            .then(gotStream)
            .catch((error) => {
                console.log(error);
                alert(`getUserMedia() error: ${error.name}`);
            });
    };

    const call = () => {
        callButton.current.disabled = true;
        hangupButton.current.disabled = false;
        trace('Starting call');
        startTime = window.performance.now();
        const videoTracks = localStream.getVideoTracks();
        const audioTracks = localStream.getAudioTracks();
        if (videoTracks.length > 0) {
            trace(`Using video device: ${videoTracks[0].label}`);
        }
        if (audioTracks.length > 0) {
            trace(`Using audio device: ${audioTracks[0].label}`);
        }
        const servers = null;
        pc1 = new RTCPeerConnection(servers);
        trace('Created local peer connection object pc1');
        pc1.onicecandidate = (event) => {
            onIceCandidate(pc1, event);
        };
        pc2 = new RTCPeerConnection(servers);
        trace('Created remote peer connection object pc2');
        pc2.onicecandidate = (event) => {
            onIceCandidate(pc2, event);
        };
        pc1.oniceconnectionstatechange = (event) => {
            onIceStateChange(pc1, event);
        };
        pc2.oniceconnectionstatechange = (event) => {
            onIceStateChange(pc2, event);
        };
        pc2.onaddstream = gotRemoteStream;

        pc1.addStream(localStream);
        trace('Added local stream to pc1');

        trace('pc1 createOffer start');
        pc1.createOffer(offerOptions)
            .then(onCreateOfferSuccess, onCreateSessionDescriptionError);
    };

    const hangup = () => {
        trace('Ending call');
        pc1.close();
        pc2.close();
        pc1 = null;
        pc2 = null;
        hangupButton.current.disabled = true;
        callButton.current.disabled = false;
    };

    useEffect(() => {
        callButton.current.disabled = true;
        hangupButton.current.disabled = true;
        startButton.current.onclick = start;
        callButton.current.onclick = call;
        hangupButton.current.onclick = hangup;

        localVideo.current.addEventListener('loadedmetadata', () => {
            trace(`Local video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
        });

        remoteVideo.current.addEventListener('loadedmetadata', () => {
            trace(`Remote video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
        });

        remoteVideo.current.onresize = () => {
            trace(`Remote video size changed to ${remoteVideo.current.videoWidth}x${remoteVideo.current.videoHeight}`);
            // We'll use the first onsize callback as an indication that video has started
            // playing out.
            if (startTime) {
                const elapsedTime = window.performance.now() - startTime;
                trace(`Setup time: ${elapsedTime.toFixed(3)}ms`);
                startTime = null;
            }
        };
    });

    return (
        <div>
            <div id="container">
                <video
                    id="videolocalVideo"
                    ref={ localVideo }
                    autoPlay
                    muted
                    playsInline
                />
                <video
                    ref={ remoteVideo }
                    autoPlay
                    playsInline
                />
                <div>
                    <button
                        type="button"
                        ref={ startButton }
                    >
                        Start
                    </button>
                    <button
                        type="button"
                        ref={ callButton }
                    >
                        Call
                    </button>
                    <button
                        type="button"
                        ref={ hangupButton }
                    >
                        Hang Up
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Video;
