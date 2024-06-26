const config = {
    env: {
        browser: true
    },
    parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname
    },
    ignorePatterns: ["*.d.ts"],
    rules: {
        // Workaround for a bug in decorator indentation, see:
        // https://github.com/typescript-eslint/typescript-eslint/issues/1824#issuecomment-957559729
        indent: "off",
        "@typescript-eslint/indent": [
              "warn",
              4,
              {
                ignoredNodes: [
                  "FunctionExpression > .params[decorators.length > 0]",
                  "FunctionExpression > .params > :matches(Decorator, :not(:first-child))",
                  "ClassBody.body > PropertyDefinition[decorators.length > 0] > .key"
                ],
                SwitchCase: 1,
              }
        ]
    }
};
module.exports = config;