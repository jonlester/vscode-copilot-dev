/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation and GitHub. All rights reserved.
 *--------------------------------------------------------------------------------------------*/
import * as fs from "node:fs";
import { join as pathJoin } from "path";
import { init } from "../src/cli/initializer";
import { InitOptions } from "../src/contracts";

describe("init new agent command", () => {
  let outputFolder = "";

  const initOptions: InitOptions = {
    name: "new-agent",
    description: "new agent description",
    displayName: "new agent display name",
    silent: true,
  };

  beforeAll(() => {
    const outputFolder = pathJoin(__dirname, "test-output", "new-agent");
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    } else {
      fs.rmSync(outputFolder, { recursive: true, force: true });
      fs.mkdirSync(outputFolder, { recursive: true });
    }
    process.chdir(outputFolder);
  });

  test("should initialize files correctly", async () => {
    await init(initOptions);

    //check that the package.json file exists
    expect(fs.existsSync(pathJoin(outputFolder, "package.json")));

    //read the package.json file and check that the name is correct
    const packageJson = JSON.parse(
      fs.readFileSync(pathJoin(outputFolder, "package.json"), "utf8"),
    );
    expect(packageJson.name).toBe("new-agent");
  }, 0);
});
