/*------------------------------------------------------------*
 *  Copyright (c) Microsoft Corporation. All rights reserved. *
 *------------------------------------------------------------*/
var __defProp = Object.defineProperty;
var __name = (target, value) =>
  __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/cli/initializer.ts
import { Command } from "commander";

// src/helpers/file-system.ts
var file_system_exports = {};
__export(file_system_exports, {
  folderIsEmpty: () => folderIsEmpty,
  isValidFolderName: () => isValidFolderName,
  packageJsonPath: () => packageJsonPath,
  renderTemplates: () => renderTemplates,
});
import { glob } from "glob";
import path, { join as pathJoin, parse as parsePath } from "node:path";
import fs from "node:fs";
import mustache from "mustache";
import { fileURLToPath } from "node:url";
var templateSuffix = ".mustache";
async function getTemplates(basePath) {
  return await getFiles(pathJoin(basePath, "**/*.*"));
}
__name(getTemplates, "getTemplates");
var _cachedPackageJsonPath = null;
async function packageJsonPath() {
  if (_cachedPackageJsonPath) {
    return _cachedPackageJsonPath;
  }
  let currentDir = path.dirname(fileURLToPath(import.meta.url));
  while (currentDir !== path.dirname(currentDir)) {
    const packageJsonPath2 = path.join(currentDir, "package.json");
    try {
      await fs.promises.access(packageJsonPath2);
      _cachedPackageJsonPath = packageJsonPath2;
      return currentDir;
    } catch (error) {
      currentDir = path.dirname(currentDir);
    }
  }
  throw new Error(
    `Could not find package.json in ${currentDir} or any parent directory`,
  );
}
__name(packageJsonPath, "packageJsonPath");
async function renderTemplates(
  folder,
  destRootPath,
  configData,
  eventCallback,
) {
  const basePath = pathJoin(await packageJsonPath(), "templates", folder);
  const files = await getTemplates(basePath);
  if (files.length === 0) {
    throw new Error(`No templates found in ${basePath}`);
  }
  for (const file of Object.values(files)) {
    const filePath = render(file, basePath, destRootPath, configData);
    if (eventCallback) {
      eventCallback(filePath);
    }
  }
  if (eventCallback) {
    eventCallback(`${files.length} files rendered successfully`);
  }
}
__name(renderTemplates, "renderTemplates");
async function getFiles(path4) {
  const normalizedPath = path4.replace(/\\/g, "/");
  return glob(normalizedPath, { dot: true, nodir: true });
}
__name(getFiles, "getFiles");
function encodingFromExt(path4) {
  return path4.endsWith(".ttf") ? "binary" : "utf8";
}
__name(encodingFromExt, "encodingFromExt");
function getFileContent(path4, allowEmpty = true) {
  if (!allowEmpty || fs.existsSync(path4)) {
    return fs.readFileSync(path4, encodingFromExt(path4));
  } else {
    return "";
  }
}
__name(getFileContent, "getFileContent");
function writeFileContent(path4, content) {
  const dir = parsePath(path4).dir;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path4, content, encodingFromExt(path4));
}
__name(writeFileContent, "writeFileContent");
function render(filePath, sourceRootPath, destRootPath, configData) {
  let fileData = getFileContent(filePath, false);
  let relativePath = filePath.replace(sourceRootPath, "");
  if (relativePath.endsWith(templateSuffix)) {
    relativePath = relativePath.replace(templateSuffix, "");
    fileData = mustache.render(fileData, configData);
  }
  const newFilePath = pathJoin(destRootPath, relativePath);
  const dir = parsePath(newFilePath).dir;
  writeFileContent(newFilePath, fileData);
  return newFilePath;
}
__name(render, "render");
async function folderIsEmpty(path4) {
  const files = await getFiles(pathJoin(path4, "*"));
  return files.length === 0;
}
__name(folderIsEmpty, "folderIsEmpty");
function isValidFolderName(folderName) {
  return /^[a-z0-9_-]+$/i.test(folderName);
}
__name(isValidFolderName, "isValidFolderName");

// src/commands/new-agent.ts
import { exec } from "child_process";
import path2 from "node:path";
import validate from "validate-npm-package-name";
import { Listr } from "listr2";
import stripAnsi from "strip-ansi";
var NewAgentCommand = class {
  static {
    __name(this, "NewAgentCommand");
  }
  async run(options) {
    const folder = "./";
    const projectFolder = path2.resolve(process.cwd(), folder);
    const tasks = new Listr([
      {
        title: "Preflight checks",
        task: () => {
          return new Listr(
            [
              {
                title: `Checking name "${options.name}"`,
                task: () => validatePackageName(options.name),
              },
              {
                title: `Checking folder "${projectFolder}"`,
                task: async () =>
                  await validateFolder(projectFolder).catch((error) => {
                    throw new Error(
                      `The specified folder is not empty.  A new agent can only be created in an empty folder.`,
                    );
                  }),
              },
            ],
            { concurrent: false },
          );
        },
      },
      {
        title: "Generate package files",
        task: async (ctx, task) => {
          const onData = /* @__PURE__ */ __name((data) => {
            task.output = data;
          }, "onData");
          return file_system_exports.renderTemplates(
            "agent-new",
            projectFolder,
            options,
            (msg) => {
              task.output = msg;
            },
          );
        },
        rendererOptions: { persistentOutput: true },
      },
      {
        title: "Install npm packages",
        task: async (ctx, task) => {
          return wrappedExec("npm install --verbose", (msg) => {
            task.output = msg;
          });
        },
        rendererOptions: { persistentOutput: true },
      },
      {
        title: "Initialize Git",
        skip: () => !options.git,
        task: async (ctx, task) => {
          return wrappedExec("git init", (msg) => {
            task.output = msg;
          });
        },
        rendererOptions: { persistentOutput: true },
      },
      {
        title: "Install vscode-dts proposed API types",
        task: async (ctx, task) => {
          return wrappedExec(
            "npx --yes vscode-dts@latest dev -f",
            (msg) => {
              task.output = msg;
            },
            path2.join(process.cwd(), "src"),
          );
        },
        rendererOptions: { persistentOutput: true },
      },
      {
        title: "Compile typeScript",
        task: async (ctx, task) => {
          return wrappedExec("npm run compile", (msg) => {
            task.output = msg;
          });
        },
        rendererOptions: { persistentOutput: true },
      },
    ]);
    return tasks.run();
  }
};
function validatePackageName(name) {
  if (!validate(name).validForNewPackages) {
    throw new Error(
      "The specified agent name must be a valid npm package name.  See https://docs.npmjs.com/package-name-guidelines",
    );
  }
}
__name(validatePackageName, "validatePackageName");
async function validateFolder(folderPath) {
  const emptyFolder = await file_system_exports.folderIsEmpty(folderPath);
  if (!emptyFolder) {
    throw new Error(
      "The target file system path is not empty. A new agent can only be created in an empty folder.",
    );
  }
  return Promise.resolve();
}
__name(validateFolder, "validateFolder");
async function wrappedExec(cmd, callback, cwd) {
  callback(`Executing: '${cmd}'`);
  return new Promise((resolve, reject) => {
    const childProcess = exec(cmd, { cwd: cwd ?? process.cwd() });
    childProcess.stdout?.on("data", (data) => {
      const lines = stripAnsi(data.toString()).split(/\r?\n/);
      lines.forEach((line) => {
        if (line.trim() !== "") {
          callback(line.trim());
        }
      });
    });
    childProcess.on("error", (error) => {
      reject(error);
    });
    childProcess.on("close", () => {
      callback("Completed successfully");
      resolve();
    });
  });
}
__name(wrappedExec, "wrappedExec");
var new_agent_default = new NewAgentCommand();

