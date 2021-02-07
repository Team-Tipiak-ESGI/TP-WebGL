import * as THREE from "../threejs/three.module.js";

export default class PlayerController {

    /**
     * Inspired by https://github.com/mrdoob/three.js/blob/master/examples/games_fps.html
     */
    constructor(world) {
        this.world = world;

        this.height = 300;

        const {body, mesh} = world.createShape({
            position: [
                800,
                800,
                100
            ],
            size: [
                100,
                this.height,
                100
            ],
            geometry: "BoxBufferGeometry",
            image: "textures/player.png",
            opacity: 0,
        });

        // Create self collada
        /*this.world.createCollada('./resources/Walking.dae')
            .then(({mixer, avatar}) => {
                avatar.scale.set(2, 2, 2);
                avatar.position.x = 800;
                avatar.position.y = 800 - this.height / 2;
                avatar.position.z = 100;

                this.world.scene.add(avatar);

                this.avatar = avatar;
                this.mixer = mixer;
            });*/

        body.setDamping(.01, 0);

        this.player = mesh;
        this.body = body;

        // Init controls
        this.keyStates = {};

        document.addEventListener('keydown', (event) => {
            this.keyStates[event.code] = true;
        });

        document.addEventListener('keyup', (event) => {
            this.keyStates[event.code] = false;
        });

        document.body.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement === document.body) {
                this.world.camera.rotation.y -= event.movementX / 500;
                this.world.camera.rotation.x -= event.movementY / 500;

                // Optional
                this.world.camera.rotation.y = this.world.camera.rotation.y % (Math.PI * 2);
                this.world.camera.rotation.x = Math.min(Math.PI / 2, Math.max(-Math.PI / 2, this.world.camera.rotation.x % (Math.PI * 2)));

                // TODO: Set angle of player
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.requestPointerLock();
        });

        this.playerDirection = new THREE.Vector3();
        this.raycaster = new THREE.Raycaster(undefined, undefined, 0, this.height / 2 /* must be at least height / 2 */);
    }

    getData() {
        const origin = this.body.getCenterOfMassTransform().getOrigin();
        const linearVelocity = this.body.getLinearVelocity();
        const angularVelocity = this.body.getAngularVelocity();

        const q = this.body.getCenterOfMassTransform().getRotation();
        const qx = q.x(), qy = q.y(), qz = q.z(), qw = q.w();

        return {
            position: {
                x: origin.x(),
                y: origin.y(),
                z: origin.z(),
            },
            rotation: {
                x: qx,
                y: qy,
                z: qz,
                w: qw,
            },
            linearVelocity: {
                x: linearVelocity.x(),
                y: linearVelocity.y(),
                z: linearVelocity.z(),
            },
            angularVelocity: {
                x: angularVelocity.x(),
                y: angularVelocity.y(),
                z: angularVelocity.z(),
            },
        }
    }

    getForwardVector() {

        this.world.camera.getWorldDirection(this.playerDirection);
        this.playerDirection.y = 0;
        this.playerDirection.normalize();

        return this.playerDirection;

    }

    getSideVector() {

        this.world.camera.getWorldDirection(this.playerDirection);
        this.playerDirection.y = 0;
        this.playerDirection.normalize();
        this.playerDirection.cross(this.world.camera.up);

        return this.playerDirection;

    }

    animate() {
        // Update camera
        this.world.camera.position.x = this.player.position.x;
        this.world.camera.position.z = this.player.position.z;
        this.world.camera.position.y = this.player.position.y + this.height / 2;

        const delta = this.world.clock.getDelta();

        // Animate Collada
        /*if (this.mixer !== undefined) {
            const linearVelocity = this.body.getLinearVelocity().length();
            this.mixer.update(delta * (linearVelocity / 500));
        }

        // Move collada
        if (this.avatar !== undefined) {
            this.avatar.position.x = this.player.position.x;
            this.avatar.position.z = this.player.position.z;
            this.avatar.position.y = this.player.position.y - this.height / 2;
        }*/

        // Player controls
        const speed = 20000000;

        let moveX = 0, moveY = 0, moveZ = 0;

        // Player rotation
        const pa = this.world.camera.rotation.y;

        if (this.keyStates['KeyW']) {
            moveX = -Math.sin(pa);
            moveZ = -Math.cos(pa);
        } else if (this.keyStates['KeyS']) {
            moveX = Math.sin(pa);
            moveZ = Math.cos(pa);
        }

        if (this.keyStates['KeyA']) {
            moveX += -Math.sin(pa + Math.PI / 2);
            moveZ += -Math.cos(pa + Math.PI / 2);
        } else if (this.keyStates['KeyD']) {
            moveX += Math.sin(pa + Math.PI / 2);
            moveZ += Math.cos(pa + Math.PI / 2);
        }

        this.raycaster.set(this.player.position, new THREE.Vector3(0, -1, 0));
        const objects = this.world.scene.children.filter(o => o instanceof THREE.Object3D);
        const result = this.raycaster.intersectObjects(objects);

        if (this.keyStates['Space'] && result.length > 0) {
            moveY = 25;
        }

        const resultantImpulse = new Ammo.btVector3(moveX, moveY, moveZ);
        resultantImpulse.op_mul(speed * 1000 * delta);
        this.body.applyImpulse(resultantImpulse, new Ammo.btVector3(0, 0, 0));

        // Keep the player up
        this.body.getCenterOfMassTransform().setRotation(new Ammo.btQuaternion(0, this.world.camera.rotation.y, 0, 1));
        //this.body.getCenterOfMassTransform().getRotation().setEulerZYX(0, this.world.camera.rotation.y, 0);

        // Debug position and rotation
        document.getElementById('position').innerText =
`x=${Math.floor(this.player.position.x)}
y=${Math.floor(this.player.position.y)}
z=${Math.floor(this.player.position.z)}

rx=${this.world.camera.rotation.y.toFixed(2)}`;
    }
}