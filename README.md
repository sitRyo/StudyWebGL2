# Study WebGL2
[初めてのWebGL2 Javascriptで開発するリアルタイム3Dアプリケーション](https://www.amazon.co.jp/%E5%88%9D%E3%82%81%E3%81%A6%E3%81%AEWebGL-%E7%AC%AC2%E7%89%88-%E2%80%95JavaScript%E3%81%A7%E9%96%8B%E7%99%BA%E3%81%99%E3%82%8B%E3%83%AA%E3%82%A2%E3%83%AB%E3%82%BF%E3%82%A4%E3%83%A03D%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3-Farhad-Ghayour/dp/4873119375) をTypescriptに移植しつつ、WebGL2を勉強しようプロジェクト。  
作者様のリポジトリは[こちら](https://github.com/PacktPublishing/Real-Time-3D-Graphics-with-WebGL-2)

## Build
webpack5を使用。  
dev-serverを利用してリアルタイムで変更をブラウザに反映させる

* watch
```bash
$ npm start
```

参考
* [最新版TypeScript+webpack 5の環境構築まとめ(React, Vue.js, Three.jsのサンプル付き)](https://ics.media/entry/16329/)

## シェーダー
頂点シェーダーとフラグメントシェーダーはwebpackを利用して, typescript内で文字列として取得できるようにしている。  
具体的にはwebpack.config.jsを参照

参考
* [【WebGL / GLSL】webpack,glslify,VS Codeでシェーダーを効率よく開発する！](https://qiita.com/yukiTTT/items/0827e39bcdb8ced681aa) 
* [webpack + typescript + three.jsでGLSL（.frag|.vert）を外部モジュールとしてimportする](https://blog.5ebec.dev/posts/webpack-ts-three-js-glsl/)

## その他参考サイト
* [TypeScript Deep Dive日本語版 リテラル型](https://typescript-jp.gitbook.io/deep-dive/type-system/literal-types)