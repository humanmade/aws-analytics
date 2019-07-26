const path = require("path");
const mode = process.env.NODE_ENV || "production";
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer")
  .BundleAnalyzerPlugin;

const sharedConfig = {
  mode: mode,
  entry: {
    analytics: path.resolve(__dirname, "src/analytics.js"),
  },
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "[name].js",
    publicPath: ".",
    libraryTarget: "this",
    jsonpFunction: "HManalyticsJSONP",
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              require("@babel/preset-env"),
              require("@babel/preset-react"),
            ],
            plugins: [
              require("@babel/plugin-transform-runtime"),
              require('@wordpress/babel-plugin-import-jsx-pragma'),
            ],
          },
        },
      },
    ],
  },
  optimization: {
    noEmitOnErrors: true,
  },
  plugins: [],
  devtool:
    mode === "production"
      ? "cheap-module-source-map"
      : "cheap-module-eval-source-map",
  externals: {
    "Altis": "Altis",
    "wp": "wp",
    "react": "React",
    "react-dom": "ReactDOM",
  },
};

if (process.env.ANALYSE_BUNDLE) {
  // Add bundle analyser.
  sharedConfig.plugins.push(new BundleAnalyzerPlugin());
}

module.exports = sharedConfig;
