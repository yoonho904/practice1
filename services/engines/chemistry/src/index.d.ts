import type { EventBus } from "@bio-sim/event-bus";
export interface EngineLifecycle {
    start(): void;
    stop(): void;
    advance(timestep: number, correlationId?: string): void;
}
export declare class ChemistryEngine implements EngineLifecycle {
    private readonly bus;
    private activeElement?;
    private environment;
    private unsubscribers;
    constructor(bus: EventBus);
    start(): void;
    stop(): void;
    advance(timestep: number, correlationId?: string): void;
}
export declare function createChemistryEngine(bus: EventBus): ChemistryEngine;
//# sourceMappingURL=index.d.ts.map