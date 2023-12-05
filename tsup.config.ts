import { defineConfig } from "tsup";
const codeFileHeader =
  "/*------------------------------------------------------------*\n" +
  " *  Copyright (c) Microsoft Corporation. All rights reserved. *\n" +
  " *------------------------------------------------------------*/";
export default defineConfig((options) => ({
  entryPoints: ["src/index.ts"],
  dts: true,
  target: "es2022",
  format: ["esm"],
  sourcemap: "inline",
  clean: true,
  minify: false,
  keepNames: true,
  banner: { js: codeFileHeader },
}));
