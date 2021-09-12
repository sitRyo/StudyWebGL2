#version 300 es
precision mediump float;

// 頂点座標をアトリビュートに伝える
in vec3 aVertexPosition;

void main(void) {
  // クリップ座標にポジションを設定
  gl_Position = vec4(aVertexPosition, 1.0);
}