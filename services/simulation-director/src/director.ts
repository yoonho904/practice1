import { createDataBroker, type DataBroker } from "@bio-sim/data-broker";
import type { ElementRecord } from "@bio-sim/atomic-data";
import {
  type ActiveElementChanged,
  type AtomicElement,
  type ClientCommand,
  type EventEnvelope,
  type EnvironmentAdjusted,
  ClientCommandSchema,
} from "@bio-sim/event-schemas";
import { createBiologyEngine } from "@bio-sim/biology-engine";
import { createChemistryEngine } from "@bio-sim/chemistry-engine";
import { createPhysicsEngine } from "@bio-sim/physics-engine";
import { createEventBus, EventRecorder, type EventBus } from "@bio-sim/event-bus";
import { buildElectronConfiguration, generateOrbitalSamples, generateShellSamples } from "@bio-sim/orbital-engine";
import type { SimulationDirectorConfig } from "./config.js";
import { defaultConfig, resolvedEnvironment } from "./config.js";
import type { ServerMessage } from "@bio-sim/contracts";

type ClientSink = (message: ServerMessage) => void;

type EngineLifecycle = {
  start(): void;
  stop(): void;
  advance(timestep: number, correlationId?: string): void;
};

export class SimulationDirector {
  private readonly bus: EventBus;
  private readonly dataBroker: DataBroker;
  private readonly engines: EngineLifecycle[];
  private readonly clients = new Set<ClientSink>();
  private readonly recorder: EventRecorder;
  private environment: { temperature: number; pressureAtm: number; ph: number; };
  private timestep = 0;

  constructor(private readonly config: SimulationDirectorConfig = defaultConfig) {
    this.bus = createEventBus();
    this.dataBroker = createDataBroker();
    this.environment = { ...resolvedEnvironment(config) };
    this.engines = [
      createChemistryEngine(this.bus),
      createPhysicsEngine(this.bus),
      createBiologyEngine(this.bus),
    ];
    this.recorder = new EventRecorder(this.bus, { limit: 250 });
    this.observeEvents();
  }

  async start(): Promise<void> {
    for (const engine of this.engines) {
      engine.start();
    }
  }

  async stop(): Promise<void> {
    for (const engine of this.engines) {
      engine.stop();
    }
    this.clients.clear();
  }

  registerClient(send: ClientSink): () => void {
    this.clients.add(send);
    void this.dispatchBootstrap(send);
    return () => {
      this.clients.delete(send);
    };
  }

  async handleRawCommand(message: unknown, respond: ClientSink): Promise<void> {
    const command = ClientCommandSchema.safeParse(message);
    if (!command.success) {
      respond({
        type: "error",
        payload: {
          message: `Invalid command payload: ${command.error.message}`,
        },
      });
      return;
    }

    await this.handleCommand(command.data, respond);
  }

  private async handleCommand(command: ClientCommand, respond: ClientSink): Promise<void> {
    if (command.type === "command/select-element") {
      await this.handleElementSelection(command.payload.elementSymbol, command.payload.correlationId, respond);
      return;
    }

    if (command.type === "command/update-environment") {
      this.handleEnvironmentUpdate(
        command.payload.temperature,
        command.payload.pressureAtm,
        command.payload.ph,
        command.payload.correlationId,
      );
      return;
    }

    if (command.type === "command/request-status") {
      this.handleStatusRequest(command.payload.correlationId, respond);
      return;
    }

    respond({
      type: "error",
      payload: {
        message: "Unsupported command received",
      },
    });
  }

  private async handleElementSelection(symbol: string, correlationId: string, respond: ClientSink): Promise<void> {
    const element = await this.dataBroker.getElement({ symbol });
    if (!element) {
      respond({
        type: "error",
        payload: {
          message: `Element with symbol ${symbol} is not supported`,
          correlationId,
        },
      });
      return;
    }

    const event: ActiveElementChanged = {
      type: "atomic-selection/active-element-changed",
      payload: {
        element,
        triggeredBy: "user",
        correlationId,
        timestamp: new Date().toISOString(),
      },
    };

    this.bus.publish(event);
    this.advanceEngines(correlationId);
    this.scheduleOrbitalBroadcast(element);
  }

  private handleEnvironmentUpdate(
    temperature: number,
    pressureAtm: number,
    ph: number,
    correlationId: string,
  ): void {
    this.environment = { temperature, pressureAtm, ph };

    const event: EnvironmentAdjusted = {
      type: "environment/adjusted",
      payload: {
        ...this.environment,
        correlationId,
        timestamp: new Date().toISOString(),
      },
    };

    this.bus.publish(event);
    this.advanceEngines(correlationId);
  }

  private handleStatusRequest(correlationId: string, respond: ClientSink): void {
    respond({
      type: "diagnostics/event-history",
      payload: {
        correlationId,
        events: this.recorder.list().slice(-25),
      },
    });
  }

  private async dispatchBootstrap(send: ClientSink): Promise<void> {
    const elements: ElementRecord[] = await this.dataBroker.listSupportedElements();
    send({
      type: "bootstrap/initial-state",
      payload: {
        elements,
        environment: this.environment,
      },
    });
  }

  private advanceEngines(correlationId: string): void {
    this.timestep += 1;
    for (const engine of this.engines) {
      engine.advance(this.timestep, correlationId);
    }
  }

  private scheduleOrbitalBroadcast(element: AtomicElement): void {
    const configuration = buildElectronConfiguration(element.atomicNumber);
    setTimeout(() => {
      try {
        let samples = generateOrbitalSamples(element.symbol, element.atomicNumber, configuration, 1500);
        if (samples.length === 0) {
          samples = generateShellSamples(element.symbol, element.atomicNumber, configuration, 1200);
        }
        const formatted = samples.map((sample) => ({
          position: sample.position,
          density: sample.density,
          quantum: sample.quantum,
        }));
        this.broadcast({
          type: "visualization/orbital-samples",
          payload: {
            elementSymbol: element.symbol,
            samples: formatted,
            computedOn: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error("Failed to compute orbital samples", error);
        const fallback = generateShellSamples(element.symbol, element.atomicNumber, configuration, 800).map((sample) => ({
          position: sample.position,
          density: sample.density,
          quantum: sample.quantum,
        }));
        this.broadcast({
          type: "visualization/orbital-samples",
          payload: {
            elementSymbol: element.symbol,
            samples: fallback,
            computedOn: new Date().toISOString(),
          },
        });
      }
    }, 0);
  }

  private observeEvents(): void {
    const forward = (event: EventEnvelope) => this.broadcast(event);
    this.bus.subscribe("atomic-selection/active-element-changed", forward);
    this.bus.subscribe("environment/adjusted", forward);
    this.bus.subscribe("engine/state-update", forward);
  }

  private broadcast(message: ServerMessage): void {
    for (const send of this.clients) {
      try {
        send(message);
      } catch (error) {
        console.error("Failed to deliver message to client", error);
      }
    }
  }
}

export function createSimulationDirector(config: SimulationDirectorConfig = defaultConfig): SimulationDirector {
  return new SimulationDirector(config);
}
