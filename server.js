const express = require('express');
const app = express();
const http = require('http').createServer(app);

const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let node_registry = {};
const port = process.env.PORT || 10000;

setInterval(() => {
    for (let id in node_registry) {
        let n = node_registry[id];
        let d = Math.sqrt(n.x * n.x + n.z * n.z);
        if (d > 50 || n.y > 0) {
            n.y -= 0.15;
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
});

app.get('/', (req, res) => res.send('Server is Running'));

http.listen(port, () => {
    console.log('Server live on port ' + port);
});
