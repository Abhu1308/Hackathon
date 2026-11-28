
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildIndustrialCity } from "./city-assets.js";
import { addIndustrialAtmosphere } from "./atmosphere.js";
import { createNetworkEffects } from "./network-effects.js";
import { createGridFeedback } from "./grid-feedback.js";
import { createBuildingLights } from "./building-lights.js";
import { createDayNightCycle } from "./day-night.js";
import { createSkybox } from "./sky.js";
import { createDeveloperConsole } from "./developer.js";
import { createPowerlines } from "./powerlines.js";
import {
    generateAIStrategy,
    resetAIToken
} from "./ai-optimizer.js";
import {
    loadSettings,
    createSettings,
    DIFFICULTY_PRESETS
} from "./settings.js";

import {
    createRenewables,
    CATALOG
} from "./renewables.js";

import { createShop } from "./shop.js";

import {
    generateCampaign,
    TOTAL_ROUNDS,
    roundLabel
} from "./campaign.js";

const $ = id => document.getElementById(id);

function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
}

const fmt = value => Number(value.toFixed(2));

// ==========================================
// GAME SETTINGS
// ==========================================

const preferences = loadSettings();

const difficulty =
    DIFFICULTY_PRESETS[preferences.difficulty];

const STARTING_FUNDS = difficulty.startingFunds;
const ELECTRICITY_COST = 3;
const HOUSEHOLD_TARIFF = 5;
const UPGRADE_COST = 120;
const UPGRADE_CAPACITY = 10;

const connectionCosts = {
    Residential: 40,
    hospital: 100,
    school: 70,
    water: 90,
    factory: 80
};

// ==========================================
// RANDOMIZED CAMPAIGN
// ==========================================

const dailyEvents = generateCampaign(difficulty);

// ==========================================
// GAME STATE
// ==========================================

let councilFunds = STARTING_FUNDS;

// currentDay represents the round number.
// Odd rounds are mornings.
// Even rounds are nights.

let currentDay = 1;
let daysCompleted = 0;

let gameOver = false;
let gridUpgraded = false;
let planConfirmed = false;

let selectedBuilding = null;
let activePanel = null;

let currentEvent = dailyEvents[0];

let TOTAL_CAPACITY = currentEvent.capacity;
let baseCapacity = TOTAL_CAPACITY;

let dayNotice = "";
let submissionDialogOpen = false;

const buildings = [];
const dailyScores = [];

const occupations = [
    "Software worker",
    "Truck driver",
    "Home-based tailor",
    "Office worker"
];

// ==========================================
// RESIDENTIAL BUILDINGS
// ==========================================

for (let i = 0; i < 12; i++) {
    const demand = 5 + (i % 5) * 2;

    buildings.push({
        id: `house-${i + 1}`,
        name: `House ${String(i + 1).padStart(2, "0")}`,
        type: "Residential",
        demand,
        baseDemand: demand,
        residents: 2 + (i % 4),
        occupation: occupations[i % 4],
        x: -15 + (i % 4) * 10,
        z: -12 + Math.floor(i / 4) * 12
    });
}

// ==========================================
// PUBLIC AND INDUSTRIAL BUILDINGS
// ==========================================

buildings.push(
    {
        id: "hospital",
        name: "City Hospital",
        type: "Hospital",
        demand: 30,
        baseDemand: 30,
        x: -15,
        z: 24
    },
    {
        id: "school",
        name: "Community School",
        type: "School",
        demand: 15,
        baseDemand: 15,
        x: -5,
        z: 24
    },
    {
        id: "water",
        name: "Water Treatment Facility",
        type: "Water Facility",
        demand: 25,
        baseDemand: 25,
        x: 5,
        z: 24
    },
    {
        id: "factory",
        name: "Industrial Factory",
        type: "Factory",
        demand: 20,
        baseDemand: 20,
        x: 15,
        z: 24
    },
    {
        id: "power",
        name: "Central Transformer",
        type: "Transformer",
        demand: 0,
        baseDemand: 0,
        x: -26,
        z: -23
    }
);

for (const b of buildings) {
    b.connected = b.id === "power";
    b.allocated = 0;

    b.connectionCost =
        b.type === "Residential"
            ? connectionCosts.Residential
            : connectionCosts[b.id] || 0;
}

const hospital = buildings.find(
    b => b.id === "hospital"
);

const water = buildings.find(
    b => b.id === "water"
);

// ==========================================
// THREE.JS SCENE
// ==========================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x070d15);

scene.fog = new THREE.FogExp2(
    0x070d15,
    0.009
);

const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.set(24, 26, 30);

const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: "high-performance"
});

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 1.5)
);

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping =
    THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.35;

renderer.shadowMap.enabled = true;

// Preserve the shadow boundary fix.

renderer.shadowMap.type = THREE.PCFShadowMap;

$("game").appendChild(renderer.domElement);

const controls = new OrbitControls(
    camera,
    renderer.domElement
);

controls.enableDamping = true;
controls.dampingFactor = 0.07;

controls.target.set(0, 0, 4);

controls.minDistance = 12;
controls.maxDistance = 95;
controls.maxPolarAngle = Math.PI / 2.05;

controls.update();

// ==========================================
// CITY INITIALIZATION
// ==========================================

const powerlines = createPowerlines(
    scene,
    buildings
);

const clickableBuildings = buildIndustrialCity(
    scene,
    buildings,
    powerlines
);

// ==========================================
// INDUSTRIAL ATMOSPHERE
// ==========================================

const atmosphere = addIndustrialAtmosphere(scene);

// ==========================================
// RENEWABLE ENERGY SYSTEM
// ==========================================

const renewables = createRenewables(
    scene,
    dailyEvents
);

function recalculateCapacity() {
    TOTAL_CAPACITY =
        baseCapacity +
        renewables.generation(currentDay) +
        renewables.stored;
}

// ==========================================
// ELECTRICITY NETWORK
// ==========================================

const networkEffects = createNetworkEffects(
    scene,
    buildings
);

// ==========================================
// GRID FEEDBACK
// ==========================================

const gridFeedback = createGridFeedback(
    scene,
    buildings
);

// ==========================================
// BUILDING ILLUMINATION
// ==========================================

const buildingLights = createBuildingLights(
    scene,
    buildings
);

// ==========================================
// DAY-NIGHT CYCLE
// ==========================================

const dayNight = createDayNightCycle(scene);

const skybox = createSkybox(scene);

// ==========================================
// SETTINGS INITIALIZATION
// ==========================================

const settings = createSettings({
    renderer,
    scene,
    skybox,
    powerlines,
    preferences
});

// ==========================================
// ENERGY CALCULATIONS
// ==========================================

function usedEnergy() {
    return buildings.reduce(
        (sum, b) => sum + b.allocated,
        0
    );
}

function remainingEnergy() {
    return TOTAL_CAPACITY - usedEnergy();
}

function householdMinimum(b) {
    return Math.ceil(b.demand * 0.5);
}

function householdsServed() {
    return buildings.filter(b =>
        b.type === "Residential" &&
        b.connected &&
        b.allocated >= householdMinimum(b)
    ).length;
}

// ==========================================
// FINANCIAL CALCULATIONS
// ==========================================

function dailyFinances() {

    const projection = renewables.preview(
        currentDay,
        usedEnergy(),
        baseCapacity
    );

    const electricityCost =
        projection.conventional *
        (currentEvent.electricityCost ?? ELECTRICITY_COST);

    const householdRevenue = buildings
        .filter(b =>
            b.type === "Residential" &&
            b.connected
        )
        .reduce(
            (sum, b) =>
                sum + b.allocated * HOUSEHOLD_TARIFF,
            0
        );

    const publicFunding = buildings
        .filter(b =>
            ["hospital", "school", "water"].includes(b.id) &&
            b.connected
        )
        .reduce(
            (sum, b) =>
                sum + b.allocated * currentEvent.funding,
            0
        );

    // Maintenance is charged once per complete day.

    const maintenance =
        currentDay % 2 === 0
            ? currentEvent.maintenance +
              renewables.maintenance()
            : 0;

    const dailyBalance =
        householdRevenue +
        publicFunding -
        electricityCost -
        maintenance;

    return {
        electricityCost,
        householdRevenue,
        publicFunding,
        maintenance,
        dailyBalance
    };
}

