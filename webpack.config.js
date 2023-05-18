const path = require("path");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = {
  mode: "production",
  entry: {
    client: "./src/fireflyClient.ts",
    "client.min": "./src/fireflyClient.ts",
  },
  output: {
    path: path.resolve(__dirname, "bundles"),
    filename: "[name].js",
    libraryTarget: "umd",
    library: "Client",
    umdNamedDefine: true,
  },
  resolve: {
    extensions: [".ts", ".js"],
    fallback: {
      "tls": false,
      "fs": false,
      "net": false
    }
  },
  devtool: "source-map",
  plugins: [
    new UglifyJsPlugin({
      sourceMap: true,
      include: /\.min\.js$/,
    }),
    new NodePolyfillPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: "ts-loader",
        exclude: [/node_modules/, /test/],
      },
    ],
  },
  resolveLoader: {
    modules: [path.join(__dirname, "node_modules")],
  },
};
