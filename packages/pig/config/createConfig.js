'use strict';
const fs = require ('fs-extra');
const path = require ('path');
const paths = require ('./paths');
const eslintFormatter = require ('react-dev-utils/eslintFormatter');
const errorOverlayMiddleware = require ('react-dev-utils/errorOverlayMiddleware');
const InterpolateHtmlPlugin = require ('react-dev-utils/InterpolateHtmlPlugin');
const {getEnv, nodePath} = require ('./env');
const WebpackBar = require ('webpackbar');
const runPlugin = require ('./runPlugin');
const HtmlWebpackPlugin = require ('html-webpack-plugin');

const target = 'client';

// Webpack config factory.
function configFactory (
  env = 'dev',
  {host = 'localhost', port = 3000, modify, plugins, modifyBabelOptions},
  webpackEntity
) {
  // babel config defined
  const hasBabelRc = fs.existsSync (paths.appBabelRc);
  const mainBabelOptions = {
    babelrc: true,
    cacheDirectory: true,
    presets: [],
  };

  if (!hasBabelRc) {
    mainBabelOptions.presets.push (require.resolve ('babel-preset-react-app'));
  }

  // Allow app to override babel options
  const babelOptions = modifyBabelOptions
    ? modifyBabelOptions (mainBabelOptions)
    : mainBabelOptions;

  if (hasBabelRc && babelOptions.babelrc) {
    console.log ('Using .babelrc defined in your app root');
  }

  // eslint config defined
  const hasEslintRc = fs.existsSync (paths.appEslintRc);
  const eslintOptions = {
    formatter: eslintFormatter,
    eslintPath: require.resolve ('eslint'),

    ignore: false,
    useEslintrc: true,
  };

  if (hasEslintRc) {
    console.log ('Using .eslintrc defined in your app root');
  } else {
    eslintOptions.baseConfig = {
      extends: [require.resolve ('eslint-config-react-app')],
    };
    eslintOptions.useEslintrc = false;
  }

  const IS_DEV = env === 'dev';

  const {raw, stringified} = getEnv (env, {host, port});
  const devServerPort = parseInt (raw.PORT, 10) + 1;

  // This is our webpack config.
  let config = {
    // Set webpack mode:
    mode: IS_DEV ? 'development' : 'production',
    // Set webpack context to the current command's directory
    context: process.cwd (),
    // Specify target (either 'node' or 'web')
    target: target,
    // Controversially, decide on sourcemaps.
    devtool: IS_DEV ? 'cheap-module-source-map' : 'source-map',
    // We need to tell webpack how to resolve both Razzle's node_modules and
    // the users', so we use resolve and resolveLoader.
    resolve: {
      modules: ['node_modules', paths.appNodeModules].concat (
        // It is guaranteed to exist because we tweak it in `env.js`
        nodePath.split (path.delimiter).filter (Boolean)
      ),
      extensions: ['.mjs', '.jsx', '.js', '.json'],
      alias: {
        // This is required so symlinks work during development.
        'webpack/hot/poll': require.resolve ('webpack/hot/poll'),
        // Support React Native Web
        // https://www.smashingmagazine.com/2016/08/a-glimpse-into-the-future-with-react-native-for-web/
        'react-native': 'react-native-web',
      },
    },
    resolveLoader: {
      modules: [paths.appNodeModules, paths.ownNodeModules],
    },
    module: {
      strictExportPresence: true,
      rules: [
        // Disable require.ensure as it's not a standard language feature.
        // { parser: { requireEnsure: false } },
        {
          test: /\.(js|jsx|mjs)$/,
          enforce: 'pre',
          use: [
            {
              options: eslintOptions,
              loader: require.resolve ('eslint-loader'),
            },
          ],
          include: paths.appSrc,
        },
        // Avoid "require is not defined" errors
        {
          test: /\.mjs$/,
          include: /node_modules/,
          type: 'javascript/auto',
        },
        // Transform ES6 with Babel
        {
          test: /\.(js|jsx|mjs)$/,
          include: [paths.appSrc],
          use: [
            {
              loader: require.resolve ('babel-loader'),
              options: babelOptions,
            },
          ],
        },
        {
          exclude: [
            /\.html$/,
            /\.(js|jsx|mjs)$/,
            /\.(ts|tsx)$/,
            /\.(vue)$/,
            /\.(less)$/,
            /\.(re)$/,
            /\.(s?css|sass)$/,
            /\.json$/,
            /\.bmp$/,
            /\.gif$/,
            /\.jpe?g$/,
            /\.png$/,
          ],
          loader: require.resolve ('file-loader'),
          options: {
            name: 'static/media/[name].[hash:8].[ext]',
            emitFile: true,
          },
        },
        // "url" loader works like "file" loader except that it embeds assets
        // smaller than specified limit in bytes as data URLs to avoid requests.
        // A missing `test` is equivalent to a match.
        {
          test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
          loader: require.resolve ('url-loader'),
          options: {
            limit: 10000,
            name: 'static/media/[name].[hash:8].[ext]',
            emitFile: true,
          },
        },

        // "postcss" loader applies autoprefixer to our CSS.
        // "css" loader resolves paths in CSS and adds assets as dependencies.
        // "style" loader turns CSS into JS modules that inject <style> tags.
        // In production, we use a plugin to extract that CSS to a file, but
        // in development "style" loader enables hot editing of CSS.
        //
        // Note: this yields the exact same CSS config as create-react-app.
        {
          test: /\.css$/,
          exclude: [paths.appBuild, /\.module\.css$/],
          use: IS_DEV
            ? [
                require.resolve ('style-loader'),
                {
                  loader: require.resolve ('css-loader'),
                  options: {
                    importLoaders: 1,
                  },
                },
                {
                  loader: require.resolve ('postcss-loader'),
                  options: postCssOptions,
                },
              ]
            : [
                MiniCssExtractPlugin.loader,
                {
                  loader: require.resolve ('css-loader'),
                  options: {
                    importLoaders: 1,
                    modules: false,
                    minimize: true,
                  },
                },
                {
                  loader: require.resolve ('postcss-loader'),
                  options: postCssOptions,
                },
              ],
        },
        // Adds support for CSS Modules (https://github.com/css-modules/css-modules)
        // using the extension .module.css
        {
          test: /\.module\.css$/,
          exclude: [paths.appBuild],
          use: IS_DEV
            ? [
                require.resolve ('style-loader'),
                {
                  loader: require.resolve ('css-loader'),
                  options: {
                    modules: true,
                    importLoaders: 1,
                    localIdentName: '[path]__[name]___[local]',
                  },
                },
                {
                  loader: require.resolve ('postcss-loader'),
                  options: postCssOptions,
                },
              ]
            : [
                MiniCssExtractPlugin.loader,
                {
                  loader: require.resolve ('css-loader'),
                  options: {
                    modules: true,
                    importLoaders: 1,
                    minimize: true,
                    localIdentName: '[path]__[name]___[local]',
                  },
                },
                {
                  loader: require.resolve ('postcss-loader'),
                  options: postCssOptions,
                },
              ],
        },
      ],
    },
  };

  if (IS_DEV) {
    // Setup Webpack Dev Server on port 3001 and
    // specify our client entry point /client/index.js
    config.entry = {
      client: [
        require.resolve ('react-dev-utils/webpackHotDevClient'),
        paths.appClientIndexJs,
      ].filter (Boolean),
    };

    // Configure our client bundles output. Not the public path is to 3001.
    config.output = {
      path: paths.appBuildPublic,
      publicPath: raw.PUBLIC_PATH,
      pathinfo: true,
      libraryTarget: 'var',
      filename: 'static/js/bundle.js',
      chunkFilename: 'static/js/[name].chunk.js',
      devtoolModuleFilenameTemplate: info =>
        path.resolve (info.resourcePath).replace (/\\/g, '/'),
    };
    // Configure webpack-dev-server to serve our client-side bundle from
    // http://${dotenv.raw.HOST}:3001
    config.devServer = {
      disableHostCheck: true,
      clientLogLevel: 'none',
      // Enable gzip compression of generated files.
      compress: true,
      // watchContentBase: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      historyApiFallback: {
        // Paths with dots should still use the history fallback.
        // See https://github.com/facebookincubator/create-react-app/issues/387.
        disableDotRule: true,
      },
      host: raw.HOST,
      hot: true,
      noInfo: true,
      overlay: false,
      port: devServerPort,
      quiet: true,
      // By default files from `contentBase` will not trigger a page reload.
      // Reportedly, this avoids CPU overload on some systems.
      // https://github.com/facebookincubator/create-react-app/issues/293
      watchOptions: {
        ignored: /node_modules/,
      },
      before (app) {
        // This lets us open files from the runtime error overlay.
        app.use (errorOverlayMiddleware ());
      },
    };
    // Add client-only development plugins
    config.plugins = [
      new webpack.HotModuleReplacementPlugin (),
      new webpack.DefinePlugin (stringified),
      new WebpackBar ({
        color: '#f56be2',
        name: 'client',
      }),
    ];
  } else {
    // Specify production entry point (/client/index.js)
    config.entry = {
      client: [paths.appClientIndexJs].filter (Boolean),
    };

    // Specify the client output directory and paths. Notice that we have
    // changed the publiPath to just '/' from http://localhost:3001. This is because
    // we will only be using one port in production.
    config.output = {
      path: paths.appBuildPublic,
      publicPath: raw.PUBLIC_PATH,
      filename: 'static/js/bundle.[chunkhash:8].js',
      chunkFilename: 'static/js/[name].[chunkhash:8].chunk.js',
      libraryTarget: 'var',
    };

    config.plugins = [
      // Define production environment vars
      new webpack.DefinePlugin (stringified),
      // Extract our CSS into a files.
      new MiniCssExtractPlugin ({
        filename: 'static/css/bundle.[contenthash:8].css',
        chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
        // allChunks: true because we want all css to be included in the main
        // css bundle when doing code splitting to avoid FOUC:
        // https://github.com/facebook/create-react-app/issues/2415
        allChunks: true,
      }),
      new webpack.HashedModuleIdsPlugin (),
      new webpack.optimize.AggressiveMergingPlugin (),
    ];

    config.optimization = {
      minimize: true,
      minimizer: [
        new UglifyJsPlugin ({
          uglifyOptions: {
            parse: {
              // we want uglify-js to parse ecma 8 code. However, we don't want it
              // to apply any minfication steps that turns valid ecma 5 code
              // into invalid ecma 5 code. This is why the 'compress' and 'output'
              // sections only apply transformations that are ecma 5 safe
              // https://github.com/facebook/create-react-app/pull/4234
              ecma: 8,
            },
            compress: {
              ecma: 5,
              warnings: false,
              // Disabled because of an issue with Uglify breaking seemingly valid code:
              // https://github.com/facebook/create-react-app/issues/2376
              // Pending further investigation:
              // https://github.com/mishoo/UglifyJS2/issues/2011
              comparisons: false,
            },
            mangle: {
              safari10: true,
            },
            output: {
              ecma: 5,
              comments: false,
              // Turned on because emoji and regex is not minified properly using default
              // https://github.com/facebook/create-react-app/issues/2488
              ascii_only: true,
            },
          },
          // Use multi-process parallel running to improve the build speed
          // Default number of concurrent runs: os.cpus().length - 1
          parallel: true,
          // Enable file caching
          cache: true,
          // @todo add flag for sourcemaps
          sourceMap: true,
        }),
      ],
    };
  }

  // If developing app is a single page application, apply HtmlWebpackPlugin webpack plugin.
  if (process.env.appMode === 'SPA') {
    config.plugins = [
      ...config.plugins,
      new HtmlWebpackPlugin ({
        inject: true,
        filename: 'index.html',
        template: paths.appHtml,
      }),
      // The public URL is available as %PUBLIC_URL% in index.html, e.g.: // Makes some environment variables available in index.html.
      // <link rel="shortcut icon" href="%PUBLIC_URL%/favicon.ico">
      // In development, this will be an empty string.
      new InterpolateHtmlPlugin (HtmlWebpackPlugin, raw),
    ];
  }

  // Apply pig plugins, if they are present in pig.config.js
  if (Array.isArray (plugins)) {
    plugins.forEach (Plugin => {
      config = runPlugin (Plugin, config, {target, dev: IS_DEV}, webpackEntity);
    });
  }

  // If modify function is present in pig.config.js, call it on the configs we created.
  if (modify) {
    config = modify (config, {target, dev: IS_DEV}, webpackEntity);
  }

  return config;
}

module.exports = configFactory;
