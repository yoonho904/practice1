import { randomUUID } from "node:crypto";
import type {
  ActiveElementChanged,
  AtomicElement,
  EngineStateUpdate,
  EnvironmentAdjusted,
} from "@bio-sim/event-schemas";
import { EngineKinds } from "@bio-sim/event-schemas";
import type { EventBus } from "@bio-sim/event-bus";
import { computeBiologySnapshot, type EnvironmentConditions } from "@bio-sim/simulation-kernel";

export interface EngineLifecycle {
  start(): void;
  stop(): void;
  advance(timestep: number, correlationId?: string): void;
}

const DEFAULT_ENVIRONMENT: EnvironmentConditions = {
  temperature: 310,
  pressureAtm: 1,
  ph: 7.4,
};

export class BiologyEngine implements EngineLifecycle {
  private activeElement?: AtomicElement;
  private environment: EnvironmentConditions = { ...DEFAULT_ENVIRONMENT };
  private unsubscribers: Array<() => void> = [];

  constructor(private readonly bus: EventBus) {}

  start(): void {
    this.unsubscribers = [
      this.bus.subscribe(
        "atomic-selection/active-element-changed",
        (event: ActiveElementChanged) => {
          this.activeElement = event.payload.element;
        },
      ),
      this.bus.subscribe(
        "environment/adjusted",
        (event: EnvironmentAdjusted) => {
          this.environment = {
            temperature: event.payload.temperature,
            pressureAtm: event.payload.pressureAtm,
            ph: event.payload.ph,
          };
        },
      ),
    ];
  }

  stop(): void {
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers = [];
  }

  advance(timestep: number, correlationId: string = randomUUID()): void {
    const { summary, metrics } = this.activeElement
      ? computeBiologySnapshot({ element: this.activeElement, environment: this.environment })
      : {
          summary: "Biology engine awaiting active element selection.",
          metrics: {
            temperatureK: this.environment.temperature,
            pressureAtm: this.environment.pressureAtm,
            ph: this.environment.ph,
          } as Record<string, number>,
        };

    const event: EngineStateUpdate = {
      type: "engine/state-update",
      payload: {
        engine: EngineKinds.enum.biology,
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

export function createBiologyEngine(bus: EventBus): BiologyEngine {
  return new BiologyEngine(bus);
}