// src/cli/initializer.ts
import { input, confirm } from "@inquirer/prompts";
import path3 from "path";
import chalk from "chalk";
var summary =
  "This package will scaffold a new GitHub Copilot chat agent typescript extension for VS Code usiing TypeScript.";
function mergeParsedArguments(args, passedOptions) {
  let result = {
    silent: false,
    git: true,
    publisher: "undefined_publisher",
  };
  if (!args || args.length === 0) {
    return result;
  }
  const cmd = args[args.length - 1];
  result = { ...result, ...cmd.opts() };
  for (let i = 0; i < cmd.registeredArguments.length; i++) {
    result[cmd.registeredArguments[i].name()] = args[i];
  }
  if (passedOptions) {
    result = { ...passedOptions, ...result };
  }
  return result;
}
__name(mergeParsedArguments, "mergeParsedArguments");
async function validateAndPrompt(prompt, currentValue, defaultValue) {
  const validator = /* @__PURE__ */ __name((input2) => {
    if (!input2 || input2.trim().length === 0) {
      return false;
    }
    return true;
  }, "validator");
  if (!validator(currentValue)) {
    return await input({
      message: `${prompt}
  ==>`,
      default: defaultValue,
      validate: function (input2) {
        return validator(input2) ? true : "value cannot be empty";
      },
    });
  } else {
    return Promise.resolve(currentValue);
  }
}
__name(validateAndPrompt, "validateAndPrompt");
async function init(initOptions) {
  const program = new Command();
  program
    .summary(summary)
    .argument("[name]", "new agent name")
    .option("--no-git", "don't initialize a local git repository")
    .action(async (...args) => {
      const mergedOptions = mergeParsedArguments(args);
      if (
        !mergedOptions.silent &&
        !(await confirm({
          message: chalk.blue(`${summary}
Do you want to continue?`),
          default: true,
        }))
      ) {
        return;
      }
      mergedOptions.name = await validateAndPrompt(
        "What would you like to name your new Copilot chat agent? Don't use spaces or special characters.",
        mergedOptions.name,
        path3.basename(process.cwd()),
      );
      mergedOptions.displayName = await validateAndPrompt(
        'Enter a "friendly" name for your agent.',
        mergedOptions.displayName,
        `Copilot agent: @${mergedOptions.name}`,
      );
      mergedOptions.description = await validateAndPrompt(
        "Enter a brief description of what it does for your users.",
        mergedOptions.description,
        `${mergedOptions.displayName} - A GitHub Copilot chat agent for VS Code`,
      );
      mergedOptions.git = await confirm({
        message: "Initialize a local git repository?",
        default: true,
      });
      await new_agent_default.run(mergedOptions);
    });
  console.clear();
  await program
    .parseAsync()
    .then((command) => {
      console.log(
        chalk.green.bold(
          "\nYour new chat agent project is now ready. Happy coding!\n",
        ),
      );
    })
    .catch((reason) => {
      console.log(
        chalk.red.bold(
          "\nInitialization Failed. Check the output above for details.",
        ),
      );
    });
}
__name(init, "init");
export { init };
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2NsaS9pbml0aWFsaXplci50cyIsICIuLi9zcmMvaGVscGVycy9maWxlLXN5c3RlbS50cyIsICIuLi9zcmMvY29tbWFuZHMvbmV3LWFnZW50LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSpcbiAqICBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gKlxuICotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuaW1wb3J0IHsgQ29tbWFuZCB9IGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQgbmV3QWdlbnRDb21tYW5kIGZyb20gJy4uL2NvbW1hbmRzL25ldy1hZ2VudCc7XG5pbXBvcnQgeyBpbnB1dCwgY29uZmlybSB9IGZyb20gJ0BpbnF1aXJlci9wcm9tcHRzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7IEluaXRPcHRpb25zIH0gZnJvbSAnLi4vY29udHJhY3RzJztcblxuY29uc3Qgc3VtbWFyeSA9XG5cdCdUaGlzIHBhY2thZ2Ugd2lsbCBzY2FmZm9sZCBhIG5ldyBHaXRIdWIgQ29waWxvdCBjaGF0IGFnZW50IHR5cGVzY3JpcHQgZXh0ZW5zaW9uIGZvciBWUyBDb2RlIHVzaWluZyBUeXBlU2NyaXB0Lic7XG5cbmZ1bmN0aW9uIG1lcmdlUGFyc2VkQXJndW1lbnRzKFxuXHRhcmdzOiBhbnlbXSxcblx0cGFzc2VkT3B0aW9ucz86IEluaXRPcHRpb25zLFxuKTogSW5pdE9wdGlvbnMge1xuXHQvL3NldCBkZWZhdWx0c1xuXHRsZXQgcmVzdWx0OiBhbnkgPSB7XG5cdFx0c2lsZW50OiBmYWxzZSxcblx0XHRnaXQ6IHRydWUsXG5cdFx0cHVibGlzaGVyOiAndW5kZWZpbmVkX3B1Ymxpc2hlcicsXG5cdH07XG5cdGlmICghYXJncyB8fCBhcmdzLmxlbmd0aCA9PT0gMCkge1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblx0Y29uc3QgY21kID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdIGFzIENvbW1hbmQ7XG5cdHJlc3VsdCA9IHsgLi4ucmVzdWx0LCAuLi5jbWQub3B0cygpIH07XG5cblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBjbWQucmVnaXN0ZXJlZEFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdHJlc3VsdFtjbWQucmVnaXN0ZXJlZEFyZ3VtZW50c1tpXS5uYW1lKCldID0gYXJnc1tpXTtcblx0fVxuXHRpZiAocGFzc2VkT3B0aW9ucykge1xuXHRcdHJlc3VsdCA9IHsgLi4ucGFzc2VkT3B0aW9ucywgLi4ucmVzdWx0IH07XG5cdH1cblx0cmV0dXJuIHJlc3VsdCBhcyBJbml0T3B0aW9ucztcbn1cbi8qKlxuICogUmV0dXJucyB0aGUgY3VycmVudCB0aW1lIGluIHRoZSBmb3JtYXQgXCJob3VyczptaW51dGVzOnNlY29uZHNcIi5cbiAqXG4gKiBAcmV0dXJucyBUaGUgY3VycmVudCB0aW1lLlxuICovXG5mdW5jdGlvbiBnZXRDdXJyZW50VGltZSgpIHtcblx0Y29uc3QgZGF0ZSA9IG5ldyBEYXRlKCk7XG5cdGNvbnN0IGhvdXJzID0gZGF0ZS5nZXRIb3VycygpO1xuXHRjb25zdCBtaW51dGVzID0gZGF0ZS5nZXRNaW51dGVzKCk7XG5cdGNvbnN0IHNlY29uZHMgPSBkYXRlLmdldFNlY29uZHMoKTtcblxuXHRyZXR1cm4gYCR7aG91cnN9OiR7bWludXRlc306JHtzZWNvbmRzfWA7XG59XG5hc3luYyBmdW5jdGlvbiB2YWxpZGF0ZUFuZFByb21wdChcblx0cHJvbXB0OiBzdHJpbmcsXG5cdGN1cnJlbnRWYWx1ZT86IHN0cmluZyxcblx0ZGVmYXVsdFZhbHVlPzogc3RyaW5nLFxuKTogUHJvbWlzZTxzdHJpbmc+IHtcblx0Y29uc3QgdmFsaWRhdG9yID0gKGlucHV0Pzogc3RyaW5nKTogYm9vbGVhbiA9PiB7XG5cdFx0aWYgKCFpbnB1dCB8fCBpbnB1dC50cmltKCkubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiB0cnVlO1xuXHR9O1xuXG5cdGlmICghdmFsaWRhdG9yKGN1cnJlbnRWYWx1ZSkpIHtcblx0XHRyZXR1cm4gYXdhaXQgaW5wdXQoe1xuXHRcdFx0bWVzc2FnZTogYCR7cHJvbXB0fVxcbiAgPT0+YCxcblx0XHRcdGRlZmF1bHQ6IGRlZmF1bHRWYWx1ZSxcblx0XHRcdHZhbGlkYXRlOiBmdW5jdGlvbiAoaW5wdXQpIHtcblx0XHRcdFx0cmV0dXJuIHZhbGlkYXRvcihpbnB1dCkgPyB0cnVlIDogJ3ZhbHVlIGNhbm5vdCBiZSBlbXB0eSc7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoY3VycmVudFZhbHVlISk7XG5cdH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXQoaW5pdE9wdGlvbnM/OiBJbml0T3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuXHRjb25zdCBwcm9ncmFtID0gbmV3IENvbW1hbmQoKTtcblxuXHRwcm9ncmFtXG5cdFx0LnN1bW1hcnkoc3VtbWFyeSlcblx0XHQuYXJndW1lbnQoJ1tuYW1lXScsICduZXcgYWdlbnQgbmFtZScpXG5cdFx0Lm9wdGlvbignLS1uby1naXQnLCBcImRvbid0IGluaXRpYWxpemUgYSBsb2NhbCBnaXQgcmVwb3NpdG9yeVwiKVxuXHRcdC5hY3Rpb24oYXN5bmMgKC4uLmFyZ3M6IGFueVtdKSA9PiB7XG5cdFx0XHRjb25zdCBtZXJnZWRPcHRpb25zID0gbWVyZ2VQYXJzZWRBcmd1bWVudHMoYXJncyk7XG5cdFx0XHRpZiAoXG5cdFx0XHRcdCFtZXJnZWRPcHRpb25zLnNpbGVudCAmJlxuXHRcdFx0XHQhKGF3YWl0IGNvbmZpcm0oe1xuXHRcdFx0XHRcdG1lc3NhZ2U6IGNoYWxrLmJsdWUoYCR7c3VtbWFyeX1cXG5EbyB5b3Ugd2FudCB0byBjb250aW51ZT9gKSxcblx0XHRcdFx0XHRkZWZhdWx0OiB0cnVlLFxuXHRcdFx0XHR9KSlcblx0XHRcdCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vVE9ETzogbWVyZ2UgcHJvbXB0cyBpbnRvIExpc3RyIHNvIHRoYXQgdGhlIHRhc2tzIGNhbiBiZSBtb3JlIGludGVyYWN0aXZlXG5cdFx0XHQvL2ZpeCB0aGlzIHRvIGhhbmRsZSBzaWxlbnQgbW9kZVxuXHRcdFx0bWVyZ2VkT3B0aW9ucy5uYW1lID0gYXdhaXQgdmFsaWRhdGVBbmRQcm9tcHQoXG5cdFx0XHRcdFwiV2hhdCB3b3VsZCB5b3UgbGlrZSB0byBuYW1lIHlvdXIgbmV3IENvcGlsb3QgY2hhdCBhZ2VudD8gRG9uJ3QgdXNlIHNwYWNlcyBvciBzcGVjaWFsIGNoYXJhY3RlcnMuXCIsXG5cdFx0XHRcdG1lcmdlZE9wdGlvbnMubmFtZSxcblx0XHRcdFx0cGF0aC5iYXNlbmFtZShwcm9jZXNzLmN3ZCgpKSxcblx0XHRcdCk7XG5cblx0XHRcdG1lcmdlZE9wdGlvbnMuZGlzcGxheU5hbWUgPSBhd2FpdCB2YWxpZGF0ZUFuZFByb21wdChcblx0XHRcdFx0J0VudGVyIGEgXCJmcmllbmRseVwiIG5hbWUgZm9yIHlvdXIgYWdlbnQuJyxcblx0XHRcdFx0bWVyZ2VkT3B0aW9ucy5kaXNwbGF5TmFtZSxcblx0XHRcdFx0YENvcGlsb3QgYWdlbnQ6IEAke21lcmdlZE9wdGlvbnMubmFtZX1gLFxuXHRcdFx0KTtcblxuXHRcdFx0bWVyZ2VkT3B0aW9ucy5kZXNjcmlwdGlvbiA9IGF3YWl0IHZhbGlkYXRlQW5kUHJvbXB0KFxuXHRcdFx0XHQnRW50ZXIgYSBicmllZiBkZXNjcmlwdGlvbiBvZiB3aGF0IGl0IGRvZXMgZm9yIHlvdXIgdXNlcnMuJyxcblx0XHRcdFx0bWVyZ2VkT3B0aW9ucy5kZXNjcmlwdGlvbixcblx0XHRcdFx0YCR7bWVyZ2VkT3B0aW9ucy5kaXNwbGF5TmFtZX0gLSBBIEdpdEh1YiBDb3BpbG90IGNoYXQgYWdlbnQgZm9yIFZTIENvZGVgLFxuXHRcdFx0KTtcblxuXHRcdFx0bWVyZ2VkT3B0aW9ucy5naXQgPSBhd2FpdCBjb25maXJtKHtcblx0XHRcdFx0bWVzc2FnZTogJ0luaXRpYWxpemUgYSBsb2NhbCBnaXQgcmVwb3NpdG9yeT8nLFxuXHRcdFx0XHRkZWZhdWx0OiB0cnVlLFxuXHRcdFx0fSk7XG5cblx0XHRcdGF3YWl0IG5ld0FnZW50Q29tbWFuZC5ydW4obWVyZ2VkT3B0aW9ucyk7XG5cdFx0fSk7XG5cblx0Y29uc29sZS5jbGVhcigpO1xuXHRhd2FpdCBwcm9ncmFtXG5cdFx0LnBhcnNlQXN5bmMoKVxuXHRcdC50aGVuKChjb21tYW5kKSA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZyhcblx0XHRcdFx0Y2hhbGsuZ3JlZW4uYm9sZChcblx0XHRcdFx0XHQnXFxuWW91ciBuZXcgY2hhdCBhZ2VudCBwcm9qZWN0IGlzIG5vdyByZWFkeS4gSGFwcHkgY29kaW5nIVxcbicsXG5cdFx0XHRcdCksXG5cdFx0XHQpO1xuXHRcdH0pXG5cdFx0LmNhdGNoKChyZWFzb24pID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKFxuXHRcdFx0XHRjaGFsay5yZWQuYm9sZChcblx0XHRcdFx0XHQnXFxuSW5pdGlhbGl6YXRpb24gRmFpbGVkLiBDaGVjayB0aGUgb3V0cHV0IGFib3ZlIGZvciBkZXRhaWxzLicsXG5cdFx0XHRcdCksXG5cdFx0XHQpO1xuXHRcdH0pO1xufVxuIiwgIi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKlxuICogIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLiAqXG4gKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5pbXBvcnQgeyBnbG9iIH0gZnJvbSAnZ2xvYic7XG5pbXBvcnQgcGF0aCwgeyBqb2luIGFzIHBhdGhKb2luLCBwYXJzZSBhcyBwYXJzZVBhdGggfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IG11c3RhY2hlIGZyb20gJ211c3RhY2hlJztcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICdub2RlOnVybCc7XG5pbXBvcnQgeyBFdmVudENhbGxiYWNrIH0gZnJvbSAnLi4vY29udHJhY3RzJztcblxuY29uc3QgdGVtcGxhdGVTdWZmaXggPSAnLm11c3RhY2hlJztcbmNvbnN0IGRlbGV0ZVN1ZmZpeCA9ICcuZGVsZXRlJztcblxuYXN5bmMgZnVuY3Rpb24gZ2V0VGVtcGxhdGVzKGJhc2VQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG5cdHJldHVybiBhd2FpdCBnZXRGaWxlcyhwYXRoSm9pbihiYXNlUGF0aCwgJyoqLyouKicpKTtcbn1cblxubGV0IF9jYWNoZWRQYWNrYWdlSnNvblBhdGg6IHN0cmluZyB8IG51bGwgPSBudWxsOyAvL2RvIG5vdCBhY2Nlc3MgZGlyZWN0bHksIHVzZSBmaW5kUGFja2FnZUpzb25QYXRoXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFja2FnZUpzb25QYXRoKCk6IFByb21pc2U8c3RyaW5nPiB7XG5cdGlmIChfY2FjaGVkUGFja2FnZUpzb25QYXRoKSB7XG5cdFx0cmV0dXJuIF9jYWNoZWRQYWNrYWdlSnNvblBhdGg7XG5cdH1cblxuXHRsZXQgY3VycmVudERpciA9IHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpO1xuXG5cdHdoaWxlIChjdXJyZW50RGlyICE9PSBwYXRoLmRpcm5hbWUoY3VycmVudERpcikpIHtcblx0XHQvLyBTdG9wIHdoZW4gcmVhY2hpbmcgcm9vdCBkaXJlY3Rvcnlcblx0XHRjb25zdCBwYWNrYWdlSnNvblBhdGggPSBwYXRoLmpvaW4oY3VycmVudERpciwgJ3BhY2thZ2UuanNvbicpO1xuXHRcdHRyeSB7XG5cdFx0XHRhd2FpdCBmcy5wcm9taXNlcy5hY2Nlc3MocGFja2FnZUpzb25QYXRoKTtcblx0XHRcdF9jYWNoZWRQYWNrYWdlSnNvblBhdGggPSBwYWNrYWdlSnNvblBhdGg7XG5cdFx0XHRyZXR1cm4gY3VycmVudERpcjtcblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0Y3VycmVudERpciA9IHBhdGguZGlybmFtZShjdXJyZW50RGlyKTtcblx0XHR9XG5cdH1cblxuXHR0aHJvdyBuZXcgRXJyb3IoXG5cdFx0YENvdWxkIG5vdCBmaW5kIHBhY2thZ2UuanNvbiBpbiAke2N1cnJlbnREaXJ9IG9yIGFueSBwYXJlbnQgZGlyZWN0b3J5YCxcblx0KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbmRlclRlbXBsYXRlcyhcblx0Zm9sZGVyOiBzdHJpbmcsXG5cdGRlc3RSb290UGF0aDogc3RyaW5nLFxuXHRjb25maWdEYXRhOiBhbnksXG5cdGV2ZW50Q2FsbGJhY2s/OiBFdmVudENhbGxiYWNrLFxuKSB7XG5cdGNvbnN0IGJhc2VQYXRoID0gcGF0aEpvaW4oYXdhaXQgcGFja2FnZUpzb25QYXRoKCksICd0ZW1wbGF0ZXMnLCBmb2xkZXIpO1xuXHRjb25zdCBmaWxlcyA9IGF3YWl0IGdldFRlbXBsYXRlcyhiYXNlUGF0aCk7XG5cdGlmIChmaWxlcy5sZW5ndGggPT09IDApIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYE5vIHRlbXBsYXRlcyBmb3VuZCBpbiAke2Jhc2VQYXRofWApO1xuXHR9XG5cdGZvciAoY29uc3QgZmlsZSBvZiBPYmplY3QudmFsdWVzKGZpbGVzKSkge1xuXHRcdGNvbnN0IGZpbGVQYXRoID0gcmVuZGVyKGZpbGUsIGJhc2VQYXRoLCBkZXN0Um9vdFBhdGgsIGNvbmZpZ0RhdGEpO1xuXHRcdGlmIChldmVudENhbGxiYWNrKSB7XG5cdFx0XHRldmVudENhbGxiYWNrKGZpbGVQYXRoKTtcblx0XHR9XG5cdH1cblx0aWYgKGV2ZW50Q2FsbGJhY2spIHtcblx0XHRldmVudENhbGxiYWNrKGAke2ZpbGVzLmxlbmd0aH0gZmlsZXMgcmVuZGVyZWQgc3VjY2Vzc2Z1bGx5YCk7XG5cdH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0RmlsZXMocGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuXHRjb25zdCBub3JtYWxpemVkUGF0aCA9IHBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXHRyZXR1cm4gZ2xvYihub3JtYWxpemVkUGF0aCwgeyBkb3Q6IHRydWUsIG5vZGlyOiB0cnVlIH0pO1xufVxuXG5mdW5jdGlvbiBlbmNvZGluZ0Zyb21FeHQocGF0aDogc3RyaW5nKTogJ2JpbmFyeScgfCAndXRmOCcge1xuXHRyZXR1cm4gcGF0aC5lbmRzV2l0aCgnLnR0ZicpID8gJ2JpbmFyeScgOiAndXRmOCc7XG59XG5cbmZ1bmN0aW9uIGdldEZpbGVDb250ZW50KHBhdGg6IHN0cmluZywgYWxsb3dFbXB0eTogYm9vbGVhbiA9IHRydWUpOiBzdHJpbmcge1xuXHRpZiAoIWFsbG93RW1wdHkgfHwgZnMuZXhpc3RzU3luYyhwYXRoKSkge1xuXHRcdHJldHVybiBmcy5yZWFkRmlsZVN5bmMocGF0aCwgZW5jb2RpbmdGcm9tRXh0KHBhdGgpKTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gJyc7XG5cdH1cbn1cblxuZnVuY3Rpb24gd3JpdGVGaWxlQ29udGVudChwYXRoOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykge1xuXHRjb25zdCBkaXIgPSBwYXJzZVBhdGgocGF0aCkuZGlyO1xuXHRmcy5ta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblx0ZnMud3JpdGVGaWxlU3luYyhwYXRoLCBjb250ZW50LCBlbmNvZGluZ0Zyb21FeHQocGF0aCkpO1xufVxuXG5mdW5jdGlvbiByZW5kZXIoXG5cdGZpbGVQYXRoOiBzdHJpbmcsXG5cdHNvdXJjZVJvb3RQYXRoOiBzdHJpbmcsXG5cdGRlc3RSb290UGF0aDogc3RyaW5nLFxuXHRjb25maWdEYXRhOiBhbnksXG4pOiBzdHJpbmcge1xuXHRsZXQgZmlsZURhdGEgPSBnZXRGaWxlQ29udGVudChmaWxlUGF0aCwgZmFsc2UpO1xuXHRsZXQgcmVsYXRpdmVQYXRoID0gZmlsZVBhdGgucmVwbGFjZShzb3VyY2VSb290UGF0aCwgJycpO1xuXHRpZiAocmVsYXRpdmVQYXRoLmVuZHNXaXRoKHRlbXBsYXRlU3VmZml4KSkge1xuXHRcdHJlbGF0aXZlUGF0aCA9IHJlbGF0aXZlUGF0aC5yZXBsYWNlKHRlbXBsYXRlU3VmZml4LCAnJyk7XG5cdFx0ZmlsZURhdGEgPSBtdXN0YWNoZS5yZW5kZXIoZmlsZURhdGEsIGNvbmZpZ0RhdGEpO1xuXHR9XG5cblx0Y29uc3QgbmV3RmlsZVBhdGggPSBwYXRoSm9pbihkZXN0Um9vdFBhdGgsIHJlbGF0aXZlUGF0aCk7XG5cdGNvbnN0IGRpciA9IHBhcnNlUGF0aChuZXdGaWxlUGF0aCkuZGlyO1xuXG5cdHdyaXRlRmlsZUNvbnRlbnQobmV3RmlsZVBhdGgsIGZpbGVEYXRhKTtcblx0cmV0dXJuIG5ld0ZpbGVQYXRoO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZm9sZGVySXNFbXB0eShwYXRoOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcblx0Y29uc3QgZmlsZXMgPSBhd2FpdCBnZXRGaWxlcyhwYXRoSm9pbihwYXRoLCAnKicpKTtcblx0cmV0dXJuIGZpbGVzLmxlbmd0aCA9PT0gMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVmFsaWRGb2xkZXJOYW1lKGZvbGRlck5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuXHRyZXR1cm4gL15bYS16MC05Xy1dKyQvaS50ZXN0KGZvbGRlck5hbWUpO1xufVxuIiwgIi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKlxuICogIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLiAqXG4gKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5pbXBvcnQgeyBmc0hlbHBlciB9IGZyb20gJy4uL2hlbHBlcnMnO1xuaW1wb3J0IHsgZXhlYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgSUNsaUNvbW1hbmQsIEV2ZW50Q2FsbGJhY2ssIEluaXRPcHRpb25zIH0gZnJvbSAnLi4vY29udHJhY3RzJztcbmltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgdmFsaWRhdGUgZnJvbSAndmFsaWRhdGUtbnBtLXBhY2thZ2UtbmFtZSc7XG5pbXBvcnQgeyBMaXN0ciB9IGZyb20gJ2xpc3RyMic7XG5pbXBvcnQgc3RyaXBBbnNpIGZyb20gJ3N0cmlwLWFuc2knO1xuXG5jbGFzcyBOZXdBZ2VudENvbW1hbmQgaW1wbGVtZW50cyBJQ2xpQ29tbWFuZCB7XG5cdHB1YmxpYyBhc3luYyBydW4ob3B0aW9uczogSW5pdE9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcblx0XHQvL1RPRE86IGFsbG93IHRoZSBmb2xkZXIgdG8gYmUgc3BlY2lmaWVkXG5cdFx0Y29uc3QgZm9sZGVyID0gJy4vJztcblx0XHRjb25zdCBwcm9qZWN0Rm9sZGVyID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksIGZvbGRlcik7XG5cdFx0Y29uc3QgdGFza3MgPSBuZXcgTGlzdHIoW1xuXHRcdFx0e1xuXHRcdFx0XHR0aXRsZTogJ1ByZWZsaWdodCBjaGVja3MnLFxuXHRcdFx0XHR0YXNrOiAoKSA9PiB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBMaXN0cihcblx0XHRcdFx0XHRcdFtcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdHRpdGxlOiBgQ2hlY2tpbmcgbmFtZSBcIiR7b3B0aW9ucy5uYW1lfVwiYCxcblx0XHRcdFx0XHRcdFx0XHR0YXNrOiAoKSA9PiB2YWxpZGF0ZVBhY2thZ2VOYW1lKG9wdGlvbnMubmFtZSksXG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHR0aXRsZTogYENoZWNraW5nIGZvbGRlciBcIiR7cHJvamVjdEZvbGRlcn1cImAsXG5cdFx0XHRcdFx0XHRcdFx0dGFzazogYXN5bmMgKCkgPT5cblx0XHRcdFx0XHRcdFx0XHRcdGF3YWl0IHZhbGlkYXRlRm9sZGVyKHByb2plY3RGb2xkZXIpLmNhdGNoKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHQoZXJyb3IpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRgVGhlIHNwZWNpZmllZCBmb2xkZXIgaXMgbm90IGVtcHR5LiAgQSBuZXcgYWdlbnQgY2FuIG9ubHkgYmUgY3JlYXRlZCBpbiBhbiBlbXB0eSBmb2xkZXIuYCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdFx0KSxcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdF0sXG5cdFx0XHRcdFx0XHR7IGNvbmN1cnJlbnQ6IGZhbHNlIH0sXG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdHRpdGxlOiAnR2VuZXJhdGUgcGFja2FnZSBmaWxlcycsXG5cdFx0XHRcdHRhc2s6IGFzeW5jIChjdHgsIHRhc2spOiBQcm9taXNlPHZvaWQ+ID0+IHtcblx0XHRcdFx0XHRjb25zdCBvbkRhdGEgPSAoZGF0YTogc3RyaW5nKSA9PiB7XG5cdFx0XHRcdFx0XHR0YXNrLm91dHB1dCA9IGRhdGE7XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRyZXR1cm4gZnNIZWxwZXIucmVuZGVyVGVtcGxhdGVzKFxuXHRcdFx0XHRcdFx0J2FnZW50LW5ldycsXG5cdFx0XHRcdFx0XHRwcm9qZWN0Rm9sZGVyLFxuXHRcdFx0XHRcdFx0b3B0aW9ucyxcblx0XHRcdFx0XHRcdChtc2c6IHN0cmluZykgPT4ge1xuXHRcdFx0XHRcdFx0XHR0YXNrLm91dHB1dCA9IG1zZztcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0fSxcblx0XHRcdFx0cmVuZGVyZXJPcHRpb25zOiB7IHBlcnNpc3RlbnRPdXRwdXQ6IHRydWUgfSxcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdHRpdGxlOiAnSW5zdGFsbCBucG0gcGFja2FnZXMnLFxuXHRcdFx0XHR0YXNrOiBhc3luYyAoY3R4LCB0YXNrKSA9PiB7XG5cdFx0XHRcdFx0cmV0dXJuIHdyYXBwZWRFeGVjKFxuXHRcdFx0XHRcdFx0J25wbSBpbnN0YWxsIC0tdmVyYm9zZScsXG5cdFx0XHRcdFx0XHQobXNnOiBzdHJpbmcpID0+IHtcblx0XHRcdFx0XHRcdFx0dGFzay5vdXRwdXQgPSBtc2c7XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHJlbmRlcmVyT3B0aW9uczogeyBwZXJzaXN0ZW50T3V0cHV0OiB0cnVlIH0sXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHR0aXRsZTogJ0luaXRpYWxpemUgR2l0Jyxcblx0XHRcdFx0c2tpcDogKCkgPT4gIW9wdGlvbnMuZ2l0LFxuXHRcdFx0XHR0YXNrOiBhc3luYyAoY3R4LCB0YXNrKSA9PiB7XG5cdFx0XHRcdFx0cmV0dXJuIHdyYXBwZWRFeGVjKCdnaXQgaW5pdCcsIChtc2c6IHN0cmluZykgPT4ge1xuXHRcdFx0XHRcdFx0dGFzay5vdXRwdXQgPSBtc2c7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHJlbmRlcmVyT3B0aW9uczogeyBwZXJzaXN0ZW50T3V0cHV0OiB0cnVlIH0sXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHR0aXRsZTogJ0luc3RhbGwgdnNjb2RlLWR0cyBwcm9wb3NlZCBBUEkgdHlwZXMnLFxuXHRcdFx0XHR0YXNrOiBhc3luYyAoY3R4LCB0YXNrKSA9PiB7XG5cdFx0XHRcdFx0cmV0dXJuIHdyYXBwZWRFeGVjKFxuXHRcdFx0XHRcdFx0J25weCAtLXllcyB2c2NvZGUtZHRzQGxhdGVzdCBkZXYgLWYnLFxuXHRcdFx0XHRcdFx0KG1zZzogc3RyaW5nKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHRhc2sub3V0cHV0ID0gbXNnO1xuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCAnc3JjJyksXG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0fSxcblx0XHRcdFx0cmVuZGVyZXJPcHRpb25zOiB7IHBlcnNpc3RlbnRPdXRwdXQ6IHRydWUgfSxcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdHRpdGxlOiAnQ29tcGlsZSB0eXBlU2NyaXB0Jyxcblx0XHRcdFx0dGFzazogYXN5bmMgKGN0eCwgdGFzaykgPT4ge1xuXHRcdFx0XHRcdHJldHVybiB3cmFwcGVkRXhlYygnbnBtIHJ1biBjb21waWxlJywgKG1zZzogc3RyaW5nKSA9PiB7XG5cdFx0XHRcdFx0XHR0YXNrLm91dHB1dCA9IG1zZztcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSxcblx0XHRcdFx0cmVuZGVyZXJPcHRpb25zOiB7IHBlcnNpc3RlbnRPdXRwdXQ6IHRydWUgfSxcblx0XHRcdH0sXG5cdFx0XSk7XG5cdFx0cmV0dXJuIHRhc2tzLnJ1bigpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlUGFja2FnZU5hbWUobmFtZTogc3RyaW5nKSB7XG5cdGlmICghdmFsaWRhdGUobmFtZSkudmFsaWRGb3JOZXdQYWNrYWdlcykge1xuXHRcdHRocm93IG5ldyBFcnJvcihcblx0XHRcdCdUaGUgc3BlY2lmaWVkIGFnZW50IG5hbWUgbXVzdCBiZSBhIHZhbGlkIG5wbSBwYWNrYWdlIG5hbWUuICBTZWUgaHR0cHM6Ly9kb2NzLm5wbWpzLmNvbS9wYWNrYWdlLW5hbWUtZ3VpZGVsaW5lcycsXG5cdFx0KTtcblx0fVxufVxuXG5hc3luYyBmdW5jdGlvbiB2YWxpZGF0ZUZvbGRlcihmb2xkZXJQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcblx0Y29uc3QgZW1wdHlGb2xkZXIgPSBhd2FpdCBmc0hlbHBlci5mb2xkZXJJc0VtcHR5KGZvbGRlclBhdGgpO1xuXHRpZiAoIWVtcHR5Rm9sZGVyKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKFxuXHRcdFx0J1RoZSB0YXJnZXQgZmlsZSBzeXN0ZW0gcGF0aCBpcyBub3QgZW1wdHkuIEEgbmV3IGFnZW50IGNhbiBvbmx5IGJlIGNyZWF0ZWQgaW4gYW4gZW1wdHkgZm9sZGVyLicsXG5cdFx0KTtcblx0fVxuXHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHdyYXBwZWRFeGVjKFxuXHRjbWQ6IHN0cmluZyxcblx0Y2FsbGJhY2s6IEV2ZW50Q2FsbGJhY2ssXG5cdGN3ZD86IHN0cmluZyxcbik6IFByb21pc2U8dm9pZD4ge1xuXHRjYWxsYmFjayhgRXhlY3V0aW5nOiAnJHtjbWR9J2ApO1xuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdGNvbnN0IGNoaWxkUHJvY2VzcyA9IGV4ZWMoY21kLCB7IGN3ZDogY3dkID8/IHByb2Nlc3MuY3dkKCkgfSk7XG5cdFx0Y2hpbGRQcm9jZXNzLnN0ZG91dD8ub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xuXHRcdFx0Y29uc3QgbGluZXMgPSBzdHJpcEFuc2koZGF0YS50b1N0cmluZygpKS5zcGxpdCgvXFxyP1xcbi8pO1xuXHRcdFx0bGluZXMuZm9yRWFjaCgobGluZSkgPT4ge1xuXHRcdFx0XHRpZiAobGluZS50cmltKCkgIT09ICcnKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2sobGluZS50cmltKCkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHRjaGlsZFByb2Nlc3Mub24oJ2Vycm9yJywgKGVycm9yKSA9PiB7XG5cdFx0XHRyZWplY3QoZXJyb3IpO1xuXHRcdH0pO1xuXHRcdGNoaWxkUHJvY2Vzcy5vbignY2xvc2UnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnQ29tcGxldGVkIHN1Y2Nlc3NmdWxseScpO1xuXHRcdFx0cmVzb2x2ZSgpO1xuXHRcdH0pO1xuXHR9KTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgbmV3IE5ld0FnZW50Q29tbWFuZCgpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7QUFHQSxTQUFTLGVBQWU7OztBQ0h4QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUdBLFNBQVMsWUFBWTtBQUNyQixPQUFPLFFBQVEsUUFBUSxVQUFVLFNBQVMsaUJBQWlCO0FBQzNELE9BQU8sUUFBUTtBQUNmLE9BQU8sY0FBYztBQUNyQixTQUFTLHFCQUFxQjtBQUc5QixJQUFNLGlCQUFpQjtBQUd2QixlQUFlLGFBQWEsVUFBcUM7QUFDaEUsU0FBTyxNQUFNLFNBQVMsU0FBUyxVQUFVLFFBQVEsQ0FBQztBQUNuRDtBQUZlO0FBSWYsSUFBSSx5QkFBd0M7QUFDNUMsZUFBc0Isa0JBQW1DO0FBQ3hELE1BQUksd0JBQXdCO0FBQzNCLFdBQU87QUFBQSxFQUNSO0FBRUEsTUFBSSxhQUFhLEtBQUssUUFBUSxjQUFjLFlBQVksR0FBRyxDQUFDO0FBRTVELFNBQU8sZUFBZSxLQUFLLFFBQVEsVUFBVSxHQUFHO0FBRS9DLFVBQU1BLG1CQUFrQixLQUFLLEtBQUssWUFBWSxjQUFjO0FBQzVELFFBQUk7QUFDSCxZQUFNLEdBQUcsU0FBUyxPQUFPQSxnQkFBZTtBQUN4QywrQkFBeUJBO0FBQ3pCLGFBQU87QUFBQSxJQUNSLFNBQVMsT0FBTztBQUNmLG1CQUFhLEtBQUssUUFBUSxVQUFVO0FBQUEsSUFDckM7QUFBQSxFQUNEO0FBRUEsUUFBTSxJQUFJO0FBQUEsSUFDVCxrQ0FBa0MsVUFBVTtBQUFBLEVBQzdDO0FBQ0Q7QUF0QnNCO0FBd0J0QixlQUFzQixnQkFDckIsUUFDQSxjQUNBLFlBQ0EsZUFDQztBQUNELFFBQU0sV0FBVyxTQUFTLE1BQU0sZ0JBQWdCLEdBQUcsYUFBYSxNQUFNO0FBQ3RFLFFBQU0s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QSxVQUFTQSxPQUFNLEtBQUssRUFBRSxXQUFXLEdBQUc7QUFDeEMsYUFBTztBQUFBLElBQ1I7QUFDQSxXQUFPO0FBQUEsRUFDUixHQUxrQjtBQU9sQixNQUFJLENBQUMsVUFBVSxZQUFZLEdBQUc7QUFDN0IsV0FBTyxNQUFNLE1BQU07QUFBQSxNQUNsQixTQUFTLEdBQUcsTUFBTTtBQUFBO0FBQUEsTUFDbEIsU0FBUztBQUFBLE1BQ1QsVUFBVSxTQUFVQSxRQUFPO0FBQzFCLGVBQU8sVUFBVUEsTUFBSyxJQUFJLE9BQU87QUFBQSxNQUNsQztBQUFBLElBQ0QsQ0FBQztBQUFBLEVBQ0YsT0FBTztBQUNOLFdBQU8sUUFBUSxRQUFRLFlBQWE7QUFBQSxFQUNyQztBQUNEO0FBdkJlO0FBeUJmLGVBQXNCLEtBQUssYUFBMEM7QUFDcEUsUUFBTSxVQUFVLElBQUksUUFBUTtBQUU1QixVQUNFLFFBQVEsT0FBTyxFQUNmLFNBQVMsVUFBVSxnQkFBZ0IsRUFDbkMsT0FBTyxZQUFZLHlDQUF5QyxFQUM1RCxPQUFPLFVBQVUsU0FBZ0I7QUFDakMsVUFBTSxnQkFBZ0IscUJBQXFCLElBQUk7QUFDL0MsUUFDQyxDQUFDLGNBQWMsVUFDZixDQUFFLE1BQU0sUUFBUTtBQUFBLE1BQ2YsU0FBUyxNQUFNLEtBQUssR0FBRyxPQUFPO0FBQUEseUJBQTRCO0FBQUEsTUFDMUQsU0FBUztBQUFBLElBQ1YsQ0FBQyxHQUNBO0FBQ0Q7QUFBQSxJQUNEO0FBSUEsa0JBQWMsT0FBTyxNQUFNO0FBQUEsTUFDMUI7QUFBQSxNQUNBLGNBQWM7QUFBQSxNQUNkQyxNQUFLLFNBQVMsUUFBUSxJQUFJLENBQUM7QUFBQSxJQUM1QjtBQUVBLGtCQUFjLGNBQWMsTUFBTTtBQUFBLE1BQ2pDO0FBQUEsTUFDQSxjQUFjO0FBQUEsTUFDZCxtQkFBbUIsY0FBYyxJQUFJO0FBQUEsSUFDdEM7QUFFQSxrQkFBYyxjQUFjLE1BQU07QUFBQSxNQUNqQztBQUFBLE1BQ0EsY0FBYztBQUFBLE1BQ2QsR0FBRyxjQUFjLFdBQVc7QUFBQSxJQUM3QjtBQUVBLGtCQUFjLE1BQU0sTUFBTSxRQUFRO0FBQUEsTUFDakMsU0FBUztBQUFBLE1BQ1QsU0FBUztBQUFBLElBQ1YsQ0FBQztBQUVELFVBQU0sa0JBQWdCLElBQUksYUFBYTtBQUFBLEVBQ3hDLENBQUM7QUFFRixVQUFRLE1BQU07QUFDZCxRQUFNLFFBQ0osV0FBVyxFQUNYLEtBQUssQ0FBQyxZQUFZO0FBQ2xCLFlBQVE7QUFBQSxNQUNQLE1BQU0sTUFBTTtBQUFBLFFBQ1g7QUFBQSxNQUNEO0FBQUEsSUFDRDtBQUFBLEVBQ0QsQ0FBQyxFQUNBLE1BQU0sQ0FBQyxXQUFXO0FBQ2xCLFlBQVE7QUFBQSxNQUNQLE1BQU0sSUFBSTtBQUFBLFFBQ1Q7QUFBQSxNQUNEO0FBQUEsSUFDRDtBQUFBLEVBQ0QsQ0FBQztBQUNIO0FBaEVzQjsiLAogICJuYW1lcyI6IFsicGFja2FnZUpzb25QYXRoIiwgInBhdGgiLCAicGF0aCIsICJwYXRoIiwgInBhdGgiLCAiaW5wdXQiLCAicGF0aCJdCn0K
