module.exports = {
  root: true,
  extends: ["eslint:recommended", "plugin:react/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  env: {
    browser: true,
    node: true,
  },
  settings: {
    next: {
      rootDir: ["packages/*", "examples/*"],
    },
  },
};
