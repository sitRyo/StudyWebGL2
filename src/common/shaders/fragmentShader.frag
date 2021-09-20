#version 300 es
precision mediump float;

uniform vec3 uModelColor;

// シェーダーから得られる色
out vec4 fragColor;

void main(void) {
  fragColor = vec4(uModelColor, 1.0);
}