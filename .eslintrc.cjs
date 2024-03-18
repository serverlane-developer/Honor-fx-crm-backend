/* eslint-env node */
module.exports = {
  env: {
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "import"],
  root: true,

  rules: {
    "@typescript-eslint/no-unused-vars": "warn",
    "no-undef": "error",
    "no-undef-init": "warn",
    "import/no-unresolved": "error",
    "import/order": "error",
    "import/first": "error",
    "import/exports-last": "error",
    "import/no-named-as-default-member": "off",
    "import/no-named-as-default": "off",
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
  settings: {
    "import/parsers": {
      "@typescript-eslint/parser": [".ts", ".tsx"],
    },
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true, // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
      },
      node: true,
    },
  },
};
