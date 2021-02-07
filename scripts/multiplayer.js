import * as THREE from "../threejs/three.module.js";

export default class Multiplayer {
    constructor(world) {
        this.world = world;
        this.elapsed = 0;

        const usernames = document.getElementById('usernames');

        // Player's uuid attributed by the server
        this.server = new WebSocket(`${document.getElementById('server_address').value || window.location.host}`);
        this.players = {};

        // Send username when connection is opened
        this.server.onopen = (event) => {
            this.server.send(JSON.stringify({type: 'name', value: document.getElementById('username').value}));
        };

        this.server.onmessage = (event) => {
            const json = JSON.parse(event.data);

            switch (json.type) {
                // Receive player positions
                case 'position':
                    if (this.own_uuid === undefined) return;

                    for (const uuid in json.value) {
                        if (json.value.hasOwnProperty(uuid) && uuid !== this.own_uuid) {
                            const player = json.value[uuid];
                            const loc = player.position;

                            if (!loc || !loc.position) {
                                return
                            }

                            if (this.players[uuid] === undefined) {
                                // Create mesh and physic body
                                this.players[uuid] = this.world.createShape({
                                    position: [...Object.values(loc.position)],
                                    size: [100, 100, 100],
                                    geometry: "BoxBufferGeometry",
                                    image: "textures/player.png",
                                });

                                // Create collada
                                this.world.createCollada('./resources/Walking.dae')
                                    .then(({mixer, avatar}) => {
                                        avatar.scale.set(2, 2, 2);
                                        avatar.position.x = loc.position.x;
                                        avatar.position.y = loc.position.y - 50;
                                        avatar.position.z = loc.position.z;

                                        world.scene.add(avatar);

                                        this.players[uuid].avatar = avatar;
                                        this.players[uuid].mixer = mixer;
                                    });

                                // Create username
                                const span = document.createElement('span');
                                console.log(player);
                                span.innerText = player.name;
                                span.id = uuid;
                                usernames.append(span);
                            } else {
                                if (this.players[uuid].body !== undefined) {
                                    const origin = this.players[uuid].body.getCenterOfMassTransform().getOrigin();
                                    origin.setX(loc.position.x);
                                    origin.setY(loc.position.y);
                                    origin.setZ(loc.position.z);

                                    const rotation = this.players[uuid].body.getCenterOfMassTransform().getRotation();
                                    rotation.setX(loc.rotation.x);
                                    rotation.setY(loc.rotation.y);
                                    rotation.setZ(loc.rotation.z);

                                    this.players[uuid].body.setLinearVelocity(new Ammo.btVector3(...Object.values(loc.linearVelocity)));
                                }

                                if (this.players[uuid].avatar !== undefined) {
                                    const avatar = this.players[uuid].avatar;
                                    avatar.position.x = loc.position.x;
                                    avatar.position.y = loc.position.y - 50;
                                    avatar.position.z = loc.position.z;

                                    avatar.rotation.x = loc.rotation.x;
                                    avatar.rotation.y = loc.rotation.y;
                                    avatar.rotation.z = loc.rotation.z;

                                    // https://stackoverflow.com/a/27410603
                                    const screenPosition = this.toScreenPosition(avatar, this.world.camera);
                                    const username = document.getElementById(uuid);
                                    username.style.top = `${screenPosition.y}px`;
                                    username.style.left = `${screenPosition.x}px`;
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
                    this.world.scene.remove(ply.mesh);

                    // Remove avatar
                    this.world.scene.remove(ply.avatar);

                    // Remove username
                    document.getElementById(json.value).outerHTML = '';

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
            this.server.send(JSON.stringify({type: "position", value: player.getData()}));
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

    /**
     * Return the xy coordinate of an object on screen
     * @param {any} obj
     * @param {THREE.PerspectiveCamera} camera
     * @returns {{x: number, y: number}}
     */
    toScreenPosition(obj, camera) {
        const vector = new THREE.Vector3(), target = new THREE.Vector3();
        const box = new THREE.Box3().setFromObject( obj );

        const widthHalf = 0.5 * this.world.renderer.getContext().canvas.width;
        const heightHalf = 0.5 * this.world.renderer.getContext().canvas.height;

        obj.updateMatrixWorld();

        vector.setFromMatrixPosition(obj.matrixWorld);
        vector.y += box.getSize(target).y + 48; // Add object's height + username height

        vector.project(camera);

        vector.x = (vector.x * widthHalf) + widthHalf;
        vector.y = -(vector.y * heightHalf) + heightHalf;

        return {
            x: vector.x,
            y: vector.y
        };
    };
}