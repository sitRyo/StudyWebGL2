#version 300 es
precision mediump float;

uniform float uShininess;
uniform vec3 uLightDirection;
uniform vec4 uLightAmbient;
uniform vec4 uLightDiffuse;
uniform vec4 uLightSpecular;
uniform vec4 uMaterialAmbient;
uniform vec4 uMaterialDiffuse;
uniform vec4 uMaterialSpecular;

in vec3 vNormal;
in vec3 vEyeVector;

out vec4 fragColor;

void main(void) {
  vec3 L = normalize(uLightDirection);
  vec3 N = normalize(vNormal);
  float lambertTerm = dot(N, -L);
  vec4 Ia = uLightAmbient * uMaterialAmbient;
  vec4 Id = vec4(0.0, 0.0, 0.0, 1.0);
  vec4 Is = vec4(0.0, 0.0, 0.0, 1.0);

  if (lambertTerm > 0.0) {
    Id = uLightDiffuse * uMaterialDiffuse * lambertTerm;
    vec3 E = normalize(vEyeVector);
    vec3 R = reflect(L, N);
    float specular = pow(max(dot(R, E), 0.0), uShininess);
    Is = uLightSpecular * uMaterialSpecular * specular;
  }

  fragColor = vec4(vec3(Ia + Id + Is), 1.0);
}