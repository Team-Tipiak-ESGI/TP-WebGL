class World {
    /**
     * Create a scene for the world
     */
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);

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

        // Add the renderer element to webpage
        document.body.appendChild(this.renderer.domElement);

        // Handle window resize
        window.addEventListener('resize', this.onWindowResize, false);
    }

    onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    createSpotLight(x, y, z) {
        this.spotLight = new THREE.SpotLight(0xffffff, 1);
        this.spotLight.position.set(x, y, z);
        this.spotLight.angle = Math.PI / 4;
        this.spotLight.penumbra = 0.1;
        this.spotLight.decay = 2;
        this.spotLight.distance = 20000;

        this.spotLight.castShadow = true;
        this.spotLight.shadow.mapSize.width = 2048;
        this.spotLight.shadow.mapSize.height = 2048;
        this.spotLight.shadow.camera.near = 10;
        this.spotLight.shadow.camera.far = 200;
        this.spotLight.shadow.focus = 1;

        this.scene.add(this.spotLight);

        this.lightHelper = new THREE.SpotLightHelper(this.spotLight);
        this.scene.add(this.lightHelper);
    }

    getSpotlight() {
        return this.spotLight;
    }

    
    render() {
        this.lightHelper.update();

        this.renderer.render(this.scene, this.camera);
    }

    buildGui() {

        const gui = new dat.GUI();

        const params = {
            'light color': this.spotLight.color.getHex(),
            intensity: this.spotLight.intensity,
            distance: this.spotLight.distance,
            angle: this.spotLight.angle,
            penumbra: this.spotLight.penumbra,
            decay: this.spotLight.decay,
            focus: this.spotLight.shadow.focus
        };

        gui.addColor(params, 'light color').onChange((val) => {
            this.spotLight.color.setHex(val);
            this.render();
        });

        gui.add(params, 'intensity', 0, 2).onChange((val) => {
            this.spotLight.intensity = val;
            this.render();
        });

        gui.add(params, 'distance', 2000, 5000).onChange((val) => {
            this.spotLight.distance = val;
            this.render();
        });

        gui.add(params, 'angle', 0, Math.PI / 3).onChange((val) => {
            this.spotLight.angle = val;
            this.render();
        });

        gui.add(params, 'penumbra', 0, 1).onChange((val) => {
            this.spotLight.penumbra = val;
            this.render();
        });

        gui.add(params, 'decay', 1, 2).onChange((val) => {
            this.spotLight.decay = val;
            this.render();
        });

        gui.add(params, 'focus', 0, 1).onChange((val) => {
            this.spotLight.shadow.focus = val;
            this.render();
        });

        gui.open();

    }

    /**
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