export default class Multiplayer {
    constructor(world) {
        this.world = world;
        this.elapsed = 0;

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
                                // Create mesh and physic body
                                this.players[uuid] = this.world.createShape({
                                    position: [...Object.values(player.position)],
                                    size: [100, 100, 100],
                                    geometry: "BoxBufferGeometry",
                                    image: "textures/player.png",
                                });

                                // Create collada
                                this.world.createCollada('./resources/Walking.dae')
                                    .then(({mixer, avatar}) => {
                                        avatar.scale.set(2, 2, 2);
                                        avatar.position.x = player.position.x;
                                        avatar.position.y = player.position.y - 50;
                                        avatar.position.z = player.position.z;

                                        world.scene.add(avatar);

                                        this.players[uuid].avatar = avatar;
                                        this.players[uuid].mixer = mixer;
                                    });
                            } else {
                                if (this.players[uuid].body !== undefined) {
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

                                if (this.players[uuid].avatar !== undefined) {
                                    const avatar = this.players[uuid].avatar;
                                    avatar.position.x = player.position.x;
                                    avatar.position.y = player.position.y - 50;
                                    avatar.position.z = player.position.z;

                                    avatar.rotation.x = player.rotation.x;
                                    avatar.rotation.y = player.rotation.y;
                                    avatar.rotation.z = player.rotation.z;
                                }
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

                    // Remove cube
                    ply.mesh.geometry.dispose();
                    ply.mesh.material.dispose();
                    this.world.scene.remove( ply.mesh );

                    // Remove avatar
                    this.world.scene.remove( ply.avatar );

                    break;

                default:
                    console.log(json);
                    break;
            }
        };
    }

    /**
     *
     * @param {number} delta
     * @param {PlayerController} player
     */
    animate(delta, player) {
        // Send own player data to server
        if ((this.elapsed += delta) > 1 / 30 && this.server.readyState === 1) {
            this.server.send(JSON.stringify({ type: "position", value: player.getData() }));
        }

        // Animate players
        for (const uuid in this.players) {
            if (this.players.hasOwnProperty(uuid)) {
                const ply = this.players[uuid];
                const linearVelocity = ply.body.getLinearVelocity().length();

                if (ply.mixer !== undefined) {
                    ply.mixer.update(delta * (linearVelocity / 500));
                }
            }
        }
    }
}