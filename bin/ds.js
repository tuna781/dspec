#!/usr/bin/env node
'use strict';
// `main` may return a Promise (`init` opens a picker). Await it here rather than forcing every
// handler to be synchronous — and set `process.exitCode`
// instead of calling `exit()`, so stdout has time to flush when the output is piped.
const { main } = require('../dist/cli/index.js');
Promise.resolve(main(process.argv.slice(2))).then(
  (code) => { process.exitCode = code; },
  (err) => {
    console.error(`✗ ${err && err.message ? err.message : err}`);
    process.exitCode = 1;
  },
);
