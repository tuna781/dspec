#!/usr/bin/env node
'use strict';
// `main` is async, so it is awaited here — and it sets `process.exitCode` instead of calling
// `exit()`, so stdout has time to flush when the output is piped.
const { main } = require('../dist/cli.js');
Promise.resolve(main(process.argv.slice(2))).then(
  (code) => { process.exitCode = code; },
  (err) => {
    console.error(`✗ ${err && err.message ? err.message : err}`);
    process.exitCode = 1;
  },
);
