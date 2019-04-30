#! /usr/bin/env node
"use strict";

process.env.NODE_ENV = "development";
const fs = require("fs-extra");
const webpack = require("webpack");
const devServer = require("webpack-dev-server");
const logger = require("pig-dev-utils/logger");
const clearConsole = require("react-dev-utils/clearConsole");
const choosePort = require("../utils/choosePort");
const paths = require("../config/paths");
const createConfig = require("../config/createConfig");

let pig = {};

// check pig.config.js file exist
if (fs.existsSync(paths.appPigConfig)) {
  try {
    pig = require(paths.appPigConfig);
  } catch (e) {
    clearConsole();
    logger.error("Invalid pig.config.js file.", e);
    process.exit(1);
  }
}

// Delete client assets file to always have a manifest up to data
fs.removeSync(paths.appManifest);

// Create webpack config, passing options in pig config file
let config = createConfig("dev", pig, webpack);

// Compile our assets with webpack
const compiler = compile(config);

function main() {
  clearConsole();
  logger.start("Compiling...");

  // Create a new instance of Webpck-dev-server for our client assets.
  // This will actually run on a different port than the users app.
  const devServerObj = new devServer(compiler, config.devServer);

  devServerObj.listen(
    ((process.env.PORT && parseInt(process.env.PORT) + 1) || pig.port || 3001,
    err => {
      if (err) {
        logger.error(err);
      }
    })
  );
}

function startServer() {
  choosePort()
    .then(main)
    .catch(console.error);
}

function compile(config) {
  let compiler;
  try {
    compiler = webpack(config);
  } catch (e) {
    logger.error("Failed to compile", e);
    process.exit(1);
  }
  return compiler;
}

exports = { compiler, startServer };
