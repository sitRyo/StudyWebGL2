function strEnum<T extends string>(o: Array<T>): {[K in T]: K} {
  return o.reduce((res, key) => {
    res[key] = key;
    return res;
  }, Object.create(null));
}

// common/models/geometriesのjsonのインターフェース
export interface Model {
  Ka?: number[];
  Kd?: number[];
  Ks?: number[];
  Ns?: number;
  d?: number;
  dimension?: number;
  illum?: number;
  lines?: number;
  scalars?: number[];
  textureCoords?: number[];
  specularExponent?: number;
  transparency?: number;
  color?: number[];
  vertices?: number[];
  indices?: number[];
  alias?: string;
  ambient?: number[];
  diffuse?: number[];
  specular?: number[];
  vao?: WebGLVertexArrayObject;
  ibo?: WebGLBuffer;
  wireframe?: boolean;
  image?: string;
  texture?: WebGLTexture;
  hidden?: boolean;
}

// シェーダーに渡すattributeのリテラル型定義
export const AttributeKind = strEnum(['aVertexPosition', 'aVertexNormal', 'aVertexColor', 'aVertexTextureCoords', 'aVertexTangent']);
export type GLAttribute = keyof typeof AttributeKind;
export type AttributeLocations = { [key in GLAttribute]?: GLint | null };

export const UniformKind = strEnum(['uProjectionMatrix', 'uModelViewMatrix', 'uNormalMatrix', 'uMaterialAmbient', 'uMaterialDiffuse', 'uMaterialSpecular', 'uShininess', 'uLightAmbient', 'uLightDiffuse', 'uLightSpecular', 'uLightDirection', 'uLightPosition', 'uWireframe', 'uFixedLight', 'uUpdateLight', 'uPerVertexColor', 'uTranslation', 'uTranslate', 'uAlpha', 'uUseVertexColor', 'uUseLambert', 'uDiffuseRedLight', 'uDiffuseGreenLight', 'uDiffuseBlueLight', 'uPositionRedLight', 'uPositionGreenLight', 'uPositionBlueLight', 'uLightSource', 'uCutOff', 'uPositionLight', 'uSampler', 'uSampler2']);
export type GLUniform = keyof typeof UniformKind
export type UniformLocations = { [key in GLUniform]?: WebGLUniformLocation | null };