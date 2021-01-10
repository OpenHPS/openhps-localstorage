const TerserPlugin = require('terser-webpack-plugin');
const EsmWebpackPlugin = require("@purtuga/esm-webpack-plugin");
const path = require('path');
const pkg = require("./package.json");

const LIBRARY_NAME = pkg.name;
const PROJECT_NAME = pkg.name.replace("@", "").replace("/", "-");

const defaultConfig = env => ({
  mode: env.prod ? "production" : "development",
  devtool: 'source-map',
  optimization: {
    minimize: env.prod,
    minimizer: [
      new TerserPlugin({
        cache: true,
        parallel: true,
        sourceMap: true,
        terserOptions: {
          keep_classnames: true,
        }
      })
    ],
    portableRecords: true,
    usedExports: true,
    providedExports: true
  },
  performance: {
    hints: false,
    maxEntrypointSize: 300000,
    maxAssetSize: 300000
  },
});

const bundle = (env, module) => ({
  name: PROJECT_NAME,
  entry: `./dist/${module ? "esm" : "cjs"}/index.js`,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: `web/${PROJECT_NAME}${module ? ".es" : ""}${env.prod ? ".min" : ""}.js`,
    library: module ? "LIB" : LIBRARY_NAME,
    libraryTarget: module ? "var" : "umd",
    umdNamedDefine: !module,
    globalObject: `(typeof self !== 'undefined' ? self : this)`,
  },
  externals: ["@openhps/core"],
  plugins: module ? [new EsmWebpackPlugin()] : [],
  ...defaultConfig(env)
});

module.exports = env => [
  //bundle(env, true),
  bundle(env, false)
];
