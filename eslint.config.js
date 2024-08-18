import pluginJs from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  { languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "react/react-in-jsx-scope": "off",
      "no-console": "warn",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(.*)/RawApi",
              importNamePattern: "^use",
              message:
                "Please use the Api object at @/api/Api to access hooks.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["scripts/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
];
