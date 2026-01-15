const express = require('express');
const app = express();
const http = require('http').createServer(app);

// This tells the server it is OK to talk to your GitHub Pages site
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ... rest of your server code (the gravity loop)

let node_registry = {};

// Use port 80 or 443 if possible to look like standard web traffic
const port = process.env.PORT || 443;

setInterval(() => {
    for (let id in node_registry) {
        let n = node_registry[id];
        let d = Math.sqrt(n.x * n.x + n.z * n.z);

        if (d > 50 || n.y > 0) {
            n.y -= 0.15; // Vertical Decay
        } else if (d <= 50 && n.y < 0) {
            n.y = 0;
        }

        if (n.y < -30) {
            n.x = 0; n.y = 15; n.z = 0;
        }

        io.emit('sync_nodes', { id: id, data: n });
    }
}, 50);

io.on('connection', (socket) => {
    node_registry[socket.id] = { x: 0, y: 10, z: 0, r: 0 };

    socket.on('data_update', (data) => {
        if (node_registry[socket.id]) {
            node_registry[socket.id].x = data.x;
            node_registry[socket.id].z = data.z;
            node_registry[socket.id].r = data.r;
        }
    });

    socket.on('disconnect', () => {
    delete node_registry[socket.id];
    io.emit('player_left', socket.id); 
});

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
// Force the project to use the secure web port
http.listen(443, () => console.log('Physics Project initialized on secure channel'));
