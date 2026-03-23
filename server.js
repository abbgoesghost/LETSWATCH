const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const logType = ["ERR","MESS","NEWC"]

const PORT = process.env.PORT || 3000;

//---ref local files---//
app.use(express.static('public'));
app.use('/input', express.static('input'));

//---sync variables---//
let videoState = { 
  currentTime: 0,
  isPlaying: false,
  videoFile: null,
  startTime: null
};

//---auto detect video files---//
function detectVideoFile() {
  const inputDir = './input';
  if (!fs.existsSync(inputDir)) {
    fs.mkdirSync(inputDir);
    return null;
  }
  
  const files = fs.readdirSync(inputDir);
  const videoFile = files.find(file => 
    file.toLowerCase().endsWith('.mp4') || 
    file.toLowerCase().endsWith('.webm') || 
    file.toLowerCase().endsWith('.ogg')
  );
  
  return videoFile; //---return file---//
}

//---init video file---//
videoState.videoFile = detectVideoFile();

//---websocket connexion managing---//
io.on('connection', (socket) => {

  console.log(`[${logType[1]}] new watcher:`, socket.id);
  
  //---send actual state to the client---//
  socket.emit('video-state', videoState);
  
  //---events for video controlling---//
  
  //---play---//
  socket.on('play', () => {
    videoState.isPlaying = true;
    videoState.startTime = Date.now() - (videoState.currentTime * 1000);
    io.emit('play', videoState);
  });
    
  //---pause---//
  socket.on('pause', () => {
    videoState.isPlaying = false;
    videoState.currentTime = (Date.now() - videoState.startTime) / 1000;
    io.emit('pause', videoState);
  });
  
  //---seek video---//
  socket.on('seek', (time) => {
    videoState.currentTime = time;
    videoState.startTime = Date.now() - (time * 1000);
    io.emit('seek', videoState);
  });
  
  //---on disconnected---//
  socket.on('disconnect', () => {
    console.log(` [${logType[1]}] watcher disconnected:`, socket.id);
  });
});

//---principal route---//
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

//---api for the video file---//
app.get('/api/video', (req, res) => {
  const videoFile = detectVideoFile();
  if (videoFile) {
    res.json({ videoFile: videoFile });
  } else {
    res.status(404).json({ error: `[${logType[0]}] no file found on /input` });
  }
});

server.listen(PORT, () => {
  console.log(`[${logType[1]}] server startedOn http://localhost:${PORT}`);
  console.log(`[${logType[1]}] file detected: ${videoState.videoFile || 'Aucun'}`);
});