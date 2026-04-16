#!/usr/bin/env node

const { ensureRuntimeDirectories } = require("../src/config/runtime");
const { getRuntimeDiagnostics } = require("../src/services/deployment");

(async () => {
  await ensureRuntimeDirectories();
  const diagnostics = await getRuntimeDiagnostics();
  const entries = Object.entries(diagnostics.checks);

  console.log("Song to Lyrics deployment doctor");
  console.log("");

  for (const [name, check] of entries) {
    const badge = check.ok ? "OK " : check.required ? "ERR" : "WARN";
    console.log(`${badge} ${name.padEnd(15)} ${check.detail}`);
  }

  console.log("");
  console.log(`ready: ${diagnostics.ready}`);
  console.log(`transcriptionReady: ${diagnostics.transcriptionReady}`);

  if (!diagnostics.ready) {
    process.exitCode = 1;
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