// ==========================================
// BUILDING STATUS INDICATORS
// ==========================================

function updateIndicator(b) {
    if (!b.indicator) return;

    let color = 0xef4444;

    if (b.connected && b.allocated > 0) {
        color =
            b.allocated >= b.demand
                ? 0x22c55e
                : 0xfacc15;
    }

    b.indicator.material.color.setHex(color);
}

// ==========================================
// ADVISOR PANEL
// ==========================================

function createAdvisorPanel() {
    if (!$("advisor-panel")) {
        const panel = document.createElement("section");

        panel.id = "advisor-panel";
        panel.className = "panel-content";
        panel.hidden = true;

        panel.innerHTML = `
            <h2>🤖 Grid Intelligence</h2>

            <p style="color:#5eead4;">
                Smart Energy Advisor
            </p>

            <p>
                Analyze your electricity distribution
                and receive recommendations.
            </p>

            <button
                id="analyze-grid-btn"
                type="button"
                style="
                    width:100%;
                    padding:13px;
                    margin:12px 0;
                    background:#facc15;
                    color:#172033;
                    border:0;
                    border-radius:10px;
                    font-weight:bold;
                    cursor:pointer;
                "
            >
                🔍 Analyze My Grid
            </button>

            <div
                id="advisor-results"
                style="
                    padding:15px;
                    margin-top:12px;
                    background:#1e293b;
                    border:1px solid #475569;
                    border-radius:12px;
                "
            >
                Click Analyze My Grid to begin.
            </div>

            <h3>🔮 Next Round Forecast</h3>

            <div
                id="advisor-forecast"
                style="
                    padding:15px;
                    background:#1e293b;
                    border-radius:12px;
                    white-space:pre-line;
                    line-height:1.7;
                "
            ></div>
        `;

        $("slide-panel").appendChild(panel);
    }

    if (
        !document.querySelector(
            '.nav-btn[data-panel="advisor-panel"]'
        )
    ) {
        const button = document.createElement("button");

        button.className = "nav-btn";
        button.type = "button";
        button.dataset.panel = "advisor-panel";
        button.textContent = "🤖 Advisor";

        const navContainer =
            document.querySelector(".nav-buttons") ||
            document.querySelector("#bottom-bar");

        if (navContainer) {
            navContainer.appendChild(button);
        }
    }
}

createAdvisorPanel();
installAIAdvisor();
// ==========================================
// INFRASTRUCTURE SHOP
// ==========================================

const shop = createShop({

    renewables,

    getState: () => ({
        day: currentDay,
        used: usedEnergy(),
        base: baseCapacity,
        funds: councilFunds,
        gameOver: gameOver || submissionDialogOpen
    }),

    purchase(type) {

        const item = CATALOG[type];

        if (
            !item ||
            gameOver ||
            submissionDialogOpen ||
            councilFunds < item.price
        ) {
            return "Purchase unavailable.";
        }

        if (!renewables.buy(type)) {
            return "Purchase limit reached.";
        }

        councilFunds -= item.price;

        recalculateCapacity();

        invalidatePlan();

        refreshAll();

        return item.name + " purchased successfully.";
    }

});

// ==========================================
// PANEL NAVIGATION
// ==========================================

const slidePanel = $("slide-panel");

const navButtons =
    document.querySelectorAll(".nav-btn");

const panelContents =
    document.querySelectorAll(".panel-content");

// ==========================================
// MINIMAL HUD CONTROLS
// ==========================================

const menu = document.querySelector(".nav-buttons");
const menuButton = $("menu-btn");

function closeMenu() {
    menu.hidden = true;

    menuButton.setAttribute(
        "aria-expanded",
        "false"
    );
}

menuButton.addEventListener("click", () => {
    const wasHidden = menu.hidden;

    closePanel();

    menu.hidden = !wasHidden;

    menuButton.setAttribute(
        "aria-expanded",
        String(wasHidden)
    );
});

// ==========================================
// FLOATING BUILDING POPUP
// ==========================================

const popupAnchor = new THREE.Vector3();

let popupWidth = 250;
let popupHeight = 200;

new ResizeObserver(() => {
    popupWidth = slidePanel.offsetWidth;
    popupHeight = slidePanel.offsetHeight;
}).observe(slidePanel);

