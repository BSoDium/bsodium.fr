# React-typescript-boilerplate

React-typescript-boilerplate is a bare-bones app template with no useless overengineered scripts. It has just the necessary tools to get you started without any unnecessary dependencies that might break at any time.

## Features

This template features:
- React typescript
- Yarn
- Eslint
- Sass
- Webpack

## Usage

Click on [Use this template](https://github.com/BSoDium/react-typescript-boilerplate/generate) to generate a new project.

This development environment uses Docker to automate the process of setting up the dependencies. It is designed so as to be as simple to use as possible, and allows you to focus on the development, without having to worry about the infrastructure. We recommend that you use Visual Studio Code to develop your application, as it is at this time the best IDE for in-container development.  

Your machine must be able to run Docker. You can download Docker for your OS from [here](https://docs.docker.com/get-docker/).  
Once VSCode is installed, open the repository as a folder (<kbd>Ctrl</kbd> + <kbd>K</kbd> then <kbd>Ctrl</kbd> + <kbd>O</kbd>), go to the extension tab and add the `Remote - Containers` extension. Make sure it is enabled. Now, open the command palette (default shortcut is <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>) and select `Remote - Containers: Reopen in Container`.  

This will create the Docker environment. This step might take a while, depending on both your internet connection and the available computing power, but it will only run once, as the Docker environment is cached.

Once the environment is created, you can open the code workspace by going to `File` > `Open Workspace from File...` and selecting `App.code-workspace`. Your environment is now ready to use.


You can now run the application either by pressing <kbd>F5</kbd> in the editor, or by opening a new terminal (default is <kbd>Ctrl</kbd> + <kbd>J</kbd>) and typing:

```bash
yarn start
```