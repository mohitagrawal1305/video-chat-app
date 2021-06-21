const express = require('express');
const socketIO = require('socket.io');
const app = express();

const server = app.listen(4000, () => {
    console.log('Listening to port 4000');
});

app.use(express.static('public'));

const ioServer = socketIO(server);

ioServer.on('connection', (socket) => {
    console.log('User connected: ', socket.id);
    socket.on('join', (roomName) => {
        // no. of clients connected to socket
       // const rooms = ioServer.sockets.adapter.rooms;
        const room = ioServer.sockets.adapter.rooms.get(roomName);
        if(room === undefined) {
            // create new room
            socket.join(roomName);
            socket.emit('roomCreated');
            
        } else if(room.size === 1) {
            // join existing room with 1 client
            socket.join(roomName);
            socket.emit('roomJoined');
        } else {
            socket.emit('roomFull');
        }

        //console.log('rooms', rooms);
    });

    socket.on('ready', (roomName) => {
        // when ever server gets a ready event, we will broadcast this event to other clients on the room
        // ready will be triggered on the first place when someone joins a room.
        socket.broadcast.to(roomName).emit('ready');
    });

    socket.on('candidate', (candidate, roomName) => {
        // clients will send there ice candidates to each other.
        // ip addresses ???
        socket.broadcast.to(roomName).emit('candidate', candidate);
    });

    socket.on('offer', (offer, roomName) => {
        socket.broadcast.to(roomName).emit('offer', offer);
    });
    socket.on('answer', (answer, roomName) => {
        socket.broadcast.to(roomName).emit('answer', answer);
    });

    socket.on('leave', (roomName) => {
        socket.leave(roomName);
        const room = ioServer.sockets.adapter.rooms.get(roomName);
        if(room.size === 1) {
            socket.broadcast.to(roomName).emit('leave');
        }
    });
} );