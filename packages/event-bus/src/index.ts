import { EventEmitter } from "node:events";
import type {
  ActiveElementChanged,
  EngineStateUpdate,
  EnvironmentAdjusted,
  EventEnvelope,
} from "@bio-sim/event-schemas";

export type EventTypes = EventEnvelope["type"];

export type EventHandler<TEvent extends EventEnvelope> = (event: TEvent) => void | Promise<void>;

export interface EventBus {
  publish<TEvent extends EventEnvelope>(event: TEvent): void;
  subscribe<TType extends EventTypes>(
    type: TType,
    handler: EventHandler<Extract<EventEnvelope, { type: TType }>>,
  ): () => void;
}

export class InMemoryEventBus implements EventBus {
  private readonly emitter = new EventEmitter({ captureRejections: true });

  publish<TEvent extends EventEnvelope>(event: TEvent): void {
    this.emitter.emit(event.type, event);
  }

  subscribe<TType extends EventTypes>(
    type: TType,
    handler: EventHandler<Extract<EventEnvelope, { type: TType }>>,
  ): () => void {
    this.emitter.on(type, handler as EventHandler<EventEnvelope>);
    return () => this.emitter.off(type, handler as EventHandler<EventEnvelope>);
  }
}

export type EventListenerMap = {
  [K in EventTypes]?: Array<EventHandler<Extract<EventEnvelope, { type: K }>>>;
};

export interface EventRecorderOptions {
  limit?: number;
}

export class EventRecorder {
  private readonly events: EventEnvelope[] = [];
  private readonly limit: number;

  constructor(private readonly bus: EventBus, options: EventRecorderOptions = {}) {
    this.limit = options.limit ?? 1000;
    this.register();
  }

  private register() {
    const record = (event: EventEnvelope) => {
      this.events.push(event);
      if (this.events.length > this.limit) {
        this.events.shift();
      }
    };

    const types: EventTypes[] = [
      "atomic-selection/active-element-changed",
      "engine/state-update",
      "environment/adjusted",
    ];

    for (const type of types) {
      this.bus.subscribe(type, record as EventHandler<EventEnvelope>);
    }
  }

  list(): readonly EventEnvelope[] {
    return [...this.events];
  }
}

export function createEventBus(): EventBus {
  return new InMemoryEventBus();
}

export type { EventEnvelope, ActiveElementChanged, EngineStateUpdate, EnvironmentAdjusted };