function positionBuildingPopup() {

    if (
        activePanel !== "hud" ||
        !selectedBuilding
    ) {
        return;
    }

    const b = selectedBuilding;

    camera.updateMatrixWorld();

    popupAnchor.set(
        b.x,
        b.id === "power" ? 5 :
        b.type === "Residential" ? 8 : 11,
        b.z
    ).project(camera);

    const w = window.innerWidth;
    const h = window.innerHeight;

    const visible =
        Math.abs(popupAnchor.x) <= 1 &&
        Math.abs(popupAnchor.y) <= 1 &&
        Math.abs(popupAnchor.z) <= 1;

    const x = visible
        ? (popupAnchor.x + 1) * w / 2
        : 12 + popupWidth / 2;

    const y = visible
        ? (1 - popupAnchor.y) * h / 2
        : h - 60;

    const left = Math.max(
        8,
        Math.min(
            w - popupWidth - 8,
            x - popupWidth / 2
        )
    );

    const top = Math.max(
        60,
        Math.min(
            h - popupHeight - 60,
            y - popupHeight - 12
        )
    );

    slidePanel.style.transform =
        `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}

// ==========================================
// ESCAPE KEY SUPPORT
// ==========================================

document.addEventListener("keydown", event => {
    if (
        event.key === "Escape" &&
        !submissionDialogOpen
    ) {
        closePanel();
    }
});

function openPanel(id) {

    if (!$(id)) return;

    panelContents.forEach(panel => {
        panel.hidden = panel.id !== id;
    });

    slidePanel.classList.remove("closed");

    activePanel = id;

    if (id === "shop-panel") {
        shop.refresh();
    }

    closeMenu();

    slidePanel.classList.toggle(
        "building-popup",
        id === "hud" && !!selectedBuilding
    );

    slidePanel.style.transform = "";

    if (id === "hud" && selectedBuilding) {

        popupWidth = slidePanel.offsetWidth;
        popupHeight = slidePanel.offsetHeight;

        positionBuildingPopup();
    }

    navButtons.forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.panel === id
        );
    });

    if (id === "hud" && !selectedBuilding) {
        showBuildingPlaceholder();
    }

    if (id === "advisor-panel") {
        updateForecast();
    }
}

function closePanel() {

    slidePanel.classList.add("closed");

    activePanel = null;
    selectedBuilding = null;

    closeMenu();

    slidePanel.classList.remove(
        "building-popup"
    );

    slidePanel.style.transform = "";

    navButtons.forEach(button => {
        button.classList.remove("active");
    });
}

navButtons.forEach(button => {
    button.addEventListener("click", () => {

        const id = button.dataset.panel;

        if (activePanel === id) {
            closePanel();
        } else {
            openPanel(id);
        }
    });
});

$("close-panel-btn").addEventListener(
    "click",
    closePanel
);

// ==========================================
// TOP BAR
// ==========================================

function updateTopBar() {

    setText(
        "current-day",
        roundLabel(currentDay)
    );

    setText(
        "top-energy",
        fmt(usedEnergy())
    );

    setText(
        "top-capacity",
        fmt(TOTAL_CAPACITY)
    );

    setText(
        "day-icon",
        currentDay % 2 ? "☀" : "☾"
    );

    setText(
        "top-funds",
        fmt(councilFunds)
    );

    setText(
        "top-households",
        householdsServed()
    );

    setText(
        "required-households",
        currentEvent.requiredHouseholds
    );
}

// ==========================================
// ENERGY DASHBOARD
// ==========================================

function updateEnergyDashboard() {

    const used = usedEnergy();

    setText(
        "total-energy",
        fmt(TOTAL_CAPACITY)
    );

    setText(
        "used-energy",
        fmt(used)
    );

    setText(
        "remaining-energy",
        fmt(remainingEnergy())
    );

    const percentage = Math.max(
        0,
        Math.min(
            100,
            (used / TOTAL_CAPACITY) * 100
        )
    );

    $("energy-fill").style.width =
        `${percentage}%`;

    if (used > TOTAL_CAPACITY) {

        setText(
            "grid-status",
            `⚠ Grid overloaded by ${fmt(used - TOTAL_CAPACITY)} kWh.`
        );

    } else if (
        hospital.allocated < currentEvent.hospitalMinimum ||
        water.allocated < currentEvent.waterMinimum
    ) {

        setText(
            "grid-status",
            "⚠ Essential services need more electricity."
        );

    } else {

        setText(
            "grid-status",
            "✓ Essential services are protected."
        );
    }
}

// ==========================================
// FINANCE DASHBOARD
// ==========================================

function updateFinanceDashboard() {

    const f = dailyFinances();

    setText(
        "council-funds",
        fmt(councilFunds)
    );

    setText(
        "daily-cost",
        fmt(f.electricityCost)
    );

    setText(
        "daily-revenue",
        fmt(f.householdRevenue)
    );

    setText(
        "public-funding",
        fmt(f.publicFunding)
    );

    setText(
        "maintenance-value",
        f.maintenance
    );

    setText(
        "daily-balance",
        fmt(f.dailyBalance)
    );

    $("daily-balance").style.color =
        f.dailyBalance >= 0
            ? "#5eead4"
            : "#f87171";

    $("upgrade-btn").disabled =
        gameOver ||
        gridUpgraded ||
        councilFunds < UPGRADE_COST;

    $("upgrade-btn").textContent =
        gridUpgraded
            ? "Grid Upgraded ✓"
            : `Upgrade Grid (+10 kWh) — ${UPGRADE_COST} EC`;
}

// ==========================================
// DAILY CHALLENGE
// ==========================================

function updateChallengeDashboard() {

    setText(
        "event-title",
        `${roundLabel(currentDay)} — ${currentEvent.title}`
    );

    setText(
        "event-description",
        currentEvent.description +
        `\nRound ${currentDay}/${TOTAL_ROUNDS}` +
        `\nEvent merging probability: ${currentEvent.mergeProbability}%`
    );

    if ($("event-description")) {
        $("event-description").style.whiteSpace =
            "pre-line";
    }

    setText(
        "event-capacity",
        fmt(TOTAL_CAPACITY)
    );

    setText(
        "event-households",
        householdsServed()
    );

    const objectives = checkObjectives();

    setText(
        "essential-objectives",
        `${objectives.hospitalOK ? "✓" : "○"} Hospital: ` +
        `${hospital.allocated}/${currentEvent.hospitalMinimum} kWh · ` +
        `${objectives.waterOK ? "✓" : "○"} Water: ` +
        `${water.allocated}/${currentEvent.waterMinimum} kWh`
    );

    const status = planConfirmed
        ? "✓ Strategy confirmed. Ready to submit!"
        : "Review your allocations and confirm your strategy.";

    setText(
        "planning-status",
        dayNotice
            ? `${dayNotice}\n\n${status}`
            : status
    );

    $("planning-status").style.whiteSpace =
        "pre-line";

    $("confirm-plan-btn").disabled = gameOver;
}

// ==========================================
// BUILDING INFORMATION
// ==========================================

function showBuildingPlaceholder() {

    $("building-info").hidden = false;

    setText(
        "building-name",
        "🏠 Building Management"
    );

    setText(
        "building-type",
        "Select a building in the city."
    );

    setText("building-demand", "");

    setText(
        "building-details",
        "Click a building to manage its electricity."
    );

    $("connection-panel").hidden = true;
    $("allocation-panel").hidden = true;
}

function updateBuildingInfo(b) {

    $("building-info").hidden = false;

    setText("building-name", b.name);

    setText(
        "building-type",
        `Type: ${b.type}`
    );

    if (b.id === "power") {

        setText(
            "building-demand",
            `Grid capacity: ${fmt(TOTAL_CAPACITY)} kWh`
        );

        setText(
            "building-details",
            "Central electricity distribution facility. Receives electricity from the external grid and supplies the city."
        );

        $("connection-panel").hidden = true;
        $("allocation-panel").hidden = true;

        return;
    }

    setText(
        "building-demand",
        `Demand: ${b.demand} kWh`
    );

    if (b.type === "Residential") {

        setText(
            "building-details",
            `Residents: ${b.residents} | Occupation: ${b.occupation}`
        );

    } else if (b.id === "factory") {

        setText(
            "building-details",
            "Industrial facility requiring electricity to operate its machinery."
        );

    } else {

        setText(
            "building-details",
            "Public infrastructure serving the community."
        );
    }

    $("connection-panel").hidden = false;

    $("allocation-panel").hidden = !b.connected;

    setText(
        "connection-status",
        b.connected
            ? "Connected"
            : "Not connected"
    );

    setText(
        "connection-cost",
        b.connected
            ? "Connection already established."
            : `Connection cost: ${b.connectionCost} EC`
    );

    $("connect-btn").hidden = b.connected;

    $("connect-btn").disabled =
        gameOver ||
        b.connected ||
        councilFunds < b.connectionCost;

    const slider = $("power-slider");

    slider.max = Math.max(
        b.demand,
        b.allocated
    );

    slider.disabled = gameOver;

    if (document.activeElement !== slider) {

        slider.value = b.allocated;

        setText(
            "allocation-value",
            `${b.allocated} kWh`
        );
    }

    $("allocate-btn").disabled = gameOver;
}

function selectBuilding(b) {

    selectedBuilding = b;

    $("power-slider").value = b.allocated;

    updateBuildingInfo(b);

    setText(
        "allocation-value",
        `${b.allocated} kWh`
    );

    setText("allocation-message", "");

    openPanel("hud");
}

// ==========================================
// CONNECT BUILDING
// ==========================================

$("connect-btn").addEventListener("click", () => {

    const b = selectedBuilding;

    if (
        !b ||
        b.connected ||
        gameOver ||
        submissionDialogOpen
    ) {
        return;
    }

    if (councilFunds < b.connectionCost) {

        setText(
            "allocation-message",
            "Not enough Energy Credits."
        );

        return;
    }

    councilFunds -= b.connectionCost;

    b.connected = true;

    invalidatePlan();

    refreshAll();

    setText(
        "allocation-message",
        "Building connected successfully!"
    );
});

// ==========================================
// ALLOCATE ELECTRICITY
// ==========================================

$("power-slider").addEventListener("input", () => {

    setText(
        "allocation-value",
        `${$("power-slider").value} kWh`
    );
});

$("allocate-btn").addEventListener("click", () => {

    const b = selectedBuilding;

    if (
        !b ||
        !b.connected ||
        gameOver ||
        submissionDialogOpen ||
        b.id === "power"
    ) {
        return;
    }

    const requested =
        Number($("power-slider").value);

    const available =
        remainingEnergy() + b.allocated;

    if (
        !Number.isInteger(requested) ||
        requested < 0 ||
        requested > b.demand
    ) {

        setText(
            "allocation-message",
            "Invalid allocation."
        );

        return;
    }

    if (
        requested > available &&
        requested >= b.allocated
    ) {

        setText(
            "allocation-message",
            `Insufficient capacity. Available: ${fmt(Math.max(0, available))} kWh.`
        );

        return;
    }

    if (requested === b.allocated) {

        setText(
            "allocation-message",
            "Allocation unchanged."
        );

        return;
    }

    b.allocated = requested;

    invalidatePlan();

    refreshAll();

    setText(
        "allocation-message",
        `Allocated ${requested} kWh!`
    );
});

// ==========================================
// GRID UPGRADE
// ==========================================

$("upgrade-btn").addEventListener("click", () => {

    if (
        gameOver ||
        gridUpgraded ||
        submissionDialogOpen
    ) {
        return;
    }

    if (councilFunds < UPGRADE_COST) {

        setText(
            "finance-message",
            "Insufficient funds for upgrade."
        );

        return;
    }

    councilFunds -= UPGRADE_COST;

    gridUpgraded = true;

    baseCapacity += UPGRADE_CAPACITY;

    recalculateCapacity();

    invalidatePlan();

    refreshAll();

    setText(
        "finance-message",
        "Grid upgraded! Permanent +10 kWh capacity."
    );
});

// ==========================================
// OBJECTIVE VALIDATION
// ==========================================

function checkObjectives() {

    const count = householdsServed();

    return {

        hospitalOK:
            hospital.connected &&
            hospital.allocated >= currentEvent.hospitalMinimum,

        waterOK:
            water.connected &&
            water.allocated >= currentEvent.waterMinimum,

        householdCount: count,

        accessOK:
            count >= currentEvent.requiredHouseholds
    };
}

function getPlanIssues() {

    const issues = [];

    const objectives = checkObjectives();

    const finances = dailyFinances();

    if (usedEnergy() > TOTAL_CAPACITY) {

        issues.push(
            `Grid overloaded by ${fmt(usedEnergy() - TOTAL_CAPACITY)} kWh.`
        );
    }

    if (!objectives.hospitalOK) {

        issues.push(
            `Hospital needs ${currentEvent.hospitalMinimum} kWh; currently ${hospital.allocated}.`
        );
    }

    if (!objectives.waterOK) {

        issues.push(
            `Water facility needs ${currentEvent.waterMinimum} kWh; currently ${water.allocated}.`
        );
    }

    if (!objectives.accessOK) {

        issues.push(
            `Households served: ${objectives.householdCount}/${currentEvent.requiredHouseholds}.`
        );
    }

    for (const b of buildings) {

        if (b.allocated > b.demand) {

            issues.push(
                `${b.name} exceeds its demand by ${b.allocated - b.demand} kWh.`
            );
        }
    }

    if (councilFunds + finances.dailyBalance < 0) {

        issues.push(
            "Projected council bankruptcy."
        );
    }

    return issues;
}

// ==========================================
// GRID INTELLIGENCE ADVISOR
// ==========================================

function getAIGridState() {

    const energy = renewables.preview(
        currentDay,
        usedEnergy(),
        baseCapacity
    );

    const finances = dailyFinances();

    return {

        round: currentDay,
        totalRounds: TOTAL_ROUNDS,

        weather: currentEvent.weather,
        challenge: currentEvent.title,

        capacity: TOTAL_CAPACITY,
        baseCapacity: baseCapacity,
        funds: councilFunds,

        hospitalMinimum: currentEvent.hospitalMinimum,
        waterMinimum: currentEvent.waterMinimum,
        requiredHouseholds: currentEvent.requiredHouseholds,

        electricityCost:
            currentEvent.electricityCost ?? ELECTRICITY_COST,

        householdTariff: HOUSEHOLD_TARIFF,
        publicFunding: currentEvent.funding,
        maintenance: finances.maintenance,

        renewableEnergy: {
            solar: energy.solar,
            wind: energy.wind,
            stored: renewables.stored,
            storageCapacity: renewables.storageCapacity(),
            chargingEfficiency: 0.75
        },

        nextRound: currentDay < TOTAL_ROUNDS
            ? {
                ...dailyEvents[currentDay],
                renewableGeneration:
                    renewables.generation(currentDay + 1)
            }
            : null,

        buildings: buildings
            .filter(b => b.id !== "power")
            .map(b => ({
                id: b.id,
                name: b.name,
                type: b.type,
                demand: b.demand,
                allocated: b.allocated,
                connected: b.connected,
                connectionCost: b.connectionCost,
                residents: b.residents ?? null,
                occupation: b.occupation ?? null
            }))
    };
}

function validateAIStrategy(strategy) {

    const invalid = error => ({
        valid: false,
        error
    });

    if (!strategy.feasible) {
        return invalid(
            "The AI could not find a feasible strategy."
        );
    }

    const targets = buildings.filter(
        b => b.id !== "power"
    );

    if (strategy.allocations.length !== targets.length) {
        return invalid("Incomplete building allocations.");
    }

    const seen = new Set();

    let total = 0;
    let connectionCost = 0;
    let served = 0;
    let householdRevenue = 0;
    let publicFunding = 0;

    for (const allocation of strategy.allocations) {

        const b = targets.find(
            item => item.id === allocation.id
        );

        if (!b || seen.has(allocation.id)) {
            return invalid("Unknown or duplicate building.");
        }

        seen.add(allocation.id);

        const amount = allocation.kWh;

        if (
            !Number.isInteger(amount) ||
            amount < 0 ||
            amount > b.demand ||
            typeof allocation.connect !== "boolean"
        ) {
            return invalid(
                `Invalid allocation for ${b.name}.`
            );
        }

        const connected =
            b.connected || allocation.connect;

        if (!connected && amount > 0) {
            return invalid(
                `${b.name} is not connected.`
            );
        }

        if (!b.connected && allocation.connect) {
            connectionCost += b.connectionCost;
        }

        if (
            b.id === "hospital" &&
            (!connected ||
             amount < currentEvent.hospitalMinimum)
        ) {
            return invalid("Hospital minimum not satisfied.");
        }

        if (
            b.id === "water" &&
            (!connected ||
             amount < currentEvent.waterMinimum)
        ) {
            return invalid("Water minimum not satisfied.");
        }

        if (b.type === "Residential") {

            if (
                connected &&
                amount >= householdMinimum(b)
            ) {
                served++;
            }

            householdRevenue +=
                amount * HOUSEHOLD_TARIFF;
        }

        if (
            ["hospital", "school", "water"].includes(b.id)
        ) {
            publicFunding +=
                amount * currentEvent.funding;
        }

        total += amount;
    }

    if (total > TOTAL_CAPACITY) {
        return invalid("Grid capacity exceeded.");
    }

    if (connectionCost > councilFunds) {
        return invalid("Insufficient connection funds.");
    }

    if (served < currentEvent.requiredHouseholds) {
        return invalid("Household access target not met.");
    }

    const energy = renewables.preview(
        currentDay,
        total,
        baseCapacity
    );

    const electricityCost =
        energy.conventional *
        (currentEvent.electricityCost ?? ELECTRICITY_COST);

    const maintenance = dailyFinances().maintenance;

    const balance =
        householdRevenue +
        publicFunding -
        electricityCost -
        maintenance;

    const projectedFunds =
        councilFunds - connectionCost + balance;

    if (projectedFunds < 0) {
        return invalid("Strategy would cause bankruptcy.");
    }

    return {
        valid: true,
        total,
        served,
        connectionCost,
        balance,
        projectedFunds,
        energy
    };
}

function installAIAdvisor() {

    const panel = document.getElementById("advisor-panel");

    if (!panel || document.getElementById("ai-strategy-box")) {
        return;
    }

    const box = document.createElement("div");

    box.id = "ai-strategy-box";

    box.style.cssText = `
        margin: 16px 0;
        padding: 15px;
        background: rgba(0, 180, 220, 0.06);
        border: 1px solid rgba(0, 200, 255, 0.3);
        border-radius: 12px;
    `;

    box.innerHTML = `
        <h3 style="color:#67e8f9">
            AI Grid Optimizer
        </h3>

        <p style="font-size:12px;opacity:0.7">
            Powered by GPT-OSS 120B
        </p>

        <button id="generate-ai-btn"
            style="width:100%;margin:10px 0">
            Generate AI Strategy
        </button>

        <div id="ai-status"
            style="font-size:13px;line-height:1.6">
            Ready to analyze your grid.
        </div>

        <div id="ai-preview"
            style="margin-top:12px">
        </div>

        <div id="ai-actions"
            style="display:none;gap:8px;margin-top:12px">

            <button id="apply-ai-btn"
                style="flex:1;background:#087f8c;color:white">
                Apply Strategy
            </button>

            <button id="reject-ai-btn" style="flex:1">
                Reject
            </button>

        </div>
    `;

    const results = document.getElementById("advisor-results");

    if (results && results.parentElement === panel) {
        panel.insertBefore(box, results);
    } else {
        panel.appendChild(box);
    }

    const generate = document.getElementById("generate-ai-btn");
    const status = document.getElementById("ai-status");
    const preview = document.getElementById("ai-preview");
    const actions = document.getElementById("ai-actions");
    const apply = document.getElementById("apply-ai-btn");
    const reject = document.getElementById("reject-ai-btn");

    let pendingStrategy = null;
    let originalState = null;

    function clearStrategy() {
        pendingStrategy = null;
        originalState = null;
        preview.replaceChildren();
        actions.style.display = "none";
    }

    function addLine(text, parent = preview) {
        const line = document.createElement("div");
        line.textContent = text;
        line.style.cssText =
            "padding:5px 0;font-size:13px;line-height:1.5";
        parent.appendChild(line);
    }

    generate.addEventListener("click", async () => {

        if (gameOver || submissionDialogOpen) {
            status.textContent =
                "AI unavailable during round submission.";
            return;
        }

        clearStrategy();

        generate.disabled = true;
        generate.textContent = "Analyzing grid...";
        status.textContent =
            "AI is calculating an electricity distribution.";

        try {

            const grid = getAIGridState();

            originalState = JSON.stringify(grid);

            const strategy = await generateAIStrategy(grid);

            if (
                gameOver ||
                submissionDialogOpen ||
                originalState !== JSON.stringify(getAIGridState())
            ) {
                throw new Error(
                    "Grid changed. Generate a fresh strategy."
                );
            }

            const validation = validateAIStrategy(strategy);

            if (!validation.valid) {
                throw new Error(validation.error);
            }

            pendingStrategy = strategy;

            status.textContent =
                "Strategy passed independent validation.";

            addLine(
                `Energy: ${validation.total} / ${TOTAL_CAPACITY} kWh`
            );

            addLine(
                `Households served: ${validation.served}`
            );

            addLine(
                `Connection cost: ${validation.connectionCost} EC`
            );

            addLine(
                `Projected balance: ${validation.balance.toFixed(2)} EC`
            );

            addLine(
                `Projected funds: ${validation.projectedFunds.toFixed(2)} EC`
            );

            addLine(strategy.reasoning);

            const details = document.createElement("details");
            const heading = document.createElement("summary");

            heading.textContent = "View building allocations";
            heading.style.cursor = "pointer";

            details.appendChild(heading);

            for (const allocation of strategy.allocations) {

                const b = buildings.find(
                    item => item.id === allocation.id
                );

                const connection =
                    !b.connected && allocation.connect
                    ? " — New connection"
                    : "";

                addLine(
                    `${b.name}: ${allocation.kWh} kWh${connection}`,
                    details
                );
            }

            preview.appendChild(details);

            actions.style.display = "flex";

        } catch (error) {

            clearStrategy();

            status.textContent = error.message;

        } finally {

            generate.disabled = false;
            generate.textContent = "Generate AI Strategy";
        }
    });

    apply.addEventListener("click", () => {

        if (
            !pendingStrategy ||
            gameOver ||
            submissionDialogOpen
        ) {
            return;
        }

        if (
            originalState !== JSON.stringify(getAIGridState())
        ) {
            clearStrategy();
            status.textContent =
                "Grid changed. Generate a fresh strategy.";
            return;
        }

        const validation =
            validateAIStrategy(pendingStrategy);

        if (!validation.valid) {

            clearStrategy();

            status.textContent = validation.error;

            return;
        }

        for (const allocation of pendingStrategy.allocations) {

            const b = buildings.find(
                item => item.id === allocation.id
            );

            if (!b.connected && allocation.connect) {

                councilFunds -= b.connectionCost;

                b.connected = true;
            }

            b.allocated = allocation.kWh;
        }

        clearStrategy();

        invalidatePlan();

        refreshAll();

        status.textContent =
            "Strategy applied! Review and confirm your daily plan.";
    });

    reject.addEventListener("click", () => {

        clearStrategy();

        status.textContent =
            "Strategy rejected. Your grid remains unchanged.";
    });
}

function analyzeGrid() {

    const recommendations = [];

    const objectives = checkObjectives();

    const finances = dailyFinances();

    if (!objectives.hospitalOK) {

        const missing = Math.max(
            0,
            currentEvent.hospitalMinimum -
            hospital.allocated
        );

        recommendations.push({

            priority: "CRITICAL",

            title: "Hospital electricity shortage",

            message: !hospital.connected
                ? `Connect the hospital for ${hospital.connectionCost} EC, then allocate ${currentEvent.hospitalMinimum} kWh.`
                : `Allocate ${missing} additional kWh to the hospital.`
        });
    }

    if (!objectives.waterOK) {

        const missing = Math.max(
            0,
            currentEvent.waterMinimum -
            water.allocated
        );

        recommendations.push({

            priority: "CRITICAL",

            title: "Water supply at risk",

            message: !water.connected
                ? `Connect the water facility for ${water.connectionCost} EC, then allocate ${currentEvent.waterMinimum} kWh.`
                : `Allocate ${missing} additional kWh to the water facility.`
        });
    }

    if (remainingEnergy() < 0) {

        recommendations.push({

            priority: "CRITICAL",

            title: "Grid overload",

            message:
                `Reduce allocations by at least ${fmt(-remainingEnergy())} kWh.`
        });
    }

    if (!objectives.accessOK) {

        const missing =
            currentEvent.requiredHouseholds -
            objectives.householdCount;

        const candidates = buildings
            .filter(b =>
                b.type === "Residential" &&
                (
                    !b.connected ||
                    b.allocated < householdMinimum(b)
                )
            )
            .sort((a, b) => {

                const energyA = Math.max(
                    0,
                    householdMinimum(a) -
                    a.allocated
                );

                const energyB = Math.max(
                    0,
                    householdMinimum(b) -
                    b.allocated
                );

                return energyA - energyB;
            });

        const suggestions = candidates
            .slice(0, missing)
            .map(b =>
                `${b.name}: ${householdMinimum(b)} kWh${b.connected ? "" : " (connect first)"}`
            );

        recommendations.push({

            priority: "HIGH",

            title:
                `${missing} more households need electricity`,

            message:
                `Suggested targets: ${suggestions.join(", ")}.`
        });
    }

    if (
        remainingEnergy() >= 0 &&
        remainingEnergy() < 10 &&
        getPlanIssues().length > 0
    ) {

        recommendations.push({

            priority: "HIGH",

            title: "Limited spare capacity",

            message: gridUpgraded
                ? "Reallocate electricity from nonessential surplus."
                : "Consider a +10 kWh upgrade for 120 EC, or reduce surplus allocations."
        });
    }

    for (const b of buildings) {

        if (b.allocated > b.demand) {

            recommendations.push({

                priority: "HIGH",

                title: `${b.name}: excess allocation`,

                message:
                    `Reduce its allocation to ${b.demand} kWh or less.`
            });
        }
    }

    if (councilFunds + finances.dailyBalance < 0) {

        recommendations.push({

            priority: "CRITICAL",

            title: "Bankruptcy risk",

            message:
                "Projected expenses exceed available council funds."
        });

    } else if (finances.dailyBalance < 0) {

        recommendations.push({

            priority: "MEDIUM",

            title: "Budget deficit",

            message:
                `Projected loss: ${fmt(Math.abs(finances.dailyBalance))} EC.`
        });
    }

    const projection = renewables.preview(
        currentDay,
        usedEnergy(),
        baseCapacity
    );

    if (
        currentEvent.weather === "Windy" &&
        renewables.counts.wind > 0
    ) {

        recommendations.push({

            priority: "MEDIUM",

            title: "High wind generation",

            message:
                `Your wind farms are generating ${projection.wind} kWh. Use surplus electricity or store it in batteries.`
        });
    }

    if (
        currentEvent.weather === "Heatwave" &&
        renewables.counts.wind > 0
    ) {

        recommendations.push({

            priority: "HIGH",

            title: "Reduced wind generation",

            message:
                "Heatwave conditions reduce each wind farm to 10 kWh. Check your available capacity."
        });
    }

    if (getPlanIssues().length === 0) {

        recommendations.unshift({

            priority: "SUCCESS",

            title: "Round objectives satisfied",

            message:
                "All mandatory requirements are met. Your plan is ready for confirmation."
        });
    }

    return recommendations;
}

function renderAnalysis() {

    const container = $("advisor-results");

    container.replaceChildren();

    const heading = document.createElement("h3");

    heading.textContent = "Grid Analysis Results";

    heading.style.color = "#5eead4";

    container.appendChild(heading);

    for (const item of analyzeGrid()) {

        const card = document.createElement("div");

        const borderColor =
            item.priority === "CRITICAL" ? "#ef4444" :
            item.priority === "HIGH" ? "#f59e0b" :
            item.priority === "SUCCESS" ? "#14b8a6" :
            "#64748b";

        card.style.cssText = `
            padding:12px;
            margin:12px 0;
            border-radius:10px;
            background:#0f172a;
            border-left:4px solid ${borderColor};
        `;

        const title = document.createElement("strong");

        title.textContent =
            `${item.priority}: ${item.title}`;

        title.style.display = "block";

        title.style.marginBottom = "8px";

        const message = document.createElement("p");

        message.textContent = item.message;

        message.style.margin = "0";

        card.append(title, message);

        container.appendChild(card);
    }

    updateForecast();
}

$("analyze-grid-btn").addEventListener(
    "click",
    renderAnalysis
);

// ==========================================
// NEXT ROUND FORECAST
// ==========================================

function updateForecast() {

    const container = $("advisor-forecast");

    if (currentDay >= TOTAL_ROUNDS) {

        container.textContent =
            "Final round! No further challenges.";

        return;
    }

    const next = dailyEvents[currentDay];

    const projection = renewables.preview(
        currentDay,
        usedEnergy(),
        baseCapacity
    );

    const nextGeneration =
        renewables.generation(currentDay + 1);

    const nextCapacity =
        next.capacity +
        (gridUpgraded ? UPGRADE_CAPACITY : 0) +
        nextGeneration +
        projection.nextStored;

    const nextServed = buildings.filter(b => {

        if (b.type !== "Residential") {
            return false;
        }

        const nextDemand = Math.ceil(
            b.baseDemand *
            next.demandMultiplier
        );

        return (
            b.connected &&
            b.allocated >= Math.ceil(nextDemand * 0.5)
        );
    }).length;

    const capacityChange =
        nextCapacity - TOTAL_CAPACITY;

    container.textContent = [

        `${roundLabel(currentDay + 1)}`,

        `Challenge: ${next.title}`,

        `Weather: ${next.weather}`,

        `Event merging probability: ${next.mergeProbability}%`,

        "",

        `Expected capacity: ${fmt(nextCapacity)} kWh`,

        `Renewable generation: ${nextGeneration} kWh`,

        `Projected battery storage: ${fmt(projection.nextStored)} kWh`,

        `Capacity change: ${capacityChange >= 0 ? "+" : ""}${fmt(capacityChange)} kWh`,

        `Required households: ${next.requiredHouseholds}`,

        `Hospital minimum: ${next.hospitalMinimum} kWh`,

        `Water minimum: ${next.waterMinimum} kWh`,

        "",

        `Households meeting the next round's threshold with current allocations: ${nextServed}`

    ].join("\n");
}

