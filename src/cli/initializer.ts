/*------------------------------------------------------------*
 *  Copyright (c) Microsoft Corporation. All rights reserved. *
 *------------------------------------------------------------*/
import { Command } from 'commander';
import newAgentCommand from '../commands/new-agent';
import { input, confirm } from '@inquirer/prompts';
import path from 'path';
import chalk from 'chalk';
import { InitOptions } from '../contracts';

const summary =
	'This package will scaffold a new GitHub Copilot chat agent typescript extension for VS Code usiing TypeScript.';

function mergeParsedArguments(
	args: any[],
	passedOptions?: InitOptions,
): InitOptions {
	//set defaults
	let result: any = {
		silent: false,
		git: true,
		publisher: 'undefined_publisher',
	};
	if (!args || args.length === 0) {
		return result;
	}
	const cmd = args[args.length - 1] as Command;
	result = { ...result, ...cmd.opts() };

	for (let i = 0; i < cmd.registeredArguments.length; i++) {
		result[cmd.registeredArguments[i].name()] = args[i];
	}
	if (passedOptions) {
		result = { ...passedOptions, ...result };
	}
	return result as InitOptions;
}
/**
 * Returns the current time in the format "hours:minutes:seconds".
 *
 * @returns The current time.
 */
function getCurrentTime() {
	const date = new Date();
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const seconds = date.getSeconds();

	return `${hours}:${minutes}:${seconds}`;
}
async function validateAndPrompt(
	prompt: string,
	currentValue?: string,
	defaultValue?: string,
): Promise<string> {
	const validator = (input?: string): boolean => {
		if (!input || input.trim().length === 0) {
			return false;
		}
		return true;
	};

	if (!validator(currentValue)) {
		return await input({
			message: `${prompt}\n  ==>`,
			default: defaultValue,
			validate: function (input) {
				return validator(input) ? true : 'value cannot be empty';
			},
		});
	} else {
		return Promise.resolve(currentValue!);
	}
}

export async function init(initOptions?: InitOptions): Promise<void> {
	const program = new Command();

	program
		.summary(summary)
		.argument('[name]', 'new agent name')
		.option('--no-git', "don't initialize a local git repository")
		.action(async (...args: any[]) => {
			const mergedOptions = mergeParsedArguments(args);
			if (
				!mergedOptions.silent &&
				!(await confirm({
					message: chalk.blue(`${summary}\nDo you want to continue?`),
					default: true,
				}))
			) {
				return;
			}

			//TODO: merge prompts into Listr so that the tasks can be more interactive
			//fix this to handle silent mode
			mergedOptions.name = await validateAndPrompt(
				"What would you like to name your new Copilot chat agent? Don't use spaces or special characters.",
				mergedOptions.name,
				path.basename(process.cwd()),
			);

			mergedOptions.displayName = await validateAndPrompt(
				'Enter a "friendly" name for your agent.',
				mergedOptions.displayName,
				`Copilot agent: @${mergedOptions.name}`,
			);

			mergedOptions.description = await validateAndPrompt(
				'Enter a brief description of what it does for your users.',
				mergedOptions.description,
				`${mergedOptions.displayName} - A GitHub Copilot chat agent for VS Code`,
			);

			mergedOptions.git = await confirm({
				message: 'Initialize a local git repository?',
				default: true,
			});

			await newAgentCommand.run(mergedOptions);
		});

	console.clear();
	await program
		.parseAsync()
		.then((command) => {
			console.log(
				chalk.green.bold(
					'\nYour new chat agent project is now ready. Happy coding!\n',
				),
			);
		})
		.catch((reason) => {
			console.log(
				chalk.red.bold(
					'\nInitialization Failed. Check the output above for details.',
				),
			);
		});
}
