#! /usr/bin/env node
'use strict';

process.env.NODE_ENV = 'development';
const fs = require('fs-extra');
const logger = require('pig-dev-utils/logger');
const clearConsole = require('react-dev-utils/clearConsole');
const choosePort = require('../utils/choosePort');
const paths = require('../config/paths');

function main() {
  clearConsole();
  logger.start('Compiling...');
  let pig = {};

  // check pig.config.js file exist
  if (fs.existsSync(paths.appPigConfig)) {
    try {
      pig = require(paths.appPigConfig);
    } catch (e) {
      clearConsole();
      logger.error('Invalid pig.config.js file.', e);
      process.exit(1);
    }
  }

  // delete client assets file to always have a manifest up to data
  fs.removeSync(paths.appManifest);

  // create webpack config, passing postion in pig config file
  
}

choosePort()
  .then(main)
  .catch(console.error);