// ==========================================
// REFRESH UI
// ==========================================

function refreshAll() {

    shop.refresh();

    buildings.forEach(updateIndicator);

    updateTopBar();

    updateEnergyDashboard();

    updateFinanceDashboard();

    updateChallengeDashboard();

    if (selectedBuilding) {

        updateBuildingInfo(selectedBuilding);
    }

    if (activePanel === "advisor-panel") {

        setText(
            "advisor-results",
            "Grid data changed. Analyze again for updated recommendations."
        );

        updateForecast();
    }
}

function invalidatePlan() {

    planConfirmed = false;

    updateChallengeDashboard();
}

// ==========================================
// CONFIRM STRATEGY
// ==========================================

$("confirm-plan-btn").addEventListener("click", () => {

    if (
        gameOver ||
        submissionDialogOpen
    ) {
        return;
    }

    planConfirmed = true;

    dayNotice = "";

    updateChallengeDashboard();
});

// ==========================================
// ROUND SCORING
// ==========================================

function calculateDayScore() {

    const objectives = checkObjectives();

    const finances = dailyFinances();

    return {

        reliability:
            (objectives.hospitalOK ? 15 : 0) +
            (objectives.waterOK ? 15 : 0),

        access: Math.round(
            30 * objectives.householdCount / 12
        ),

        financial: Math.round(
            Math.max(
                0,
                Math.min(
                    25,
                    25 + finances.dailyBalance / 10
                )
            )
        ),

        coverage: Math.round(
            15 * objectives.householdCount / 12
        )
    };
}

