
import * as THREE from "three";

export function createWindTurbines(scene) {

    const rotors = [];

    const white = new THREE.MeshStandardMaterial({
        color: 0xe5e7eb,
        roughness: 0.45
    });

    const base = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.9
    });

    const red = new THREE.MeshBasicMaterial({
        color: 0xff3333
    });

    function mesh(
        parent,
        geometry,
        material,
        x,
        y,
        z
    ) {
        const m = new THREE.Mesh(
            geometry,
            material
        );

        m.position.set(x, y, z);

        m.castShadow = true;
        m.receiveShadow = true;

        parent.add(m);

        return m;
    }

    function spawn(index) {

        const farm = new THREE.Group();

        farm.position.set(
            index ? -43 : 43,
            0,
            -40
        );

        scene.add(farm);

        // Concrete foundation.

        mesh(
            farm,
            new THREE.BoxGeometry(23, 0.15, 20),
            base,
            0, -0.075, 0
        );

        const positions = [
            [-7, -5],
            [7, -5],
            [0, 6]
        ];

        for (const [x, z] of positions) {

            const turbine = new THREE.Group();

            turbine.position.set(x, 0, z);

            farm.add(turbine);

            // Turbine foundation.

            mesh(
                turbine,
                new THREE.CylinderGeometry(
                    1.5, 1.8, 0.4, 16
                ),
                base,
                0, 0.2, 0
            );

            // Main tapered tower.

            mesh(
                turbine,
                new THREE.CylinderGeometry(
                    0.25, 0.65, 12, 16
                ),
                white,
                0, 6.4, 0
            );

            // Generator housing.

            mesh(
                turbine,
                new THREE.BoxGeometry(
                    1.1, 1, 2
                ),
                white,
                0, 12.5, 0
            );

            // Aviation warning light.

            mesh(
                turbine,
                new THREE.SphereGeometry(
                    0.13, 8, 8
                ),
                red,
                0, 13.1, -0.5
            );

            // Rotating blade assembly.

            const rotor = new THREE.Group();

            rotor.position.set(
                0, 12.5, 1.2
            );

            turbine.add(rotor);

            rotors.push(rotor);

            // Central rotor hub.

            mesh(
                rotor,
                new THREE.SphereGeometry(
                    0.55, 12, 12
                ),
                white,
                0, 0, 0
            );

            // Three blades spaced 120 degrees apart.

            for (let i = 0; i < 3; i++) {

                const blade = new THREE.Group();

                blade.rotation.z =
                    i * Math.PI * 2 / 3;

                rotor.add(blade);

                mesh(
                    blade,
                    new THREE.BoxGeometry(
                        0.45, 4.8, 0.16
                    ),
                    white,
                    0, 2.7, 0
                );

                // Red blade tips.

                mesh(
                    blade,
                    new THREE.BoxGeometry(
                        0.45, 0.35, 0.17
                    ),
                    red,
                    0, 5, 0
                );
            }
        }
    }

    let last = null;

    function update(time, weather) {

        const dt =
            last === null
                ? 0
                : Math.min(
                    0.1,
                    Math.max(0, time - last)
                );

        last = time;

        const speed =
            weather === "Windy"
                ? 3.2
                : weather === "Heatwave"
                    ? 0.2
                    : 1;

        for (const rotor of rotors) {
            rotor.rotation.z += dt * speed;
        }
    }

    return {
        spawn,
        update
    };
}
