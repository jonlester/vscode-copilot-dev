/*------------------------------------------------------------*
 *  Copyright (c) Microsoft Corporation. All rights reserved. *
 *------------------------------------------------------------*/
import { glob } from 'glob';
import path, { join as pathJoin, parse as parsePath } from 'node:path';
import fs from 'node:fs';
import mustache from 'mustache';
import { fileURLToPath } from 'node:url';
import { EventCallback } from '../contracts';

const templateSuffix = '.mustache';
const deleteSuffix = '.delete';

async function getTemplates(basePath: string): Promise<string[]> {
	return await getFiles(pathJoin(basePath, '**/*.*'));
}

let _cachedPackageJsonPath: string | null = null; //do not access directly, use findPackageJsonPath
export async function packageJsonPath(): Promise<string> {
	if (_cachedPackageJsonPath) {
		return _cachedPackageJsonPath;
	}

	let currentDir = path.dirname(fileURLToPath(import.meta.url));

	while (currentDir !== path.dirname(currentDir)) {
		// Stop when reaching root directory
		const packageJsonPath = path.join(currentDir, 'package.json');
		try {
			await fs.promises.access(packageJsonPath);
			_cachedPackageJsonPath = packageJsonPath;
			return currentDir;
		} catch (error) {
			currentDir = path.dirname(currentDir);
		}
	}

	throw new Error(
		`Could not find package.json in ${currentDir} or any parent directory`,
	);
}

export async function renderTemplates(
	folder: string,
	destRootPath: string,
	configData: any,
	eventCallback?: EventCallback,
) {
	const basePath = pathJoin(await packageJsonPath(), 'templates', folder);
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

async function getFiles(path: string): Promise<string[]> {
	const normalizedPath = path.replace(/\\/g, '/');
	return glob(normalizedPath, { dot: true, nodir: true });
}

function encodingFromExt(path: string): 'binary' | 'utf8' {
	return path.endsWith('.ttf') ? 'binary' : 'utf8';
}

function getFileContent(path: string, allowEmpty: boolean = true): string {
	if (!allowEmpty || fs.existsSync(path)) {
		return fs.readFileSync(path, encodingFromExt(path));
	} else {
		return '';
	}
}

function writeFileContent(path: string, content: string) {
	const dir = parsePath(path).dir;
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path, content, encodingFromExt(path));
}

function render(
	filePath: string,
	sourceRootPath: string,
	destRootPath: string,
	configData: any,
): string {
	let fileData = getFileContent(filePath, false);
	let relativePath = filePath.replace(sourceRootPath, '');
	if (relativePath.endsWith(templateSuffix)) {
		relativePath = relativePath.replace(templateSuffix, '');
		fileData = mustache.render(fileData, configData);
	}

	const newFilePath = pathJoin(destRootPath, relativePath);
	const dir = parsePath(newFilePath).dir;

	writeFileContent(newFilePath, fileData);
	return newFilePath;
}

export async function folderIsEmpty(path: string): Promise<boolean> {
	const files = await getFiles(pathJoin(path, '*'));
	return files.length === 0;
}

export function isValidFolderName(folderName: string): boolean {
	return /^[a-z0-9_-]+$/i.test(folderName);
}
