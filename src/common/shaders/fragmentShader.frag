#version 300 es
precision mediump float;

// 頂点シェーダーから補完された値を受け取る
in vec4 vVertexColor;

// 最終的な色はfragColorとして返す
out vec4 fragColor;

void main(void) {
  fragColor = vVertexColor;
}