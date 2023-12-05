type InitOptions = {
    silent: boolean;
    name: string;
    displayName?: string;
    description?: string;
    git?: boolean;
};

declare function init(initOptions?: InitOptions): Promise<void>;

export { init };
