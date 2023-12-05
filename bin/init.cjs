#!/usr/bin/env node
/*------------------------------------------------------------*
 *  Copyright (c) Microsoft Corporation. All rights reserved. *
 *------------------------------------------------------------*/
async function run() {
  const { init } = await import("../dist/index.js");
  init();
}

run().catch((err) => {
  process.exit(1);
});
