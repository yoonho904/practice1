import type { EventBus } from "@bio-sim/event-bus";
export interface EngineLifecycle {
    start(): void;
    stop(): void;
    advance(timestep: number, correlationId?: string): void;
}
export declare class BiologyEngine implements EngineLifecycle {
    private readonly bus;
    private activeElement?;
    private environment;
    private unsubscribers;
    constructor(bus: EventBus);
    start(): void;
    stop(): void;
    advance(timestep: number, correlationId?: string): void;
}
export declare function createBiologyEngine(bus: EventBus): BiologyEngine;
//# sourceMappingURL=index.d.ts.map