function finalScore() {

    const average = key => Math.round(
        dailyScores.reduce(
            (sum, score) => sum + score[key],
            0
        ) / Math.max(1, dailyScores.length)
    );

    const score = {

        reliability: average("reliability"),

        access: average("access"),

        financial: average("financial"),

        coverage: average("coverage")
    };

    score.total =
        score.reliability +
        score.access +
        score.financial +
        score.coverage;

    return score;
}

// ==========================================
// GAME RESULT
// ==========================================

function endGame(victory, reason) {

    if (gameOver) return;

    if (!victory) {

        dailyScores.push(
            calculateDayScore()
        );
    }

    gameOver = true;

    const score = finalScore();

    $("game-result").hidden = false;

    setText(
        "result-title",
        victory
            ? "🏆 Campaign Completed!"
            : "Campaign Failed"
    );

    setText(
        "result-reason",
        reason
    );

    setText(
        "final-score",
        `${score.total}/100`
    );

    setText(
        "result-breakdown",
        [

            `Reliability: ${score.reliability}/30`,

            `Access: ${score.access}/30`,

            `Financial management: ${score.financial}/25`,

            `Coverage: ${score.coverage}/15`,

            `Rounds completed: ${daysCompleted}/${TOTAL_ROUNDS}`,

            `Days completed: ${Math.floor(daysCompleted / 2)}/7`,

            `Difficulty: ${difficulty.name || ["Easy", "Normal", "Hard"][preferences.difficulty]}`

        ].join("\n")
    );

    if ($("result-breakdown")) {

        $("result-breakdown").style.whiteSpace =
            "pre-line";
    }

    $("next-day-btn").disabled = true;

    closePanel();

    refreshAll();
}

