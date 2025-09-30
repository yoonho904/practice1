import { EngineKinds } from "@bio-sim/event-schemas";
import type { SimulationStore } from "../state/simulationStore";

interface EngineStatusPanelProps {
  readonly engineStatuses: SimulationStore["engineStatuses"];
}

const ENGINE_LABELS: Record<string, string> = {
  chemistry: "Chemistry",
  physics: "Physics",
  biology: "Biology",
};

export function EngineStatusPanel({ engineStatuses }: EngineStatusPanelProps) {
  const engines = EngineKinds.options;

  return (
    <div className="engine-status">
      {engines.map((engine) => {
        const status = engineStatuses[engine];
        return (
          <div key={engine} className="engine-badge">
            <header>
              <h3>{ENGINE_LABELS[engine] ?? engine}</h3>
              <span>{status ? `t=${status.timestep}` : "⏳ awaiting"}</span>
            </header>
            <p>{status ? status.summary : "Waiting for simulation input."}</p>
            {status && (
              <div className="metrics-grid">
                {Object.entries(status.metrics).map(([metric, value]) => (
                  <span key={metric}>
                    {metric}: {value.toFixed(3)}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
