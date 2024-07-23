const { overrides } = require("../../.eslintrc");

const config = {
    env: {
        browser: false,
    },
    parserOptions: {
        project: "./test/tsconfig.json",
        tsonfigRootDir: __dirname + "/test"
    },
    // We can allow some type trickery in tests, we will notice if they crash
    rules: {
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-explicit-any": "off"
    }
}
module.exports = config;