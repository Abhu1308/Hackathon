import * as THREE from "three";

// ==========================================
// POWERQUEST — OPTIMIZED BUILDING LIGHTING
// ==========================================

export function createBuildingLights(scene, buildings) {

    // ==========================================
    // PERFORMANCE SETTINGS
    // ==========================================

    const MAX_ACTIVE_LIGHTS = 6;

    const LIGHT_UPDATE_INTERVAL = 0.1;

    const DISCOVERY_INTERVAL = 1.5;

    const LIGHT_RANGE = 22;

    const LIGHT_INTENSITY = 65;

    const WINDOW_INTENSITY = 1.8;

    // ==========================================
    // INTERNAL STATE
    // ==========================================

    const buildingLights = new Map();

    const processedMeshes = new WeakSet();

    const WINDOW_WORDS = /window|glass|pane|glazing/i;

    const warmColor = new THREE.Color(0xffc078);

    const hospitalColor = new THREE.Color(0xd6edff);

    let lastDiscovery = -Infinity;

    let lastUpdate = -Infinity;

    const activeBuildings = [];

    // ==========================================
    // HOSPITAL WINDOW IDENTIFICATION
    // ==========================================

    const hospitalWindowPieces = new Set([
        15, 18, 21, 24, 27,
        30, 33, 36, 39, 42,
        45, 48, 51, 54, 57,
        60, 63, 66, 69, 72,
        75, 78, 81, 84, 87,
        90, 93, 96, 99,
        103,
        175, 176, 177,
        178, 179, 180
    ]);

    function isHospitalWindow(object, building) {

        if (building.id !== "hospital") {
            return false;
        }

        const match = object.name.match(
            /^piece_(\d+)/
        );

        if (!match) return false;

        const pieceNumber = Number(match[1]);

        return hospitalWindowPieces.has(
            pieceNumber
        );
    }

    // ==========================================
    // CREATE BUILDING LIGHTS
    // ==========================================

    for (const building of buildings) {

        if (building.id === "power") continue;

        const group = new THREE.Group();

        group.position.set(
            building.x,
            0,
            building.z
        );

        scene.add(group);

        let lightColor = 0xffb86b;

        if (building.id === "hospital") {

            lightColor = 0xd6edff;

        } else if (building.id === "school") {

            lightColor = 0xffe4aa;

        } else if (building.id === "water") {

            lightColor = 0x80dfff;
        }

        const light = new THREE.PointLight(
            lightColor,
            0,
            LIGHT_RANGE,
            1.5
        );

        // Hospital-specific light placement.

        if (building.id === "hospital") {

            light.position.set(0, 8, 4.8);

        } else {

            light.position.set(0, 5.5, 0);
        }

        light.castShadow = false;

        light.visible = false;

        group.add(light);

        buildingLights.set(building.id, {

            building,

            light,

            windowMaterials: new Set(),

            phase: buildingLights.size * 0.73,

            ratio: 0,

            brightness: 0

        });
    }

    // ==========================================
    // DISCOVER WINDOWS
    // ==========================================

    function discoverWindows() {

        scene.traverse(object => {

            if (!object.isMesh) return;

            if (processedMeshes.has(object)) return;

            const building = object.userData.building;

            if (!building || building.id === "power") {
                return;
            }

            const entry = buildingLights.get(building.id);

            if (!entry) return;

            processedMeshes.add(object);

            const materials = Array.isArray(object.material)
                ? object.material
                : [object.material];

            const hospitalWindow =
                isHospitalWindow(object, building);

            const updatedMaterials = materials.map(material => {

                if (!material) return material;

                const name = [
                    object.name,
                    material.name
                ].join(" ");

                // Standard window detection and
                // hospital-specific mesh detection.

                if (
                    !WINDOW_WORDS.test(name) &&
                    !hospitalWindow
                ) {
                    return material;
                }

                let windowMaterial = material;

                // ==================================
                // HOSPITAL MATERIAL FIX
                // ==================================

                if (building.id === "hospital") {

                    if (!material.emissive) {

                        // Support models without
                        // emissive-compatible materials.

                        windowMaterial =
                            new THREE.MeshStandardMaterial({

                                color: material.color
                                    ? material.color.clone()
                                    : new THREE.Color(0xffffff),

                                vertexColors:
                                    !!object.geometry.attributes.color,

                                map: material.map || null,

                                roughness: 0.25,

                                metalness: 0.1,

                                side: material.side,

                                transparent: material.transparent,

                                opacity: material.opacity,

                                depthWrite: material.depthWrite,

                                depthTest: material.depthTest

                            });

                    } else {

                        // Keep the original material
                        // properties and vertex colors.

                        windowMaterial = material.clone();
                    }

                    windowMaterial.emissive.copy(
                        hospitalColor
                    );

                    windowMaterial.emissiveIntensity =
                        WINDOW_INTENSITY * entry.brightness;

                    windowMaterial.needsUpdate = true;

                } else {

                    // Preserve the original lighting
                    // behavior for all other buildings.

                    if (!windowMaterial.emissive) {
                        return material;
                    }

                    windowMaterial.emissive.copy(
                        warmColor
                    );

                    windowMaterial.emissiveIntensity =
                        WINDOW_INTENSITY * entry.brightness;
                }

                entry.windowMaterials.add(
                    windowMaterial
                );

                return windowMaterial;
            });

            object.material = Array.isArray(object.material)
                ? updatedMaterials
                : updatedMaterials[0];

        });
    }

    // ==========================================
    // ELECTRICITY STATUS
    // ==========================================

    function powerRatio(building) {

        if (
            !building.connected ||
            building.allocated <= 0
        ) {
            return 0;
        }

        return THREE.MathUtils.clamp(
            building.allocated /
            Math.max(1, building.demand),
            0,
            1
        );
    }

    // ==========================================
    // LIGHT PRIORITY
    // ==========================================

    function getPriority(entry) {

        let priority = entry.ratio;

        // Prioritize public infrastructure.

        if (entry.building.id === "hospital") {

            priority += 3;

        } else if (entry.building.id === "water") {

            priority += 2;

        } else if (entry.building.id === "school") {

            priority += 1;
        }

        return priority;
    }

    // ==========================================
    // OPTIMIZED LIGHTING UPDATE
    // ==========================================

    function update(time, daylight = 0) {

        // Discover asynchronously loaded models
        // only once every 1.5 seconds.

        if (time - lastDiscovery >= DISCOVERY_INTERVAL) {

            discoverWindows();

            lastDiscovery = time;
        }

        // Lighting only needs to update 10 times
        // per second instead of every rendered frame.

        if (time - lastUpdate < LIGHT_UPDATE_INTERVAL) {

            return;
        }

        lastUpdate = time;

        activeBuildings.length = 0;

        const nightFactor = 1 - THREE.MathUtils.clamp(
            daylight,
            0,
            1
        );

        // ======================================
        // UPDATE WINDOW ILLUMINATION
        // ======================================

        for (const entry of buildingLights.values()) {

            entry.ratio = powerRatio(entry.building);

            if (entry.ratio <= 0) {

                entry.brightness = 0;

                entry.light.intensity = 0;

                entry.light.visible = false;

                for (const material of entry.windowMaterials) {

                    material.emissiveIntensity = 0;
                }

                continue;
            }

            const variation =
                0.95 +
                0.05 * Math.sin(
                    time * 1.5 + entry.phase
                );

            entry.brightness =
                entry.ratio * variation;

            const isHospital =
                entry.building.id === "hospital";

            // Hospital windows remain visibly
            // illuminated during the daytime.

            const windowBrightness =
                entry.brightness *
                (
                    isHospital
                        ? 0.75 + 0.25 * nightFactor
                        : 0.35 + 0.65 * nightFactor
                );

            for (const material of entry.windowMaterials) {

                material.emissiveIntensity =
                    WINDOW_INTENSITY *
                    windowBrightness;
            }

            activeBuildings.push(entry);
        }

        // ======================================
        // PRIORITIZE ACTIVE POINT LIGHTS
        // ======================================

        activeBuildings.sort(
            (a, b) => getPriority(b) - getPriority(a)
        );

        // ======================================
        // LIMIT GPU LIGHTING WORKLOAD
        // ======================================

        for (let i = 0; i < activeBuildings.length; i++) {

            const entry = activeBuildings[i];

            const isHospital =
                entry.building.id === "hospital";

            // Hospital lighting remains active
            // during both daytime and nighttime.

            const lightFactor = isHospital
                ? Math.max(0.4, nightFactor)
                : nightFactor;

            const enabled =
                i < MAX_ACTIVE_LIGHTS &&
                lightFactor > 0.02;

            entry.light.visible = enabled;

            entry.light.intensity = enabled
                ? LIGHT_INTENSITY *
                  entry.brightness *
                  lightFactor *
                  (isHospital ? 2 : 1)
                : 0;
        }
    }

    return {
        update
    };
}