// ==========================================
// APPLY RANDOMIZED EVENT
// ==========================================

function applyDailyEvent(index) {

    const previousCapacity = TOTAL_CAPACITY;

    const previousDemands = new Map(
        buildings.map(b => [b.id, b.demand])
    );

    currentEvent = dailyEvents[index];

    baseCapacity =
        currentEvent.capacity +
        (gridUpgraded ? UPGRADE_CAPACITY : 0);

    recalculateCapacity();

    for (const b of buildings) {

        if (b.type === "Residential") {

            b.demand = Math.ceil(
                b.baseDemand *
                currentEvent.demandMultiplier
            );

        } else if (b.id === "factory") {

            b.demand =
                currentEvent.factoryDemand ??
                b.baseDemand;

        } else {

            b.demand = b.baseDemand;
        }
    }

    planConfirmed = false;

    const changes = [];

    if (index > 0) {

        changes.push(
            `Weather: ${currentEvent.weather}.`
        );

        if (TOTAL_CAPACITY !== previousCapacity) {

            changes.push(
                `Grid capacity: ${fmt(previousCapacity)} → ${fmt(TOTAL_CAPACITY)} kWh.`
            );
        }

        const changedHomes = buildings.filter(b =>
            b.type === "Residential" &&
            b.demand !== previousDemands.get(b.id)
        ).length;

        if (changedHomes > 0) {

            changes.push(
                `Electricity demand changed for ${changedHomes} households.`
            );
        }

        if (usedEnergy() > TOTAL_CAPACITY) {

            changes.push(
                `Grid overloaded by ${fmt(usedEnergy() - TOTAL_CAPACITY)} kWh.`
            );
        }

        const issues = getPlanIssues();

        if (issues.length > 0) {

            changes.push(
                "Review your strategy:",
                ...issues
            );
        }
    }

    dayNotice = changes.join("\n");

    refreshAll();
}

