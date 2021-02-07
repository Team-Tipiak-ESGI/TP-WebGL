const WebSocket = require('ws');
const UUID = require('uuid');

const server = new WebSocket.Server({ port: 8080 })

const players = {};

server.on('connection', (socket) => {
    const uuid = UUID.v4();

    players[uuid] = {
        position: {},
        name: '',
    };

    socket.on('message', (message) => {
        const json = JSON.parse(message);

        if (players[uuid][json.type] !== undefined) {
            players[uuid][json.type] = json.value;
        }
    });

    socket.send(JSON.stringify({type: 'uuid', value: uuid}));

    const interval = setInterval(() => {
        socket.send(JSON.stringify({type: 'position', value: players}));
    }, 1 / 30 * 1000);

    socket.on('close', () => {
        server.clients.forEach(function each(client) {
            if (client !== socket && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({type: 'disconnect', value: uuid}));
            }
        });

        clearInterval(interval);
        players[uuid] = undefined;
        delete players[uuid];
    });
});