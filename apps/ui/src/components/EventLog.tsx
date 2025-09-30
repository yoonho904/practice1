import type { EventEnvelope } from "@bio-sim/event-schemas";

interface EventLogProps {
  readonly events: EventEnvelope[];
}

export function EventLog({ events }: EventLogProps) {
  return (
    <div className="event-log">
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Type</th>
            <th>Summary</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => {
            const timestamp = extractTimestamp(event);
            const key = buildEventKey(event);
            return (
              <tr key={key}>
                <td>{timestamp ?? "—"}</td>
                <td>{event.type}</td>
                <td>{renderSummary(event)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function buildEventKey(event: EventEnvelope): string {
  switch (event.type) {
    case "atomic-selection/active-element-changed":
      return `${event.type}-${event.payload.correlationId}`;
    case "environment/adjusted":
      return `${event.type}-${event.payload.correlationId}`;
    case "engine/state-update":
      return `${event.type}-${event.payload.engine}-${event.payload.timestep}-${event.payload.correlationId}`;
    default:
      return event.type;
  }
}

function extractTimestamp(event: EventEnvelope): string | undefined {
  switch (event.type) {
    case "atomic-selection/active-element-changed":
      return event.payload.timestamp;
    case "environment/adjusted":
      return event.payload.timestamp;
    case "engine/state-update":
      return event.payload.timestamp;
    default:
      return undefined;
  }
}

function renderSummary(event: EventEnvelope): string {
  switch (event.type) {
    case "atomic-selection/active-element-changed":
      return `Active element → ${event.payload.element.symbol}`;
    case "environment/adjusted":
      return `Environment updated (T=${event.payload.temperature.toFixed(0)}K, pH=${event.payload.ph.toFixed(1)})`;
    case "engine/state-update":
      return `${event.payload.engine} :: ${event.payload.summary}`;
    default:
      return "";
  }
}
