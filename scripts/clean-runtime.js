#!/usr/bin/env node

const fsp = require("fs/promises");

const { runtimeRoot } = require("../src/config/runtime");

(async () => {
  await fsp.rm(runtimeRoot, { recursive: true, force: true });
  await fsp.mkdir(runtimeRoot, { recursive: true });
  console.log(`Cleaned runtime directory: ${runtimeRoot}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
