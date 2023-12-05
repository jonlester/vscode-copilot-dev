/*------------------------------------------------------------*
 *  Copyright (c) Microsoft Corporation. All rights reserved. *
 *------------------------------------------------------------*/
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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
  renderTemplates: () => renderTemplates
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
  throw new Error(`Could not find package.json in ${currentDir} or any parent directory`);
}
__name(packageJsonPath, "packageJsonPath");
async function renderTemplates(folder, destRootPath, configData, eventCallback) {
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
    const tasks = new Listr(
      [
        {
          title: "Preflight checks",
          task: () => {
            return new Listr(
              [
                {
                  title: `Checking name "${options.name}"`,
                  task: () => validatePackageName(options.name)
                },
                {
                  title: `Checking folder "${projectFolder}"`,
                  task: async () => await validateFolder(projectFolder).catch(
                    (error) => {
                      throw new Error(
                        `The specified folder is not empty.  A new agent can only be created in an empty folder.`
                      );
                    }
                  )
                }
              ],
              { concurrent: false }
            );
          }
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
              }
            );
          },
          rendererOptions: { persistentOutput: true }
        },
        {
          title: "Install npm packages",
          task: async (ctx, task) => {
            return wrappedExec("npm install --verbose", (msg) => {
              task.output = msg;
            });
          },
          rendererOptions: { persistentOutput: true }
        },
        {
          title: "Initialize Git",
          skip: () => !options.git,
          task: async (ctx, task) => {
            return wrappedExec("git init", (msg) => {
              task.output = msg;
            });
          },
          rendererOptions: { persistentOutput: true }
        },
        {
          title: "Install vscode-dts proposed API types",
          task: async (ctx, task) => {
            return wrappedExec("npx --yes vscode-dts@latest dev -f", (msg) => {
              task.output = msg;
            });
          },
          rendererOptions: { persistentOutput: true }
        },
        {
          title: "Compile typeScript",
          task: async (ctx, task) => {
            return wrappedExec("npm run compile", (msg) => {
              task.output = msg;
            });
          },
          rendererOptions: { persistentOutput: true }
        }
      ]
    );
    return tasks.run();
  }
};
function validatePackageName(name) {
  if (!validate(name).validForNewPackages) {
    throw new Error(
      "The specified agent name must be a valid npm package name.  See https://docs.npmjs.com/package-name-guidelines"
    );
  }
}
__name(validatePackageName, "validatePackageName");
async function validateFolder(folderPath) {
  const emptyFolder = await file_system_exports.folderIsEmpty(folderPath);
  if (!emptyFolder) {
    throw new Error(
      "The target file system path is not empty. A new agent can only be created in an empty folder."
    );
  }
  return Promise.resolve();
}
__name(validateFolder, "validateFolder");
async function wrappedExec(cmd, callback) {
  callback(`Executing: '${cmd}'`);
  return new Promise((resolve, reject) => {
    const childProcess = exec(cmd);
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
var summary = "This package will scaffold a new GitHub Copilot chat agent typescript extension for VS Code usiing TypeScript.";
function mergeParsedArguments(args, passedOptions) {
  let result = { silent: false, git: true };
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
      validate: function(input2) {
        return validator(input2) ? true : "value cannot be empty";
      }
    });
  } else {
    return Promise.resolve(currentValue);
  }
}
__name(validateAndPrompt, "validateAndPrompt");
async function init(initOptions) {
  const program = new Command();
  program.summary(summary).argument("[name]", "new agent name").option("--no-git", "don't initialize a local git repository").action(async (...args) => {
    const mergedOptions = mergeParsedArguments(args);
    if (!mergedOptions.silent && !await confirm({
      message: chalk.blue(`${summary}
Do you want to continue?`),
      default: true
    })) {
      return;
    }
    mergedOptions.name = await validateAndPrompt(
      "What would you like to name your new Copilot chat agent? Don't use spaces or special characters.",
      mergedOptions.name,
      path3.basename(process.cwd())
    );
    mergedOptions.displayName = await validateAndPrompt(
      'Enter a "friendly" name for your agent.',
      mergedOptions.displayName,
      `${mergedOptions.name} chat agent`
    );
    mergedOptions.description = await validateAndPrompt(
      "Enter a brief description of what it does for your users.",
      mergedOptions.description,
      `${mergedOptions.name} chat agent`
    );
    await new_agent_default.run(mergedOptions);
  });
  console.clear();
  await program.parseAsync().then((command) => {
    console.log(chalk.green.bold("\nYour new chat agent project is now ready. Happy coding!\n"));
  }).catch((reason) => {
    console.log(chalk.red.bold("\nInitialization Failed. Check the output above for details."));
  });
}
__name(init, "init");
export {
  init
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2NsaS9pbml0aWFsaXplci50cyIsICIuLi9zcmMvaGVscGVycy9maWxlLXN5c3RlbS50cyIsICIuLi9zcmMvY29tbWFuZHMvbmV3LWFnZW50LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSpcbiAqICBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gKlxuICotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuaW1wb3J0IHsgQ29tbWFuZCB9IGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQgbmV3QWdlbnRDb21tYW5kIGZyb20gJy4uL2NvbW1hbmRzL25ldy1hZ2VudCc7XG5pbXBvcnQgeyBpbnB1dCwgY29uZmlybSB9IGZyb20gJ0BpbnF1aXJlci9wcm9tcHRzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7IEluaXRPcHRpb25zIH0gZnJvbSAnLi4vY29udHJhY3RzJztcblxuY29uc3Qgc3VtbWFyeSA9XG5cdCdUaGlzIHBhY2thZ2Ugd2lsbCBzY2FmZm9sZCBhIG5ldyBHaXRIdWIgQ29waWxvdCBjaGF0IGFnZW50IHR5cGVzY3JpcHQgZXh0ZW5zaW9uIGZvciBWUyBDb2RlIHVzaWluZyBUeXBlU2NyaXB0Lic7XG5cbmZ1bmN0aW9uIG1lcmdlUGFyc2VkQXJndW1lbnRzKGFyZ3M6IGFueVtdLCBwYXNzZWRPcHRpb25zPzogSW5pdE9wdGlvbnMpOiBJbml0T3B0aW9ucyB7XG5cdC8vc2V0IGRlZmF1bHRzXG5cdGxldCByZXN1bHQ6IGFueSA9IHsgc2lsZW50OiBmYWxzZSwgZ2l0OiB0cnVlIH07XG5cdGlmICghYXJncyB8fCBhcmdzLmxlbmd0aCA9PT0gMCkge1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblx0Y29uc3QgY21kID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdIGFzIENvbW1hbmQ7XG5cdHJlc3VsdCA9IHsgLi4ucmVzdWx0LCAuLi5jbWQub3B0cygpIH07XG5cblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBjbWQucmVnaXN0ZXJlZEFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdHJlc3VsdFtjbWQucmVnaXN0ZXJlZEFyZ3VtZW50c1tpXS5uYW1lKCldID0gYXJnc1tpXTtcblx0fVxuXHRpZiAocGFzc2VkT3B0aW9ucykge1xuXHRcdHJlc3VsdCA9IHsgLi4ucGFzc2VkT3B0aW9ucywgLi4ucmVzdWx0IH07XG5cdH1cblx0cmV0dXJuIHJlc3VsdCBhcyBJbml0T3B0aW9ucztcbn1cblxuYXN5bmMgZnVuY3Rpb24gdmFsaWRhdGVBbmRQcm9tcHQocHJvbXB0OiBzdHJpbmcsIGN1cnJlbnRWYWx1ZT86IHN0cmluZywgZGVmYXVsdFZhbHVlPzogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcblx0Y29uc3QgdmFsaWRhdG9yID0gKGlucHV0Pzogc3RyaW5nKTogYm9vbGVhbiA9PiB7XG5cdFx0aWYgKCFpbnB1dCB8fCBpbnB1dC50cmltKCkubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiB0cnVlO1xuXHR9O1xuXG5cdGlmICghdmFsaWRhdG9yKGN1cnJlbnRWYWx1ZSkpIHtcblx0XHRyZXR1cm4gYXdhaXQgaW5wdXQoe1xuXHRcdFx0bWVzc2FnZTogYCR7cHJvbXB0fVxcbiAgPT0+YCxcblx0XHRcdGRlZmF1bHQ6IGRlZmF1bHRWYWx1ZSxcblx0XHRcdHZhbGlkYXRlOiBmdW5jdGlvbiAoaW5wdXQpIHtcblx0XHRcdFx0cmV0dXJuIHZhbGlkYXRvcihpbnB1dCkgPyB0cnVlIDogJ3ZhbHVlIGNhbm5vdCBiZSBlbXB0eSc7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9XG5cdGVsc2Uge1xuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoY3VycmVudFZhbHVlISk7XG5cdH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXQoaW5pdE9wdGlvbnM/OiBJbml0T3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuXHRjb25zdCBwcm9ncmFtID0gbmV3IENvbW1hbmQoKTtcblxuXHRwcm9ncmFtXG5cdFx0LnN1bW1hcnkoc3VtbWFyeSlcblx0XHQuYXJndW1lbnQoJ1tuYW1lXScsICduZXcgYWdlbnQgbmFtZScpXG5cdFx0Lm9wdGlvbignLS1uby1naXQnLCAnZG9uXFwndCBpbml0aWFsaXplIGEgbG9jYWwgZ2l0IHJlcG9zaXRvcnknKVxuXHRcdC5hY3Rpb24oYXN5bmMgKC4uLmFyZ3M6IGFueVtdKSA9PiB7XG5cdFx0XHRjb25zdCBtZXJnZWRPcHRpb25zID0gbWVyZ2VQYXJzZWRBcmd1bWVudHMoYXJncyk7XG5cdFx0XHRpZighbWVyZ2VkT3B0aW9ucy5zaWxlbnQgJiYgIShhd2FpdCBjb25maXJtKHtcblx0XHRcdFx0bWVzc2FnZTogY2hhbGsuYmx1ZShgJHtzdW1tYXJ5fVxcbkRvIHlvdSB3YW50IHRvIGNvbnRpbnVlP2ApLFxuXHRcdFx0XHRkZWZhdWx0OiB0cnVlLFxuXHRcdFx0fSkpKSB7IHJldHVybjsgfVxuXG5cdFx0XHQvL1RPRE86IG1lcmdlIHByb21wdHMgaW50byBMaXN0ciBzbyB0aGF0IHRoZSB0YXNrcyBjYW4gYmUgbW9yZSBpbnRlcmFjdGl2ZVxuXHRcdFx0Ly9maXggdGhpcyB0byBoYW5kbGUgc2lsZW50IG1vZGVcblx0XHRcdG1lcmdlZE9wdGlvbnMubmFtZSA9IGF3YWl0IHZhbGlkYXRlQW5kUHJvbXB0KCdXaGF0IHdvdWxkIHlvdSBsaWtlIHRvIG5hbWUgeW91ciBuZXcgQ29waWxvdCBjaGF0IGFnZW50PyBEb25cXCd0IHVzZSBzcGFjZXMgb3Igc3BlY2lhbCBjaGFyYWN0ZXJzLicsXG5cdFx0XHRcdG1lcmdlZE9wdGlvbnMubmFtZSwgcGF0aC5iYXNlbmFtZShwcm9jZXNzLmN3ZCgpKSk7XG5cblx0XHRcdG1lcmdlZE9wdGlvbnMuZGlzcGxheU5hbWUgPSBhd2FpdCB2YWxpZGF0ZUFuZFByb21wdCgnRW50ZXIgYSBcImZyaWVuZGx5XCIgbmFtZSBmb3IgeW91ciBhZ2VudC4nLFxuXHRcdFx0XHRtZXJnZWRPcHRpb25zLmRpc3BsYXlOYW1lLCBgJHttZXJnZWRPcHRpb25zLm5hbWV9IGNoYXQgYWdlbnRgKTtcblxuXHRcdFx0bWVyZ2VkT3B0aW9ucy5kZXNjcmlwdGlvbiA9IGF3YWl0IHZhbGlkYXRlQW5kUHJvbXB0KCdFbnRlciBhIGJyaWVmIGRlc2NyaXB0aW9uIG9mIHdoYXQgaXQgZG9lcyBmb3IgeW91ciB1c2Vycy4nLFxuXHRcdFx0XHRtZXJnZWRPcHRpb25zLmRlc2NyaXB0aW9uLCBgJHttZXJnZWRPcHRpb25zLm5hbWV9IGNoYXQgYWdlbnRgKTtcblxuXHRcdFx0YXdhaXQgbmV3QWdlbnRDb21tYW5kLnJ1bihtZXJnZWRPcHRpb25zKTtcblx0XHR9KTtcblxuXHRjb25zb2xlLmNsZWFyKCk7XG5cdGF3YWl0IHByb2dyYW0ucGFyc2VBc3luYygpXG5cdFx0LnRoZW4oKGNvbW1hbmQpID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKGNoYWxrLmdyZWVuLmJvbGQoJ1xcbllvdXIgbmV3IGNoYXQgYWdlbnQgcHJvamVjdCBpcyBub3cgcmVhZHkuIEhhcHB5IGNvZGluZyFcXG4nKSk7XG5cdFx0fSlcblx0XHQuY2F0Y2goKHJlYXNvbikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coY2hhbGsucmVkLmJvbGQoJ1xcbkluaXRpYWxpemF0aW9uIEZhaWxlZC4gQ2hlY2sgdGhlIG91dHB1dCBhYm92ZSBmb3IgZGV0YWlscy4nKSk7XG5cdFx0fSk7XG59XG5cblxuIiwgIi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKlxuICogIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLiAqXG4gKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5pbXBvcnQgeyBnbG9iIH0gZnJvbSAnZ2xvYic7XG5pbXBvcnQgcGF0aCwgeyBqb2luIGFzIHBhdGhKb2luLCBwYXJzZSBhcyBwYXJzZVBhdGggfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IG11c3RhY2hlIGZyb20gJ211c3RhY2hlJztcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICdub2RlOnVybCc7XG5pbXBvcnQgeyBFdmVudENhbGxiYWNrIH0gZnJvbSAnLi4vY29udHJhY3RzJztcblxuY29uc3QgdGVtcGxhdGVTdWZmaXggPSAnLm11c3RhY2hlJztcbmNvbnN0IGRlbGV0ZVN1ZmZpeCA9ICcuZGVsZXRlJztcblxuYXN5bmMgZnVuY3Rpb24gZ2V0VGVtcGxhdGVzKGJhc2VQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG5cdHJldHVybiBhd2FpdCBnZXRGaWxlcyhwYXRoSm9pbihiYXNlUGF0aCwgJyoqLyouKicpKTtcbn1cblxubGV0IF9jYWNoZWRQYWNrYWdlSnNvblBhdGg6IHN0cmluZyB8IG51bGwgPSBudWxsOyAvL2RvIG5vdCBhY2Nlc3MgZGlyZWN0bHksIHVzZSBmaW5kUGFja2FnZUpzb25QYXRoXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFja2FnZUpzb25QYXRoKCk6IFByb21pc2U8c3RyaW5nPiB7XG5cdGlmIChfY2FjaGVkUGFja2FnZUpzb25QYXRoKSB7XG5cdFx0cmV0dXJuIF9jYWNoZWRQYWNrYWdlSnNvblBhdGg7XG5cdH1cblxuXHRsZXQgY3VycmVudERpciA9IHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpO1xuXG5cdHdoaWxlIChjdXJyZW50RGlyICE9PSBwYXRoLmRpcm5hbWUoY3VycmVudERpcikpIHsgLy8gU3RvcCB3aGVuIHJlYWNoaW5nIHJvb3QgZGlyZWN0b3J5XG5cdFx0Y29uc3QgcGFja2FnZUpzb25QYXRoID0gcGF0aC5qb2luKGN1cnJlbnREaXIsICdwYWNrYWdlLmpzb24nKTtcblx0XHR0cnkge1xuXHRcdFx0YXdhaXQgZnMucHJvbWlzZXMuYWNjZXNzKHBhY2thZ2VKc29uUGF0aCk7XG5cdFx0XHRfY2FjaGVkUGFja2FnZUpzb25QYXRoID0gcGFja2FnZUpzb25QYXRoO1xuXHRcdFx0cmV0dXJuIGN1cnJlbnREaXI7XG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdGN1cnJlbnREaXIgPSBwYXRoLmRpcm5hbWUoY3VycmVudERpcik7XG5cdFx0fVxuXHR9XG5cblx0dGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBwYWNrYWdlLmpzb24gaW4gJHtjdXJyZW50RGlyfSBvciBhbnkgcGFyZW50IGRpcmVjdG9yeWApO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVuZGVyVGVtcGxhdGVzKFxuXHRmb2xkZXI6IHN0cmluZyxcblx0ZGVzdFJvb3RQYXRoOiBzdHJpbmcsXG5cdGNvbmZpZ0RhdGE6IGFueSxcblx0ZXZlbnRDYWxsYmFjaz86IEV2ZW50Q2FsbGJhY2ssXG4pIHtcblx0Y29uc3QgYmFzZVBhdGggPSBwYXRoSm9pbihhd2FpdCBwYWNrYWdlSnNvblBhdGgoKSwgJ3RlbXBsYXRlcycsIGZvbGRlcik7XG5cdGNvbnN0IGZpbGVzID0gYXdhaXQgZ2V0VGVtcGxhdGVzKGJhc2VQYXRoKTtcblx0aWYgKGZpbGVzLmxlbmd0aCA9PT0gMCkge1xuXHRcdHRocm93IG5ldyBFcnJvcihgTm8gdGVtcGxhdGVzIGZvdW5kIGluICR7YmFzZVBhdGh9YCk7XG5cdH1cblx0Zm9yIChjb25zdCBmaWxlIG9mIE9iamVjdC52YWx1ZXMoZmlsZXMpKSB7XG5cdFx0Y29uc3QgZmlsZVBhdGggPSByZW5kZXIoZmlsZSwgYmFzZVBhdGgsIGRlc3RSb290UGF0aCwgY29uZmlnRGF0YSk7XG5cdFx0aWYgKGV2ZW50Q2FsbGJhY2spIHtcblx0XHRcdGV2ZW50Q2FsbGJhY2soZmlsZVBhdGgpO1xuXHRcdH1cblx0fVxuXHRpZiAoZXZlbnRDYWxsYmFjaykge1xuXHRcdGV2ZW50Q2FsbGJhY2soYCR7ZmlsZXMubGVuZ3RofSBmaWxlcyByZW5kZXJlZCBzdWNjZXNzZnVsbHlgKTtcblx0fVxufVxuXG5hc3luYyBmdW5jdGlvbiBnZXRGaWxlcyhwYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG5cdGNvbnN0IG5vcm1hbGl6ZWRQYXRoID0gcGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdHJldHVybiBnbG9iKG5vcm1hbGl6ZWRQYXRoLCB7IGRvdDogdHJ1ZSwgbm9kaXI6IHRydWUgfSk7XG59XG5cbmZ1bmN0aW9uIGVuY29kaW5nRnJvbUV4dChwYXRoOiBzdHJpbmcpOiAnYmluYXJ5JyB8ICd1dGY4JyB7XG5cdHJldHVybiBwYXRoLmVuZHNXaXRoKCcudHRmJykgPyAnYmluYXJ5JyA6ICd1dGY4Jztcbn1cblxuZnVuY3Rpb24gZ2V0RmlsZUNvbnRlbnQocGF0aDogc3RyaW5nLCBhbGxvd0VtcHR5OiBib29sZWFuID0gdHJ1ZSk6IHN0cmluZyB7XG5cdGlmICghYWxsb3dFbXB0eSB8fCBmcy5leGlzdHNTeW5jKHBhdGgpKSB7XG5cdFx0cmV0dXJuIGZzLnJlYWRGaWxlU3luYyhwYXRoLCBlbmNvZGluZ0Zyb21FeHQocGF0aCkpO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiAnJztcblx0fVxufVxuXG5mdW5jdGlvbiB3cml0ZUZpbGVDb250ZW50KHBhdGg6IHN0cmluZywgY29udGVudDogc3RyaW5nKSB7XG5cdGNvbnN0IGRpciA9IHBhcnNlUGF0aChwYXRoKS5kaXI7XG5cdGZzLm1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXHRmcy53cml0ZUZpbGVTeW5jKHBhdGgsIGNvbnRlbnQsIGVuY29kaW5nRnJvbUV4dChwYXRoKSk7XG59XG5cbmZ1bmN0aW9uIHJlbmRlcihcblx0ZmlsZVBhdGg6IHN0cmluZyxcblx0c291cmNlUm9vdFBhdGg6IHN0cmluZyxcblx0ZGVzdFJvb3RQYXRoOiBzdHJpbmcsXG5cdGNvbmZpZ0RhdGE6IGFueSxcbik6IHN0cmluZyB7XG5cdGxldCBmaWxlRGF0YSA9IGdldEZpbGVDb250ZW50KGZpbGVQYXRoLCBmYWxzZSk7XG5cdGxldCByZWxhdGl2ZVBhdGggPSBmaWxlUGF0aC5yZXBsYWNlKHNvdXJjZVJvb3RQYXRoLCAnJyk7XG5cdGlmIChyZWxhdGl2ZVBhdGguZW5kc1dpdGgodGVtcGxhdGVTdWZmaXgpKSB7XG5cdFx0cmVsYXRpdmVQYXRoID0gcmVsYXRpdmVQYXRoLnJlcGxhY2UodGVtcGxhdGVTdWZmaXgsICcnKTtcblx0XHRmaWxlRGF0YSA9IG11c3RhY2hlLnJlbmRlcihmaWxlRGF0YSwgY29uZmlnRGF0YSk7XG5cdH1cblxuXHRjb25zdCBuZXdGaWxlUGF0aCA9IHBhdGhKb2luKGRlc3RSb290UGF0aCwgcmVsYXRpdmVQYXRoKTtcblx0Y29uc3QgZGlyID0gcGFyc2VQYXRoKG5ld0ZpbGVQYXRoKS5kaXI7XG5cblx0d3JpdGVGaWxlQ29udGVudChuZXdGaWxlUGF0aCwgZmlsZURhdGEpO1xuXHRyZXR1cm4gbmV3RmlsZVBhdGg7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmb2xkZXJJc0VtcHR5KHBhdGg6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuXHRjb25zdCBmaWxlcyA9IGF3YWl0IGdldEZpbGVzKHBhdGhKb2luKHBhdGgsICcqJykpO1xuXHRyZXR1cm4gZmlsZXMubGVuZ3RoID09PSAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNWYWxpZEZvbGRlck5hbWUoZm9sZGVyTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG5cdHJldHVybiAvXlthLXowLTlfLV0rJC9pLnRlc3QoZm9sZGVyTmFtZSk7XG59XG4iLCAiLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qXG4gKiAgQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuICpcbiAqLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cbmltcG9ydCB7IGZzSGVscGVyIH0gZnJvbSAnLi4vaGVscGVycyc7XG5pbXBvcnQgeyBleGVjIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyBJQ2xpQ29tbWFuZCwgRXZlbnRDYWxsYmFjaywgSW5pdE9wdGlvbnMgfSBmcm9tICcuLi9jb250cmFjdHMnO1xuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB2YWxpZGF0ZSBmcm9tICd2YWxpZGF0ZS1ucG0tcGFja2FnZS1uYW1lJztcbmltcG9ydCB7IExpc3RyIH0gZnJvbSAnbGlzdHIyJztcbmltcG9ydCBzdHJpcEFuc2kgZnJvbSAnc3RyaXAtYW5zaSc7XG5cbmNsYXNzIE5ld0FnZW50Q29tbWFuZCBpbXBsZW1lbnRzIElDbGlDb21tYW5kIHtcblx0cHVibGljIGFzeW5jIHJ1bihvcHRpb25zOiBJbml0T3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuXHRcdC8vVE9ETzogYWxsb3cgdGhlIGZvbGRlciB0byBiZSBzcGVjaWZpZWRcblx0XHRjb25zdCBmb2xkZXIgPSAnLi8nO1xuXHRcdGNvbnN0IHByb2plY3RGb2xkZXIgPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgZm9sZGVyKTtcblx0XHRjb25zdCB0YXNrcyA9IG5ldyBMaXN0cihcblx0XHRcdFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRpdGxlOiAnUHJlZmxpZ2h0IGNoZWNrcycsXG5cdFx0XHRcdFx0dGFzazogKCkgPT4ge1xuXHRcdFx0XHRcdFx0cmV0dXJuIG5ldyBMaXN0cihcblx0XHRcdFx0XHRcdFx0W1xuXHRcdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHRcdHRpdGxlOiBgQ2hlY2tpbmcgbmFtZSBcIiR7b3B0aW9ucy5uYW1lfVwiYCxcblx0XHRcdFx0XHRcdFx0XHRcdHRhc2s6ICgpID0+IHZhbGlkYXRlUGFja2FnZU5hbWUob3B0aW9ucy5uYW1lKSxcblx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHRcdHRpdGxlOiBgQ2hlY2tpbmcgZm9sZGVyIFwiJHtwcm9qZWN0Rm9sZGVyfVwiYCxcblx0XHRcdFx0XHRcdFx0XHRcdHRhc2s6IGFzeW5jICgpID0+IGF3YWl0IHZhbGlkYXRlRm9sZGVyKHByb2plY3RGb2xkZXIpXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC5jYXRjaCgoZXJyb3IpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRgVGhlIHNwZWNpZmllZCBmb2xkZXIgaXMgbm90IGVtcHR5LiAgQSBuZXcgYWdlbnQgY2FuIG9ubHkgYmUgY3JlYXRlZCBpbiBhbiBlbXB0eSBmb2xkZXIuYCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHQpLFxuXHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdF0sXG5cdFx0XHRcdFx0XHRcdHsgY29uY3VycmVudDogZmFsc2UgfSxcblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRpdGxlOiAnR2VuZXJhdGUgcGFja2FnZSBmaWxlcycsXG5cdFx0XHRcdFx0dGFzazogYXN5bmMgKGN0eCwgdGFzayk6IFByb21pc2U8dm9pZD4gPT4ge1xuXHRcdFx0XHRcdFx0Y29uc3Qgb25EYXRhID0gKGRhdGE6IHN0cmluZykgPT4ge1xuXHRcdFx0XHRcdFx0XHR0YXNrLm91dHB1dCA9IGRhdGE7XG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZzSGVscGVyLnJlbmRlclRlbXBsYXRlcyhcblx0XHRcdFx0XHRcdFx0J2FnZW50LW5ldycsXG5cdFx0XHRcdFx0XHRcdHByb2plY3RGb2xkZXIsXG5cdFx0XHRcdFx0XHRcdG9wdGlvbnMsXG5cdFx0XHRcdFx0XHRcdChtc2c6IHN0cmluZykgPT4geyB0YXNrLm91dHB1dCA9IG1zZzsgfSxcblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRyZW5kZXJlck9wdGlvbnM6IHsgcGVyc2lzdGVudE91dHB1dDogdHJ1ZSB9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aXRsZTogJ0luc3RhbGwgbnBtIHBhY2thZ2VzJyxcblx0XHRcdFx0XHR0YXNrOiBhc3luYyAoY3R4LCB0YXNrKSA9PiB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gd3JhcHBlZEV4ZWMoJ25wbSBpbnN0YWxsIC0tdmVyYm9zZScsIChtc2c6IHN0cmluZykgPT4geyB0YXNrLm91dHB1dCA9IG1zZzsgfSk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRyZW5kZXJlck9wdGlvbnM6IHsgcGVyc2lzdGVudE91dHB1dDogdHJ1ZSB9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aXRsZTogJ0luaXRpYWxpemUgR2l0Jyxcblx0XHRcdFx0XHRza2lwOiAoKSA9PiAhb3B0aW9ucy5naXQsXG5cdFx0XHRcdFx0dGFzazogYXN5bmMgKGN0eCwgdGFzaykgPT4ge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHdyYXBwZWRFeGVjKCdnaXQgaW5pdCcsIChtc2c6IHN0cmluZykgPT4geyB0YXNrLm91dHB1dCA9IG1zZzsgfSk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRyZW5kZXJlck9wdGlvbnM6IHsgcGVyc2lzdGVudE91dHB1dDogdHJ1ZSB9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aXRsZTogJ0luc3RhbGwgdnNjb2RlLWR0cyBwcm9wb3NlZCBBUEkgdHlwZXMnLFxuXHRcdFx0XHRcdHRhc2s6IGFzeW5jIChjdHgsIHRhc2spID0+IHtcblx0XHRcdFx0XHRcdHJldHVybiB3cmFwcGVkRXhlYygnbnB4IC0teWVzIHZzY29kZS1kdHNAbGF0ZXN0IGRldiAtZicsIChtc2c6IHN0cmluZykgPT4geyB0YXNrLm91dHB1dCA9IG1zZzsgfSk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRyZW5kZXJlck9wdGlvbnM6IHsgcGVyc2lzdGVudE91dHB1dDogdHJ1ZSB9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aXRsZTogJ0NvbXBpbGUgdHlwZVNjcmlwdCcsXG5cdFx0XHRcdFx0dGFzazogYXN5bmMgKGN0eCwgdGFzaykgPT4ge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHdyYXBwZWRFeGVjKCducG0gcnVuIGNvbXBpbGUnLCAobXNnOiBzdHJpbmcpID0+IHsgdGFzay5vdXRwdXQgPSBtc2c7IH0pO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0cmVuZGVyZXJPcHRpb25zOiB7IHBlcnNpc3RlbnRPdXRwdXQ6IHRydWUgfVxuXHRcdFx0XHR9XG5cdFx0XHRdLFxuXHRcdCk7XG5cdFx0cmV0dXJuIHRhc2tzLnJ1bigpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlUGFja2FnZU5hbWUobmFtZTogc3RyaW5nKSB7XG5cdGlmICghdmFsaWRhdGUobmFtZSkudmFsaWRGb3JOZXdQYWNrYWdlcykge1xuXHRcdHRocm93IG5ldyBFcnJvcihcblx0XHRcdCdUaGUgc3BlY2lmaWVkIGFnZW50IG5hbWUgbXVzdCBiZSBhIHZhbGlkIG5wbSBwYWNrYWdlIG5hbWUuICBTZWUgaHR0cHM6Ly9kb2NzLm5wbWpzLmNvbS9wYWNrYWdlLW5hbWUtZ3VpZGVsaW5lcycsXG5cdFx0KTtcblx0fVxufVxuXG5hc3luYyBmdW5jdGlvbiB2YWxpZGF0ZUZvbGRlcihmb2xkZXJQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcblx0Y29uc3QgZW1wdHlGb2xkZXIgPSBhd2FpdCBmc0hlbHBlci5mb2xkZXJJc0VtcHR5KGZvbGRlclBhdGgpO1xuXHRpZiAoIWVtcHR5Rm9sZGVyKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKFxuXHRcdFx0J1RoZSB0YXJnZXQgZmlsZSBzeXN0ZW0gcGF0aCBpcyBub3QgZW1wdHkuIEEgbmV3IGFnZW50IGNhbiBvbmx5IGJlIGNyZWF0ZWQgaW4gYW4gZW1wdHkgZm9sZGVyLicsXG5cdFx0KTtcblx0fVxuXHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHdyYXBwZWRFeGVjKGNtZDogc3RyaW5nLCBjYWxsYmFjazogRXZlbnRDYWxsYmFjayk6IFByb21pc2U8dm9pZD4ge1xuXHRjYWxsYmFjayhgRXhlY3V0aW5nOiAnJHtjbWR9J2ApO1xuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdGNvbnN0IGNoaWxkUHJvY2VzcyA9IGV4ZWMoY21kKTtcblx0XHRjaGlsZFByb2Nlc3Muc3Rkb3V0Py5vbignZGF0YScsIChkYXRhKSA9PiB7XG5cdFx0XHRjb25zdCBsaW5lcyA9IHN0cmlwQW5zaShkYXRhLnRvU3RyaW5nKCkpLnNwbGl0KC9cXHI/XFxuLyk7XG5cdFx0XHRsaW5lcy5mb3JFYWNoKChsaW5lKSA9PiB7XG5cdFx0XHRcdGlmIChsaW5lLnRyaW0oKSAhPT0gJycpIHtcblx0XHRcdFx0XHRjYWxsYmFjayhsaW5lLnRyaW0oKSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdGNoaWxkUHJvY2Vzcy5vbihcImVycm9yXCIsIChlcnJvcikgPT4ge1xuXHRcdFx0cmVqZWN0KGVycm9yKTtcblx0XHR9KTtcblx0XHRjaGlsZFByb2Nlc3Mub24oXCJjbG9zZVwiLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjayhcIkNvbXBsZXRlZCBzdWNjZXNzZnVsbHlcIik7XG5cdFx0XHRyZXNvbHZlKCk7XG5cdFx0fSk7XG5cdH0pO1xufVxuXG5leHBvcnQgZGVmYXVs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