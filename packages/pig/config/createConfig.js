'use strict';
const fs = require('fs-extra');
const paths = require('./paths');
const eslintFormatter = require('react-dev-utils/eslintFormatter');

// Webpack config factory.
function configFactory(env = 'dev', { host = 'localhost', port = 3000, modify, plugins, modifyBabelOptions }, webpackEntity) {
  const hasBabelRc = fs.existsSync(paths.appBabelRc);
  const babelOptions = {
    babelrc: true,
    cacheDirectory: true,
    presets: [],
  }

  if(!hasBabelRc){
    babelOptions.presets.push(require.resolve(''));
  }

  const hasEslintRc = fs.existsSync(paths.appEslintRc);
  const eslintOptions = {
    formatter: eslintFormatter,
    eslintPath: require.resolve('eslint'),

    ignore: false,
    useEslintrc: true,
  }
}