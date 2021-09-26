#version 300 es
precision mediump float;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;
// Lights
uniform vec3 uLightDirection; // 光源方向
uniform vec4 uLightAmbient; // 環境光
uniform vec4 uLightDiffuse; // 拡散反射光
uniform vec4 uLightSpecular; // 鏡面反射光
// Materials
uniform vec4 uMaterialAmbient;
uniform vec4 uMaterialDiffuse;
uniform vec4 uMaterialSpecular;
uniform float uShininess; // 光沢度

in vec3 aVertexPosition; // 頂点位置
in vec3 aVertexNormal; // 法線

// 出力する頂点カラー
out vec4 vVertexColor;

void main(void) {
  vec4 vertex = uModelViewMatrix * vec4(aVertexPosition, 1.0);

  // 法線の計算
  vec3 N = vec3(uNormalMatrix * vec4(aVertexNormal, 1.0));

  // 光源の向きを計算
  vec3 L = normalize(uLightDirection);

  // 法線と反転した光線ベクトルの内積（ランバート反射の計算）
  float lambertTerm = dot(N, -L);

  // 環境光（Ambient）
  vec4 Ia = uMaterialDiffuse * uLightAmbient;
  // 拡散反射光（Diffuse）
  vec4 Id = vec4(0.0, 0.0, 0.0, 1.0);
  // 鏡面反射光（Specular）
  vec4 Is = vec4(0.0, 0.0, 0.0, 1.0);

  // 法線と光源ベクトルの内積が0以上の場合
  if (lambertTerm > 0.0) {
    Id = uLightDiffuse * uMaterialDiffuse * lambertTerm;
    vec3 eyeVec = -vec3(vertex.xyz);
    vec3 E = normalize(eyeVec); // 視線ベクトル
    vec3 R = reflect(L, N); // 入射光の反射ベクトル
    float specular = pow(max(dot(R, E), 0.0), uShininess); // 鏡面反射
    Is = uLightSpecular * uMaterialSpecular * specular; // 光源とマテリアルの鏡面反射色と光沢度
  }

  vVertexColor = vec4(vec3(Ia + Id + Is), 1.0);
  // 頂点位置を設定
  // 頂点のワールド座標にカメラ変換行列、プロジェクション変換行列を反映させる
  gl_Position = uProjectionMatrix * vertex;
}