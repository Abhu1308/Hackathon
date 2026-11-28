import * as THREE from "three";

export function createPowerlines(scene, buildings) {

    const group = new THREE.Group();

    group.name = "Overhead Powerlines";

    scene.add(group);

    // ==========================================
    // SETTINGS
    // ==========================================

    const WIRE_RADIUS = 0.035;

    const WIRE_SPACING = 0.65;

    const WIRE_SAG = 0.85;

    const ATTACHMENT_OFFSET = 0.35;

    const SEGMENTS = 24;

    const PULSE_SPEED = 7;

    const spans = [];

    const anchors = new Map();

    let built = false;

    // ==========================================
    // MATERIALS
    // ==========================================

    const wireMaterial = new THREE.MeshStandardMaterial({

        color: 0x252932,

        roughness: 0.85,

        metalness: 0.25

    });

    const pulseGeometry = new THREE.SphereGeometry(

        0.095, 8, 6

    );

    const pulseMaterial = new THREE.MeshBasicMaterial({

        color: 0x00d9ff,

        transparent: true,

        opacity: 0.9,

        toneMapped: false

    });

    const cyan = new THREE.Color(0x00d9ff);

    const amber = new THREE.Color(0xf5b942);

    const red = new THREE.Color(0xef4444);

    // ==========================================
    // REGISTER ELECTRICITY INFRASTRUCTURE
    // ==========================================

    function registerAnchor(model, x, z, type) {

        model.updateMatrixWorld(true);

        const box = new THREE.Box3()
            .setFromObject(model);

        if (box.isEmpty()) return;

        let attachmentPoints;

        // ======================================
        // UTILITY POLE
        // ======================================

        if (type === "pole") {

            attachmentPoints = [

                new THREE.Vector3(-1.32, 0, 7.94),

                new THREE.Vector3(0, 0, 7.94),

                new THREE.Vector3(1.32, 0, 7.94)

            ].map(point => model.localToWorld(point));

        }

        // ======================================
        // CENTRAL TRANSFORMER
        // ======================================

        else if (type === "transformer") {

            attachmentPoints = [

                new THREE.Vector3(-0.9, 0, 4.425),

                new THREE.Vector3(0, 0, 4.425),

                new THREE.Vector3(0.9, 0, 4.425)

            ].map(point => model.localToWorld(point));

        }

        // ======================================
        // TRANSMISSION GANTRY
        // ======================================

        else {

            const height = Math.max(

                0.2,

                box.max.y - ATTACHMENT_OFFSET

            );

            attachmentPoints = [

                new THREE.Vector3(
                    x - WIRE_SPACING,
                    height,
                    z
                ),

                new THREE.Vector3(
                    x,
                    height,
                    z
                ),

                new THREE.Vector3(
                    x + WIRE_SPACING,
                    height,
                    z
                )

            ];

        }

        anchors.set(`${x},${z}`, {

            x,

            z,

            type,

            attachmentPoints

        });

        built = false;

    }

    // ==========================================
    // SAGGING WIRE CURVE
    // ==========================================

    function createWireCurve(start, end, sagFactor = 1) {

        const distance = Math.hypot(

            end.x - start.x,

            end.z - start.z

        );

        const sag = Math.min(

            WIRE_SAG * distance / 12 * sagFactor,

            2.5,

            Math.max(

                0,

                Math.min(start.y, end.y) - 0.2

            )

        );

        const points = [];

        for (let i = 0; i <= SEGMENTS; i++) {

            const t = i / SEGMENTS;

            const point = new THREE.Vector3()
                .lerpVectors(start, end, t);

            point.y -= 4 * sag * t * (1 - t);

            points.push(point);

        }

        return new THREE.CatmullRomCurve3(points);

    }

    // ==========================================
    // CONNECT TWO SUPPORTS
    // ==========================================

    function createSpan(

        anchorA,

        anchorB,

        side,

        isSource = false

    ) {

        if (!anchorA || !anchorB) return;

        for (let i = 0; i < 3; i++) {

            const start = anchorA.attachmentPoints[i];

            const end = anchorB.attachmentPoints[i];

            if (!start || !end) continue;

            const curve = createWireCurve(

                start,

                end,

                isSource ? 0.45 : 1

            );

            const geometry = new THREE.TubeGeometry(

                curve,

                SEGMENTS,

                WIRE_RADIUS,

                4,

                false

            );

            const wire = new THREE.Mesh(

                geometry,

                wireMaterial

            );

            wire.castShadow = false;

            wire.receiveShadow = false;

            group.add(wire);

            // Animated electricity on centre wire.

            if (i === 1) {

                const pulse = new THREE.Mesh(

                    pulseGeometry,

                    pulseMaterial.clone()

                );

                pulse.visible = false;

                group.add(pulse);

                spans.push({

                    curve,

                    pulse,

                    side,

                    isSource,

                    length: curve.getLength(),

                    phase: spans.length * 0.19

                });

            }

        }

    }

    // ==========================================
    // REMOVE OLD WIRES
    // ==========================================

    function clearNetwork() {

        for (const child of [...group.children]) {

            if (child.geometry !== pulseGeometry) {

                child.geometry.dispose();

            }

            if (child.material !== wireMaterial) {

                child.material.dispose();

            }

            group.remove(child);

        }

        spans.length = 0;

    }

    // ==========================================
    // BUILD OVERHEAD NETWORK
    // ==========================================

    function buildNetwork() {

        clearNetwork();

        // ======================================
        // WESTERN AND EASTERN POWERLINES
        // ======================================

        for (const side of [-1, 1]) {

            const supports = [

                anchors.get(`${side * 30},-26`),

                anchors.get(`${side * 25},-20`),

                anchors.get(`${side * 25},-8`),

                anchors.get(`${side * 25},4`),

                anchors.get(`${side * 25},16`),

                anchors.get(`${side * 25},28`),

                anchors.get(`${side * 30},34`)

            ];

            for (let i = 1; i < supports.length; i++) {

                // Wait until both adjacent models
                // have finished loading.

                if (

                    !supports[i - 1] ||

                    !supports[i]

                ) {

                    continue;

                }

                createSpan(

                    supports[i - 1],

                    supports[i],

                    side

                );

            }

        }

        // ======================================
        // CONNECT OUTER TRANSMISSION GANTRIES
        // ======================================

        for (const z of [-26, 34]) {

            const left = anchors.get(`-30,${z}`);

            const right = anchors.get(`30,${z}`);

            if (left && right) {

                createSpan(

                    left,

                    right,

                    0

                );

            }

        }

        // ======================================
        // CENTRAL TRANSFORMER CONNECTION
        // ======================================

        const transformer = buildings.find(

            b => b.id === "power"

        );

        if (transformer) {

            const transformerAnchor = anchors.get(

                `${transformer.x},${transformer.z}`

            );

            const westGantry = anchors.get(

                "-30,-26"

            );

            if (

                transformerAnchor &&

                transformerAnchor.type === "transformer" &&

                westGantry

            ) {

                createSpan(

                    transformerAnchor,

                    westGantry,

                    0,

                    true

                );

            }

        }

        built = true;

    }

    // ==========================================
    // GRID STATUS
    // ==========================================

    function getSideStatus(side) {

        const consumers = buildings.filter(b =>

            b.id !== "power" &&

            (

                side === 0 ||

                Math.sign(b.x) === side

            )

        );

        let allocated = 0;

        let demand = 0;

        for (const b of consumers) {

            if (!b.connected) continue;

            allocated += b.allocated;

            demand += b.demand;

        }

        return {

            allocated,

            ratio: demand > 0

                ? Math.min(1, allocated / demand)

                : 0

        };

    }

    // ==========================================
    // ANIMATION
    // ==========================================

    function update(time, capacity, daylight = 1) {

        if (!built) {

            buildNetwork();

        }

        const totalAllocated = buildings.reduce(

            (sum, b) => sum + b.allocated,

            0

        );

        const overloaded = totalAllocated > capacity;

        const night = 1 - THREE.MathUtils.clamp(

            daylight,

            0,

            1

        );

        const statuses = {

            "-1": getSideStatus(-1),

            "0": getSideStatus(0),

            "1": getSideStatus(1)

        };

        for (const span of spans) {

            const status = statuses[span.side];

            span.pulse.visible =

                status.allocated > 0;

            if (!span.pulse.visible) continue;

            // ==================================
            // ELECTRICITY STATUS COLOURS
            // ==================================

            if (overloaded) {

                span.pulse.material.color.copy(red);

            }

            else if (status.ratio >= 0.99) {

                span.pulse.material.color.copy(cyan);

            }

            else {

                span.pulse.material.color.copy(amber);

            }

            // ==================================
            // ELECTRICITY MOVEMENT
            // ==================================

            const progress = (

                time * PULSE_SPEED /

                Math.max(1, span.length) +

                span.phase

            ) % 1;

            span.curve.getPointAt(

                progress,

                span.pulse.position

            );

            // ==================================
            // DAY-NIGHT VISIBILITY
            // ==================================

            span.pulse.material.opacity =

                0.65 + night * 0.35;

            // ==================================
            // OVERLOAD PULSATION
            // ==================================

            span.pulse.scale.setScalar(

                overloaded

                    ? 1.2 + 0.4 * Math.sin(time * 8)

                    : 1

            );

        }

    }

    // ==========================================
    // PUBLIC INTERFACE
    // ==========================================

    return {

        registerAnchor,

        update,

        group

    };

}