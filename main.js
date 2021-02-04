import * as THREE from './threejs/three.module.js';
import { OrbitControls } from './threejs/jsm/controls/OrbitControls.js';
import { ColladaLoader } from './threejs/jsm/loaders/ColladaLoader.js';

export class World {
    /**
     * Create a scene for the world
     */
    constructor(canvas) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000);
        
        if (canvas) {
            this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
        } else {
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
        }


        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        // Create camera
        this.camera.position.set(1600, 0, 1000);
        this.camera.lookAt(0, 0, 0);
        this.controls.update();

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

        // Audio loader
        this.audioLoader = new THREE.AudioLoader();

        // Add the renderer element to webpage
        document.body.appendChild(this.renderer.domElement);

        // Handle window resize
        window.addEventListener('resize', this.onWindowResize, false);
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
        this.loader = new ColladaLoader();
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

            this.mixer = new THREE.AnimationMixer(avatar);
            this.mixer.clipAction(animations[0]).play();

            this.scene.add(avatar);

            avatar.scale.set(2, 2, 2);
            avatar.position.y = -200;
        });
    }

    animateCollada() {
        const delta = this.clock.getDelta();
        if (this.mixer !== undefined) {
            this.mixer.update(delta);
        }

        this.renderer.render(this.scene, this.camera);
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
        this.scene.add(lightHelper);

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

        // Get position
        let position =
            options.x !== undefined && options.y !== undefined && options.z !== undefined ?
                [options.x, options.y, options.z] :
                options.position || options.pos;

        switch (options.geometry) {
            case 'CylinderBufferGeometry':
                geometry = new THREE.CylinderBufferGeometry(size.w, size.h, size.d);
                break;

            case 'Triangle':
                geometry = new THREE.Geometry();
                const v1 = new THREE.Vector3(-size.w / 2, 0, -size.d / 2);
                const v2 = new THREE.Vector3(size.w / 2, 0, -size.d / 2);
                const v3 = new THREE.Vector3(0, size.h, -size.d / 2);

                const v4 = new THREE.Vector3(0, size.h, size.d / 2);
                const v5 = new THREE.Vector3(size.w / 2, 0, size.d / 2);
                const v6 = new THREE.Vector3(-size.w / 2, 0, size.d / 2);

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
                break;

            case 'SphereGeometry':
                geometry = new THREE.SphereGeometry(size.w, size.h, size.d);
                break;

            case 'BoxBufferGeometry':
            default:
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

        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.set(...position);
        if (options.geometry !== 'SphereGeometry') {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        } else {
            mesh.material.side = THREE.DoubleSide;
        }

        this.scene.add(mesh);
    }
}