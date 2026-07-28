import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const requested = process.argv[2];
const command = requested === "build" || requested === "start" ? requested : "dev";
const wasmDirectory = resolve("node_modules/@next/swc-wasm-nodejs");
const environment = { ...process.env };

if (existsSync(resolve(wasmDirectory, "wasm.js"))) {
  environment.NEXT_TEST_WASM_DIR = wasmDirectory;
}

const args = [resolve("node_modules/next/dist/bin/next"), command];
if (command !== "start") args.push("--webpack");
args.push(...process.argv.slice(3));
const result = spawnSync(process.execPath, args, {
  env: environment,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
