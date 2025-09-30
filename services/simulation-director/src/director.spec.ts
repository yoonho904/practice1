import test from "node:test";
import assert from "node:assert/strict";
import { createSimulationDirector } from "./director.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test("registerClient sends bootstrap payload", async () => {
  const director = createSimulationDirector();
  await director.start();

  const messages: unknown[] = [];
  const unregister = director.registerClient((message) => {
    messages.push(message);
  });

  await delay(0);

  assert.ok(messages.length > 0, "expected at least one bootstrap message");
  const bootstrap = messages[0] as { type?: string };
  assert.equal(bootstrap.type, "bootstrap/initial-state");

  unregister();
  await director.stop();
});
