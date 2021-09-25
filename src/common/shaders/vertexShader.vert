#version 300 es
precision mediump float;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;
uniform vec3 uLightDirection;
uniform vec3 uLightDiffuse;
uniform vec3 uMaterialDiffuse; 

in vec3 aVertexPosition;
in vec3 aVertexNormal;

// 出力する頂点カラー
out vec4 vVertexColor;

void main(void) {
  // 法線の計算
  vec3 N = normalize(vec3(uNormalMatrix * vec4(aVertexNormal, 1.0)));
  // ライトの位置を計算
  vec3 light = vec3(uModelViewMatrix * vec4(uLightDirection, 0.0));
  // 光線の向きを計算
  vec3 L = normalize(light);
  // 法線と反転した光線ベクトルの内積（ランバート反射の計算）
  float lambertTerm = dot(N, -L);
  // ランバート反射モデルに基づいた拡散反射色の計算
  vec3 Id = uMaterialDiffuse * uLightDiffuse * lambertTerm;
  vVertexColor = vec4(Id, 1.0);
  // 頂点位置を設定
  // 頂点のワールド座標にカメラ変換行列、プロジェクション変換行列を反映させる
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aVertexPosition, 1.0);
}