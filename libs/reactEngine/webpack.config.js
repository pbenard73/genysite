const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = (constants = {}, config = {}) => ({
  entry: path.resolve(constants.tmp, "./app_index.js"),
  output: {
    filename: "bundle.[fullhash].js",
    path: constants.dist,
  },
  mode:'development',
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(constants.tmp, "./index.html"),
    }),
  ],
  resolve: {
    modules: [path.resolve(__dirname, '../../node_modules'), "src", "node_modules"],
    extensions: ["*", ".js", ".jsx", ".tsx", ".ts"],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: require.resolve("babel-loader"),
        options: {
            presets: [require.resolve("@babel/preset-react")],
            plugins: [require.resolve("@babel/plugin-syntax-jsx")]
        }
      },
      {
        test: /\.css$/,
        use: [require.resolve("style-loader"), require.resolve("css-loader")],
      },
      {
        test: /\.png|svg|jpg|gif$/,
        use: [require.resolve("file-loader")],
      }, 
    ],
  },
});
