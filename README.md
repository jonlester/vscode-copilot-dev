# vscode-copilot-dev

This project provides development tools for creating GitHub Copilot extensions for Visual Studio Code.


https://github.com/jonlester/vscode-copilot-dev/assets/1609107/ee2f7541-7e3f-436d-b0eb-956fd697947c


## Usage

From a command prompt or VS Code terminal window, create a new empty directory to hold your project.  For example:
`mkdir myagent`

Launch VS Code with your new folder as the workspace:
`code ./myagent`

Launch the scaffolder from the npm package manager:
`npm exec jonlester/vscode-copilot-dev`

Once the project setup completes, you can launch your new chat agent by opening the VS Code debugging panel, and starting the "Run Extension" launch configuration.

Customize your chat agent by adding your code to the `extension.ts` file.

## License

This project is licensed under the [MIT License](LICENSE).
