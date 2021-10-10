import { Program } from './Program';
import { isGLint } from './typeGuards';
import Texture from './Texture';
import Utils from './Utils';
import { Model } from './types';

export class Scene {
  gl: WebGL2RenderingContext;
  program: Program;
  objects: Model[];
  utils = new Utils();

  constructor(gl: WebGL2RenderingContext, program: Program) {
    this.gl = gl;
    this.program = program;
    this.objects = [];
  }

  // TODO: 戻り値
  get = (alias: string) => {
    return this.objects.find(object => object.alias === alias);
  }

  // TODO: 戻り値
  load = (filename: string, alias: string, attributes: string | undefined = undefined): Promise<void> => {
    return fetch(filename)
      .then(res => res.json())
      .then(object => {
        object.visible = true;
        object.alias = alias || object.alias;
        this.add(object, attributes);
      })
      .catch((err) => console.error(err));
  }

  // TODO: 実装
  loadByParts = (path: string, count: number, alias: string | undefined = undefined) => {
    for (let i = 1; i <= count; ++i) {
      const part = `${path}${i}.json`;
      this.load(part, alias);
    }
  }

  add = (object: any, attributes: string | undefined = undefined) => {
    const { gl, program } = this;

    object.diffuse = object?.diffuse || [1, 1, 1, 1];
    object.Kd = object?.Kd || object?.diffuse.slice(0, 3);

    object.ambient || [0.2, 0.2, 0.2, 1];
    object.Ka = object?.Ka || object?.ambient.slice(0, 3);

    object.specular = object.specular || [1, 1, 1, 1];
    object.Ks = object?.Ks || object?.specular.slice(0, 3);

    object.specularExponent = object?.specularExponent || 0;
    object.Ns = object?.Ns || object?.specularExponent;

    object.d = object?.d || 1;
    object.transparency = object?.transparency || object?.d;

    object.illum = object?.illum || 1;

    // Merge if any attributes are provided
    Object.assign(object, attributes);

    // Indices
    object.ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(object.indices), gl.STATIC_DRAW);

    // Attach a new VAO instance
    object.vao = gl.createVertexArray();

    // Enable it to start working on it
    gl.bindVertexArray(object.vao);

    // Positions
    if (program.attLocation.aVertexPosition >= 0) {
      const vertexBufferObject = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(object.vertices), gl.STATIC_DRAW);
      if (isGLint(program.attLocation.aVertexPosition)) {
        gl.enableVertexAttribArray(program.attLocation.aVertexPosition);
        gl.vertexAttribPointer(program.attLocation.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
      }
    }

    // Normals
    if (program.attLocation.aVertexNormal >= 0) {
      const normalBufferObject = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBufferObject);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(
        this.utils.calculateNormals(object.vertices, object.indices)),
        gl.STATIC_DRAW
      );
      if (isGLint(program.attLocation.aVertexNormal)) {
        gl.enableVertexAttribArray(program.attLocation.aVertexNormal);
        gl.vertexAttribPointer(program.attLocation.aVertexNormal, 3, gl.FLOAT, false, 0, 0);
      }
    }

    // Color Scalars
    if (object.scalars && program.attLocation.aVertexColor >= 0) {
      const colorBufferObject = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBufferObject);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(object.scalars), gl.STATIC_DRAW);
      if (isGLint(program.attLocation.aVertexColor)) {
        gl.enableVertexAttribArray(program.attLocation.aVertexColor);
        gl.vertexAttribPointer(program.attLocation.aVertexColor, 4, gl.FLOAT, false, 0, 0);  
      }
    }

    // Textures coordinates
    if (object.textureCoords && program.attLocation.aVertexTextureCoords >= 0) {
      const textureBufferObject = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, textureBufferObject);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(object.textureCoords), gl.STATIC_DRAW);
      if (isGLint(program.attLocation.aVertexTextureCoords)) {
        gl.enableVertexAttribArray(program.attLocation.aVertexTextureCoords);
        gl.vertexAttribPointer(program.attLocation.aVertexTextureCoords, 2, gl.FLOAT, false, 0, 0);
      }

      // Tangents
      if (program.attLocation.aVertexTangent >= 0) {
        const tangentBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tangentBufferObject);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(
          this.utils.calculateTangents(object.vertices, object.textureCoords, object.indices)),
          gl.STATIC_DRAW
        );
        if (isGLint(program.attLocation.aVertexTangent)) {
          gl.enableVertexAttribArray(program.attLocation.aVertexTangent);
          gl.vertexAttribPointer(program.attLocation.aVertexTangent, 3, gl.FLOAT, false, 0, 0);
        }
      }
    }

    // Image texture
    if (object.image) {
      object.texture = new Texture(gl, object.image);
    }

    // Push to our objects list for later access
    this.objects.push(object);

    // Clean up
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  traverse = (cb: any): void => {
    for(let i = 0; i < this.objects.length; ++i) {
      if (cb(this.objects[i], i) !== undefined) break;
    }
  }

  remove = (alias: string): void => {
    const object = this.get(alias);
    const index = this.objects.indexOf(object);
    this.objects.splice(index, 1);
  }

  renderFirst = (alias: string) => {
    const object = this.get(alias);
    const index = this.objects.indexOf(object);
    if (index === 0) return;

    this.objects.splice(index, 1);
  }

  renderLast = (alias: string) => {
    const object = this.get(alias);
    const index = this.objects.indexOf(object);
    if (index === 0) return;

    this.objects.splice(index, 1);
    this.objects.push(object);
    this.printRenderOrder();
  }

  renderSooner = (alias: string) => {
    const object = this.get(alias);
    const index = this.objects.indexOf(object);
    if (index === 0) return;

    this.objects.splice(index, 1);
    this.objects.splice(index - 1, 0, object);
    this.printRenderOrder();
  }

  renderLater = (alias: string) => {
    const object = this.get(alias);
    const index = this.objects.indexOf(object);
    if (index === this.objects.length - 1) return;

    this.objects.splice(index, 1);
    this.objects.splice(index + 1, 0, object);
    this.printRenderOrder();
  }

  printRenderOrder= (): void => {
    const renderOrder = this.objects.map(object => object.alias).join(' > ');
    console.info('Render Order:', renderOrder);
  }
}