const path = require('path');
module.exports = {
  entry: { bundle: path.join(__dirname, './src/index.ts') },

  output: {
    filename: 'bundle.js',
    path: path.join(__dirname, 'dist')
  },

  mode: process.env.NODE_ENV || 'development',

  devtool: 'cheap-module-source-map',

  watchOptions: {
    ignored: /node_modules|dist|\.js/g
  },

  resolve: {
    extensions: ['.ts', '.js', '.json', '.mjs '],
    plugins: []
  },

  module: {
    rules: [
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto'
      },
      {
        test: /\.ts$/,
        loader: 'awesome-typescript-loader'
      }
    ]
  }
};
