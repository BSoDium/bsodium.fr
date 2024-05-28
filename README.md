# bsodium.fr

## Overview

This repository contains the source code of my eportfolio, a React progressive web app which showcases my skills and projects. It is based on *MUI Joy* for UI components, *React Spring* for animations and *DALL-E 3* for illustration generation. Feel free to check out the latest production deployment at https://bsodium.fr.

This project is available for free as a proof of concept and source of inspiration, and was by design tailored to my personal needs. However, its generic structure and components could technically allow anyone to make it their own.

**If you are interested in using this project for your own portfolio, please carefully read the [License](#license) section.**

## Installation

### Frontend

This app uses several environment variables to configure the API url, Google Analytics tracking ID and Web3forms access key. You can create a `.env.local` file in the root directory with the following content:

```shell
REACT_APP_API_URL=https://localhost:3001 # The URL of the backend
REACT_APP_GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X # Your google Analytics tracking ID
REACT_APP_WEB3FORMS_KEY=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX # Your web3forms access key
```

To run the app locally, you need to have Node.js and yarn installed on your machine. Clone this repository and run the following commands in the root directory:

```shell
yarn install # install dependencies
yarn start # start development server
```

In its default configuration, the app should be available at http://localhost:3000.

### Backend

For detailed documentation on how to run the backend, please refer to the [api.bsodium.fr](https://github.com/BSoDium/api.bsodium.fr) repository.

By default, the backend is expected to run on `http://localhost:3001`. If you decide to change this, you should also modify the `REACT_APP_API_URL` environment variable in the `.env.local` file accordingly.

## License

This project is licensed under the GNU General public license - see the [LICENSE](LICENSE) file for details. Any use of the code must include a reference to the original repository. Any components or UI elements reused in other projects must be credited in a visible way to the original authors.

The removal of the credit banner which appears at the top right corner of the website is strictly prohibited and constitutes a violation of the license. It must be visible at all times and should not be covered by any other element. 

This software is available for free and is provided "as is" without warranty of any kind. Please respect the work that has been put into this project and do not use it for commercial purposes without permission.
