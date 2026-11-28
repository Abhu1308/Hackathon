
const AI_ENDPOINT =
    "https://powerquest-ai.abhyudayajr.workers.dev/";

let accessToken = null;
let requestInProgress = false;

export function resetAIToken() {
    accessToken = null;
}

export async function generateAIStrategy(grid) {

    if (requestInProgress) {
        throw new Error(
            "An AI request is already in progress."
        );
    }

    if (!accessToken) {

        const token = window.prompt(
            "Enter your PowerQuest AI access token:"
        );

        if (!token || !token.trim()) {
            throw new Error("AI request cancelled.");
        }

        accessToken = token.trim();
    }

    requestInProgress = true;

    try {

        const response = await fetch(AI_ENDPOINT, {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`
            },

            body: JSON.stringify(grid),

            signal: AbortSignal.timeout(60000),

            cache: "no-store"
        });

        if (response.status === 401) {

            resetAIToken();

            throw new Error(
                "Incorrect AI access token. Try again."
            );
        }

        if (response.status === 429) {
            throw new Error(
                "AI request limit reached. Wait one minute."
            );
        }

        if (!response.ok) {
            throw new Error(
                `AI backend error (${response.status}).`
            );
        }

        const data = await response.json();

        if (!data.success || !data.strategy) {
            throw new Error(
                "The AI did not return a strategy."
            );
        }

        const strategy = data.strategy;

        if (
            typeof strategy.feasible !== "boolean" ||
            typeof strategy.reasoning !== "string" ||
            !Array.isArray(strategy.allocations)
        ) {
            throw new Error(
                "Invalid AI strategy format."
            );
        }

        return strategy;

    } catch (error) {

        if (
            error.name === "TimeoutError" ||
            error.name === "AbortError"
        ) {
            throw new Error(
                "AI request timed out. Try again."
            );
        }

        throw error;

    } finally {

        requestInProgress = false;
    }
}
