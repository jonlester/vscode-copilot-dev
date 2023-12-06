/*------------------------------------------------------------*
 *  Copyright (c) Microsoft Corporation. All rights reserved. *
 *------------------------------------------------------------*/
export interface ICliCommand {
	run: (...args: any[]) => Promise<void>;
}
export type EventCallback = (msg: string) => void;

export type InitOptions = {
    silent: boolean;
	name: string;
	displayName?: string;
	description?: string;
	publisher?: string;
	git?: boolean;
};