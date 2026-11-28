import * as THREE from "three";

export function createSkybox(scene) {

    const uniforms = {

        daylight: { value: 1 },

        time: { value: 0 },

        dayTop: {
            value: new THREE.Color(0x398bd4)
        },

        dayHorizon: {
            value: new THREE.Color(0xc9e7fa)
        },

        nightTop: {
            value: new THREE.Color(0x030711)
        },

        nightHorizon: {
            value: new THREE.Color(0x263b59)
        },

        cloudCoverage: { value: 0.48 },

        cloudSpeed: { value: 0.05 },

        cloudScale: { value: 3.5 }

    };

    // ==========================================
    // SKY GEOMETRY
    // ==========================================

    const geometry = new THREE.SphereGeometry(
        450, 32, 24
    );

    // ==========================================
    // PROCEDURAL SKY SHADER
    // ==========================================

    const material = new THREE.ShaderMaterial({

        uniforms,

        side: THREE.BackSide,

        depthWrite: false,

        fog: false,

        toneMapped: false,

        vertexShader: `

            varying vec3 vDirection;

            void main() {

                vDirection = position;

                gl_Position =
                    projectionMatrix *
                    modelViewMatrix *
                    vec4(position, 1.0);

            }

        `,

        fragmentShader: `

            uniform float daylight;
            uniform float time;

            uniform float cloudCoverage;
            uniform float cloudSpeed;
            uniform float cloudScale;

            uniform vec3 dayTop;
            uniform vec3 dayHorizon;

            uniform vec3 nightTop;
            uniform vec3 nightHorizon;

            varying vec3 vDirection;

            // ==================================
            // RANDOM FUNCTIONS
            // ==================================

            float hash(vec3 p) {

                p = fract(p * 0.3183099 + 0.1);

                p *= 17.0;

                return fract(
                    p.x * p.y * p.z *
                    (p.x + p.y + p.z)
                );

            }

            float hash2D(vec2 p) {

                return fract(

                    sin(dot(
                        p,
                        vec2(127.1, 311.7)
                    )) * 43758.5453

                );

            }

            // ==================================
            // SMOOTH NOISE
            // ==================================

            float noise(vec2 p) {

                vec2 i = floor(p);

                vec2 f = fract(p);

                vec2 u = f * f * (3.0 - 2.0 * f);

                float a = hash2D(i);

                float b = hash2D(
                    i + vec2(1.0, 0.0)
                );

                float c = hash2D(
                    i + vec2(0.0, 1.0)
                );

                float d = hash2D(
                    i + vec2(1.0, 1.0)
                );

                return mix(

                    mix(a, b, u.x),

                    mix(c, d, u.x),

                    u.y

                );

            }

            // ==================================
            // FRACTAL CLOUD NOISE
            // ==================================

            float fbm(vec2 p) {

                float value = 0.0;

                float amplitude = 0.5;

                for (int i = 0; i < 4; i++) {

                    value += amplitude * noise(p);

                    p = p * 2.03 + vec2(17.3, 9.2);

                    amplitude *= 0.5;

                }

                return value;

            }

            // ==================================
            // MAIN SKY RENDERING
            // ==================================

            void main() {

                vec3 direction =
                    normalize(vDirection);

                float height = max(
                    direction.y, 0.0
                );

                float gradient = pow(
                    height, 0.65
                );

                // ==============================
                // DAYTIME GRADIENT
                // ==============================

                vec3 dayColor = mix(

                    dayHorizon,

                    dayTop,

                    gradient

                );

                // ==============================
                // NIGHTTIME GRADIENT
                // ==============================

                vec3 nightColor = mix(

                    nightHorizon,

                    nightTop,

                    gradient

                );

                // ==============================
                // STARS
                // ==============================

                vec3 starPosition =
                    direction * 180.0;

                vec3 starCell =
                    floor(starPosition);

                float randomValue =
                    hash(starCell);

                float starDistance = length(
                    fract(starPosition) - 0.5
                );

                float stars =

                    step(0.985, randomValue) *

                    (1.0 - smoothstep(
                        0.03,
                        0.15,
                        starDistance
                    ));

                stars *= smoothstep(
                    0.05,
                    0.35,
                    height
                );

                nightColor +=

                    vec3(0.8, 0.88, 1.0) *

                    stars;

                // ==============================
                // PROCEDURAL CLOUDS
                // ==============================

                if (
                    direction.y > 0.04 &&
                    daylight > 0.02
                ) {

                    vec2 cloudUV =

                        direction.xz /

                        (direction.y + 0.35);

                    cloudUV *= cloudScale;

                    // Slowly moving clouds

                    cloudUV += vec2(

                        time * cloudSpeed,

                        time * cloudSpeed * 0.3

                    );

                    float cloudNoise =
                        fbm(cloudUV);

                    float cloudDensity =
                        smoothstep(

                            cloudCoverage,

                            cloudCoverage + 0.16,

                            cloudNoise

                        );

                    // Fade clouds near horizon

                    float horizonFade =
                        smoothstep(

                            0.04,

                            0.25,

                            height

                        );

                    cloudDensity *= horizonFade;

                    // Soft shading inside clouds

                    vec3 cloudShadow = vec3(
                        0.72, 0.79, 0.87
                    );

                    vec3 cloudWhite = vec3(
                        1.0, 1.0, 1.0
                    );

                    vec3 cloudColor = mix(

                        cloudShadow,

                        cloudWhite,

                        smoothstep(
                            0.4,
                            0.75,
                            cloudNoise
                        )

                    );

                    dayColor = mix(

                        dayColor,

                        cloudColor,

                        cloudDensity * 0.9

                    );

                }

                // ==============================
                // DAY / NIGHT TRANSITION
                // ==============================

                vec3 finalColor = mix(

                    nightColor,

                    dayColor,

                    daylight

                );

                gl_FragColor = vec4(

                    finalColor,

                    1.0

                );

                #include <colorspace_fragment>

            }

        `

    });

    // ==========================================
    // CREATE SKYBOX
    // ==========================================

    const skybox = new THREE.Mesh(
        geometry,
        material
    );

    skybox.name = "PowerQuest Skybox";

    skybox.renderOrder = -1000;

    skybox.frustumCulled = false;

    skybox.castShadow = false;

    skybox.receiveShadow = false;

    scene.add(skybox);

    // ==========================================
    // UPDATE SKYBOX
    // ==========================================

    function update(daylight, camera) {

        uniforms.daylight.value =
            THREE.MathUtils.clamp(
                daylight, 0, 1
            );

        uniforms.time.value =
            performance.now() * 0.001;

        skybox.position.copy(camera.position);

    }

    return {

        update,

        skybox,

        uniforms

    };

}