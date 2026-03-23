# Catalyst

## Overview

This repository contains the source code of my eportfolio, a modern full-stack web application which showcases my skills and projects. Feel free to check out the latest production deployment at https://bsodium.fr.

This project was completely revamped to embrace a modern and robust architecture. It is now powered by **React Router 7** for routing and data loading, **HeroUI** paired with **Tailwind CSS v4** for a beautifully responsive user interface, and **Framer Motion** for fluid and interactive animations.

This project is available for free as a proof of concept and source of inspiration, tailored by design to my personal needs. However, its generic structure and components technically allow anyone to adapt it and make it their own.

**If you are interested in using this project for your own portfolio, please carefully read the [License](#license) section.**

## Installation

### Environment Setup

This app relies on several environment variables to configure its API, analytics, and form endpoints. You can create a `.env.local` file in the root directory with the following content:

```shell
VITE_API_URL=https://localhost:3001 # The URL of the backend
VITE_GA_MEASUREMENT_ID=UA-XXXXXXXXX-X # Your google Analytics tracking ID
VITE_WEB3FORMS_ACCESS_KEY=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX # Your web3forms access key
```

### Running the App Locally

To run the app locally, you need to have Node.js and Yarn installed on your machine. Clone this repository and run the following commands in the root directory:

```shell
yarn install # install dependencies
yarn dev     # start development server
```

The development server uses `vite-plugin-mkcert` to provide a secure environment out of the box. In its default configuration, the app should be available at `https://catalyst.localhost:5173` (or `http://localhost:5173`).

### Component Library & Testing

This project utilizes [Storybook](https://storybook.js.org) alongside Vitest and Playwright to document, build, and test components in complete isolation.

To start the Storybook development environment:
```shell
yarn storybook
```
By default, the component catalog will be served at `http://localhost:6006`.

## Backend

For detailed documentation on how to run the original backend, please refer to the [api.bsodium.fr](https://github.com/BSoDium/api.bsodium.fr) repository. Note that with React Router 7's full-stack capabilities, backend responsibilities may be progressively handled directly within this project.

By default, the legacy backend is expected to run on `http://localhost:3001`. If you decide to change this, you should also modify the `VITE_API_URL` environment variable in the `.env.local` file accordingly.

## License

This project is licensed under the GNU General Public License - see the [LICENSE](LICENSE) file for details. Any use of the code must include a reference to the original repository. Any components or UI elements reused in other projects must be credited in a visible way to the original authors.

The removal of the credit banner which appears at the top right corner of the website is strictly prohibited and constitutes a violation of the license. It must be visible at all times and should not be covered by any other element. 

This software is available for free and is provided "as is" without warranty of any kind. Please respect the work that has been put into this project and do not use it for commercial purposes without permission.
