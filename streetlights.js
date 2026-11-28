
import * as THREE from "three";

// ==========================================
// POWERQUEST — INDUSTRIAL STREETLIGHTS
// ==========================================
// Streetlights placed beside roads.
// Includes warm lighting and subtle flicker.
// Does not change existing gameplay.

export function createStreetlights(scene) {

    const group = new THREE.Group();
    group.name = "PowerQuest Streetlights";

    scene.add(group);

    // ==========================================
    // MATERIALS
    // ==========================================

    const poleMaterial = new THREE.MeshStandardMaterial({
        color: 0x303b48,
        metalness: 0.7,
        roughness: 0.45
    });

    const armMaterial = new THREE.MeshStandardMaterial({
        color: 0x465363,
        metalness: 0.65,
        roughness: 0.4
    });

    const housingMaterial = new THREE.MeshStandardMaterial({
        color: 0x202a35,
        metalness: 0.6,
        roughness: 0.4
    });

    const lamps = [];

    // ==========================================
    // SHARED GEOMETRIES
    // ==========================================

    const poleGeometry = new THREE.CylinderGeometry(
        0.09,
        0.13,
        4.5,
        8
    );

    const armGeometry = new THREE.BoxGeometry(
        1.1,
        0.10,
        0.12
    );

    const housingGeometry = new THREE.BoxGeometry(
        0.48,
        0.15,
        0.34
    );

    const bulbGeometry = new THREE.SphereGeometry(
        0.17,
        10,
        8
    );

    // ==========================================
    // CREATE INDIVIDUAL STREETLIGHT
    // ==========================================

    function addLamp(x, z, rotation = 0) {

        const lampGroup = new THREE.Group();

        lampGroup.position.set(x, 0, z);
        lampGroup.rotation.y = rotation;

        // --------------------------------------
        // MAIN POLE
        // --------------------------------------

        const pole = new THREE.Mesh(
            poleGeometry,
            poleMaterial
        );

        pole.position.y = 2.25;

        lampGroup.add(pole);

        // --------------------------------------
        // HORIZONTAL ARM
        // --------------------------------------

        const arm = new THREE.Mesh(
            armGeometry,
            armMaterial
        );

        arm.position.set(
            0.52,
            4.35,
            0
        );

        lampGroup.add(arm);

        // --------------------------------------
        // LAMP HOUSING
        // --------------------------------------

        const housing = new THREE.Mesh(
            housingGeometry,
            housingMaterial
        );

        housing.position.set(
            1.05,
            4.27,
            0
        );

        lampGroup.add(housing);

        // --------------------------------------
        // GLOWING BULB
        // --------------------------------------

        const bulbMaterial =
            new THREE.MeshBasicMaterial({
                color: 0xffd18a,
                toneMapped: false
            });

        const bulb = new THREE.Mesh(
            bulbGeometry,
            bulbMaterial
        );

        bulb.position.set(
            1.05,
            4.12,
            0
        );

        lampGroup.add(bulb);

        // --------------------------------------
        // ACTUAL ROAD LIGHT
        // --------------------------------------

        
        // ======================================
        // WARM AMBER STREETLIGHT
        // ======================================

        // Soft illumination around the bulb
        const light = new THREE.PointLight(
            0xffb765,
            9,
            15,
            2
        );

        light.position.copy(bulb.position);
        lampGroup.add(light);

        // Focused downward beam
        
const spotlight = new THREE.SpotLight(
    0xffc47a,
    85,             // Brighter light
    18,             // Light range
    Math.PI / 3,    // Wider beam
    0.65,           // Soft edges
    1.2            // Distance falloff
);


        spotlight.position.copy(bulb.position);

        // Aim slightly toward the road
        spotlight.target.position.set(
            1.05,
            0,
            0
        );

        lampGroup.add(spotlight);
        lampGroup.add(spotlight.target);


        // --------------------------------------
        // SOFT LIGHT HALO
        // --------------------------------------

        const haloMaterial =
            new THREE.SpriteMaterial({
                color: 0xffc87c,
                transparent: true,
                opacity: 0.25,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });

        const halo = new THREE.Sprite(
            haloMaterial
        );

        halo.position.copy(bulb.position);

        halo.scale.set(
            1.1,
            1.1,
            1
        );

        lampGroup.add(halo);

        // --------------------------------------
        // ADD TO SCENE
        // --------------------------------------

        group.add(lampGroup);

        lamps.push({
            light,
            spotlight,
            bulb,
            halo,
            phase: lamps.length * 1.7
        });
    }

    // ==========================================
    // STREETLIGHT PLACEMENT
    // ==========================================

    // Vertical roads are near X = -21 and X = 21.
    // Poles are positioned outside the roads.
    // Lamp arms point inward toward the streets.

    const verticalRoadPositions = [
        -18,
        -6,
        6,
        18,
        30
    ];

    for (const z of verticalRoadPositions) {

        // Left sidewalk — faces right (+X)
        addLamp(
            -24,
            z,
            0
        );

        // Right sidewalk — faces left (-X)
        addLamp(
            24,
            z,
            Math.PI
        );
    }

    // ==========================================
    // HORIZONTAL ROAD STREETLIGHTS
    // ==========================================

    // Arms are rotated to point along Z,
    // toward the horizontal roads.

    const horizontalRoadPositions = [
        -15,
        -5,
        5,
        15
    ];

    for (const x of horizontalRoadPositions) {

        // Front sidewalk — faces inward (+Z)
        addLamp(
            x,
            -27,
            -Math.PI / 2
        );

        // Rear sidewalk — faces inward (-Z)
        addLamp(
            x,
            33,
            Math.PI / 2
        );
    }

    // ==========================================
    // ANIMATION
    // ==========================================

    function update(time) {

        for (const lamp of lamps) {

            // Very subtle industrial flicker
            const flicker =
                0.96 +
                0.04 * Math.sin(
                    time * 3 + lamp.phase
                );

            lamp.light.intensity = 9 * flicker;
            lamp.spotlight.intensity = 85 * flicker;

            lamp.halo.material.opacity =
                0.25 * flicker;

            lamp.bulb.material.color.setRGB(
                1,
                0.82 * flicker,
                0.54 * flicker
            );
        }
    }

    // ==========================================
    // PUBLIC API
    // ==========================================

    return {
        update
    };
}
