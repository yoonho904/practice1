import { useEffect, useMemo, useRef, useCallback } from "react";
import { listElements } from "@bio-sim/atomic-data";
import { EventEnvelopeSchema, type ClientCommand, EngineKinds } from "@bio-sim/event-schemas";
import type { ServerMessage } from "@bio-sim/contracts";
import { computeBiologySnapshot, computeChemistrySnapshot, computePhysicsSnapshot } from "@bio-sim/simulation-kernel";
import { buildElectronConfiguration, generateOrbitalSamples, generateShellSamples } from "@bio-sim/orbital-engine";
import { VISUALIZATION_FIDELITY_SETTINGS } from "../config/visualization";
import { useSimulationStore } from "../state/simulationStore";

function resolveWebSocketUrl(raw?: string): string {
  if (typeof window === "undefined") {
    return raw ?? "";
  }

  const trimmed = raw?.trim();

  if (!trimmed) {
    return "ws://127.0.0.1:8080";
  }

  if (trimmed.startsWith("/")) {
    const url = new URL(window.location.href);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = trimmed;
    url.search = "";
    url.hash = "";
    return url.toString();
  }

  if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) {
    return trimmed;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.replace(/^http/, window.location.protocol === "https:" ? "wss" : "ws");
  }

  return `${window.location.protocol === "https:" ? "wss" : "ws"}://${trimmed}`;
}

function createCorrelationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

function computeLocalEngineUpdates(symbol: string): void {
  const state = useSimulationStore.getState();
  const element = state.elements.find((candidate) => candidate.symbol === symbol);
  if (!element) {
    return;
  }

  const correlationId = createCorrelationId();
  const timestamp = new Date().toISOString();
  const environment = state.environment;
  const chemistry = computeChemistrySnapshot({ element, environment });
  const physics = computePhysicsSnapshot({ element, environment });
  const biology = computeBiologySnapshot({ element, environment });

  state.appendEvent({
    type: "atomic-selection/active-element-changed",
    payload: {
      element,
      triggeredBy: "system",
      correlationId,
      timestamp,
    },
  });
  state.setActiveElement(element);

  const snapshots = [
    {
      engine: EngineKinds.enum.chemistry,
      summary: chemistry.summary,
      metrics: chemistry.metrics,
    },
    {
      engine: EngineKinds.enum.physics,
      summary: physics.summary,
      metrics: physics.metrics,
    },
    {
      engine: EngineKinds.enum.biology,
      summary: biology.summary,
      metrics: biology.metrics,
    },
  ];

  for (const snapshot of snapshots) {
    state.upsertEngineStatus(snapshot.engine, {
      summary: snapshot.summary,
      metrics: snapshot.metrics,
      timestamp,
      correlationId,
      timestep: 0,
    });

    state.appendEvent({
      type: "engine/state-update",
      payload: {
        engine: snapshot.engine,
        summary: snapshot.summary,
        metrics: snapshot.metrics,
        timestamp,
        correlationId,
        timestep: 0,
      },
    });
  }
}


function computeLocalOrbitalSamples(symbol: string): void {
  const state = useSimulationStore.getState();
  const element = state.elements.find((candidate) => candidate.symbol === symbol);
  if (!element) {
    return;
  }
  const configuration = buildElectronConfiguration(element.atomicNumber);
  const fidelitySettings = VISUALIZATION_FIDELITY_SETTINGS[state.visualizationFidelity];
  const primarySamples = Math.max(240, Math.round(1200 * fidelitySettings.sampleMultiplier));
  const fallbackSamples = Math.max(180, Math.round(900 * fidelitySettings.sampleMultiplier));

  let samples = generateOrbitalSamples(element.symbol, element.atomicNumber, configuration, primarySamples);
  if (samples.length === 0) {
    samples = generateShellSamples(element.symbol, element.atomicNumber, configuration, fallbackSamples);
  }
  state.setOrbitalSamples(samples.map((sample) => ({
    position: sample.position,
    density: sample.density,
    quantum: sample.quantum,
  })));
}

function computeLocalEnvironmentUpdate(environment: {
  temperature: number;
  pressureAtm: number;
  ph: number;
}): void {
  const state = useSimulationStore.getState();
  state.setEnvironment(environment);
  const active = state.activeElement;
  if (active) {
    computeLocalEngineUpdates(active.symbol);
    computeLocalOrbitalSamples(active.symbol);
  }
}

export interface SimulationConnection {
  readonly connectionState: ReturnType<typeof useSimulationStore>["connectionState"];
  selectElement(symbol: string): void;
  updateEnvironment(environment: { temperature: number; pressureAtm: number; ph: number }): void;
  requestStatus(): void;
}

