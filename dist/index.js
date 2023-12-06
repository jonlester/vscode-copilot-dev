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
  let result = { silent: false, git: true, publisher: "undefined_publisher" };
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
      `Copilot agent: @${mergedOptions.name}`
    );
    mergedOptions.description = await validateAndPrompt(
      "Enter a brief description of what it does for your users.",
      mergedOptions.description,
      `${mergedOptions.displayName} - A GitHub Copilot chat agent for VS Code`
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2NsaS9pbml0aWFsaXplci50cyIsICIuLi9zcmMvaGVscGVycy9maWxlLXN5c3RlbS50cyIsICIuLi9zcmMvY29tbWFuZHMvbmV3LWFnZW50LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSpcclxuICogIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLiAqXHJcbiAqLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuaW1wb3J0IHsgQ29tbWFuZCB9IGZyb20gJ2NvbW1hbmRlcic7XHJcbmltcG9ydCBuZXdBZ2VudENvbW1hbmQgZnJvbSAnLi4vY29tbWFuZHMvbmV3LWFnZW50JztcclxuaW1wb3J0IHsgaW5wdXQsIGNvbmZpcm0gfSBmcm9tICdAaW5xdWlyZXIvcHJvbXB0cyc7XHJcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xyXG5pbXBvcnQgeyBJbml0T3B0aW9ucyB9IGZyb20gJy4uL2NvbnRyYWN0cyc7XHJcblxyXG5jb25zdCBzdW1tYXJ5ID1cclxuXHQnVGhpcyBwYWNrYWdlIHdpbGwgc2NhZmZvbGQgYSBuZXcgR2l0SHViIENvcGlsb3QgY2hhdCBhZ2VudCB0eXBlc2NyaXB0IGV4dGVuc2lvbiBmb3IgVlMgQ29kZSB1c2lpbmcgVHlwZVNjcmlwdC4nO1xyXG5cclxuZnVuY3Rpb24gbWVyZ2VQYXJzZWRBcmd1bWVudHMoYXJnczogYW55W10sIHBhc3NlZE9wdGlvbnM/OiBJbml0T3B0aW9ucyk6IEluaXRPcHRpb25zIHtcclxuXHQvL3NldCBkZWZhdWx0c1xyXG5cdGxldCByZXN1bHQ6IGFueSA9IHsgc2lsZW50OiBmYWxzZSwgZ2l0OiB0cnVlLCBwdWJsaXNoZXI6ICd1bmRlZmluZWRfcHVibGlzaGVyJyB9O1xyXG5cdGlmICghYXJncyB8fCBhcmdzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0cmV0dXJuIHJlc3VsdDtcclxuXHR9XHJcblx0Y29uc3QgY21kID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdIGFzIENvbW1hbmQ7XHJcblx0cmVzdWx0ID0geyAuLi5yZXN1bHQsIC4uLmNtZC5vcHRzKCkgfTtcclxuXHJcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBjbWQucmVnaXN0ZXJlZEFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0cmVzdWx0W2NtZC5yZWdpc3RlcmVkQXJndW1lbnRzW2ldLm5hbWUoKV0gPSBhcmdzW2ldO1xyXG5cdH1cclxuXHRpZiAocGFzc2VkT3B0aW9ucykge1xyXG5cdFx0cmVzdWx0ID0geyAuLi5wYXNzZWRPcHRpb25zLCAuLi5yZXN1bHQgfTtcclxuXHR9XHJcblx0cmV0dXJuIHJlc3VsdCBhcyBJbml0T3B0aW9ucztcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gdmFsaWRhdGVBbmRQcm9tcHQocHJvbXB0OiBzdHJpbmcsIGN1cnJlbnRWYWx1ZT86IHN0cmluZywgZGVmYXVsdFZhbHVlPzogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuXHRjb25zdCB2YWxpZGF0b3IgPSAoaW5wdXQ/OiBzdHJpbmcpOiBib29sZWFuID0+IHtcclxuXHRcdGlmICghaW5wdXQgfHwgaW5wdXQudHJpbSgpLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9O1xyXG5cclxuXHRpZiAoIXZhbGlkYXRvcihjdXJyZW50VmFsdWUpKSB7XHJcblx0XHRyZXR1cm4gYXdhaXQgaW5wdXQoe1xyXG5cdFx0XHRtZXNzYWdlOiBgJHtwcm9tcHR9XFxuICA9PT5gLFxyXG5cdFx0XHRkZWZhdWx0OiBkZWZhdWx0VmFsdWUsXHJcblx0XHRcdHZhbGlkYXRlOiBmdW5jdGlvbiAoaW5wdXQpIHtcclxuXHRcdFx0XHRyZXR1cm4gdmFsaWRhdG9yKGlucHV0KSA/IHRydWUgOiAndmFsdWUgY2Fubm90IGJlIGVtcHR5JztcclxuXHRcdFx0fSxcclxuXHRcdH0pO1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoY3VycmVudFZhbHVlISk7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5pdChpbml0T3B0aW9ucz86IEluaXRPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0Y29uc3QgcHJvZ3JhbSA9IG5ldyBDb21tYW5kKCk7XHJcblxyXG5cdHByb2dyYW1cclxuXHRcdC5zdW1tYXJ5KHN1bW1hcnkpXHJcblx0XHQuYXJndW1lbnQoJ1tuYW1lXScsICduZXcgYWdlbnQgbmFtZScpXHJcblx0XHQub3B0aW9uKCctLW5vLWdpdCcsICdkb25cXCd0IGluaXRpYWxpemUgYSBsb2NhbCBnaXQgcmVwb3NpdG9yeScpXHJcblx0XHQuYWN0aW9uKGFzeW5jICguLi5hcmdzOiBhbnlbXSkgPT4ge1xyXG5cdFx0XHRjb25zdCBtZXJnZWRPcHRpb25zID0gbWVyZ2VQYXJzZWRBcmd1bWVudHMoYXJncyk7XHJcblx0XHRcdGlmKCFtZXJnZWRPcHRpb25zLnNpbGVudCAmJiAhKGF3YWl0IGNvbmZpcm0oe1xyXG5cdFx0XHRcdG1lc3NhZ2U6IGNoYWxrLmJsdWUoYCR7c3VtbWFyeX1cXG5EbyB5b3Ugd2FudCB0byBjb250aW51ZT9gKSxcclxuXHRcdFx0XHRkZWZhdWx0OiB0cnVlLFxyXG5cdFx0XHR9KSkpIHsgcmV0dXJuOyB9XHJcblxyXG5cdFx0XHQvL1RPRE86IG1lcmdlIHByb21wdHMgaW50byBMaXN0ciBzbyB0aGF0IHRoZSB0YXNrcyBjYW4gYmUgbW9yZSBpbnRlcmFjdGl2ZVxyXG5cdFx0XHQvL2ZpeCB0aGlzIHRvIGhhbmRsZSBzaWxlbnQgbW9kZVxyXG5cdFx0XHRtZXJnZWRPcHRpb25zLm5hbWUgPSBhd2FpdCB2YWxpZGF0ZUFuZFByb21wdCgnV2hhdCB3b3VsZCB5b3UgbGlrZSB0byBuYW1lIHlvdXIgbmV3IENvcGlsb3QgY2hhdCBhZ2VudD8gRG9uXFwndCB1c2Ugc3BhY2VzIG9yIHNwZWNpYWwgY2hhcmFjdGVycy4nLFxyXG5cdFx0XHRcdG1lcmdlZE9wdGlvbnMubmFtZSwgcGF0aC5iYXNlbmFtZShwcm9jZXNzLmN3ZCgpKSk7XHJcblxyXG5cdFx0XHRtZXJnZWRPcHRpb25zLmRpc3BsYXlOYW1lID0gYXdhaXQgdmFsaWRhdGVBbmRQcm9tcHQoJ0VudGVyIGEgXCJmcmllbmRseVwiIG5hbWUgZm9yIHlvdXIgYWdlbnQuJyxcclxuXHRcdFx0XHRtZXJnZWRPcHRpb25zLmRpc3BsYXlOYW1lLCBgQ29waWxvdCBhZ2VudDogQCR7bWVyZ2VkT3B0aW9ucy5uYW1lfWApO1xyXG5cclxuXHRcdFx0bWVyZ2VkT3B0aW9ucy5kZXNjcmlwdGlvbiA9IGF3YWl0IHZhbGlkYXRlQW5kUHJvbXB0KCdFbnRlciBhIGJyaWVmIGRlc2NyaXB0aW9uIG9mIHdoYXQgaXQgZG9lcyBmb3IgeW91ciB1c2Vycy4nLFxyXG5cdFx0XHRcdG1lcmdlZE9wdGlvbnMuZGVzY3JpcHRpb24sIGAke21lcmdlZE9wdGlvbnMuZGlzcGxheU5hbWV9IC0gQSBHaXRIdWIgQ29waWxvdCBjaGF0IGFnZW50IGZvciBWUyBDb2RlYCk7XHJcblxyXG5cdFx0XHRhd2FpdCBuZXdBZ2VudENvbW1hbmQucnVuKG1lcmdlZE9wdGlvbnMpO1xyXG5cdFx0fSk7XHJcblxyXG5cdGNvbnNvbGUuY2xlYXIoKTtcclxuXHRhd2FpdCBwcm9ncmFtLnBhcnNlQXN5bmMoKVxyXG5cdFx0LnRoZW4oKGNvbW1hbmQpID0+IHtcclxuXHRcdFx0Y29uc29sZS5sb2coY2hhbGsuZ3JlZW4uYm9sZCgnXFxuWW91ciBuZXcgY2hhdCBhZ2VudCBwcm9qZWN0IGlzIG5vdyByZWFkeS4gSGFwcHkgY29kaW5nIVxcbicpKTtcclxuXHRcdH0pXHJcblx0XHQuY2F0Y2goKHJlYXNvbikgPT4ge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhjaGFsay5yZWQuYm9sZCgnXFxuSW5pdGlhbGl6YXRpb24gRmFpbGVkLiBDaGVjayB0aGUgb3V0cHV0IGFib3ZlIGZvciBkZXRhaWxzLicpKTtcclxuXHRcdH0pO1xyXG59XHJcblxyXG5cclxuIiwgIi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKlxyXG4gKiAgQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuICpcclxuICotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5pbXBvcnQgeyBnbG9iIH0gZnJvbSAnZ2xvYic7XHJcbmltcG9ydCBwYXRoLCB7IGpvaW4gYXMgcGF0aEpvaW4sIHBhcnNlIGFzIHBhcnNlUGF0aCB9IGZyb20gJ25vZGU6cGF0aCc7XHJcbmltcG9ydCBmcyBmcm9tICdub2RlOmZzJztcclxuaW1wb3J0IG11c3RhY2hlIGZyb20gJ211c3RhY2hlJztcclxuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ25vZGU6dXJsJztcclxuaW1wb3J0IHsgRXZlbnRDYWxsYmFjayB9IGZyb20gJy4uL2NvbnRyYWN0cyc7XHJcblxyXG5jb25zdCB0ZW1wbGF0ZVN1ZmZpeCA9ICcubXVzdGFjaGUnO1xyXG5jb25zdCBkZWxldGVTdWZmaXggPSAnLmRlbGV0ZSc7XHJcblxyXG5hc3luYyBmdW5jdGlvbiBnZXRUZW1wbGF0ZXMoYmFzZVBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nW10+IHtcclxuXHRyZXR1cm4gYXdhaXQgZ2V0RmlsZXMocGF0aEpvaW4oYmFzZVBhdGgsICcqKi8qLionKSk7XHJcbn1cclxuXHJcbmxldCBfY2FjaGVkUGFja2FnZUpzb25QYXRoOiBzdHJpbmcgfCBudWxsID0gbnVsbDsgLy9kbyBub3QgYWNjZXNzIGRpcmVjdGx5LCB1c2UgZmluZFBhY2thZ2VKc29uUGF0aFxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFja2FnZUpzb25QYXRoKCk6IFByb21pc2U8c3RyaW5nPiB7XHJcblx0aWYgKF9jYWNoZWRQYWNrYWdlSnNvblBhdGgpIHtcclxuXHRcdHJldHVybiBfY2FjaGVkUGFja2FnZUpzb25QYXRoO1xyXG5cdH1cclxuXHJcblx0bGV0IGN1cnJlbnREaXIgPSBwYXRoLmRpcm5hbWUoZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpKTtcclxuXHJcblx0d2hpbGUgKGN1cnJlbnREaXIgIT09IHBhdGguZGlybmFtZShjdXJyZW50RGlyKSkgeyAvLyBTdG9wIHdoZW4gcmVhY2hpbmcgcm9vdCBkaXJlY3RvcnlcclxuXHRcdGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHBhdGguam9pbihjdXJyZW50RGlyLCAncGFja2FnZS5qc29uJyk7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRhd2FpdCBmcy5wcm9taXNlcy5hY2Nlc3MocGFja2FnZUpzb25QYXRoKTtcclxuXHRcdFx0X2NhY2hlZFBhY2thZ2VKc29uUGF0aCA9IHBhY2thZ2VKc29uUGF0aDtcclxuXHRcdFx0cmV0dXJuIGN1cnJlbnREaXI7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjdXJyZW50RGlyID0gcGF0aC5kaXJuYW1lKGN1cnJlbnREaXIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0dGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBwYWNrYWdlLmpzb24gaW4gJHtjdXJyZW50RGlyfSBvciBhbnkgcGFyZW50IGRpcmVjdG9yeWApO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVuZGVyVGVtcGxhdGVzKFxyXG5cdGZvbGRlcjogc3RyaW5nLFxyXG5cdGRlc3RSb290UGF0aDogc3RyaW5nLFxyXG5cdGNvbmZpZ0RhdGE6IGFueSxcclxuXHRldmVudENhbGxiYWNrPzogRXZlbnRDYWxsYmFjayxcclxuKSB7XHJcblx0Y29uc3QgYmFzZVBhdGggPSBwYXRoSm9pbihhd2FpdCBwYWNrYWdlSnNvblBhdGgoKSwgJ3RlbXBsYXRlcycsIGZvbGRlcik7XHJcblx0Y29uc3QgZmlsZXMgPSBhd2FpdCBnZXRUZW1wbGF0ZXMoYmFzZVBhdGgpO1xyXG5cdGlmIChmaWxlcy5sZW5ndGggPT09IDApIHtcclxuXHRcdHRocm93IG5ldyBFcnJvcihgTm8gdGVtcGxhdGVzIGZvdW5kIGluICR7YmFzZVBhdGh9YCk7XHJcblx0fVxyXG5cdGZvciAoY29uc3QgZmlsZSBvZiBPYmplY3QudmFsdWVzKGZpbGVzKSkge1xyXG5cdFx0Y29uc3QgZmlsZVBhdGggPSByZW5kZXIoZmlsZSwgYmFzZVBhdGgsIGRlc3RSb290UGF0aCwgY29uZmlnRGF0YSk7XHJcblx0XHRpZiAoZXZlbnRDYWxsYmFjaykge1xyXG5cdFx0XHRldmVudENhbGxiYWNrKGZpbGVQYXRoKTtcclxuXHRcdH1cclxuXHR9XHJcblx0aWYgKGV2ZW50Q2FsbGJhY2spIHtcclxuXHRcdGV2ZW50Q2FsbGJhY2soYCR7ZmlsZXMubGVuZ3RofSBmaWxlcyByZW5kZXJlZCBzdWNjZXNzZnVsbHlgKTtcclxuXHR9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGdldEZpbGVzKHBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nW10+IHtcclxuXHRjb25zdCBub3JtYWxpemVkUGF0aCA9IHBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xyXG5cdHJldHVybiBnbG9iKG5vcm1hbGl6ZWRQYXRoLCB7IGRvdDogdHJ1ZSwgbm9kaXI6IHRydWUgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVuY29kaW5nRnJvbUV4dChwYXRoOiBzdHJpbmcpOiAnYmluYXJ5JyB8ICd1dGY4JyB7XHJcblx0cmV0dXJuIHBhdGguZW5kc1dpdGgoJy50dGYnKSA/ICdiaW5hcnknIDogJ3V0ZjgnO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRGaWxlQ29udGVudChwYXRoOiBzdHJpbmcsIGFsbG93RW1wdHk6IGJvb2xlYW4gPSB0cnVlKTogc3RyaW5nIHtcclxuXHRpZiAoIWFsbG93RW1wdHkgfHwgZnMuZXhpc3RzU3luYyhwYXRoKSkge1xyXG5cdFx0cmV0dXJuIGZzLnJlYWRGaWxlU3luYyhwYXRoLCBlbmNvZGluZ0Zyb21FeHQocGF0aCkpO1xyXG5cdH0gZWxzZSB7XHJcblx0XHRyZXR1cm4gJyc7XHJcblx0fVxyXG59XHJcblxyXG5mdW5jdGlvbiB3cml0ZUZpbGVDb250ZW50KHBhdGg6IHN0cmluZywgY29udGVudDogc3RyaW5nKSB7XHJcblx0Y29uc3QgZGlyID0gcGFyc2VQYXRoKHBhdGgpLmRpcjtcclxuXHRmcy5ta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcclxuXHRmcy53cml0ZUZpbGVTeW5jKHBhdGgsIGNvbnRlbnQsIGVuY29kaW5nRnJvbUV4dChwYXRoKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlcihcclxuXHRmaWxlUGF0aDogc3RyaW5nLFxyXG5cdHNvdXJjZVJvb3RQYXRoOiBzdHJpbmcsXHJcblx0ZGVzdFJvb3RQYXRoOiBzdHJpbmcsXHJcblx0Y29uZmlnRGF0YTogYW55LFxyXG4pOiBzdHJpbmcge1xyXG5cdGxldCBmaWxlRGF0YSA9IGdldEZpbGVDb250ZW50KGZpbGVQYXRoLCBmYWxzZSk7XHJcblx0bGV0IHJlbGF0aXZlUGF0aCA9IGZpbGVQYXRoLnJlcGxhY2Uoc291cmNlUm9vdFBhdGgsICcnKTtcclxuXHRpZiAocmVsYXRpdmVQYXRoLmVuZHNXaXRoKHRlbXBsYXRlU3VmZml4KSkge1xyXG5cdFx0cmVsYXRpdmVQYXRoID0gcmVsYXRpdmVQYXRoLnJlcGxhY2UodGVtcGxhdGVTdWZmaXgsICcnKTtcclxuXHRcdGZpbGVEYXRhID0gbXVzdGFjaGUucmVuZGVyKGZpbGVEYXRhLCBjb25maWdEYXRhKTtcclxuXHR9XHJcblxyXG5cdGNvbnN0IG5ld0ZpbGVQYXRoID0gcGF0aEpvaW4oZGVzdFJvb3RQYXRoLCByZWxhdGl2ZVBhdGgpO1xyXG5cdGNvbnN0IGRpciA9IHBhcnNlUGF0aChuZXdGaWxlUGF0aCkuZGlyO1xyXG5cclxuXHR3cml0ZUZpbGVDb250ZW50KG5ld0ZpbGVQYXRoLCBmaWxlRGF0YSk7XHJcblx0cmV0dXJuIG5ld0ZpbGVQYXRoO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZm9sZGVySXNFbXB0eShwYXRoOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuXHRjb25zdCBmaWxlcyA9IGF3YWl0IGdldEZpbGVzKHBhdGhKb2luKHBhdGgsICcqJykpO1xyXG5cdHJldHVybiBmaWxlcy5sZW5ndGggPT09IDA7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBpc1ZhbGlkRm9sZGVyTmFtZShmb2xkZXJOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRyZXR1cm4gL15bYS16MC05Xy1dKyQvaS50ZXN0KGZvbGRlck5hbWUpO1xyXG59XHJcbiIsICIvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSpcclxuICogIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLiAqXHJcbiAqLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuaW1wb3J0IHsgZnNIZWxwZXIgfSBmcm9tICcuLi9oZWxwZXJzJztcclxuaW1wb3J0IHsgZXhlYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xyXG5pbXBvcnQgeyBJQ2xpQ29tbWFuZCwgRXZlbnRDYWxsYmFjaywgSW5pdE9wdGlvbnMgfSBmcm9tICcuLi9jb250cmFjdHMnO1xyXG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xyXG5pbXBvcnQgdmFsaWRhdGUgZnJvbSAndmFsaWRhdGUtbnBtLXBhY2thZ2UtbmFtZSc7XHJcbmltcG9ydCB7IExpc3RyIH0gZnJvbSAnbGlzdHIyJztcclxuaW1wb3J0IHN0cmlwQW5zaSBmcm9tICdzdHJpcC1hbnNpJztcclxuXHJcbmNsYXNzIE5ld0FnZW50Q29tbWFuZCBpbXBsZW1lbnRzIElDbGlDb21tYW5kIHtcclxuXHRwdWJsaWMgYXN5bmMgcnVuKG9wdGlvbnM6IEluaXRPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHQvL1RPRE86IGFsbG93IHRoZSBmb2xkZXIgdG8gYmUgc3BlY2lmaWVkXHJcblx0XHRjb25zdCBmb2xkZXIgPSAnLi8nO1xyXG5cdFx0Y29uc3QgcHJvamVjdEZvbGRlciA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCBmb2xkZXIpO1xyXG5cdFx0Y29uc3QgdGFza3MgPSBuZXcgTGlzdHIoXHJcblx0XHRcdFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0aXRsZTogJ1ByZWZsaWdodCBjaGVja3MnLFxyXG5cdFx0XHRcdFx0dGFzazogKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gbmV3IExpc3RyKFxyXG5cdFx0XHRcdFx0XHRcdFtcclxuXHRcdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGl0bGU6IGBDaGVja2luZyBuYW1lIFwiJHtvcHRpb25zLm5hbWV9XCJgLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0YXNrOiAoKSA9PiB2YWxpZGF0ZVBhY2thZ2VOYW1lKG9wdGlvbnMubmFtZSksXHJcblx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aXRsZTogYENoZWNraW5nIGZvbGRlciBcIiR7cHJvamVjdEZvbGRlcn1cImAsXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRhc2s6IGFzeW5jICgpID0+IGF3YWl0IHZhbGlkYXRlRm9sZGVyKHByb2plY3RGb2xkZXIpXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0LmNhdGNoKChlcnJvcikgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRgVGhlIHNwZWNpZmllZCBmb2xkZXIgaXMgbm90IGVtcHR5LiAgQSBuZXcgYWdlbnQgY2FuIG9ubHkgYmUgY3JlYXRlZCBpbiBhbiBlbXB0eSBmb2xkZXIuYCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdFx0XHRcdHsgY29uY3VycmVudDogZmFsc2UgfSxcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0aXRsZTogJ0dlbmVyYXRlIHBhY2thZ2UgZmlsZXMnLFxyXG5cdFx0XHRcdFx0dGFzazogYXN5bmMgKGN0eCwgdGFzayk6IFByb21pc2U8dm9pZD4gPT4ge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBvbkRhdGEgPSAoZGF0YTogc3RyaW5nKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0dGFzay5vdXRwdXQgPSBkYXRhO1xyXG5cdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gZnNIZWxwZXIucmVuZGVyVGVtcGxhdGVzKFxyXG5cdFx0XHRcdFx0XHRcdCdhZ2VudC1uZXcnLFxyXG5cdFx0XHRcdFx0XHRcdHByb2plY3RGb2xkZXIsXHJcblx0XHRcdFx0XHRcdFx0b3B0aW9ucyxcclxuXHRcdFx0XHRcdFx0XHQobXNnOiBzdHJpbmcpID0+IHsgdGFzay5vdXRwdXQgPSBtc2c7IH0sXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0cmVuZGVyZXJPcHRpb25zOiB7IHBlcnNpc3RlbnRPdXRwdXQ6IHRydWUgfVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dGl0bGU6ICdJbnN0YWxsIG5wbSBwYWNrYWdlcycsXHJcblx0XHRcdFx0XHR0YXNrOiBhc3luYyAoY3R4LCB0YXNrKSA9PiB7XHJcblx0XHRcdFx0XHRcdHJldHVybiB3cmFwcGVkRXhlYygnbnBtIGluc3RhbGwgLS12ZXJib3NlJywgKG1zZzogc3RyaW5nKSA9PiB7IHRhc2sub3V0cHV0ID0gbXNnOyB9KTtcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRyZW5kZXJlck9wdGlvbnM6IHsgcGVyc2lzdGVudE91dHB1dDogdHJ1ZSB9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0aXRsZTogJ0luaXRpYWxpemUgR2l0JyxcclxuXHRcdFx0XHRcdHNraXA6ICgpID0+ICFvcHRpb25zLmdpdCxcclxuXHRcdFx0XHRcdHRhc2s6IGFzeW5jIChjdHgsIHRhc2spID0+IHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHdyYXBwZWRFeGVjKCdnaXQgaW5pdCcsIChtc2c6IHN0cmluZykgPT4geyB0YXNrLm91dHB1dCA9IG1zZzsgfSk7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0cmVuZGVyZXJPcHRpb25zOiB7IHBlcnNpc3RlbnRPdXRwdXQ6IHRydWUgfVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dGl0bGU6ICdJbnN0YWxsIHZzY29kZS1kdHMgcHJvcG9zZWQgQVBJIHR5cGVzJyxcclxuXHRcdFx0XHRcdHRhc2s6IGFzeW5jIChjdHgsIHRhc2spID0+IHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHdyYXBwZWRFeGVjKCducHggLS15ZXMgdnNjb2RlLWR0c0BsYXRlc3QgZGV2IC1mJywgKG1zZzogc3RyaW5nKSA9PiB7IHRhc2sub3V0cHV0ID0gbXNnOyB9KTtcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRyZW5kZXJlck9wdGlvbnM6IHsgcGVyc2lzdGVudE91dHB1dDogdHJ1ZSB9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0aXRsZTogJ0NvbXBpbGUgdHlwZVNjcmlwdCcsXHJcblx0XHRcdFx0XHR0YXNrOiBhc3luYyAoY3R4LCB0YXNrKSA9PiB7XHJcblx0XHRcdFx0XHRcdHJldHVybiB3cmFwcGVkRXhlYygnbnBtIHJ1biBjb21waWxlJywgKG1zZzogc3RyaW5nKSA9PiB7IHRhc2sub3V0cHV0ID0gbXNnOyB9KTtcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRyZW5kZXJlck9wdGlvbnM6IHsgcGVyc2lzdGVudE91dHB1dDogdHJ1ZSB9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRdLFxyXG5cdFx0KTtcclxuXHRcdHJldHVybiB0YXNrcy5ydW4oKTtcclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHZhbGlkYXRlUGFja2FnZU5hbWUobmFtZTogc3RyaW5nKSB7XHJcblx0aWYgKCF2YWxpZGF0ZShuYW1lKS52YWxpZEZvck5ld1BhY2thZ2VzKSB7XHJcblx0XHR0aHJvdyBuZXcgRXJyb3IoXHJcblx0XHRcdCdUaGUgc3BlY2lmaWVkIGFnZW50IG5hbWUgbXVzdCBiZSBhIHZhbGlkIG5wbSBwYWNrYWdlIG5hbWUuICBTZWUgaHR0cHM6Ly9kb2NzLm5wbWpzLmNvbS9wYWNrYWdlLW5hbWUtZ3VpZGVsaW5lcycsXHJcblx0XHQpO1xyXG5cdH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gdmFsaWRhdGVGb2xkZXIoZm9sZGVyUGF0aDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0Y29uc3QgZW1wdHlGb2xkZXIgPSBhd2FpdCBmc0hlbHBlci5mb2xkZXJJc0VtcHR5KGZvbGRlclBhdGgpO1xyXG5cdGlmICghZW1wdHlGb2xkZXIpIHtcclxuXHRcdHRocm93IG5ldyBFcnJvcihcclxuXHRcdFx0J1RoZSB0YXJnZXQgZmlsZSBzeXN0ZW0gcGF0aCBpcyBub3QgZW1wdHkuIEEgbmV3IGFnZW50IGNhbiBvbmx5IGJlIGNyZWF0ZWQgaW4gYW4gZW1wdHkgZm9sZGVyLicsXHJcblx0XHQpO1xyXG5cdH1cclxuXHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHdyYXBwZWRFeGVjKGNtZDogc3RyaW5nLCBjYWxsYmFjazogRXZlbnRDYWxsYmFjayk6IFByb21pc2U8dm9pZD4ge1xyXG5cdGNhbGxiYWNrKGBFeGVjdXRpbmc6ICcke2NtZH0nYCk7XHJcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuXHRcdGNvbnN0IGNoaWxkUHJvY2VzcyA9IGV4ZWMoY21kKTtcclxuXHRcdGNoaWxkUHJvY2Vzcy5zdGRvdXQ/Lm9uKCdkYXRhJywgKGRhdGEpID0+IHtcclxuXHRcdFx0Y29uc3QgbGluZXMgPSBzdHJpcEFuc2koZGF0YS50b1N0cmluZygpKS5zcGxpdCgvXFxyP1xcbi8pO1xyXG5cdFx0XHRsaW5lcy5mb3JFYWNoKChsaW5lKSA9PiB7XHJcblx0XHRcdFx0aWYgKGxpbmUudHJpbSgpICE9PSAnJykge1xyXG5cdFx0XHRcdFx0Y2FsbGJhY2sobGluZS50cmltKCkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHRcdGNoaWxkUHJvY2Vzcy5vbihcImVycm9yXCIsIChlcnJvcikgPT4ge1xyXG5cdFx0XHRyZWplY3QoZXJyb3IpO1xyXG5cdFx0fSk7XHJcblx0XHRjaGlsZFByb2Nlc3Mub24oXCJjbG9zZVwiLCAoKSA9PiB7XHJcblx0XHRcdGNhbGxiYWNrKFwiQ29tcGxldGVkIHN1Y2Nlc3NmdWxseVwiKTtcclxuXHRcdFx0cmVzb2x2ZSgpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IG5ldyBOZXdBZ2VudENvbW1hbmQoKTsiXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7OztBQUdBLFNBQVMsZUFBZTs7O0FDSHhCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBR0EsU0FBUyxZQUFZO0FBQ3JCLE9BQU8sUUFBUSxRQUFRLFVBQVUsU0FB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QUU1QixVQUNFLFFBQVEsT0FBTyxFQUNmLFNBQVMsVUFBVSxnQkFBZ0IsRUFDbkMsT0FBTyxZQUFZLHlDQUEwQyxFQUM3RCxPQUFPLFVBQVUsU0FBZ0I7QUFDakMsVUFBTSxnQkFBZ0IscUJBQXFCLElBQUk7QUFDL0MsUUFBRyxDQUFDLGNBQWMsVUFBVSxDQUFFLE1BQU0sUUFBUTtBQUFBLE1BQzNDLFNBQVMsTUFBTSxLQUFLLEdBQUcsT0FBTztBQUFBLHlCQUE0QjtBQUFBLE1BQzFELFNBQVM7QUFBQSxJQUNWLENBQUMsR0FBSTtBQUFFO0FBQUEsSUFBUTtBQUlmLGtCQUFjLE9BQU8sTUFBTTtBQUFBLE1BQWtCO0FBQUEsTUFDNUMsY0FBYztBQUFBLE1BQU1DLE1BQUssU0FBUyxRQUFRLElBQUksQ0FBQztBQUFBLElBQUM7QUFFakQsa0JBQWMsY0FBYyxNQUFNO0FBQUEsTUFBa0I7QUFBQSxNQUNuRCxjQUFjO0FBQUEsTUFBYSxtQkFBbUIsY0FBYyxJQUFJO0FBQUEsSUFBRTtBQUVuRSxrQkFBYyxjQUFjLE1BQU07QUFBQSxNQUFrQjtBQUFBLE1BQ25ELGNBQWM7QUFBQSxNQUFhLEdBQUcsY0FBYyxXQUFXO0FBQUEsSUFBNEM7QUFFcEcsVUFBTSxrQkFBZ0IsSUFBSSxhQUFhO0FBQUEsRUFDeEMsQ0FBQztBQUVGLFVBQVEsTUFBTTtBQUNkLFFBQU0sUUFBUSxXQUFXLEVBQ3ZCLEtBQUssQ0FBQyxZQUFZO0FBQ2xCLFlBQVEsSUFBSSxNQUFNLE1BQU0sS0FBSyw2REFBNkQsQ0FBQztBQUFBLEVBQzVGLENBQUMsRUFDQSxNQUFNLENBQUMsV0FBVztBQUNsQixZQUFRLElBQUksTUFBTSxJQUFJLEtBQUssOERBQThELENBQUM7QUFBQSxFQUMzRixDQUFDO0FBQ0g7QUFwQ3NCOyIsCiAgIm5hbWVzIjogWyJwYWNrYWdlSnNvblBhdGgiLCAicGF0aCIsICJwYXRoIiwgInBhdGgiLCAicGF0aCIsICJpbnB1dCIsICJwYXRoIl0KfQo=