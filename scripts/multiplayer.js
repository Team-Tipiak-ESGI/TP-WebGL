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
                            const player = json.value[uuid].position;

                            if (player.position === undefined || player.position === null) {
                                return
                            }

                            if (this.players[uuid] === undefined) {
                                this.players[uuid] = this.world.createShape({
                                    position: [...Object.values(player.position)],
                                    size: [100, 100, 100],
                                    geometry: "BoxBufferGeometry",
                                    image: "textures/player.png",
                                });
                            } else {
                                const origin = this.players[uuid].body.getCenterOfMassTransform().getOrigin();
                                origin.setX(player.position.x);
                                origin.setY(player.position.y);
                                origin.setZ(player.position.z);

                                const rotation = this.players[uuid].body.getCenterOfMassTransform().getRotation();
                                rotation.setX(player.rotation.x);
                                rotation.setY(player.rotation.y);
                                rotation.setZ(player.rotation.z);

                                this.players[uuid].body.setLinearVelocity(new Ammo.btVector3(...Object.values(player.linearVelocity)));
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
                    ply.mesh.geometry.dispose();
                    ply.mesh.material.dispose();
                    this.world.scene.remove( ply.mesh );

                    break;

                default:
                    console.log(json);
                    break;
            }
        };
    }

    /**
     *
     * @param {PlayerController} player
     */
    animate(player) {
        // Send own player data to server
        if (this.server.readyState === 1) {
            this.server.send(JSON.stringify({ type: "position", value: player.getData() }));
        }
    }
}