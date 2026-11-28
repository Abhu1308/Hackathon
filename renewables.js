
import * as THREE from "three";

import {
    GLTFLoader
} from "three/addons/loaders/GLTFLoader.js";

import {
    createWindTurbines
} from "./wind-turbines.js";

export const CATALOG = {

    solar: {
        name: "Solar farm",
        price: 400,
        maintenance: 15,
        limit: 4,
        description:
            "Five panels · 75 kWh per daytime round"
    },

    wind: {
        name: "Wind farm",
        price: 500,
        maintenance: 50,
        limit: 2,
        description:
            "Three turbines · 10 / 30 / 150 kWh depending on weather"
    },

    battery: {
        name: "Battery storage",
        price: 50,
        maintenance: 5,
        limit: 8,
        description:
            "37.5 kWh · 75% charging efficiency"
    }
};

export function createRenewables(scene, campaign) {

    const counts = {
        solar: 0,
        battery: 0,
        wind: 0
    };

    const turbines = createWindTurbines(scene);

    const weather = round =>
        campaign[round - 1]?.weather || "Normal";

    let stored = 0;

    const loader = new GLTFLoader();

    const cache = new Map();

    const group = new THREE.Group();

    scene.add(group);

    const padMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x26323c,
            roughness: 0.9
        });

    const fenceMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x64748b
        });

    function refreshShadows() {

        scene.traverse(object => {

            if (
                object.isDirectionalLight &&
                object.shadow
            ) {
                object.shadow.needsUpdate = true;
            }
        });
    }

    function box(
        parent,
        w, h, d,
        x, y, z,
        material
    ) {

        const m = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            material
        );

        m.position.set(x, y, z);

        m.castShadow = true;
        m.receiveShadow = true;

        parent.add(m);

        return m;
    }

    function model(
        parent,
        file,
        x,
        z,
        size
    ) {

        if (!cache.has(file)) {

            cache.set(
                file,
                loader.loadAsync("./" + file)
                    .then(gltf => gltf.scene)
            );
        }

        cache.get(file).then(original => {

            const m = original.clone(true);

            m.rotation.x = -Math.PI / 2;

            m.updateMatrixWorld(true);

            let bounds =
                new THREE.Box3().setFromObject(m);

            const dimensions =
                bounds.getSize(new THREE.Vector3());

            m.scale.multiplyScalar(
                size / Math.max(
                    dimensions.x,
                    dimensions.z,
                    0.001
                )
            );

            m.updateMatrixWorld(true);

            bounds =
                new THREE.Box3().setFromObject(m);

            const center =
                bounds.getCenter(new THREE.Vector3());

            m.position.set(
                x - center.x,
                0.04 - bounds.min.y,
                z - center.z
            );

            m.traverse(object => {

                if (object.isMesh) {

                    object.castShadow = true;

                    object.receiveShadow = true;
                }
            });

            parent.add(m);

            refreshShadows();

        }).catch(error => {

            console.error(
                "Renewable asset failed",
                file,
                error
            );

            box(
                parent,
                size,
                0.8,
                size * 0.6,
                x,
                0.44,
                z,
                padMaterial
            );

            refreshShadows();
        });
    }

    function spawn(type, i) {

        // WIND FARM

        if (type === "wind") {

            turbines.spawn(i);

            refreshShadows();

            return;
        }

        const plot = new THREE.Group();

        group.add(plot);

        // SOLAR FARM

        if (type === "solar") {

            plot.position.set(
                i < 2 ? 42 : -42,
                0,
                i % 2 === 0 ? -12 : 12
            );

            box(
                plot,
                16, 0.12, 18,
                0, -0.06, 0,
                padMaterial
            );

            const panelPositions = [
                [-5, -4],
                [0, -4],
                [5, -4],
                [-2.5, 3],
                [2.5, 3]
            ];

            for (const [x, z] of panelPositions) {

                model(
                    plot,
                    "powerquest_solar_panel.glb",
                    x,
                    z,
                    4
                );
            }

            // Side fencing.

            for (const x of [-7.8, 7.8]) {

                box(
                    plot,
                    0.12, 0.12, 17,
                    x, 0.8, 0,
                    fenceMaterial
                );

                for (
                    let z = -8;
                    z <= 8;
                    z += 4
                ) {

                    box(
                        plot,
                        0.15, 1.2, 0.15,
                        x, 0.6, z,
                        fenceMaterial
                    );
                }
            }

            // Front and rear fencing.

            for (const z of [-8.8, 8.8]) {

                box(
                    plot,
                    15.6, 0.12, 0.12,
                    0, 0.8, z,
                    fenceMaterial
                );
            }

            // Inverter.

            box(
                plot,
                1.2, 1.1, 0.8,
                0, 0.55, 7,
                fenceMaterial
            );

        } else {

            // BATTERY STORAGE

            plot.position.set(
                -14 + (i % 4) * 8,
                0,
                43 + Math.floor(i / 4) * 5
            );

            box(
                plot,
                4, 0.12, 4,
                0, -0.06, 0,
                padMaterial
            );

            model(
                plot,
                "powerquest_battery.glb",
                0,
                0,
                2.8
            );
        }

        refreshShadows();
    }

    // SOLAR GENERATION

    function solarGeneration(day) {

        return day % 2
            ? counts.solar * 75
            : 0;
    }

    // WIND GENERATION

    function windGeneration(day) {

        const condition = weather(day);

        const output =
            condition === "Windy"
                ? 150
                : condition === "Heatwave"
                    ? 10
                    : 30;

        return counts.wind * output;
    }

    // TOTAL RENEWABLE GENERATION

    function generation(day) {

        return (
            solarGeneration(day) +
            windGeneration(day)
        );
    }

    // BATTERY CAPACITY

    function storageCapacity() {

        return counts.battery * 37.5;
    }

    // DAILY MAINTENANCE

    function maintenance() {

        return (
            counts.solar * 15 +
            counts.battery * 5 +
            counts.wind * 50
        );
    }

    // PROJECTED ENERGY DISTRIBUTION

    function preview(day, used, base) {

        const solar = solarGeneration(day);

        const wind = windGeneration(day);

        const solarUsed = Math.min(
            used,
            solar
        );

        const windUsed = Math.min(
            used - solarUsed,
            wind
        );

        const discharge = Math.min(
            stored,
            Math.max(
                0,
                used - solarUsed - windUsed - base
            )
        );

        const conventional = Math.max(
            0,
            used -
            solarUsed -
            windUsed -
            discharge
        );

        const charge = Math.min(

            storageCapacity() -
            stored +
            discharge,

            Math.max(
                0,
                solar +
                wind -
                solarUsed -
                windUsed
            ) * 0.75
        );

        return {
            solar,
            wind,
            solarUsed,
            windUsed,
            discharge,
            conventional,
            charge,
            nextStored:
                stored - discharge + charge
        };
    }

    return {

        counts,

        generation,

        weather,

        update(time, day) {

            turbines.update(
                time,
                weather(day)
            );
        },

        storageCapacity,

        maintenance,

        preview,

        get stored() {

            return stored;
        },

        buy(type) {

            if (
                !CATALOG[type] ||
                counts[type] >= CATALOG[type].limit
            ) {
                return false;
            }

            spawn(
                type,
                counts[type]++
            );

            return true;
        },

        settle(day, used, base) {

            const projection = preview(
                day,
                used,
                base
            );

            stored = projection.nextStored;

            return projection;
        }
    };
}