// ==========================================
// ROUND SUBMISSION DIALOG
// ==========================================

const submissionOverlay =
    document.createElement("div");

submissionOverlay.id =
    "submission-overlay";

submissionOverlay.hidden = true;

submissionOverlay.style.cssText = `
    position:fixed;
    inset:0;
    z-index:10000;
    background:rgba(2,6,23,0.75);
    align-items:center;
    justify-content:center;
    padding:20px;
`;

submissionOverlay.innerHTML = `
    <div style="
        width:100%;
        max-width:440px;
        max-height:85vh;
        overflow-y:auto;
        background:#0f172a;
        border:1px solid #475569;
        border-radius:16px;
        padding:24px;
        color:#e2e8f0;
        box-shadow:0 20px 70px rgba(0,0,0,0.45);
    ">
        <h2>Submit Round Plan</h2>

        <p
            id="submission-summary"
            style="
                white-space:pre-line;
                line-height:1.7;
            "
        ></p>

        <div style="
            display:flex;
            gap:12px;
            margin-top:20px;
        ">
            <button
                id="cancel-submission"
                type="button"
                style="
                    flex:1;
                    padding:12px;
                    border:1px solid #475569;
                    background:#1e293b;
                    color:#e2e8f0;
                    border-radius:8px;
                    cursor:pointer;
                "
            >
                Cancel
            </button>

            <button
                id="confirm-submission"
                type="button"
                style="
                    flex:1;
                    padding:12px;
                    border:0;
                    background:#5eead4;
                    color:#0f172a;
                    border-radius:8px;
                    font-weight:bold;
                    cursor:pointer;
                "
            >
                Submit
            </button>
        </div>
    </div>
`;

document.body.appendChild(submissionOverlay);

function showSubmissionDialog() {

    if (
        gameOver ||
        submissionDialogOpen
    ) {
        return;
    }

    const issues = getPlanIssues();

    const finances = dailyFinances();

    const projection = renewables.preview(
        currentDay,
        usedEnergy(),
        baseCapacity
    );

    const summary = [

        `${roundLabel(currentDay)} — ${currentEvent.title}`,

        `Weather: ${currentEvent.weather}`,

        "",

        `Allocated: ${fmt(usedEnergy())}/${fmt(TOTAL_CAPACITY)} kWh`,

        `Households served: ${householdsServed()}/${currentEvent.requiredHouseholds}`,

        `Projected balance: ${fmt(finances.dailyBalance)} EC`,

        `Maintenance: ${finances.maintenance} EC`,

        "",

        `Solar used: ${fmt(projection.solarUsed)} kWh`,

        `Wind used: ${fmt(projection.windUsed)} kWh`,

        `Battery charge: ${fmt(projection.charge)} kWh`,

        `Battery discharge: ${fmt(projection.discharge)} kWh`,

        "",

        issues.length > 0
            ? "Warning: Your plan does not satisfy all objectives."
            : "All mandatory objectives are satisfied.",

        ...issues

    ];

    setText(
        "submission-summary",
        summary.join("\n")
    );

    submissionDialogOpen = true;

    submissionOverlay.hidden = false;

    submissionOverlay.style.display = "flex";

    shop.refresh();
}

function closeSubmissionDialog() {

    submissionDialogOpen = false;

    submissionOverlay.hidden = true;

    submissionOverlay.style.display = "none";

    shop.refresh();
}

$("cancel-submission").addEventListener(
    "click",
    closeSubmissionDialog
);

// ==========================================
// REVIEW ROUND PLAN
// ==========================================

$("next-day-btn").addEventListener("click", () => {

    if (
        gameOver ||
        submissionDialogOpen
    ) {
        return;
    }

    if (!planConfirmed) {

        dayNotice =
            "Confirm your strategy before submitting the round plan.";

        updateChallengeDashboard();

        openPanel("daily-event-panel");

        return;
    }

    showSubmissionDialog();
});

// ==========================================
// FINALIZE ROUND PLAN
// ==========================================

$("confirm-submission").addEventListener("click", () => {

    if (
        gameOver ||
        !submissionDialogOpen ||
        !planConfirmed
    ) {

        closeSubmissionDialog();

        return;
    }

    closeSubmissionDialog();

    const issues = getPlanIssues();

    if (issues.length > 0) {

        endGame(
            false,
            issues.join("\n")
        );

        return;
    }

    const finances = dailyFinances();

    dailyScores.push(
        calculateDayScore()
    );

    councilFunds += finances.dailyBalance;

    // ======================================
    // FINALIZE RENEWABLE ENERGY
    // ======================================

    const settlement = renewables.settle(
        currentDay,
        usedEnergy(),
        baseCapacity
    );

    daysCompleted++;

    planConfirmed = false;

    // ======================================
    // CAMPAIGN COMPLETION
    // ======================================

    if (daysCompleted >= TOTAL_ROUNDS) {

        endGame(
            true,
            "You successfully managed the city's electricity grid for all seven days and fourteen rounds."
        );

        return;
    }

    // ======================================
    // ADVANCE TO NEXT ROUND
    // ======================================

    currentDay++;

    applyDailyEvent(daysCompleted);

    setText(
        "finance-message",
        `Previous round balance: ${fmt(finances.dailyBalance)} EC.`
    );

    const renewableNotice = [];

    if (settlement.charge > 0) {

        renewableNotice.push(
            `Battery charged: ${fmt(settlement.charge)} kWh.`
        );
    }

    if (settlement.discharge > 0) {

        renewableNotice.push(
            `Battery discharged: ${fmt(settlement.discharge)} kWh.`
        );
    }

    if (renewableNotice.length > 0) {

        renewableNotice.push(
            `Stored energy: ${fmt(renewables.stored)} kWh.`
        );

        dayNotice = [

            dayNotice,

            ...renewableNotice

        ].filter(Boolean).join("\n");

        updateChallengeDashboard();
    }

    openPanel("daily-event-panel");
});

// ==========================================
// RESTART
// ==========================================

$("restart-btn").addEventListener("click", () => {

    window.location.reload();
});

// ==========================================
// 3D BUILDING SELECTION
// ==========================================

const raycaster = new THREE.Raycaster();

const mouse = new THREE.Vector2();

let pointerStartX = 0;

let pointerStartY = 0;

renderer.domElement.addEventListener(
    "pointerdown",
    event => {

        pointerStartX = event.clientX;

        pointerStartY = event.clientY;
    }
);