export function useSimulationConnection(): SimulationConnection {
  const fallbackLoadedRef = useRef(false);

  const socketRef = useRef<WebSocket | null>(null);
  const setConnectionState = useSimulationStore((state) => state.setConnectionState);
  const setElements = useSimulationStore((state) => state.setElements);
  const setEnvironment = useSimulationStore((state) => state.setEnvironment);
  const setActiveElement = useSimulationStore((state) => state.setActiveElement);
  const stageActiveElementBySymbol = useSimulationStore((state) => state.stageActiveElementBySymbol);
  const setOrbitalSamples = useSimulationStore((state) => state.setOrbitalSamples);
  const upsertEngineStatus = useSimulationStore((state) => state.upsertEngineStatus);
  const appendEvent = useSimulationStore((state) => state.appendEvent);
  const resetEventLog = useSimulationStore((state) => state.resetEventLog);
  const connectionState = useSimulationStore((state) => state.connectionState);

  const handleEvent = useCallback(
    (event: ReturnType<typeof EventEnvelopeSchema.parse>) => {
      appendEvent(event);
      switch (event.type) {
        case "atomic-selection/active-element-changed":
          setActiveElement(event.payload.element);
          computeLocalOrbitalSamples(event.payload.element.symbol);
          break;
        case "environment/adjusted":
          setEnvironment({
            temperature: event.payload.temperature,
            pressureAtm: event.payload.pressureAtm,
            ph: event.payload.ph,
          });
          break;
        case "engine/state-update":
          upsertEngineStatus(event.payload.engine, {
            summary: event.payload.summary,
            metrics: event.payload.metrics,
            timestamp: event.payload.timestamp,
            correlationId: event.payload.correlationId,
            timestep: event.payload.timestep,
          });
          break;
        case "visualization/orbital-samples":
          setOrbitalSamples(event.payload.samples);
          break;
        default:
          break;
      }
    },
    [appendEvent, setActiveElement, setEnvironment, setOrbitalSamples, upsertEngineStatus],
  );

  const handleServerMessage = useCallback(
    (data: unknown) => {
      if (!data || typeof data !== "object") {
        return;
      }

      if ("type" in data && typeof (data as { type: unknown }).type === "string") {
        if ((data as { type: string }).type === "bootstrap/initial-state") {
          const payload = (data as ServerMessage & { type: "bootstrap/initial-state" }).payload;
          setElements(payload.elements);
          setEnvironment(payload.environment);
          return;
        }

        if ((data as { type: string }).type === "diagnostics/event-history") {
          const message = data as Extract<ServerMessage, { type: "diagnostics/event-history" }>;
          resetEventLog(message.payload.events);
          return;
        }

        if ((data as { type: string }).type === "error") {
          console.warn("Simulation Director error", data);
          return;
        }
      }

      const parsed = EventEnvelopeSchema.safeParse(data);
      if (parsed.success) {
        handleEvent(parsed.data);
      }
    },
    [handleEvent, resetEventLog, setElements, setEnvironment],
  );

  useEffect(() => {
    if (fallbackLoadedRef.current) {
      return;
    }
    const locals = listElements();
    if (locals.length === 0) {
      return;
    }
    const current = useSimulationStore.getState().elements;
    if (current.length === 0) {
      fallbackLoadedRef.current = true;
      setElements(locals);
    }
  }, [setElements]);

  useEffect(() => {
    const socketUrl = resolveWebSocketUrl(import.meta.env.VITE_SIM_DIRECTOR_URL);
    let reconnectTimer: number | undefined;
    let disposed = false;

    const connect = () => {
      if (disposed) {
        return;
      }
      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;
      setConnectionState("connecting");

      socket.addEventListener("open", () => {
        if (!disposed) {
          setConnectionState("connected");
        }
      });

      socket.addEventListener("close", () => {
        if (!disposed) {
          setConnectionState("disconnected");
          reconnectTimer = window.setTimeout(connect, 2500);
        }
      });

      socket.addEventListener("error", (event) => {
        console.error("Simulation Director websocket error", event);
      });

      socket.addEventListener("message", (event) => {
        try {
          const payload = JSON.parse(event.data) as ServerMessage | unknown;
          handleServerMessage(payload);
        } catch (error) {
          console.error("Failed to parse server message", error);
        }
      });
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      const socket = socketRef.current;
      socketRef.current = null;
      socket?.close(1000, "component disposed");
    };
  }, [handleServerMessage, setConnectionState]);

  const sendCommand = useCallback(
    (command: ClientCommand) => {
      const socket = socketRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(command));
        return true;
      }
      return false;
    },
    [],
  );

  const selectElement = useCallback(
    (symbol: string) => {
      stageActiveElementBySymbol(symbol);
      const correlationId = createCorrelationId();
      const sent = sendCommand({
        type: "command/select-element",
        payload: { elementSymbol: symbol, correlationId },
      });

      if (!sent) {
        computeLocalEngineUpdates(symbol);
        computeLocalOrbitalSamples(symbol);
      } else {
        computeLocalOrbitalSamples(symbol);
      }
    },
    [sendCommand, stageActiveElementBySymbol],
  );

  const updateEnvironment = useCallback(
    (environment: { temperature: number; pressureAtm: number; ph: number }) => {
      const correlationId = createCorrelationId();
      const sent = sendCommand({
        type: "command/update-environment",
        payload: { ...environment, correlationId },
      });

      if (!sent) {
        computeLocalEnvironmentUpdate(environment);
      }
    },
    [sendCommand],
  );

  const requestStatus = useCallback(() => {
    sendCommand({
      type: "command/request-status",
      payload: { correlationId: createCorrelationId() },
    });
  }, [sendCommand]);

  return useMemo(
    () => ({
      connectionState,
      selectElement,
      updateEnvironment,
      requestStatus,
    }),
    [connectionState, requestStatus, selectElement, updateEnvironment],
  );
}
