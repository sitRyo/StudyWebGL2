#version 300 es
precision mediump float;

// シェーダーから得られる色
out vec4 fragColor;

void main(void) {
  vec4 colorNormalizer = vec4(255, 255, 255, 1.0);
  vec4 color = vec4(250, 111, 103, 1.0);
  fragColor = color / colorNormalizer;
}