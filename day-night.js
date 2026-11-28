import * as THREE from "three";

import { GLTFLoader } from
    "three/addons/loaders/GLTFLoader.js";

// =============================================
// POWERQUEST — DAY / NIGHT SYSTEM
// =============================================

export function createDayNightCycle(scene) {

    // =========================================
    // CONFIGURATION
    // =========================================

    const SUN_SIZE = 8;
    const MOON_SIZE = 7;

    // Actual light source positions

    const SUN_POSITION = new THREE.Vector3(
        35, 35, 45
    );

    const MOON_POSITION = new THREE.Vector3(
        -35, 25, -35
    );

    const MOON_VISUAL_POSITION = new THREE.Vector3(
        -105, 75, -105
    );

    // Separate visual Sun position

    const SUN_VISUAL_POSITION = new THREE.Vector3(
        105, 105, 135
    );

    const loader = new GLTFLoader();

    // =========================================
    // DISABLE OLD GLOBAL LIGHTING
    // =========================================

    scene.traverse((object) => {

        if (
            object.isAmbientLight ||
            object.isHemisphereLight ||
            object.isDirectionalLight
        ) {
            object.intensity = 0;
        }

    });

    // =========================================
    // SKY COLOURS
    // =========================================

    const daySky = new THREE.Color(0x91c5ed);

    const nightSky = new THREE.Color(0x101c30);

    const sky = daySky.clone();

    const dayAmbient = new THREE.Color(0xe4f1ff);

    const nightAmbient = new THREE.Color(0x9dbde8);

    // =========================================
    // AMBIENT LIGHTING
    // =========================================

    const ambient = new THREE.HemisphereLight(
        0xb5d5ff,
        0x526070,
        1.35
    );

    scene.add(ambient);

    // =========================================
    // SUNLIGHT
    // =========================================

    const sun = new THREE.DirectionalLight(
        0xfff1d6,
        2.2
    );

    sun.position.copy(SUN_POSITION);

    scene.add(sun);
    scene.add(sun.target);

    // =========================================
    // MOONLIGHT
    // =========================================

    const moon = new THREE.DirectionalLight(
        0xb5d4ff,
        0
    );

    moon.position.copy(MOON_POSITION);

    scene.add(moon);
    scene.add(moon.target);

    // =========================================
    // SHADOW CONFIGURATION
    // =========================================

    function configureShadows(light) {

        light.castShadow = true;

        // Preserve optimized shadow resolution.

        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;

        // Restore original shadow coverage.

        light.shadow.camera.left = -45;
        light.shadow.camera.right = 45;

        light.shadow.camera.top = 45;
        light.shadow.camera.bottom = -45;

        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 180;

        // Adjusted shadow bias.
        // Disable normal bias to test boundary artifacts.

        light.shadow.bias = -0.001;
        light.shadow.normalBias = 0;

        light.shadow.radius = 1;

        // Preserve optimized shadow updates.

        light.shadow.autoUpdate = false;
        light.shadow.needsUpdate = true;

        light.shadow.camera.updateProjectionMatrix();

    }

    configureShadows(sun);
    configureShadows(moon);

    moon.castShadow = false;

    // =========================================
    // VISUAL SUN GROUP
    // =========================================

    const sunGroup = new THREE.Group();

    sunGroup.name = "Visual Sun";

    sunGroup.position.copy(SUN_VISUAL_POSITION);

    scene.add(sunGroup);

    // =========================================
    // LOAD WHITE SUN MODEL
    // =========================================

    loader.load(

        "./powerquest_sun.glb",

        (gltf) => {

            const model = gltf.scene;

            model.updateMatrixWorld(true);

            const box = new THREE.Box3()
                .setFromObject(model);

            const size = box.getSize(
                new THREE.Vector3()
            );

            const largestDimension = Math.max(
                size.x,
                size.y,
                size.z,
                0.001
            );

            const scale = SUN_SIZE / largestDimension;

            model.scale.multiplyScalar(scale);

            model.updateMatrixWorld(true);

            const scaledBox = new THREE.Box3()
                .setFromObject(model);

            const center = scaledBox.getCenter(
                new THREE.Vector3()
            );

            model.position.sub(center);

            model.traverse((child) => {

                if (!child.isMesh) return;

                // Pure white visual Sun.
                // Original orange textures are removed.

                child.material =
                    new THREE.MeshBasicMaterial({

                        color: 0xffffff,

                        fog: false,

                        toneMapped: false

                    });

                child.castShadow = false;
                child.receiveShadow = false;

            });

            sunGroup.add(model);

            console.log("White Sun model loaded.");

        },

        undefined,

        (error) => {

            console.warn(
                "Sun GLB could not be loaded.",
                error
            );

            const fallbackSun = new THREE.Mesh(

                new THREE.SphereGeometry(
                    SUN_SIZE / 2,
                    32,
                    32
                ),

                new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    fog: false,
                    toneMapped: false
                })

            );

            sunGroup.add(fallbackSun);

        }

    );

    // =========================================
    // WHITE SUN HALO
    // =========================================

    const sunCanvas = document.createElement("canvas");

    sunCanvas.width = 128;
    sunCanvas.height = 128;

    const sunContext = sunCanvas.getContext("2d");

    const sunGradient =
        sunContext.createRadialGradient(
            64, 64, 0,
            64, 64, 64
        );

    sunGradient.addColorStop(
        0.0,
        "rgba(255,255,255,1)"
    );

    sunGradient.addColorStop(
        0.2,
        "rgba(255,255,255,0.7)"
    );

    sunGradient.addColorStop(
        0.5,
        "rgba(240,248,255,0.2)"
    );

    sunGradient.addColorStop(
        1.0,
        "rgba(255,255,255,0)"
    );

    sunContext.fillStyle = sunGradient;

    sunContext.fillRect(0, 0, 128, 128);

    const sunHaloTexture =
        new THREE.CanvasTexture(sunCanvas);

    sunHaloTexture.colorSpace =
        THREE.SRGBColorSpace;

    const sunHaloMaterial =
        new THREE.SpriteMaterial({

            map: sunHaloTexture,

            color: 0xffffff,

            transparent: true,

            opacity: 0.85,

            blending: THREE.AdditiveBlending,

            depthWrite: false,

            fog: false,

            toneMapped: false

        });

    const sunHalo = new THREE.Sprite(
        sunHaloMaterial
    );

    sunHalo.scale.set(18, 18, 1);

    sunGroup.add(sunHalo);

    // =========================================
    // VISUAL MOON GROUP
    // =========================================

    const moonGroup = new THREE.Group();

    moonGroup.name = "Visual Moon";

    moonGroup.position.copy(MOON_VISUAL_POSITION);

    moonGroup.visible = false;

    scene.add(moonGroup);

    // =========================================
    // LOAD MOON MODEL
    // =========================================

    loader.load(

        "./powerquest_moon.glb",

        (gltf) => {

            const model = gltf.scene;

            model.updateMatrixWorld(true);

            const box = new THREE.Box3()
                .setFromObject(model);

            const size = box.getSize(
                new THREE.Vector3()
            );

            const largestDimension = Math.max(
                size.x,
                size.y,
                size.z,
                0.001
            );

            const scale = MOON_SIZE / largestDimension;

            model.scale.multiplyScalar(scale);

            model.updateMatrixWorld(true);

            const scaledBox = new THREE.Box3()
                .setFromObject(model);

            const center = scaledBox.getCenter(
                new THREE.Vector3()
            );

            model.position.sub(center);

            model.traverse((child) => {

                if (!child.isMesh) return;

                const originalMaterial = child.material;

                function createMoonMaterial(material) {

                    return new THREE.MeshBasicMaterial({

                        color: 0xf0f4ff,

                        map: material?.map || null,

                        fog: false,

                        toneMapped: false

                    });

                }

                if (Array.isArray(originalMaterial)) {

                    child.material = originalMaterial.map(
                        createMoonMaterial
                    );

                } else {

                    child.material = createMoonMaterial(
                        originalMaterial
                    );

                }

                child.castShadow = false;
                child.receiveShadow = false;

            });

            moonGroup.add(model);

            console.log("Moon model loaded.");

        },

        undefined,

        (error) => {

            console.warn(
                "Moon GLB could not be loaded.",
                error
            );

            const fallbackMoon = new THREE.Mesh(

                new THREE.SphereGeometry(
                    MOON_SIZE / 2,
                    32,
                    32
                ),

                new THREE.MeshBasicMaterial({

                    color: 0xd6e5ff,

                    fog: false,

                    toneMapped: false

                })

            );

            moonGroup.add(fallbackMoon);

        }

    );

    // =========================================
    // MOON HALO
    // =========================================

    const moonCanvas =
        document.createElement("canvas");

    moonCanvas.width = 128;
    moonCanvas.height = 128;

    const moonContext =
        moonCanvas.getContext("2d");

    const moonGradient =
        moonContext.createRadialGradient(
            64, 64, 0,
            64, 64, 64
        );

    moonGradient.addColorStop(
        0.0,
        "rgba(220,235,255,0.9)"
    );

    moonGradient.addColorStop(
        0.2,
        "rgba(190,215,255,0.5)"
    );

    moonGradient.addColorStop(
        0.5,
        "rgba(130,175,255,0.15)"
    );

    moonGradient.addColorStop(
        1.0,
        "rgba(100,150,255,0)"
    );

    moonContext.fillStyle = moonGradient;

    moonContext.fillRect(0, 0, 128, 128);

    const moonHaloTexture =
        new THREE.CanvasTexture(moonCanvas);

    moonHaloTexture.colorSpace =
        THREE.SRGBColorSpace;

    const moonHaloMaterial =
        new THREE.SpriteMaterial({

            map: moonHaloTexture,

            color: 0xffffff,

            transparent: true,

            opacity: 0,

            blending: THREE.AdditiveBlending,

            depthWrite: false,

            fog: false,

            toneMapped: false

        });

    const moonHalo = new THREE.Sprite(
        moonHaloMaterial
    );

    moonHalo.scale.set(15, 15, 1);

    moonGroup.add(moonHalo);

    // =========================================
    // DAY / NIGHT STATE
    // =========================================

    let daylight = 1;

    let previousTime = null;

    let previousShadowState = true;

    // =========================================
    // UPDATE FUNCTION
    // =========================================

    function update(time, currentDay = 1) {

        // Frame-independent transition speed

        const delta = previousTime === null

            ? 0

            : Math.max(
                0,
                Math.min(time - previousTime, 0.1)
            );

        previousTime = time;

        // Odd days = daytime
        // Even days = nighttime

        const targetDaylight =
            currentDay % 2 === 1 ? 1 : 0;

        daylight = THREE.MathUtils.lerp(

            daylight,

            targetDaylight,

            1 - Math.exp(-delta * 1.5)

        );

        const night = 1 - daylight;

        // =====================================
        // GLOBAL LIGHTING
        // =====================================

        sun.intensity = 2.2 * daylight;

        moon.intensity = 1.05 * night;

        ambient.intensity = THREE.MathUtils.lerp(

            0.85,

            1.35,

            daylight

        );

        ambient.color
            .copy(nightAmbient)
            .lerp(dayAmbient, daylight);

        // =====================================
        // SKY TRANSITION
        // =====================================

        sky.copy(nightSky).lerp(
            daySky,
            daylight
        );

        if (scene.background?.isColor) {

            scene.background.copy(sky);

        } else {

            scene.background = sky.clone();

        }

        if (scene.fog) {

            scene.fog.color.copy(sky);

        }

        // =====================================
        // VISUAL SUN MOVEMENT
        // =====================================

        sunGroup.visible = daylight > 0.02;

        sunGroup.position.x =
            SUN_VISUAL_POSITION.x;

        sunGroup.position.z =
            SUN_VISUAL_POSITION.z;

        sunGroup.position.y =
            -36 + 141 * daylight;

        sunHaloMaterial.opacity =
            daylight * 0.85;

        // Actual sunlight position remains fixed.
        // Only the visible Sun model moves.

        // =====================================
        // VISUAL MOON MOVEMENT
        // =====================================

        moonGroup.visible = night > 0.02;

        moonGroup.position.y = -36 + 111 * night;

        moonHaloMaterial.opacity =
            night * 0.65;

        // =====================================
        // OPTIMIZED SHADOW SWITCHING
        // =====================================

        const isDaytime = daylight >= 0.5;

        if (previousShadowState !== isDaytime) {

            sun.castShadow = isDaytime;

            moon.castShadow = !isDaytime;

            sun.shadow.needsUpdate = isDaytime;

            moon.shadow.needsUpdate = !isDaytime;

            previousShadowState = isDaytime;

        }

        // Used by building-lights.js

        return daylight;

    }

    // =========================================
    // PUBLIC INTERFACE
    // =========================================

    return {

        update,

        sun,

        moon,

        ambient,

        sunGroup,

        moonGroup

    };

}