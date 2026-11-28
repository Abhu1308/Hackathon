
export default {
    async fetch(request, env) {

        if (!env.GROQ_API_KEY) {
            return Response.json({
                error: "GROQ_API_KEY is missing"
            }, { status: 500 });
        }

        // Only allow a POST test request.
        if (request.method !== "POST") {
            return new Response(
                "PowerQuest AI backend is online.",
                { status: 200 }
            );
        }

        try {

            const response = await fetch(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    method: "POST",

                    headers: {
                        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        model: "openai/gpt-oss-120b",

                        messages: [
                            {
                                role: "system",
                                content: `
You are PowerQuest's electricity grid advisor.
Prioritize essential services.
Never exceed available electricity capacity.
Use the propose_distribution function.
                                `
                            },
                            {
                                role: "user",
                                content: `
Available electricity: 70 kWh.
Hospital requires 25 kWh.
Water facility requires 15 kWh.
Households demand 40 kWh.
Recommend a valid distribution.
                                `
                            }
                        ],

                        tools: [
                            {
                                type: "function",

                                function: {

                                    name: "propose_distribution",

                                    description:
                                        "Propose an electricity allocation for player review.",

                                    parameters: {

                                        type: "object",

                                        properties: {

                                            hospital: {
                                                type: "integer"
                                            },

                                            water: {
                                                type: "integer"
                                            },

                                            households: {
                                                type: "integer"
                                            },

                                            reasoning: {
                                                type: "string"
                                            }
                                        },

                                        required: [
                                            "hospital",
                                            "water",
                                            "households",
                                            "reasoning"
                                        ]
                                    }
                                }
                            }
                        ],

                        tool_choice: "required",

                        temperature: 0.2,

                        max_completion_tokens: 2048
                    })
                }
            );

            const data = await response.json();

console.log("GROQ STATUS:", response.status);

console.log(
    "GROQ RESPONSE:",
    JSON.stringify(data, null, 2)
);

            if (!response.ok) {
                return Response.json({
                    success: false,
                    error: data.error
                }, { status: response.status });
            }

            const message = data.choices?.[0]?.message;

            const call = message?.tool_calls?.[0];

            if (!call) {
                return Response.json({
                    success: false,
                    error: "No function call received"
                });
            }

            const strategy = JSON.parse(
                call.function.arguments
            );

            const total =
                strategy.hospital +
                strategy.water +
                strategy.households;

            const valid =
                Number.isInteger(strategy.hospital) &&
                Number.isInteger(strategy.water) &&
                Number.isInteger(strategy.households) &&
                strategy.hospital === 25 &&
                strategy.water === 15 &&
                strategy.households >= 0 &&
                strategy.households <= 40 &&
                total <= 70;

            return Response.json({

                success: true,

                model: data.model,

                function: call.function.name,

                strategy,

                totalAllocated: total,

                valid,

                playerConfirmationRequired: true
            });

        } catch (error) {

            return Response.json({
                success: false,
                error: error.message
            }, { status: 500 });
        }
    }
};
