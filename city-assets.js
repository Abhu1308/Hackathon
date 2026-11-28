
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ==========================================
// POWERQUEST — INDUSTRIAL CITY
// ==========================================

export function buildIndustrialCity(
    scene,
    buildings,
    powerlines = null
) {

    // ==========================================
    // SHADOW REFRESH
    // ==========================================

    function sunShadowRefresh() {

        scene.traverse(object => {

            if (
                object.isDirectionalLight &&
                object.shadow
            ) {

                object.shadow.needsUpdate = true;
            }
        });
    }

    const loader = new GLTFLoader();

    const clickableBuildings = [];

    const path = './';

    // ==========================================
    // GRASS TEXTURE
    // ==========================================

    function createGrassTexture() {

        const canvas = document.createElement("canvas");

        canvas.width = 256;
        canvas.height = 256;

        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#527c36";

        ctx.fillRect(0, 0, 256, 256);

        for (let i = 0; i < 18000; i++) {

            const x = Math.random() * 256;

            const y = Math.random() * 256;

            const lightness =
                24 + Math.random() * 16;

            ctx.fillStyle =
                `hsl(95, 35%, ${lightness}%)`;

            ctx.fillRect(x, y, 1, 2);
        }

        const texture = new THREE.CanvasTexture(canvas);

        texture.wrapS = THREE.RepeatWrapping;

        texture.wrapT = THREE.RepeatWrapping;

        texture.repeat.set(42, 42);

        texture.colorSpace = THREE.SRGBColorSpace;

        return texture;
    }

    // ==========================================
    // CITY MATERIALS
    // ==========================================

    const materials = {

        ground: new THREE.MeshStandardMaterial({

            color: 0x4F7942,

            map: createGrassTexture(),

            roughness: 1.2,

            metalness: 0
        }),

        road: new THREE.MeshStandardMaterial({

            color: 0x303b4b,

            roughness: 0.95
        }),

        sidewalk: new THREE.MeshStandardMaterial({

            color: 0x3c4757,

            roughness: 1
        }),

        lot: new THREE.MeshStandardMaterial({

            color: 0x111b2b,

            roughness: 1
        }),

        lane: new THREE.MeshBasicMaterial({

            color: 0x776a50
        })
    };

    // ==========================================
    // GROUND
    // ==========================================

    const ground = new THREE.Mesh(

        new THREE.PlaneGeometry(200, 200),

        materials.ground
    );

    ground.rotation.x = -Math.PI / 2;

    ground.position.y = -0.14;

    ground.receiveShadow = true;

    scene.add(ground);

    // ==========================================
    // RECTANGLE HELPER
    // ==========================================

    function rectangle(
        x,
        z,
        w,
        d,
        y,
        h,
        material
    ) {

        const mesh = new THREE.Mesh(

            new THREE.BoxGeometry(w, h, d),

            material
        );

        mesh.position.set(x, y, z);

        mesh.receiveShadow = true;

        scene.add(mesh);

        return mesh;
    }

    // ==========================================
    // HORIZONTAL ROADS
    // ==========================================

    for (const z of [-18, -6, 6, 18, 30]) {

        rectangle(

            0, z,

            62, 4.4,

            -0.075, 0.06,

            materials.road
        );

        rectangle(

            0, z - 2.6,

            62, 0.55,

            -0.065, 0.08,

            materials.sidewalk
        );

        rectangle(

            0, z + 2.6,

            62, 0.55,

            -0.065, 0.08,

            materials.sidewalk
        );

        for (let x = -17; x <= 17; x += 6) {

            rectangle(

                x, z,

                2.5, 0.08,

                -0.035, 0.015,

                materials.lane
            );
        }
    }

    // ==========================================
    // VERTICAL ROADS
    // ==========================================

    for (const x of [-21, 21]) {

        rectangle(

            x, 6,

            4.4, 72,

            -0.075, 0.06,

            materials.road
        );

        rectangle(

            x - 2.6, 6,

            0.55, 72,

            -0.065, 0.08,

            materials.sidewalk
        );

        rectangle(

            x + 2.6, 6,

            0.55, 72,

            -0.065, 0.08,

            materials.sidewalk
        );

        for (let z = -25; z <= 35; z += 6) {

            rectangle(

                x, z,

                0.08, 2.5,

                -0.035, 0.015,

                materials.lane
            );
        }
    }

    // ==========================================
    // INDUSTRIAL ACCESS ROAD
    // ==========================================

    rectangle(

        0, 33,

        52, 4,

        -0.075, 0.06,

        materials.road
    );

    // ==========================================
    // BUILDING FOUNDATIONS
    // ==========================================

    for (const b of buildings) {

        const residential =
            b.type === "Residential";

        const width =

            b.id === "power" ? 4.5 :

            residential ? 7.6 : 9.5;

        const depth =

            b.id === "power" ? 4.5 :

            residential ? 7.5 : 9.5;

        rectangle(

            b.x,

            b.z,

            width,

            depth,

            -0.095,

            0.045,

            materials.lot
        );
    }

    // ==========================================
    // GLB MODEL FILES
    // ==========================================

    const files = {

        cottage: 'powerquest_cottage.glb',

        townhouse: 'powerquest_townhouse.glb',

        apartments: 'powerquest_apartments.glb',

        hospital: 'powerquest_hospital.glb',

        school: 'powerquest_school.glb',

        water: 'powerquest_water_treatment.glb',

        // Original power station becomes factory.

        factory: 'powerquest_station.glb',

        // Transformer becomes electricity source.

        power: 'powerquest_transformer.glb',

        substation: 'powerquest_substation.glb',

        pole: 'powerquest_utility_pole.glb',

        transformer: 'powerquest_transformer.glb',

        gantry: 'powerquest_transmission_gantry.glb',

        fence: 'powerquest_fence_panel.glb',

        pipe: 'powerquest_pipe_rack.glb',

        crates: 'powerquest_cargo_crates.glb',

        ventilation: 'powerquest_ventilation_unit.glb'
    };

    // ==========================================
    // MODEL CACHE
    // ==========================================

    const cache = new Map();

    function load(file) {

        if (!cache.has(file)) {

            cache.set(

                file,

                new Promise((resolve, reject) => {

                    loader.load(

                        path + file,

                        gltf => resolve(gltf.scene),

                        undefined,

                        reject
                    );
                })
            );
        }

        return cache.get(file);
    }

    // ==========================================
    // MODEL PLACEMENT
    // ==========================================

    function place(
        file,
        x,
        z,
        size,
        building = null
    ) {

        load(file).then(original => {

            const model = original.clone(true);

            // GLB models are authored Z-up.
            // Preserve the original orientation fix.

            model.rotation.x = -Math.PI / 2;

            model.updateMatrixWorld(true);

            // ==================================
            // CALCULATE ORIGINAL DIMENSIONS
            // ==================================

            let box = new THREE.Box3()
                .setFromObject(model);

            const dimensions = new THREE.Vector3();

            box.getSize(dimensions);

            const factor = size / Math.max(

                dimensions.x,

                dimensions.z,

                0.001
            );

            // ==================================
            // SCALE MODEL TO REQUIRED FOOTPRINT
            // ==================================

            model.scale.multiplyScalar(factor);

            model.updateMatrixWorld(true);

            // ==================================
            // RECALCULATE SCALED BOUNDING BOX
            // ==================================

            box = new THREE.Box3()
                .setFromObject(model);

            const center = new THREE.Vector3();

            box.getCenter(center);

            // ==================================
            // CENTRE MODEL AND ALIGN WITH GROUND
            // ==================================

            model.position.set(

                x - center.x,

                -box.min.y,

                z - center.z
            );

            // ==================================
            // MESH PREPARATION
            // ==================================

            model.traverse(child => {

                if (!child.isMesh) return;

                child.castShadow = true;

                child.receiveShadow = true;

                if (

                    child.geometry?.attributes?.position &&

                    !child.geometry.attributes.normal

                ) {

                    child.geometry.computeVertexNormals();
                }

                // ==============================
                // MATERIAL PREPARATION
                // ==============================

                const prep = m => {

                    const copy = m.clone();

                    copy.side = THREE.FrontSide;

                    copy.depthTest = true;

                    copy.depthWrite = true;

                    const materialName =
                        copy.name.toLowerCase();

                    if (copy.isMeshStandardMaterial) {

                        // Window and glass materials.

                        if (

                            /window|glass|pane|glazing/
                                .test(materialName)

                        ) {

                            copy.roughness = 0.12;

                            copy.metalness = 0.15;
                        }

                        // Metal surfaces.

                        else if (

                            /metal|steel|aluminium/
                                .test(materialName)

                        ) {

                            copy.roughness = 0.28;

                            copy.metalness = 0.65;
                        }

                        // Roof surfaces.

                        else if (

                            /roof/.test(materialName)

                        ) {

                            copy.roughness = 0.45;

                            copy.metalness = 0.1;
                        }
                    }

                    return copy;
                };

                if (child.material) {

                    child.material =

                        Array.isArray(child.material)

                            ? child.material.map(prep)

                            : prep(child.material);
                }

                // ==============================
                // PRECISE BUILDING SELECTION
                // ==============================
                //
                // Use the actual GLB mesh geometry
                // instead of invisible rectangular
                // click targets.
                //
                // Every building mesh references
                // its corresponding building data.
                //
                // Three.js raycasting determines
                // which visible surface was clicked.
                //
                // =================================

                if (building) {

                    child.userData.building = building;

                    clickableBuildings.push(child);
                }
            });

            // ==================================
            // ADD MODEL TO SCENE
            // ==================================

            scene.add(model);

            model.updateMatrixWorld(true);

            sunShadowRefresh();

            // ==================================
            // POWERLINE ATTACHMENT REGISTRATION
            // ==================================

            if (powerlines) {

                // Utility pole.

                if (file === files.pole) {

                    powerlines.registerAnchor(

                        model,

                        x,

                        z,

                        "pole"
                    );
                }

                // Transmission gantry.

                else if (file === files.gantry) {

                    powerlines.registerAnchor(

                        model,

                        x,

                        z,

                        "gantry"
                    );
                }

                // Central transformer.

                else if (building?.id === "power") {

                    powerlines.registerAnchor(

                        model,

                        x,

                        z,

                        "transformer"
                    );
                }
            }

        }).catch(error => {

            console.error(

                'GLB failed:',

                file,

                error
            );
        });
    }

    // ==========================================
    // RESIDENTIAL MODEL VARIATIONS
    // ==========================================

    const residentialFiles = [

        files.cottage,

        files.townhouse,

        files.apartments
    ];

    // ==========================================
    // MAIN CITY BUILDINGS
    // ==========================================

    for (let i = 0; i < buildings.length; i++) {

        const b = buildings[i];

        const isHome =
            b.type === "Residential";

        const file =

            isHome

                ? residentialFiles[i % 3]

                : files[b.id];

        // Transformer has a smaller footprint
        // than the other industrial buildings.

        const size =

            b.id === "power" ? 3.5 :

            isHome ? 7.1 : 9;

        if (file) {

            place(

                file,

                b.x,

                b.z,

                size,

                b
            );
        }

        // ======================================
        // ELECTRICITY STATUS INDICATORS
        // ======================================

        if (b.id !== "power") {

            const marker = new THREE.Mesh(

                new THREE.SphereGeometry(

                    0.16,

                    12,

                    8
                ),

                new THREE.MeshBasicMaterial({

                    color: 0xef4444
                })
            );

            marker.position.set(

                b.x,

                isHome ? 8 : 11,

                b.z
            );

            scene.add(marker);

            b.indicator = marker;
        }

        // ======================================
        // INVISIBLE HITBOXES REMOVED
        // ======================================
        //
        // Previously, large invisible boxes
        // surrounded each building.
        //
        // These boxes intercepted clicks even
        // when the cursor was outside the model.
        //
        // Building selection is now handled
        // directly by the GLB meshes registered
        // inside place().
        //
        // No additional click target is needed.
        //
        // ======================================
    }

    // ==========================================
    // SUBSTATIONS
    // ==========================================

    for (const [x, z] of [

        [-29, 20],

        [29, 20]

    ]) {

        place(

            files.substation,

            x,

            z,

            5
        );
    }

    // ==========================================
    // UTILITY POLES
    // ==========================================

    for (const x of [-25, 25]) {

        for (const z of [

            -20,

            -8,

            4,

            16,

            28

        ]) {

            place(

                files.pole,

                x,

                z,

                3.5
            );
        }
    }

    // ==========================================
    // CENTRAL TRANSFORMER
    // ==========================================

    /*
        All decorative transformers are removed.

        The single central transformer is now
        loaded through the main buildings array.

        Building ID: "power"

        Its position is controlled by main.js.

        Its overhead electricity connections
        are controlled by powerlines.js.
    */

    // ==========================================
    // TRANSMISSION GANTRIES
    // ==========================================

    for (const [x, z] of [

        [-30, -26],

        [30, -26],

        [-30, 34],

        [30, 34]

    ]) {

        place(

            files.gantry,

            x,

            z,

            5.5
        );
    }

    // ==========================================
    // INDUSTRIAL PIPE RACKS
    // ==========================================

    for (const [x, z] of [

        [28, 24],

        [28, 30]

    ]) {

        place(

            files.pipe,

            x,

            z,

            4.5
        );
    }

    // ==========================================
    // CARGO CRATES
    // ==========================================

    for (const [x, z] of [

        [25, 18],

        [29, 16],

        [-28, 24]

    ]) {

        place(

            files.crates,

            x,

            z,

            2.2
        );
    }

    // ==========================================
    // VENTILATION UNITS
    // ==========================================

    for (const [x, z] of [

        [11, 32],

        [19, 32]

    ]) {

        place(

            files.ventilation,

            x,

            z,

            2.5
        );
    }

    // ==========================================
    // INDUSTRIAL FENCING
    // ==========================================

    for (const [x, z] of [

        [10, 34],

        [15, 34],

        [20, 34]

    ]) {

        place(

            files.fence,

            x,

            z,

            4
        );
    }

    // ==========================================
    // INITIALIZATION COMPLETE
    // ==========================================

    console.log(

        "PowerQuest — Industrial City loading"
    );

    return clickableBuildings;
}
