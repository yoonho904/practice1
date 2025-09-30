import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import { createSimulationDirector } from "./director.js";
import { launchWebSocketGateway } from "./websocket-gateway.js";

function waitForOpen(socket: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleOpen = () => {
      cleanup();
      resolve();
    };
    const handleError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      socket.off("open", handleOpen);
      socket.off("error", handleError);
    };

    socket.on("open", handleOpen);
    socket.on("error", handleError);
  });
}

test("Simulation Director broadcasts engine updates after element selection", async () => {
  const director = createSimulationDirector({ host: "127.0.0.1", port: 0 });
  const gateway = await launchWebSocketGateway(director, { host: "127.0.0.1", port: 0 });
  const address = gateway.getAddress();
  assert.ok(address, "gateway should expose listening address");

  const socket = new WebSocket(`ws://${address.host}:${address.port}`);
  await waitForOpen(socket);

  const received: Array<Record<string, unknown>> = [];
  const selectionCorrelation = randomUUID();

  const completion = new Promise<void>((resolve, reject) => {
    socket.on("message", (raw: WebSocket.RawData) => {
      try {
        const parsed = JSON.parse(raw.toString()) as Record<string, unknown>;
        received.push(parsed);
        if (
          parsed.type === "engine/state-update" &&
          typeof parsed.payload === "object" &&
          parsed.payload !== null &&
          (parsed.payload as { engine?: string }).engine === "biology"
        ) {
          resolve();
        }
      } catch (error) {
        reject(error as Error);
      }
    });
    socket.once("error", (error) => reject(error));
  });

  socket.send(
    JSON.stringify({
      type: "command/select-element",
      payload: { elementSymbol: "C", correlationId: selectionCorrelation },
    }),
  );

  await completion;
  socket.close();
  await new Promise<void>((resolve) => socket.once("close", () => resolve()));
  await gateway.stop();

  const selectionEvent = received.find((event) => event.type === "atomic-selection/active-element-changed");
  assert.ok(selectionEvent, "expected atomic selection broadcast");

  const engineUpdates = received.filter((event) => event.type === "engine/state-update");
  assert.equal(engineUpdates.length, 3, "expected three engine state updates");

  for (const update of engineUpdates) {
    assert.equal(
      (update as { payload?: { correlationId?: string } }).payload?.correlationId,
      selectionCorrelation,
      "engine update correlation should match selection",
    );
  }
});
