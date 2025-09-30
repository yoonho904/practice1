import { create } from "zustand";
import type { ElementRecord } from "@bio-sim/atomic-data";
import type { EngineKind, EventEnvelope } from "@bio-sim/event-schemas";
import type { VisualizationFidelity } from "../config/visualization";

export type ConnectionState = "connecting" | "connected" | "disconnected";

export interface EngineStatusSnapshot {
  readonly summary: string;
  readonly metrics: Record<string, number>;
  readonly timestamp: string;
  readonly correlationId: string;
  readonly timestep: number;
}

export interface SimulationStore {
  readonly elements: ElementRecord[];
  readonly activeElement?: ElementRecord;
  readonly environment: {
    temperature: number;
    pressureAtm: number;
    ph: number;
  };
  readonly engineStatuses: Partial<Record<EngineKind, EngineStatusSnapshot>>;
  readonly eventLog: EventEnvelope[];
  readonly orbitalSamples: { position: [number, number, number]; density: number; quantum: { n: number; l: number; m: number; spin: 1 | -1; }; }[];
  readonly connectionState: ConnectionState;
  readonly visualizationMode: "point-cloud" | "orbital-shapes" | "wave-particle";
  readonly visualizationFidelity: VisualizationFidelity;
  readonly enhancedLighting: boolean;
  readonly focusedOrbitalKey?: string | null;
  readonly waveIntensity: number;
  readonly noiseLevel: number;
  setConnectionState(state: ConnectionState): void;
  setElements(elements: ElementRecord[]): void;
  setEnvironment(environment: { temperature: number; pressureAtm: number; ph: number }): void;
  setActiveElement(element?: ElementRecord): void;
  stageActiveElementBySymbol(symbol?: string): void;
  setOrbitalSamples(samples: { position: [number, number, number]; density: number; quantum: { n: number; l: number; m: number; spin: 1 | -1; }; }[]): void;
  setVisualizationMode(mode: "point-cloud" | "orbital-shapes" | "wave-particle"): void;
  setVisualizationFidelity(fidelity: VisualizationFidelity): void;
  setEnhancedLighting(enabled: boolean): void;
  setFocusedOrbitalKey(key?: string | null): void;
  setWaveIntensity(intensity: number): void;
  setNoiseLevel(level: number): void;
  upsertEngineStatus(engine: EngineKind, snapshot: EngineStatusSnapshot): void;
  appendEvent(event: EventEnvelope): void;
  resetEventLog(events: EventEnvelope[]): void;
}

const EVENT_LOG_LIMIT = 200;

export const useSimulationStore = create<SimulationStore>((set) => ({
  elements: [],
  environment: {
    temperature: 310,
    pressureAtm: 1,
    ph: 7.4,
  },
  engineStatuses: {},
  eventLog: [],
  orbitalSamples: [],
  connectionState: "connecting",
  visualizationMode: "point-cloud",
  visualizationFidelity: "medium",
  enhancedLighting: false,
  focusedOrbitalKey: undefined,
  waveIntensity: 0.5,
  noiseLevel: 0.3,
  setConnectionState: (state) => set({ connectionState: state }),
  setElements: (elements) =>
    set((state) => {
      const activeSymbol = state.activeElement?.symbol;
      const nextActive = activeSymbol ? elements.find((element) => element.symbol === activeSymbol) : undefined;
      return { elements, activeElement: nextActive };
    }),
  setEnvironment: (environment) => set({ environment }),
  setActiveElement: (element) => set({ activeElement: element ?? undefined, focusedOrbitalKey: undefined }),
  stageActiveElementBySymbol: (symbol) =>
    set((state) => ({
      activeElement: symbol ? state.elements.find((element) => element.symbol === symbol) : undefined,
      focusedOrbitalKey: undefined,
    })),
  setOrbitalSamples: (samples) => set({ orbitalSamples: samples }),
  setVisualizationMode: (mode) =>
    set((state) => ({
      visualizationMode: mode,
      focusedOrbitalKey: mode === "orbital-shapes" ? state.focusedOrbitalKey : undefined,
    })),
  setVisualizationFidelity: (fidelity) => set({ visualizationFidelity: fidelity }),
  setEnhancedLighting: (enabled) => set({ enhancedLighting: enabled }),
  setFocusedOrbitalKey: (key) => set({ focusedOrbitalKey: key ?? undefined }),
  setWaveIntensity: (intensity) => set({ waveIntensity: intensity }),
  setNoiseLevel: (level) => set({ noiseLevel: level }),
  upsertEngineStatus: (engine, snapshot) =>
    set((state) => ({
      engineStatuses: { ...state.engineStatuses, [engine]: snapshot },
    })),
  appendEvent: (event) =>
    set((state) => {
      const nextLog = [...state.eventLog, event];
      if (nextLog.length > EVENT_LOG_LIMIT) {
        nextLog.splice(0, nextLog.length - EVENT_LOG_LIMIT);
      }
      return { eventLog: nextLog };
    }),
  resetEventLog: (events) => set({ eventLog: events.slice(-EVENT_LOG_LIMIT) }),
}));
