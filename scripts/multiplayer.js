export default class Multiplayer {
    constructor(world) {
        this.world = world;

        // Player's uuid attributed by the server
        this.server = new WebSocket(`${document.getElementById('server_address').value || window.location.host}`);
        this.players = {};

        this.server.onmessage = (event) => {
            const json = JSON.parse(event.data);

            switch (json.type) {
                // Receive player positions
                case 'position':
                    if (this.own_uuid === undefined) return;

                    for (const uuid in json.value) {
                        if (json.value.hasOwnProperty(uuid) && uuid !== this.own_uuid) {
                            const player = json.value[uuid];

                            if (this.players[uuid] === undefined) {
                                const {body, mesh} = this.world.createShape({
                                    position: [...Object.values(player.position)],
                                    size: [100, 100, 100],
                                    geometry: "BoxBufferGeometry",
                                    image: "textures/player.png",
                                });

                                this.players[uuid] = mesh;
                            } else {
                                this.players[uuid].position.x = player.position.x;
                                this.players[uuid].position.y = player.position.y;
                                this.players[uuid].position.z = player.position.z;
                            }
                        }
                    }

                    break;

                // Get the own uuid provided by the server
                case 'uuid':
                    this.own_uuid = json.value;
                    break;

                // Handle disconnection
                case 'disconnect':
                    const ply = this.players[json.value];
                    ply.geometry.dispose();
                    ply.material.dispose();
                    this.world.scene.remove( ply );

                    this.players[json.value] = undefined;
                    delete this.players[json.value];

                    break;

                default:
                    console.log(json);
                    break;
            }
        };
    }

    animate(player) {
        // Send own player data to server
        if (this.server.readyState === 1) {
            this.server.send(JSON.stringify({type: "position", value: player.getPosition()}));
        }
    }
}