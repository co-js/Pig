const createBaseConfig = require("@geetemp/pig-client/config/createBaseConfig");
const paths = require("./paths");

function createConfig(
  env = "dev",
  { host = "localhost", port = 3000, modify, plugins, modifyBabelOptions },
  webpackEntity
) {
  const target = "node";
  const IS_NODE = target === "node";
  let config = createBaseConfig(target, env, { modifyBabelOptions });

  // We want to uphold node's __filename, and __dirname.
  config.node = {
    __console: false,
    __dirname: false,
    __filename: false
  };

  // We need to tell webpack what to bundle into our Node bundle.
  config.externals = [
    nodeExternals({
      whitelist: [
        IS_DEV ? "webpack/hot/poll?300" : null,
        /\.(eot|woff|woff2|ttf|otf)$/,
        /\.(svg|png|jpg|jpeg|gif|ico)$/,
        /\.(mp4|mp3|ogg|swf|webp)$/,
        /\.(css|scss|sass|sss|less)$/
      ].filter(x => x)
    })
  ];

  // Specify webpack Node.js output path and filename
  config.output = {
    path: paths.appBuild,
    publicPath: clientPublicPath,
    filename: "server.js",
    libraryTarget: "commonjs2"
  };
  // Add some plugins...
  config.plugins = [
    // We define environment variables that can be accessed globally in our
    new webpack.DefinePlugin(dotenv.stringified),
    // Prevent creating multiple chunks for the server
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1
    })
  ];

  config.entry = [paths.appServerIndexJs];

  if (IS_DEV) {
    // Use watch mode
    config.watch = true;
    config.entry.unshift("webpack/hot/poll?300");

    // Pretty format server errors
    config.entry.unshift("razzle-dev-utils/prettyNodeErrors");

    const nodeArgs = ["-r", "source-map-support/register"];

    // Passthrough --inspect and --inspect-brk flags (with optional [host:port] value) to node
    if (process.env.INSPECT_BRK) {
      nodeArgs.push(process.env.INSPECT_BRK);
    } else if (process.env.INSPECT) {
      nodeArgs.push(process.env.INSPECT);
    }

    config.plugins = [
      ...config.plugins,
      // Add hot module replacement
      new webpack.HotModuleReplacementPlugin(),
      // Supress errors to console (we use our own logger)
      new StartServerPlugin({
        name: "server.js",
        nodeArgs
      }),
      // Ignore assets.json to avoid infinite recompile bug
      new webpack.WatchIgnorePlugin([paths.appManifest])
    ];
  }
}
