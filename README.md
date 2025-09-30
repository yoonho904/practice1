# Bio System Simulator (MVP Scaffold)

This repository contains the first implementation slice for the interactive atomic→cell simulation described in `docs/interactive-simulation-blueprint.md`. The current focus is on the ribosome-centric MVP: an extendable backend orchestration layer, typed event contracts, in-memory engines, and a React-based control surface for atomic selection and environment tuning.

## Repository Layout

- `apps/ui` – Vite/React front-end with Zustand state management, websocket client, periodic table selector, environment controls, and live event log.
- `packages/atomic-data` – Curated element records (initially H, C, N, O, P) exposed with lookup helpers.
- `packages/contracts` – Shared server↔client transport contracts (bootstrap, event envelopes, diagnostics).
- `packages/event-bus` – Lightweight typed in-memory pub/sub used by the director and engines.
- `packages/event-schemas` – Zod schemas for commands and engine events with safe parsing helpers.
- `services/data-broker` – Data access abstraction; currently backed by in-memory atomic data.
- `services/engines/*` – Chemistry/Physics/Biology engine stubs that react to selection/environment changes and publish structured status updates.
- `services/simulation-director` – Orchestrator coordinating commands, data hydration, engine lifecycles, and websocket fan-out.

## Getting Started

> Requires Node.js ≥ 18.17 (for built-in `node:test`, WebSocket global, and `crypto.randomUUID`).

1. Install dependencies once from the workspace root:

   ```bash
   npm install
   ```

2. Build all packages and services (emits TypeScript into `dist/` per package):

   ```bash
   npm run build
   ```

3. Start the simulation director websocket service:

   ```bash
   npm run build --workspace services/simulation-director
   SIM_DIRECTOR_HOST=127.0.0.1 SIM_DIRECTOR_PORT=8080 node services/simulation-director/dist/index.js
   ```

   Environment variables:
   - `SIM_DIRECTOR_HOST` (default `0.0.0.0`)
   - `SIM_DIRECTOR_PORT` (default `8080`)

4. Launch the UI in development mode (served on Vite's default port):

   ```bash
   npm run dev --workspace apps/ui
   ```

   The dev server now proxies `/simulator` to the Simulation Director automatically, so the browser only needs to reach the Vite origin. If you bind the director to a non-default address, set `VITE_SIM_DIRECTOR_URL` (e.g. `ws://127.0.0.1:9001`) before running the dev server and the proxy will follow it.


5. Request a status snapshot after connecting by using the **Pull Diagnostics** button in the UI. Atomic selection updates fire engine status cards and append to the event log in real time.

## Testing

- The simulation director includes a lightweight `node:test` spec that validates bootstrap fan-out.
- Additional unit tests can be added alongside TypeScript sources; execute them with:

  ```bash
  npm run build --workspace services/simulation-director
  node --test services/simulation-director/dist
  ```

## Extending the Scaffold

- **Engines**: replace the stub logic in `services/engines/*` with concrete chemistry/physics/biology integrations. The event bus API already supports typed publish/subscribe.
- **Data**: extend `packages/atomic-data` with the full periodic table or inject alternative `DataBroker` implementations (e.g., REST-backed, gRPC).
- **Orchestration**: swap the in-memory event bus with Kafka/NATS by implementing the `EventBus` interface.
- **UI**: add additional panels (e.g., 3D scene, reaction visualizations) under `apps/ui/src/components` and subscribe to the existing event log for coherence.
- **Schema**: evolve `packages/event-schemas` / `packages/contracts` and version message structures as new subsystems come online.

## Next Steps

- Add automated build/test workflows and linting (ESLint, Prettier) for consistent code quality.
- Persist engine metrics and playback history via a storage adapter exposed from the director.
- Integrate a real-time 3D visualization canvas (Three.js/WebGPU) that consumes engine state snapshots.
- Expand environment controls to cover scenario presets and time dilation toggles as outlined in the blueprint.
