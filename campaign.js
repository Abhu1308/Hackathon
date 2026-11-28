
export const TOTAL_ROUNDS = 14;

export const mergeProbabilities = [
    0, 25, 40, 55, 70, 85, 100
];

export const roundLabel = r =>
    `Day ${Math.ceil(r / 2)} (${r % 2 ? "Morning" : "Night"})`;

const weatherPool = [
    "Normal",
    "Normal",
    "Normal",
    "Normal",
    "Normal",
    "Windy",
    "Windy",
    "Windy",
    "Heatwave",
    "Heatwave"
];

const eventPool = [
    {
        title: "Normal Operations",
        description: "Maintain reliable service."
    },
    {
        title: "Transformer Maintenance",
        description: "Grid capacity decreases by 10 kWh.",
        capacity: -10
    },
    {
        title: "Hospital Emergency",
        description: "Hospital requires 25 kWh.",
        hospitalMinimum: 5
    },
    {
        title: "Funding Shortfall",
        description: "Public funding decreases by 1 EC/kWh.",
        funding: -1
    },
    {
        title: "Equipment Efficiency",
        description: "Capacity increases by 5 kWh; serve two more homes.",
        capacity: 5,
        requiredHouseholds: 2,
        maintenance: 5
    },
    {
        title: "Increased Household Demand",
        description: "Residential demand rises by 10%.",
        demandMultiplier: 0.1
    },
    {
        title: "Water Supply Emergency",
        description: "Water facility requires 20 kWh.",
        waterMinimum: 5
    },
    {
        title: "Government Subsidy",
        description: "Public funding increases by 1 EC/kWh.",
        funding: 1
    },
    {
        title: "Rising Electricity Prices",
        description: "Conventional electricity costs 1 EC more per kWh.",
        electricityCost: 1
    },
    {
        title: "Industrial Demand Surge",
        description: "Factory demand rises by 10 kWh.",
        factoryDemand: 10
    }
];

const pick = array =>
    array[Math.floor(Math.random() * array.length)];

export function generateCampaign(difficulty) {

    return Array.from(
        { length: TOTAL_ROUNDS },
        (_, i) => {

            const day = Math.floor(i / 2) + 1;

            const mergeProbability =
                mergeProbabilities[day - 1];

            const weather =
                i === 0
                    ? "Normal"
                    : pick(weatherPool);

            const primary =
                i === 0
                    ? eventPool[0]
                    : pick(eventPool);

            const pool = eventPool.filter(event =>
                event !== primary &&
                event.title !== "Normal Operations" &&
                !(primary.funding && event.funding)
            );

            const secondary =
                Math.random() * 100 < mergeProbability
                    ? pick(pool)
                    : null;

            const events = [
                primary,
                secondary
            ].filter(Boolean);

            const e = {
                capacity: 70,
                demandMultiplier:
                    weather === "Heatwave" ? 1.2 : 1,
                hospitalMinimum: 20,
                waterMinimum: 15,
                requiredHouseholds: 6,
                funding: 2,
                maintenance: 25,
                electricityCost: 3,
                factoryDemand: 20
            };

            for (const event of events) {
                for (const key of Object.keys(e)) {
                    e[key] += event[key] || 0;
                }
            }

            e.capacity = Math.round(
                e.capacity *
                difficulty.capacityMultiplier
            );

            e.demandMultiplier *=
                difficulty.demandMultiplier;

            e.maintenance = Math.round(
                e.maintenance *
                difficulty.maintenanceMultiplier
            );

            // Prevent impossible mandatory energy requirements.

            const minimums = Array.from(
                { length: 12 },
                (_, j) => Math.ceil(
                    Math.ceil(
                        (5 + j % 5 * 2) *
                        e.demandMultiplier
                    ) * 0.5
                )
            ).sort((a, b) => a - b);

            const mandatory =
                e.hospitalMinimum +
                e.waterMinimum +
                minimums
                    .slice(0, e.requiredHouseholds)
                    .reduce((a, b) => a + b, 0);

            e.capacity = Math.max(
                e.capacity,
                mandatory
            );

            return {
                ...e,
                day,
                weather,
                mergeProbability,

                title: events
                    .map(event => event.title)
                    .join(" + "),

                description: events
                    .map(event => event.description)
                    .join(" ") +
                    ` Weather: ${weather}.`
            };
        }
    );
}
