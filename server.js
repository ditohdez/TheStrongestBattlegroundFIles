const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

let players = {};

// --- PHYSICS CONSTANTS ---
const GRAVITY = 0.2;
const FLOOR_Y = 0;
const ARENA_RADIUS = 50;

// 1. THE MAIN PHYSICS LOOP (Runs for all players 20 times per second)
setInterval(() => {
    for (let id in players) {
        let p = players[id];
        let dist = Math.sqrt(p.x * p.x + p.z * p.z);

        // Check if player should be falling
        if (dist > ARENA_RADIUS || p.y > FLOOR_Y) {
            p.y -= GRAVITY; // Pull down
        } else if (dist <= ARENA_RADIUS && p.y < FLOOR_Y) {
            p.y = FLOOR_Y; // Stay on floor
        }

        // Void/Respawn Check (If fell too deep)
        if (p.y < -30) {
            p.x = 0;
            p.y = 15; // Spawn them back in the air
            p.z = 0;
            p.health = 100;
            io.emit('playerHit', { id: id, health: 100 });
        }

        // Broadcast current position to everyone
        io.emit('playerMoved', { id: id, data: p });
    }
}, 50);

// 2. NETWORK CONNECTIONS
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Initial stats
    players[socket.id] = {
        x: 0, y: 10, z: 0, ry: 0,
        health: 100,
        appearance: { suitColor: 0x00ff00, accessory: 'none' }
    };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', { id: socket.id, data: players[socket.id] });

    // Handle Movement (Only update X, Z, and Rotation)
    socket.on('playerMovement', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].z = data.z;
            players[socket.id].ry = data.ry;
            // Note: We don't update Y here, the Server Loop handles gravity!
        }
    });

    socket.on('attack', () => {
        const attacker = players[socket.id];
        for (let id in players) {
            if (id === socket.id) continue;
            const victim = players[id];
            const dist = Math.hypot(attacker.x - victim.x, attacker.z - victim.z);
            if (dist < 3.5) {
                victim.health -= 25;
                io.emit('playerHit', { id: id, health: victim.health });
                if (victim.health <= 0) {
                    victim.health = 100;
                    victim.x = 0; victim.y = 10; victim.z = 0;
                }
            }
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
http.listen(3000, () => console.log(`Game running on port 3000`));
