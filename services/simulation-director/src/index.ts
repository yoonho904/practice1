import { createSimulationDirector } from "./director.js";
import { defaultConfig } from "./config.js";
import { launchWebSocketGateway } from "./websocket-gateway.js";

async function main() {
  const director = createSimulationDirector(defaultConfig);
  await launchWebSocketGateway(director, defaultConfig);
}

main().catch((error) => {
  console.error("Simulation Director failed to start", error);
  process.exitCode = 1;
});
