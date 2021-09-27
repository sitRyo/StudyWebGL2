#version 300 es
precision mediump float;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;
uniform vec3 uLightDirection;
uniform vec4 uLightAmbient;
uniform vec4 uLightDiffuse;
uniform vec4 uMaterialDiffuse;

in vec3 aVertexPosition;
in vec3 aVertexNormal;

out vec4 vVertexColor;

void main(void) {
  vec3 N = vec3(uNormalMatrix * vec4(aVertexNormal, 1.0));
  vec3 L = normalize(uLightDirection);
  float lambertTerm = dot(N, -L);

  vec4 Ia = uLightAmbient;
  vec4 Id = uMaterialDiffuse * uLightDiffuse * lambertTerm;

  vVertexColor = vec4(vec3(Ia + Id), 1.0);
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aVertexPosition, 1.0);
}