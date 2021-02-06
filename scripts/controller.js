import * as THREE from "../threejs/three.module.js";

export default class PlayerController {

    /**
     * Inspired by https://github.com/mrdoob/three.js/blob/master/examples/games_fps.html
     */
    constructor(world) {
        this.world = world;

        const {body, mesh} = world.createShape({
            position: [
                800,
                800,
                100
            ],
            size: [
                100,
                100,
                100
            ],
            geometry: "BoxBufferGeometry",
            image: "textures/player.png"
        });

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
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.requestPointerLock();
        });

        this.playerDirection = new THREE.Vector3();
    }

    getPosition() {
        return {
            x: this.player.position.x,
            y: this.player.position.y,
            z: this.player.position.z,
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
        this.world.camera.position.y = this.player.position.y;

        const delta = this.world.clock.getDelta();

        // Player controls
        const speed = 10000000;

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

        if (this.keyStates['Space']) {
            moveY = 1;
        }

        const resultantImpulse = new Ammo.btVector3(moveX, moveY, moveZ);
        resultantImpulse.op_mul(speed * 1000 * delta);
        this.body.applyImpulse(resultantImpulse, new Ammo.btVector3(0, 0, 0));
        //this.body.setLinearVelocity(resultantImpulse);
    }
}