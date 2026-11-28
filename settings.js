import * as THREE from "three";

// ==========================================
// POWERQUEST — SETTINGS SYSTEM
// ==========================================

const STORAGE_KEY = "powerquest-settings";

export const GRAPHICS_PRESETS = [

    {
        name: "Low",
        description: "Maximum performance. Reduced resolution, no shadows or clouds.",
        pixelRatio: 0.75,
        shadows: false,
        shadowSize: 512,
        clouds: false,
        wirePulses: false,
        dynamicLights: false
    },

    {
        name: "Medium",
        description: "Balanced visuals and performance.",
        pixelRatio: 1.5,
        shadows: true,
        shadowSize: 1024,
        clouds: true,
        wirePulses: true,
        dynamicLights: true
    },

    {
        name: "High",
        description: "Higher resolution and detailed shadows with full visual effects.",
        pixelRatio: 2,
        shadows: true,
        shadowSize: 2048,
        clouds: true,
        wirePulses: true,
        dynamicLights: true
    }

];

// ==========================================
// DIFFICULTY PRESETS
// ==========================================

export const DIFFICULTY_PRESETS = [

    {
        name: "Easy",
        description: "More starting funds, increased capacity and lower demand.",
        startingFunds: 1500,
        capacityMultiplier: 1.25,
        demandMultiplier: 0.9,
        maintenanceMultiplier: 0.75
    },

    {
        name: "Normal",
        description: "Original PowerQuest gameplay balance.",
        startingFunds: 1000,
        capacityMultiplier: 1,
        demandMultiplier: 1,
        maintenanceMultiplier: 1
    },

    {
        name: "Hard",
        description: "Limited funds, reduced capacity and increased demand.",
        startingFunds: 750,
        capacityMultiplier: 0.9,
        demandMultiplier: 1.1,
        maintenanceMultiplier: 1.25
    }

];

// ==========================================
// LOAD SAVED SETTINGS
// ==========================================

export function loadSettings() {

    const defaults = {

        graphics: 1,

        difficulty: 1

    };

    try {

        const saved = JSON.parse(
            localStorage.getItem(STORAGE_KEY)
        );

        if (!saved) return defaults;

        return {

            graphics:
                [0, 1, 2].includes(saved.graphics)
                    ? saved.graphics
                    : 1,

            difficulty:
                [0, 1, 2].includes(saved.difficulty)
                    ? saved.difficulty
                    : 1

        };

    } catch {

        return defaults;

    }

}

// ==========================================
// SAVE SETTINGS
// ==========================================

function saveSettings(settings) {

    try {

        localStorage.setItem(

            STORAGE_KEY,

            JSON.stringify(settings)

        );

    } catch (error) {

        console.warn(
            "Unable to save settings.",
            error
        );

    }

}

// ==========================================
// SETTINGS CONTROLLER
// ==========================================

export function createSettings({

    renderer,

    scene,

    skybox,

    powerlines,

    preferences

}) {

    const $ = id => document.getElementById(id);

    const activeDifficulty = preferences.difficulty;

    let graphics =
        GRAPHICS_PRESETS[preferences.graphics];

    const originalCloudCoverage =
        skybox.uniforms.cloudCoverage.value;

    // ==========================================
    // APPLY GRAPHICS
    // ==========================================

    function applyGraphics(level) {

        graphics = GRAPHICS_PRESETS[level];

        renderer.setPixelRatio(

            Math.min(

                window.devicePixelRatio || 1,

                graphics.pixelRatio

            )

        );

        renderer.setSize(

            window.innerWidth,

            window.innerHeight

        );

        renderer.shadowMap.enabled =
            graphics.shadows;

        // Update shadow resolution.

        scene.traverse(object => {

            if (
                object.isDirectionalLight &&
                object.shadow
            ) {

                const shadow = object.shadow;

                if (
                    shadow.mapSize.x !==
                    graphics.shadowSize
                ) {

                    shadow.mapSize.set(

                        graphics.shadowSize,

                        graphics.shadowSize

                    );

                    if (shadow.map) {

                        shadow.map.dispose();

                        shadow.map = null;

                    }

                }

                shadow.needsUpdate = true;

            }

            if (object.isMesh && object.material) {

                const materials =
                    Array.isArray(object.material)
                        ? object.material
                        : [object.material];

                materials.forEach(material => {

                    material.needsUpdate = true;

                });

            }

        });

        // Cloud rendering.

        skybox.uniforms.cloudCoverage.value =

            graphics.clouds

                ? originalCloudCoverage

                : 2;

        renderer.shadowMap.needsUpdate = true;

    }

    // ==========================================
    // UPDATE SETTINGS INTERFACE
    // ==========================================

    function updateUI() {

        const graphicsPreset =
            GRAPHICS_PRESETS[preferences.graphics];

        const difficultyPreset =
            DIFFICULTY_PRESETS[preferences.difficulty];

        $("graphics-slider").value =
            preferences.graphics;

        $("difficulty-slider").value =
            preferences.difficulty;

        $("graphics-value").textContent =
            graphicsPreset.name;

        $("difficulty-value").textContent =
            difficultyPreset.name;

        $("graphics-description").textContent =
            graphicsPreset.description;

        $("difficulty-description").textContent =
            difficultyPreset.description;

        $("difficulty-value").style.color = [

            "#4cbb17",

            "#65ced9",

            "#ef4444"

        ][preferences.difficulty];

        const notice =
            document.querySelector(".settings-notice");

        if (notice) {

            notice.textContent =

                preferences.difficulty !== activeDifficulty

                    ? "Restart required to apply difficulty."

                    : "Active difficulty: " +
                      DIFFICULTY_PRESETS[activeDifficulty].name;

        }

    }

    // ==========================================
    // GRAPHICS SLIDER
    // ==========================================

    $("graphics-slider").addEventListener(

        "input",

        event => {

            preferences.graphics =
                Number(event.target.value);

            applyGraphics(preferences.graphics);

            saveSettings(preferences);

            updateUI();

        }

    );

    // ==========================================
    // DIFFICULTY SLIDER
    // ==========================================

    $("difficulty-slider").addEventListener(

        "input",

        event => {

            preferences.difficulty =
                Number(event.target.value);

            saveSettings(preferences);

            updateUI();

        }

    );

    // ==========================================
    // RESTART CAMPAIGN
    // ==========================================

    $("settings-restart-btn").addEventListener(

        "click",

        () => {

            const confirmed = window.confirm(

                "Restart the campaign? " +
                "Your current progress will be lost."

            );

            if (!confirmed) return;

            saveSettings(preferences);

            window.location.reload();

        }

    );

    // ==========================================
    // RESTORE DEFAULTS
    // ==========================================

    $("reset-settings-btn").addEventListener(

        "click",

        () => {

            preferences.graphics = 1;

            preferences.difficulty = 1;

            applyGraphics(1);

            saveSettings(preferences);

            updateUI();

        }

    );

    // ==========================================
    // INITIALIZATION
    // ==========================================

    applyGraphics(preferences.graphics);

    updateUI();

    return {

        get graphics() {

            return graphics;

        },

        get difficulty() {

            return DIFFICULTY_PRESETS[activeDifficulty];

        },

        updatePowerlines() {

            if (graphics.wirePulses) return;

            // Hide animated pulses without hiding
            // the actual overhead cables.

            for (const child of powerlines.group.children) {

                if (
                    child.isMesh &&
                    child.geometry.type === "SphereGeometry"
                ) {

                    child.visible = false;

                }

            }

        }

    };

}