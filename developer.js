export function createDeveloperConsole(commands) {

    const PASSWORD = "2012";

    let unlocked = false;
    let visible = false;

    const history = [];
    let historyIndex = 0;

    // ==========================================
    // CONSOLE INTERFACE
    // ==========================================

    const panel = document.createElement("div");

    panel.id = "developer-console";

    panel.style.cssText = `
        position: fixed;
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        width: 650px;
        max-width: 90vw;
        background: rgba(8, 14, 23, 0.98);
        border: 1px solid #344353;
        border-radius: 12px;
        padding: 16px;
        color: #edf2f7;
        font-family: monospace;
        z-index: 1000;
        box-shadow: 0 10px 40px #0008;
        display: none;
    `;

    panel.innerHTML = `
        <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-bottom:12px;
        ">
            <strong style="color:#65ced9;">
                POWERQUEST — DEVELOPER CONSOLE
            </strong>

            <button id="dev-close">×</button>
        </div>

        <div id="dev-output" style="
            height:240px;
            overflow-y:auto;
            background:#080d15;
            padding:12px;
            border-radius:6px;
            white-space:pre-wrap;
            line-height:1.6;
            font-size:12px;
        "></div>

        <input
            id="dev-input"
            type="password"
            placeholder="Enter developer password..."
            autocomplete="off"
            style="
                width:100%;
                margin-top:12px;
                padding:12px;
                background:#101a27;
                color:#4cbb17;
                border:1px solid #344353;
                border-radius:6px;
                font-family:monospace;
                outline:none;
            "
        >
    `;

    document.body.appendChild(panel);

    const output = panel.querySelector("#dev-output");

    const input = panel.querySelector("#dev-input");

    // ==========================================
    // CONSOLE OUTPUT
    // ==========================================

    function log(message, color = "#a7b5c5") {

        const line = document.createElement("div");

        line.style.color = color;

        line.textContent = message;

        output.appendChild(line);

        output.scrollTop = output.scrollHeight;

    }

    // ==========================================
    // DEBUG RUN INDICATOR
    // ==========================================

    const debugBadge = document.createElement("div");

    debugBadge.textContent = "DEBUG RUN";

    debugBadge.style.cssText = `
        position:fixed;
        top:60px;
        right:12px;
        padding:6px 10px;
        border:1px solid #f59e0b;
        border-radius:6px;
        color:#f59e0b;
        background:#101a27;
        font-size:11px;
        font-weight:bold;
        z-index:40;
        pointer-events:none;
        display:none;
    `;

    document.body.appendChild(debugBadge);

    function markDebugRun() {

        debugBadge.style.display = "block";

    }

    // ==========================================
    // OPEN AND CLOSE
    // ==========================================

    function toggle() {

        visible = !visible;

        panel.style.display =
            visible ? "block" : "none";

        if (visible) {

            input.focus();

        }

    }

    function close() {

        visible = false;

        panel.style.display = "none";

        input.blur();

    }

    panel.querySelector("#dev-close")
        .addEventListener("click", close);

    // ==========================================
    // KEYBOARD SHORTCUT
    // ==========================================

    document.addEventListener("keydown", event => {

        if (
            (event.ctrlKey || event.metaKey) &&
            event.shiftKey &&
            event.key.toLowerCase() === "d"
        ) {

            event.preventDefault();

            toggle();

        }

    });

    // ==========================================
    // LOCK CONSOLE
    // ==========================================

    function lock() {

        unlocked = false;

        history.length = 0;

        historyIndex = 0;

        input.type = "password";

        input.placeholder =
            "Enter developer password...";

        output.replaceChildren();

        log("Developer console locked.");

    }

    // ==========================================
    // COMMAND PROCESSING
    // ==========================================

    function execute(raw) {

        if (!unlocked) {

            if (raw === PASSWORD) {

                unlocked = true;

                input.type = "text";

                input.placeholder =
                    "Enter command...";

                output.replaceChildren();

                log(
                    "Developer access granted.",
                    "#4cbb17"
                );

                log("Type help for available commands.");

            } else {

                log(
                    "Incorrect password.",
                    "#ef4444"
                );

            }

            return;

        }

        log("> " + raw, "#65ced9");

        const parts = raw.trim().split(/\s+/);

        const command = parts.shift().toLowerCase();

        if (command === "help") {

            log("AVAILABLE COMMANDS", "#65ced9");

            log("help — List commands");
            log("clear — Clear console");
            log("lock — Lock console");

            for (const [name, config] of
                Object.entries(commands)) {

                log(
                    name + " — " + config.description
                );

            }

            return;

        }

        if (command === "clear") {

            output.replaceChildren();

            return;

        }

        if (command === "lock") {

            lock();

            return;

        }

        const config = commands[command];

        if (!config) {

            log(
                "Unknown command: " + command,
                "#ef4444"
            );

            return;

        }

        try {

            if (config.mutates !== false) {

                markDebugRun();

            }

            const result = config.run(parts);

            if (result !== undefined) {

                log(String(result), "#4cbb17");

            }

        } catch (error) {

            log(error.message, "#ef4444");

        }

    }

    // ==========================================
    // INPUT AND COMMAND HISTORY
    // ==========================================

    input.addEventListener("keydown", event => {

        event.stopPropagation();

        if (event.key === "Escape") {

            close();

            return;

        }

        if (event.key === "Enter") {

            const raw = input.value.trim();

            input.value = "";

            if (!raw) return;

            if (unlocked) {

                history.push(raw);

                historyIndex = history.length;

            }

            execute(raw);

        }

        if (unlocked && event.key === "ArrowUp") {

            event.preventDefault();

            historyIndex = Math.max(
                0, historyIndex - 1
            );

            input.value =
                history[historyIndex] || "";

        }

        if (unlocked && event.key === "ArrowDown") {

            event.preventDefault();

            historyIndex = Math.min(
                history.length,
                historyIndex + 1
            );

            input.value =
                history[historyIndex] || "";

        }

    });

    log("PowerQuest Developer Environment");

    log("Authentication required.", "#f59e0b");

    return {

        toggle,

        close,

        lock

    };

}