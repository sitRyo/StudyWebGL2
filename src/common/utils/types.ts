function strEnum<T extends string>(o: Array<T>): {[K in T]: K} {
  return o.reduce((res, key) => {
    res[key] = key;
    return res;
  }, Object.create(null));
}

// common/models/geometriesのjsonのインターフェース
export interface Model {
  color?: number[];
  vertices?: number[];
  indices?: number[];
  alias?: string;
  ambient?: number[];
  diffuse?: number[];
  specular?: number[];
  vao?: WebGLVertexArrayObject;
  ibo?: WebGLBuffer;
}

// シェーダーに渡すattributeのリテラル型定義
export const AttributeKind = strEnum(['aVertexPosition', 'aVertexNormal', 'uProjectionMatrix', 'uModelViewMatrix', 'uNormalMatrix', 'uMaterialAmbient', 'uMaterialDiffuse', 'uMaterialSpecular', 'uShininess', 'uLightAmbient', 'uLightDiffuse', 'uLightSpecular', 'uLightDirection', 'uLightPosition']);
export type GLAttribute = keyof typeof AttributeKind;
export type AttLocation = { [key in GLAttribute]?: GLint | WebGLUniformLocation | null };

export type vec3 = [number, number, number];