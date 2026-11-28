
import { CATALOG } from "./renewables.js";

export function createShop({
    renewables,
    getState,
    purchase
}) {

    const panel = document.createElement("section");

    panel.id = "shop-panel";
    panel.className = "panel-content";
    panel.hidden = true;

    panel.innerHTML = `
        <h2>Energy Infrastructure</h2>

        <p id="shop-funds"></p>

        <div
            id="shop-stats"
            style="
                white-space:pre-line;
                line-height:1.7;
                background:#1e293b;
                padding:12px;
                border-radius:10px;
            "
        ></div>

        <div id="shop-catalog"></div>

        <p id="shop-message" role="status"></p>
    `;

    document
        .getElementById("slide-panel")
        .append(panel);

    const nav = document.createElement("button");

    nav.type = "button";
    nav.className = "nav-btn";
    nav.dataset.panel = panel.id;
    nav.textContent = "Shop";

    document
        .querySelector(".nav-buttons")
        .append(nav);

    const buttons = {};

    for (const [type, item] of Object.entries(CATALOG)) {

        const card = document.createElement("div");

        card.style.cssText = `
            background:#0f172a;
            border:1px solid #475569;
            border-radius:12px;
            padding:12px;
            margin:12px 0;
        `;

        card.innerHTML = `
            <strong>${item.name}</strong>

            <p>${item.description}</p>

            <p>
                ${item.price} EC ·
                ${item.maintenance} EC/day
            </p>
        `;

        const button = document.createElement("button");

        button.type = "button";

        button.style.cssText = `
            width:100%;
            padding:10px;
            background:#5eead4;
            color:#0f172a;
            border:0;
            border-radius:8px;
            font-weight:bold;
            cursor:pointer;
        `;

        button.onclick = () => {

            panel.querySelector(
                "#shop-message"
            ).textContent = purchase(type);

            refresh();
        };

        card.append(button);

        panel.querySelector(
            "#shop-catalog"
        ).append(card);

        buttons[type] = button;
    }

    const fmt = n => Number(n.toFixed(2));

    function refresh() {

        const s = getState();

        const r = renewables;

        const p = r.preview(
            s.day,
            s.used,
            s.base
        );

        panel.querySelector(
            "#shop-funds"
        ).textContent =
            `Available funds: ${fmt(s.funds)} EC`;

        panel.querySelector(
            "#shop-stats"
        ).textContent = [

            `Weather: ${r.weather(s.day)}`,

            `Solar generation: ${p.solar} kWh`,

            `Wind generation: ${p.wind} kWh`,

            `Battery stored: ${fmt(r.stored)} / ${r.storageCapacity()} kWh`,

            `Projected charge: ${fmt(p.charge)} kWh`,

            `Projected discharge: ${fmt(p.discharge)} kWh`,

            `After submission: ${fmt(p.nextStored)} kWh`,

            `Renewable maintenance: ${r.maintenance()} EC/day`

        ].join("\n");

        for (
            const [type, item]
            of Object.entries(CATALOG)
        ) {

            const button = buttons[type];

            button.disabled =
                s.gameOver ||
                s.funds < item.price ||
                r.counts[type] >= item.limit;

            button.textContent =
                `Buy · ${item.price} EC (${r.counts[type]}/${item.limit})`;

            button.style.opacity =
                button.disabled ? ".45" : "1";
        }
    }

    return {
        refresh
    };
}
