type InitOptions = {
  silent: boolean;
  name: string;
  displayName?: string;
  description?: string;
  publisher?: string;
  git?: boolean;
};

declare function init(initOptions?: InitOptions): Promise<void>;

export { init };
