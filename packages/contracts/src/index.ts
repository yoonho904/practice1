import type { EventEnvelope } from "@bio-sim/event-schemas";
import type { ElementRecord } from "@bio-sim/atomic-data";

export interface EnvironmentSnapshot {
  readonly temperature: number;
  readonly pressureAtm: number;
  readonly ph: number;
}

export type ServerMessage =
  | EventEnvelope
  | {
      type: "bootstrap/initial-state";
      payload: {
        elements: ElementRecord[];
        environment: EnvironmentSnapshot;
      };
    }
  | {
      type: "error";
      payload: {
        message: string;
        correlationId?: string;
      };
    }
  | {
      type: "diagnostics/event-history";
      payload: {
        correlationId: string;
        events: EventEnvelope[];
      };
    };
