const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = (constants = {}) => ({
  entry: path.resolve(__dirname, "./app_index.js"),
  output: {
    filename: "bundle.[fullhash].js",
    path: constants.dist,
  },
  mode:'development',
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "./index.html"),
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
            presets: ["@babel/preset-react"],
            plugins: ["@babel/plugin-syntax-jsx"]
        }
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.png|svg|jpg|gif$/,
        use: ["file-loader"],
      }, 
    ],
  },
});