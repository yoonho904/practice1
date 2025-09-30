import { randomUUID } from "node:crypto";
import { EngineKinds } from "@bio-sim/event-schemas";
import { computeChemistrySnapshot, } from "@bio-sim/simulation-kernel";
const DEFAULT_ENVIRONMENT = {
    temperature: 310, // K
    pressureAtm: 1.0,
    ph: 7.4,
};
export class ChemistryEngine {
    constructor(bus) {
        this.bus = bus;
        this.environment = { ...DEFAULT_ENVIRONMENT };
        this.unsubscribers = [];
    }
    start() {
        this.unsubscribers = [
            this.bus.subscribe("atomic-selection/active-element-changed", (event) => {
                this.activeElement = event.payload.element;
            }),
            this.bus.subscribe("environment/adjusted", (event) => {
                this.environment = {
                    temperature: event.payload.temperature,
                    pressureAtm: event.payload.pressureAtm,
                    ph: event.payload.ph,
                };
            }),
        ];
    }
    stop() {
        for (const unsubscribe of this.unsubscribers) {
            unsubscribe();
        }
        this.unsubscribers = [];
    }
    advance(timestep, correlationId = randomUUID()) {
        const { summary, metrics } = this.activeElement
            ? computeChemistrySnapshot({ element: this.activeElement, environment: this.environment })
            : {
                summary: "Chemistry engine awaiting active element selection.",
                metrics: {
                    temperatureK: this.environment.temperature,
                    pressureAtm: this.environment.pressureAtm,
                    ph: this.environment.ph,
                },
            };
        const event = {
            type: "engine/state-update",
            payload: {
                engine: EngineKinds.enum.chemistry,
                timestep,
                timestamp: new Date().toISOString(),
                correlationId,
                summary,
                metrics,
            },
        };
        this.bus.publish(event);
    }
}
export function createChemistryEngine(bus) {
    return new ChemistryEngine(bus);
}
