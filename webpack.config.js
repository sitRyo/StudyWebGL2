var path = require('path');

module.exports = {
  // productionで最適化されたjsが出力される
  mode: 'development',
  entry: './src/App.js',
  
  // webpack-dev-serverの設定
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    open: true,
  },

  module: {
    rules: [
      {
        // 拡張子 .ts の場合
        // TypeScript をコンパイルする
        test: /\.ts$/,
        use: 'ts-loader',
      },
    ],
  },
  
  // import 文で .ts ファイルを解決するため
  // これを定義しないと import 文で拡張子を書く必要が生まれる。
  resolve: {
    extensions: [
      '.ts', '.js',
    ],
  },
};