import * as THREE from '../threejs/three.module.js';
import { ColladaLoader } from '../threejs/jsm/loaders/ColladaLoader.js';

export class World {
    /**
     * Create a scene for the world
     */
    constructor(canvas) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000);
        this.camera.rotation.order = 'YXZ';
        
        if (canvas) {
            this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
        } else {
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
        }

        // Scene background
        const loader = new THREE.TextureLoader();
        const texture = loader.load('./textures/1920px-Sky_hr_aztec_csgo.jpg', () => {
            const rt = new THREE.WebGLCubeRenderTarget(texture.image.height);
            rt.fromEquirectangularTexture(this.renderer, texture);
            this.scene.background = rt;
        });

        // Ambient light
        const light = new THREE.AmbientLight( 0x404040 ); // soft white light
        this.scene.add( light );

        // Create camera
        /*this.camera.position.set(1600, 0, 1000);
        this.camera.lookAt(0, 0, 0);*/

        // Setup the renderer
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        // Ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.1);
        this.scene.add(ambient);

        // Clock
        this.clock = new THREE.Clock();

        // Audio listener
        this.listener = new THREE.AudioListener();
        this.camera.add(this.listener);

        // Collada loader
        this.loader = new ColladaLoader();

        // Audio loader
        this.audioLoader = new THREE.AudioLoader();

        // Add the renderer element to webpage
        document.body.appendChild(this.renderer.domElement);

        // Handle window resize
        window.addEventListener('resize', this.onWindowResize, false);

        this.initPhysics();
    }


    /*
     * Physics
     */

    initPhysics() {
        // Physics variables
        const gravityConstant = -9.8 * 100;
        this.rigidBodies = [];

        // Physics configuration

        const collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration();
        const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
        const broadphase = new Ammo.btDbvtBroadphase();
        const solver = new Ammo.btSequentialImpulseConstraintSolver();
        const softBodySolver = new Ammo.btDefaultSoftBodySolver();
        this.physicsWorld = new Ammo.btSoftRigidDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration, softBodySolver);
        this.physicsWorld.setGravity(new Ammo.btVector3(0, gravityConstant, 0));
        this.physicsWorld.getWorldInfo().set_m_gravity(new Ammo.btVector3(0, gravityConstant, 0));

        this.transformAux1 = new Ammo.btTransform();
    }

    /**
     * 
     * @param {THREE.Mesh} threeObject
     * @param {Ammo.btBoxShape} physicsShape
     * @param {number} mass
     * @param {THREE.Vector3} pos
     * @param {THREE.Quaternion} quat
     */
    createRigidBody(threeObject, physicsShape, mass, pos, quat) {

        threeObject.position.copy(pos);
        threeObject.quaternion.copy(quat);

        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
        const motionState = new Ammo.btDefaultMotionState(transform);

        const localInertia = new Ammo.btVector3(0, 0, 0);
        physicsShape.calculateLocalInertia(mass, localInertia);

        const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
        const body = new Ammo.btRigidBody(rbInfo);

        threeObject.userData.physicsBody = body;

        this.scene.add(threeObject);

        if (mass > 0) {

            this.rigidBodies.push(threeObject);

            // Disable deactivation
            body.setActivationState(4);

        }

        this.physicsWorld.addRigidBody(body);

        return body;

    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /*
     * Collada
     */

    /**
     * Create and add a new model to the scene
     * @param {string} file File path to the .dae file
     */
    createCollada(file) {
        return new Promise((resolve, reject) => {
            this.loader.load(file, (collada) => {
                const avatar = collada.scene;
                const animations = avatar.animations;

                avatar.traverse((node) => {
                    if (node.isSkinnedMesh) {
                        node.frustumCulled = false;
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });

                const mixer = new THREE.AnimationMixer(avatar);
                mixer.clipAction(animations[0]).play();

                resolve({mixer: mixer, avatar: avatar});
            });
        });
    }

    animate(delta) {
        this.renderer.render(this.scene, this.camera);

        // Step world
        this.physicsWorld.stepSimulation( delta, 10 );

        // Update rigid bodies
        for ( let i = 0, il = this.rigidBodies.length; i < il; i ++ ) {
            const objThree = this.rigidBodies[ i ];
            const objPhys = objThree.userData.physicsBody;
            const ms = objPhys.getMotionState();

            if ( ms ) {
                ms.getWorldTransform( this.transformAux1 );
                const p = this.transformAux1.getOrigin();
                const q = this.transformAux1.getRotation();
                objThree.position.set( p.x(), p.y(), p.z() );
                objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );
            }
        }
    }

    /*
     * Audio
     */

    /**
     * 
     * @param {number} x 
     * @param {number} y
     * @param {number} z
     * @param {number} file
     */
    createAudioSource(x, y, z, file) {
        // audio sphere
        const sphere = new THREE.SphereGeometry(20, 32, 16);
        const material = new THREE.MeshPhongMaterial({ color: 0xffaa00, flatShading: true, shininess: 0 });
        const mesh = new THREE.Mesh(sphere, material);
        mesh.position.set(x, y, z);

        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        this.scene.add(mesh);

        const sound = new THREE.PositionalAudio(this.listener);
        this.audioLoader.load(file, (buffer) => {
            sound.setBuffer(buffer);
            sound.setRefDistance(50);
            sound.play();
        });

        mesh.add(sound);
    }

    /*
     * Spotlight
     */

    /**
     * Create a new spotlight in the scene
     * @param {number} x X coordinate of the spotlight
     * @param {number} y Y coordinate
     * @param {number} z Z coordinate
     * @param {number} rx X rotation of the spotlight
     * @param {number} ry Y rotation
     * @param {number} rz Z rotation
     * @return {{THREE.SpotLight, THREE.SpotLightHelper}}
     */
    createSpotLight(x, y, z, rx = 0, ry = 0, rz = 0, options) {
        const spotLight = new THREE.SpotLight(0xffffff, 1);
        spotLight.position.set(x, y, z);
        spotLight.angle = Math.PI / 4;
        spotLight.penumbra = 0.1;
        spotLight.decay = 2;
        spotLight.distance = options?.distance ?? 20000;

        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 2048;
        spotLight.shadow.mapSize.height = 2048;
        spotLight.shadow.camera.near = 10;
        spotLight.shadow.camera.far = 200;
        spotLight.shadow.focus = 1;

        this.scene.add(spotLight);

        const lightHelper = new THREE.SpotLightHelper(spotLight);
        //this.scene.add(lightHelper);

        return {spotLight: spotLight, lightHelper: lightHelper};
    }

    /*
     * GUI
     */

    render(lightHelper) {
        lightHelper.update();

        this.renderer.render(this.scene, this.camera);
    }

    buildSpotLightGui(spotLight, lightHelper) {
        const gui = new dat.GUI();

        const params = {
            'light color': spotLight.color.getHex(),
            intensity: spotLight.intensity,
            distance: spotLight.distance,
            angle: spotLight.angle,
            penumbra: spotLight.penumbra,
            decay: spotLight.decay,
            focus: spotLight.shadow.focus
        };

        gui.addColor(params, 'light color').onChange((val) => {
            spotLight.color.setHex(val);
            this.render(lightHelper);
        });

        gui.add(params, 'intensity', 0, 2).onChange((val) => {
            spotLight.intensity = val;
            this.render(lightHelper);
        });

        gui.add(params, 'distance', 2000, 5000).onChange((val) => {
            spotLight.distance = val;
            this.render(lightHelper);
        });

        gui.add(params, 'angle', 0, Math.PI / 3).onChange((val) => {
            spotLight.angle = val;
            this.render(lightHelper);
        });

        gui.add(params, 'penumbra', 0, 1).onChange((val) => {
            spotLight.penumbra = val;
            this.render(lightHelper);
        });

        gui.add(params, 'decay', 1, 2).onChange((val) => {
            spotLight.decay = val;
            this.render(lightHelper);
        });

        gui.add(params, 'focus', 0, 1).onChange((val) => {
            spotLight.shadow.focus = val;
            this.render(lightHelper);
        });

        gui.open();
    }

    /*
     * Create and add a new shape to the world
     */

    createShape(options) {
        let geometry;

        const size = {
            w: options.w || options.width || options.size[0],
            h: options.h || options.height || options.size[1],
            d: options.d || options.depth || options.size[2],
        };

        let shape;

        // Get position
        let position =
            options.x !== undefined && options.y !== undefined && options.z !== undefined ?
                [options.x, options.y, options.z] :
                options.position || options.pos;

        let volume = 0;

        switch (options.geometry) {
            case 'CylinderBufferGeometry':
                geometry = new THREE.CylinderBufferGeometry(size.w, size.h, size.d);
                volume = Math.PI * Math.pow(size.w, 2) * size.h;

                shape = new Ammo.btCylinderShape(new Ammo.btVector3(size.w * 0.5, size.d * 0.5, size.h * 0.5));

                break;

            case 'Triangle':
                geometry = new THREE.Geometry();
                const v1 = new THREE.Vector3(-size.w / 2, -size.h / 4, -size.d / 2);
                const v2 = new THREE.Vector3(size.w / 2, -size.h / 4, -size.d / 2);
                const v3 = new THREE.Vector3(0, size.h / 2, -size.d / 2);

                const v4 = new THREE.Vector3(0, size.h / 2, size.d / 2);
                const v5 = new THREE.Vector3(size.w / 2, -size.h / 4, size.d / 2);
                const v6 = new THREE.Vector3(-size.w / 2, -size.h / 4, size.d / 2);

                geometry.vertices.push(v1);
                geometry.vertices.push(v2);
                geometry.vertices.push(v3);
                geometry.vertices.push(v4);
                geometry.vertices.push(v5);
                geometry.vertices.push(v6);

                // Generate all faces
                // TODO: Optimise by drawing only the required faces
                for (let i = 0; i < geometry.vertices.length; i++)
                    for (let j = 0; j < geometry.vertices.length; j++)
                        for (let k = 0; k < geometry.vertices.length; k++)
                            geometry.faces.push(new THREE.Face3(i, j, k));

                geometry.computeFaceNormals();

                shape = new Ammo.btBoxShape(new Ammo.btVector3(size.w * 0.5, size.h / 2 * 0.5, size.d * 0.5));

                volume = (size.d / 2) * (size.h) * (size.w / 2);

                break;

            case 'SphereGeometry':
                geometry = new THREE.SphereGeometry(size.w, size.h, size.d);
                break;

            case 'BoxBufferGeometry':
            default:

                shape = new Ammo.btBoxShape(new Ammo.btVector3(size.w * 0.5, size.h * 0.5, size.d * 0.5));

                volume = size.d * size.h * size.w;

                geometry = new THREE.BoxBufferGeometry(size.w, size.h, size.d);
                break;

        }

        const texture = new THREE.TextureLoader().load(options.image);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        if (options.geometry !== 'SphereGeometry') {
            texture.repeat.x = 4;
            texture.repeat.y = 4;
        }

        const material = new THREE.MeshPhongMaterial({ map: texture, dithering: true });
        material.opacity = options.opacity ?? 1;
        material.transparent = options.opacity === 0;
        console.log(options.opacity, material.opacity, material.transparent);

        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.set(...position);
        if (options.geometry !== 'SphereGeometry') {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        } else {
            mesh.material.side = THREE.DoubleSide;
        }

        let body;

        if (shape && (options.rigidBody ?? true)) {
            /*if (options.geometry === "CylinderBufferGeometry") {
                position[1] = size.d;
            }*/

            const vector3 = new THREE.Vector3(...position);
            const quaternion = new THREE.Quaternion(0, 0, 0, 1);

            shape.setMargin(0.05);

            body = this.createRigidBody(mesh, shape, options.mass ?? volume, vector3, quaternion);
        }

        this.scene.add(mesh);

        return {body: body, mesh: mesh};
    }
}