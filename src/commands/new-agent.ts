/*------------------------------------------------------------*
 *  Copyright (c) Microsoft Corporation. All rights reserved. *
 *------------------------------------------------------------*/
import { fsHelper } from '../helpers';
import { exec } from 'child_process';
import { ICliCommand, EventCallback, InitOptions } from '../contracts';
import path from 'node:path';
import validate from 'validate-npm-package-name';
import { Listr } from 'listr2';
import stripAnsi from 'strip-ansi';

class NewAgentCommand implements ICliCommand {
	public async run(options: InitOptions): Promise<void> {
		//TODO: allow the folder to be specified
		const folder = './';
		const projectFolder = path.resolve(process.cwd(), folder);
		const tasks = new Listr(
			[
				{
					title: 'Preflight checks',
					task: () => {
						return new Listr(
							[
								{
									title: `Checking name "${options.name}"`,
									task: () => validatePackageName(options.name),
								},
								{
									title: `Checking folder "${projectFolder}"`,
									task: async () => await validateFolder(projectFolder)
										.catch((error) => {
											throw new Error(
												`The specified folder is not empty.  A new agent can only be created in an empty folder.`,
											);
										},
										),
								},
							],
							{ concurrent: false },
						);
					},
				},
				{
					title: 'Generate package files',
					task: async (ctx, task): Promise<void> => {
						const onData = (data: string) => {
							task.output = data;
						};
						return fsHelper.renderTemplates(
							'agent-new',
							projectFolder,
							options,
							(msg: string) => { task.output = msg; },
						);
					},
					rendererOptions: { persistentOutput: true }
				},
				{
					title: 'Install npm packages',
					task: async (ctx, task) => {
						return wrappedExec('npm install --verbose', (msg: string) => { task.output = msg; });
					},
					rendererOptions: { persistentOutput: true }
				},
				{
					title: 'Initialize Git',
					skip: () => !options.git,
					task: async (ctx, task) => {
						return wrappedExec('git init', (msg: string) => { task.output = msg; });
					},
					rendererOptions: { persistentOutput: true }
				},
				{
					title: 'Install vscode-dts proposed API types',
					task: async (ctx, task) => {
						return wrappedExec('npx --yes vscode-dts@latest dev -f', (msg: string) => { task.output = msg; });
					},
					rendererOptions: { persistentOutput: true }
				},
				{
					title: 'Compile typeScript',
					task: async (ctx, task) => {
						return wrappedExec('npm run compile', (msg: string) => { task.output = msg; });
					},
					rendererOptions: { persistentOutput: true }
				}
			],
		);
		return tasks.run();
	}
}

function validatePackageName(name: string) {
	if (!validate(name).validForNewPackages) {
		throw new Error(
			'The specified agent name must be a valid npm package name.  See https://docs.npmjs.com/package-name-guidelines',
		);
	}
}

async function validateFolder(folderPath: string): Promise<void> {
	const emptyFolder = await fsHelper.folderIsEmpty(folderPath);
	if (!emptyFolder) {
		throw new Error(
			'The target file system path is not empty. A new agent can only be created in an empty folder.',
		);
	}
	return Promise.resolve();
}

async function wrappedExec(cmd: string, callback: EventCallback): Promise<void> {
	callback(`Executing: '${cmd}'`);
	return new Promise((resolve, reject) => {
		const childProcess = exec(cmd);
		childProcess.stdout?.on('data', (data) => {
			const lines = stripAnsi(data.toString()).split(/\r?\n/);
			lines.forEach((line) => {
				if (line.trim() !== '') {
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

export default new NewAgentCommand();