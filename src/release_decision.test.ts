import { strict as assert } from "node:assert";
import { decideRelease } from "./release_decision.js";

assert.deepEqual(decideRelease(true, []), { state: "ready", reason: "build passed with no diagnostics" });
assert.deepEqual(decideRelease(false, []), { state: "blocked", reason: "build failed" });
assert.deepEqual(decideRelease(true, ["lockfile drift"]), { state: "blocked", reason: "lockfile drift" });
console.log("release decisions verified");
