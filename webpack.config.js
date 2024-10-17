//@ts-check
"use strict";

const path = require("path");
const webpack = require("webpack");

/**@type {webpack.Configuration}*/
const extensionConfig = {
  name: "extension",
  target: "node",
  entry: "./src/extension.ts",
  output: {
    path: path.resolve(__dirname, "out/src"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../../[resource-path]"
  },
  devtool: "source-map",
  externals: {
    vscode: "commonjs vscode"
  },
  resolve: {
    mainFields: ["browser", "module", "main"],
    extensions: [".ts", ".js"],
    alias: {
      // provides alternate implementation for node module and source files
    },
    fallback: {
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: path.resolve(__dirname, "src/tsconfig.json")
            }
          }
        ]
      },
    ]
  }
};

// Add an entry for each webview here. '"X": "./A/B.ts"' will bundle './A/B.ts'
// and generate 'out/webviews/X.js'
const webviewEntries = {
  listwindow: "./webviews/listwindow/index.ts",
  form: "./webviews/form/index.ts",
};

/**@type {webpack.Configuration}*/
const webviewConfig = {
    name: "webviews",
    target: "web",
    entry: webviewEntries,
    experiments: {
      outputModule: true
    },
    output: {
      path: path.resolve(__dirname, "out/webviews/"),
      filename: "[name].js",
      libraryTarget: "module",
			publicPath: '#{root}/dist/',
    },
    devtool: "source-map",
    resolve: {
      extensions: [".ts", ".js"],
      alias: {
        // provides alternate implementation for node module and source files
      },
      fallback: {
      }
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              loader: "ts-loader",
              options: {
                configFile: path.resolve(__dirname, "webviews/tsconfig.json")
              }
            }
          ]
        }
      ]
    },
    plugins: []
};

module.exports = [extensionConfig, webviewConfig];