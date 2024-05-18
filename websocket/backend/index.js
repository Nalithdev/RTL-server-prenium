import express from 'express';
import http from 'http';
import ip from 'ip';
import {Server} from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const PORT = 3000;
const io = new Server(server, {
    cors: {
        origin: '*',
    }
})
app.use(cors())
app.get('/', (req, res) => {
    res.json('ip address: http://' + ip.address() + ':' + PORT);
});
let games = {};
let restart = 0;

class Morpion {
    constructor() {
        this.players = [];
        this.board = [
            [null, null, null],
            [null, null, null],
            [null, null, null]
        ];
        this.turn = 0;
    }
}

function Play(room, coord, player) {
    if (player === games[room].players[games[room].turn]) {
        if (games[room].board[coord[0]][coord[1]] !== null) {
            console.log('case not empty');
            io.to(room).emit('message', 'case not empty');
        } else {
            games[room].board[coord[0]][coord[1]] = player;
            io.emit("play", {"coord": coord, "player": player});
            io.to(room).emit('message', `player ${player} played at ${coord}`);
            let result = check_if_winner(coord, room);
            if (result === true) {
                io.to(room).emit('winner', games[room].players[games[room].turn]);
                return result;
            }
            else {
                if (games[room].turn === 0) {
                    games[room].turn = 1;
                    io.to(room).emit('turn', "au tour de " + games[room].players[1]);
                } else {
                    games[room].turn = 0;
                    io.to(room).emit('turn', "au tour de " + games[room].players[0]);
                }
            }

        }
    } else {
        console.log('not your turn');
        io.to(room).emit('message', 'not your turn');
    }
}

function check_if_winner(coord, room) {
    console.log('check if winner');
    let linecheck = check_line(coord, room);
    let colcheck = check_col(coord, room);
    let diagcheck = check_diag(room);
    if (linecheck === true || colcheck === true || diagcheck === true ) {
        return true;
    }
    return false;

}

function check_line(coord, room) {
    console.log('check line');

    if (games[room].board[0][coord[1]] === games[room].board[1][coord[1]] && games[room].board[0][coord[1]] === games[room].board[2][coord[1]]) {
        console.log('win');
        return true;
    }
    return false;
}

function check_col(coord, room) {
    console.log('check col');

    if (games[room].board[coord[0]][0] === games[room].board[coord[0]][1] && games[room].board[coord[0]][0] === games[room].board[coord[0]][2]) {
        console.log('win');
        return true;
    }
    return false;
}

function check_diag(room) {
    console.log('check diag');
    if (games[room].board[0][0] === games[room].board[1][1] && games[room].board[0][0] === games[room].board[2][2] &&
        + games[room].board[0][0] != null||
        + games[room].board[0][2] === games[room].board[1][1] && games[room].board[0][2] === games[room].board[2][0] &&
        + games[room].board[0][2] != null ){
        console.log('win');
        return true;
    }
    return false;
}

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.broadcast.emit('user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
        socket.broadcast.emit('user disconnected');
    });
    socket.on('message', (msg) => {
        console.log('message: ' + msg);
        io.emit('message', msg);
    });


    socket.on('join', (room) => {
        console.log('join room: ' + room);
        socket.join(room);
        io.to(room).emit('join', room);
        if (games[room] === undefined) {
            games[room] = new Morpion(room);
            console.log('création de la room ' + room);
            console.log(games);

        }
        if (games[room].players.length === 2) {
            io.to(room).emit('full', 'room is full');
            console.log('room is full');
        }
        else {
            io.to(room).emit('new-game', `new game in ${room} room`);
        }
        
    });
    socket.on('leave', (room) => {
        console.log('leave room: ' + room);
        socket.leave(room);
        io.to(room).emit('leave', room);
    });
    socket.on('JoinGame', (data) => {
            console.log('JoinGame');
            console.log(data);
            if (games[data['room']].players.length === 2) {
                io.to(data['room']).emit('full', 'room is full');
                console.log('room is full');
            }
            else {
            games[data['room']].players.push(data['player']);
            io.to(data['room']).emit('message', `player ${data['player']} joined the game`);
            io.to(data['room']).emit('turn', "au tour de " + games[data['room']].players[games[data['room']].turn]);
            console.log(games[data['room']].players);
            if (games[data['room']].players.length === 2) {
                io.to(data['room']).emit('start', 'game started');

            }

        }
    }
    )
    socket.on('coord', (data) => {
        console.log('Coordonate give');
        console.table(games[data['room']].board);
        let result = Play(data['room'], data['coord'], data['player']);

        console.log(result);
        if (result === true) {
            console.log('winner');
            io.to(data['room']).emit('winner', games[data['room']].players[games[data['room']].turn]);
        }



    });
    socket.on('restart', (room) => {
        console.log('restart');
        restart++;
        if (restart === 2) {
            io.to(room).emit('restart', 'restart');
            restart = 0;
        }

        games[room].board = [
            [null, null, null],
            [null, null, null],
            [null, null, null]
        ];
        games[room].turn = 0;
        io.to(room).emit('turn', "au tour de " + games[room].players[0]);

    });
})



server.listen(PORT, () => {
    console.log('Server ip : http://' + ip.address() + ":" + PORT);
})

