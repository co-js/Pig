const fs = require("fs-extra");
const paths = require("./paths");
const path = require("path");
const nodePath = require("./env").nodePath;
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const postCssOptions = {
  ident: "postcss", // https://webpack.js.org/guides/migrating/#complex-options
  plugins: () => [
    require("postcss-flexbugs-fixes"),
    autoprefixer({
      browsers: [
        ">1%",
        "last 4 versions",
        "Firefox ESR",
        "not ie < 9" // React doesn't support IE8 anyway
      ],
      flexbox: "no-2009"
    })
  ]
};

function createBaseConfig(target = "web", env = "dev", { modifyBabelOptions }) {
  // babel config defined
  const hasBabelRc = fs.existsSync(paths.appBabelRc);
  const mainBabelOptions = {
    babelrc: true,
    cacheDirectory: true,
    presets: []
  };

  if (!hasBabelRc) {
    mainBabelOptions.presets.push(require.resolve("babel-preset-react-app"));
  }

  // Allow app to override babel options
  const babelOptions = modifyBabelOptions
    ? modifyBabelOptions(mainBabelOptions)
    : mainBabelOptions;

  if (hasBabelRc && babelOptions.babelrc) {
    console.log("Using .babelrc defined in your app root");
  }

  // eslint config defined
  const hasEslintRc = fs.existsSync(paths.appEslintRc);
  const eslintOptions = {
    formatter: eslintFormatter,
    eslintPath: require.resolve("eslint"),

    ignore: false,
    useEslintrc: true
  };

  if (hasEslintRc) {
    console.log("Using .eslintrc defined in your app root");
  } else {
    eslintOptions.baseConfig = {
      extends: [require.resolve("eslint-config-react-app")]
    };
    eslintOptions.useEslintrc = false;
  }

  const IS_DEV = env === "dev";

  // This is our webpack config.
  let config = {
    // Set webpack mode:
    mode: IS_DEV ? "development" : "production",
    // Set webpack context to the current command's directory
    context: process.cwd(),
    // Specify target (either 'node' or 'web')
    target: target,
    // Controversially, decide on sourcemaps.
    devtool: IS_DEV ? "cheap-module-source-map" : "source-map",
    // We need to tell webpack how to resolve both Razzle's node_modules and
    // the users', so we use resolve and resolveLoader.
    resolve: {
      modules: ["node_modules", paths.appNodeModules].concat(
        // It is guaranteed to exist because we tweak it in `env.js`
        nodePath.split(path.delimiter).filter(Boolean)
      ),
      extensions: [".mjs", ".jsx", ".js", ".json"],
      alias: {
        // This is required so symlinks work during development.
        "webpack/hot/poll": require.resolve("webpack/hot/poll"),
        // Support React Native Web
        // https://www.smashingmagazine.com/2016/08/a-glimpse-into-the-future-with-react-native-for-web/
        "react-native": "react-native-web"
      }
    },
    resolveLoader: {
      modules: [paths.appNodeModules, paths.ownNodeModules]
    },
    module: {
      strictExportPresence: true,
      rules: [
        // Disable require.ensure as it's not a standard language feature.
        // { parser: { requireEnsure: false } },
        {
          test: /\.(js|jsx|mjs)$/,
          enforce: "pre",
          use: [
            {
              options: eslintOptions,
              loader: require.resolve("eslint-loader")
            }
          ],
          include: paths.appSrc
        },
        // Avoid "require is not defined" errors
        {
          test: /\.mjs$/,
          include: /node_modules/,
          type: "javascript/auto"
        },
        // Transform ES6 with Babel
        {
          test: /\.(js|jsx|mjs)$/,
          include: [paths.appSrc],
          use: [
            {
              loader: require.resolve("babel-loader"),
              options: babelOptions
            }
          ]
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
            /\.png$/
          ],
          loader: require.resolve("file-loader"),
          options: {
            name: "static/media/[name].[hash:8].[ext]",
            emitFile: true
          }
        },
        // "url" loader works like "file" loader except that it embeds assets
        // smaller than specified limit in bytes as data URLs to avoid requests.
        // A missing `test` is equivalent to a match.
        {
          test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
          loader: require.resolve("url-loader"),
          options: {
            limit: 10000,
            name: "static/media/[name].[hash:8].[ext]",
            emitFile: true
          }
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
                require.resolve("style-loader"),
                {
                  loader: require.resolve("css-loader"),
                  options: {
                    importLoaders: 1
                  }
                },
                {
                  loader: require.resolve("postcss-loader"),
                  options: postCssOptions
                }
              ]
            : [
                MiniCssExtractPlugin.loader,
                {
                  loader: require.resolve("css-loader"),
                  options: {
                    importLoaders: 1,
                    modules: false,
                    minimize: true
                  }
                },
                {
                  loader: require.resolve("postcss-loader"),
                  options: postCssOptions
                }
              ]
        },
        // Adds support for CSS Modules (https://github.com/css-modules/css-modules)
        // using the extension .module.css
        {
          test: /\.module\.css$/,
          exclude: [paths.appBuild],
          use: IS_DEV
            ? [
                require.resolve("style-loader"),
                {
                  loader: require.resolve("css-loader"),
                  options: {
                    modules: true,
                    importLoaders: 1,
                    localIdentName: "[path]__[name]___[local]"
                  }
                },
                {
                  loader: require.resolve("postcss-loader"),
                  options: postCssOptions
                }
              ]
            : [
                MiniCssExtractPlugin.loader,
                {
                  loader: require.resolve("css-loader"),
                  options: {
                    modules: true,
                    importLoaders: 1,
                    minimize: true,
                    localIdentName: "[path]__[name]___[local]"
                  }
                },
                {
                  loader: require.resolve("postcss-loader"),
                  options: postCssOptions
                }
              ]
        }
      ]
    }
  };

  return config;
}
