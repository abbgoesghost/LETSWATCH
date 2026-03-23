//---websocket connexion---//
const socket = io();

//---dom elements---//
const video = document.getElementById('video');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const syncBtn = document.getElementById('syncBtn');
const status = document.getElementById('status');
const viewers = document.getElementById('viewers');
const loading = document.getElementById('loading');
const error = document.getElementById('error');

let isUpdatingFromServer = false;
let connectedUsers = 0;

//---init---//
async function init() {
    try {
        const response = await fetch('/api/video');
        const data = await response.json();
        
        if (data.videoFile) {
            video.src = `/input/${data.videoFile}`;
            video.style.display = 'block';
            loading.style.display = 'none';
            enableControls();
            status.textContent = `playing: ${data.videoFile}`; //---file playing---//
        } else {
            throw new Error('no video');
        }
    } catch (err) {
        loading.style.display = 'none';
        error.style.display = 'block';
        status.textContent = 'no video found';
    }
}

function enableControls() {
    playBtn.disabled = false;
    pauseBtn.disabled = false;
    syncBtn.disabled = false;
}

//---buttons events---//
playBtn.addEventListener('click', () => {
    socket.emit('play');
});

pauseBtn.addEventListener('click', () => {
    socket.emit('pause');
});

syncBtn.addEventListener('click', () => {
    socket.emit('seek', video.currentTime);
});

//---vid local events (not working on sync)---//
video.addEventListener('play', () => {
    if (!isUpdatingFromServer) {
        socket.emit('play');
    }
});

video.addEventListener('pause', () => {
    if (!isUpdatingFromServer) {
        socket.emit('pause');
    }
});

video.addEventListener('seeked', () => {
    if (!isUpdatingFromServer) {
        socket.emit('seek', video.currentTime);
    }
});

//---web socket events---//
socket.on('connect', () => {
    status.textContent = 'connected';
});

socket.on('disconnect', () => {
    status.textContent = 'disconnected';
});

socket.on('video-state', (state) => {
    updateVideoState(state);
});

socket.on('play', (state) => {
    console.log('Play received:', state);
    updateVideoState(state);
    playVideo();
});

socket.on('pause', (state) => {
    updateVideoState(state);
    pauseVideo();
});

socket.on('seek', (state) => {
    updateVideoState(state);
    seekVideo(state.currentTime);
});

//---update video state---//
function updateVideoState(state) {
    if (state.isPlaying && state.startTime) {
        const currentTime = (Date.now() - state.startTime) / 1000;
        state.currentTime = currentTime;
    }
}

function playVideo() {
    isUpdatingFromServer = true;
    video.play().then(() => {
        isUpdatingFromServer = false;
    }).catch(() => {
        isUpdatingFromServer = false;
    });
}

function pauseVideo() {
    isUpdatingFromServer = true;
    video.pause();
    setTimeout(() => {
        isUpdatingFromServer = false;
    }, 100);
}

function seekVideo(time) {
    isUpdatingFromServer = true;
    video.currentTime = time;
    setTimeout(() => {
        isUpdatingFromServer = false;
    }, 100);
}

//--- periodic sync---//
setInterval(() => {
    if (socket.connected) {
        connectedUsers++;
        viewers.textContent = Math.max(1, connectedUsers % 8 + 1); //---random number[[TO DO]]---//
    }
}, 4000);

// starting
init();