renderer.domElement.addEventListener(
    "pointerup",
    event => {

        if (
            gameOver ||
            submissionDialogOpen
        ) {
            return;
        }

        const movement = Math.hypot(
            event.clientX - pointerStartX,
            event.clientY - pointerStartY
        );

        if (movement > 5) return;

        const rect =
            renderer.domElement.getBoundingClientRect();

        mouse.x =
            ((event.clientX - rect.left) / rect.width) * 2 - 1;

        mouse.y =
            -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(
            mouse,
            camera
        );

        const hits = raycaster.intersectObjects(
            clickableBuildings,
            false
        );

        if (hits.length > 0) {

            const building =
                hits[0].object.userData.building;

            if (building) {

                selectBuilding(building);
            }

        } else {

            closePanel();
        }
    }
);

// ==========================================
// WINDOW RESIZE
// ==========================================

window.addEventListener("resize", () => {

    camera.aspect =
        window.innerWidth /
        window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );
});

// ==========================================
// START GAME
// ==========================================

applyDailyEvent(0);

closePanel();

// ==========================================
// ANIMATION LOOP
// ==========================================

function animate() {

    requestAnimationFrame(animate);

    controls.update();

    const time = performance.now() * 0.001;

    // Industrial atmosphere effects.

    atmosphere.update(time);

    // Renewable infrastructure animations.

    renewables.update(
        time,
        currentDay
    );

    // Dynamic environmental lighting.

    const daylight = dayNight.update(
        time,
        currentDay
    );

    skybox.update(
        daylight,
        camera
    );

    // Electricity network animations.

    networkEffects.update(time);

    // Overhead powerlines.

    powerlines.update(
        time,
        TOTAL_CAPACITY,
        daylight
    );

    settings.updatePowerlines();

    // Grid overload and selection feedback.

    gridFeedback.update(
        time,
        usedEnergy(),
        TOTAL_CAPACITY,
        selectedBuilding
    );

    // Electricity-powered building illumination.

    buildingLights.update(
        time,
        settings.graphics.dynamicLights
            ? daylight
            : 1
    );

    // Update floating building popup.

    positionBuildingPopup();

    // Render completed scene.
    renderer.render(
        scene,
        camera
    );
}

// ==========================================
// DEVELOPER COMMANDS
// ==========================================

function devNumber(args, minimum, maximum) {

    const value = Number(args[0]);

    if (
        args.length !== 1 ||
        !Number.isInteger(value) ||
        value < minimum ||
        value > maximum
    ) {

        throw new Error(
            `Enter an integer from ${minimum} to ${maximum}.`
        );
    }

    return value;
}

const developerConsole = createDeveloperConsole({

    // ======================================
    // SET FUNDS
    // ======================================

    funds: {

        description: "Set council funds",

        run(args) {

            councilFunds = devNumber(
                args,
                0,
                1000000
            );

            invalidatePlan();

            refreshAll();

            return `Funds set to ${councilFunds} EC.`;
        }
    },

    // ======================================
    // SET CAPACITY
    // ======================================

    capacity: {

        description: "Set electricity capacity",

        run(args) {

            baseCapacity = devNumber(
                args,
                1,
                100000
            );

            recalculateCapacity();

            invalidatePlan();

            refreshAll();

            return `Capacity set to ${fmt(TOTAL_CAPACITY)} kWh.`;
        }
    },

    // ======================================
    // CHANGE ROUND
    // ======================================

    day: {

        description:
            "Jump to a campaign round (1–14)",

        run(args) {

            if (gameOver) {

                throw new Error(
                    "Reset the game first."
                );
            }

            currentDay = devNumber(
                args,
                1,
                TOTAL_ROUNDS
            );

            daysCompleted = currentDay - 1;

            dailyScores.length = 0;

            applyDailyEvent(currentDay - 1);

            return `Jumped to ${roundLabel(currentDay)}.`;
        }
    },

    // ======================================
    // CONNECT ALL BUILDINGS
    // ======================================

    connectall: {

        description: "Connect all buildings",

        run() {

            for (const b of buildings) {

                b.connected = true;
            }

            invalidatePlan();

            refreshAll();

            return "All buildings connected.";
        }
    },

    // ======================================
    // DISCONNECT ALL CONSUMERS
    // ======================================

    disconnectall: {

        description: "Disconnect all consumers",

        run() {

            for (const b of buildings) {

                if (b.id === "power") continue;

                b.connected = false;

                b.allocated = 0;
            }

            invalidatePlan();

            refreshAll();

            return "All consumers disconnected.";
        }
    },

    // ======================================
    // POWER ALL BUILDINGS
    // ======================================

    powerall: {

        description: "Fully power every building",

        run() {

            for (const b of buildings) {

                if (b.id === "power") continue;

                b.connected = true;

                b.allocated = b.demand;
            }

            invalidatePlan();

            refreshAll();

            return `All buildings powered. Usage: ${usedEnergy()} kWh.`;
        }
    },

    // ======================================
    // CLEAR ALLOCATIONS
    // ======================================

    clearallocations: {

        description: "Reset electricity allocations",

        run() {

            for (const b of buildings) {

                b.allocated = 0;
            }

            invalidatePlan();

            refreshAll();

            return "All allocations cleared.";
        }
    },

    // ======================================
    // CLOUD VISIBILITY
    // ======================================

    clouds: {

        description: "Enable or disable clouds",

        run(args) {

            if (args[0] === "off") {

                skybox.uniforms.cloudCoverage.value = 2;

            } else if (args[0] === "on") {

                skybox.uniforms.cloudCoverage.value = 0.48;

            } else {

                throw new Error(
                    "Usage: clouds on/off"
                );
            }

            return `Clouds ${args[0]}.`;
        }
    },

    // ======================================
    // CLOUD SPEED
    // ======================================

    cloudspeed: {

        description: "Set cloud movement speed",

        run(args) {

            const speed = Number(args[0]);

            if (
                args.length !== 1 ||
                !Number.isFinite(speed) ||
                speed < 0 ||
                speed > 1
            ) {

                throw new Error(
                    "Enter a speed from 0 to 1."
                );
            }

            skybox.uniforms.cloudSpeed.value = speed;

            return `Cloud speed set to ${speed}.`;
        }
    },

    // ======================================
    // GAME STATUS
    // ======================================

    status: {

        description: "Display current game statistics",

        mutates: false,

        run() {

            const projection = renewables.preview(
                currentDay,
                usedEnergy(),
                baseCapacity
            );

            return [

                `${roundLabel(currentDay)} — Round ${currentDay}/${TOTAL_ROUNDS}`,

                `Weather: ${currentEvent.weather}`,

                `Event: ${currentEvent.title}`,

                `Merge probability: ${currentEvent.mergeProbability}%`,

                `Funds: ${fmt(councilFunds)} EC`,

                `Capacity: ${fmt(TOTAL_CAPACITY)} kWh`,

                `Base capacity: ${baseCapacity} kWh`,

                `Solar generation: ${projection.solar} kWh`,

                `Wind generation: ${projection.wind} kWh`,

                `Battery storage: ${fmt(renewables.stored)} kWh`,

                `Allocated: ${usedEnergy()} kWh`,

                `Remaining: ${fmt(remainingEnergy())} kWh`,

                `Households served: ${householdsServed()}/12`

            ].join("\n");
        }
    },

    // ======================================
    // FORCE VICTORY
    // ======================================

    win: {

        description: "Trigger victory screen",

        run() {

            endGame(
                true,
                "Developer-triggered victory — Debug Run."
            );

            return "Victory triggered.";
        }
    },

    // ======================================
    // FORCE FAILURE
    // ======================================

    lose: {

        description: "Trigger failure screen",

        run() {

            endGame(
                false,
                "Developer-triggered failure — Debug Run."
            );

            return "Failure triggered.";
        }
    },

    // ======================================
    // RESET GAME
    // ======================================

    reset: {

        description: "Restart the game",

        run() {

            window.location.reload();
        }
    }

});

// ==========================================
// START RENDERING
// ==========================================

animate();

console.log(
    "PowerQuest v1.4 — Randomized 14-round campaign and wind energy system loaded!"
);
