import Program from "./Program";
import { isGLint } from "./typeGuards";
import Texture from './Texture';
import Utils from "./Utils";
import { Model } from "./types";

// Manages objects in a 3D scene
class Scene {
  gl: WebGL2RenderingContext;
  program: Program;
  objects: any[];
  utils: Utils;

  constructor(gl: WebGL2RenderingContext, program: Program) {
    this.gl = gl;
    this.program = program;

    this.objects = [];
    this.utils = new Utils();
  }

  // Find the item with given alias
  get(alias: string): Model {
    return this.objects.find(object => object.alias === alias);
  }

  // Asynchronously load a file
  load(filename: string, alias?: string, attributes?: any): Promise<void> {
    return fetch(filename)
    .then(res => res.json())
    .then(object => {
      object.visible = true;
      object.alias = alias || object.alias;
      this.add(object, attributes);
    })
    .catch((err) => console.error(err, ...arguments));
  }

  // Helper function for returning as list of items for a given model
  loadByParts(path: string, count: number, alias?: string): void {
    for (let i = 1; i <= count; i++) {
      const part = `${path}${i}.json`;
      this.load(part, alias);
    }
  }

  // Add object to scene, by settings default and configuring all necessary
  // buffers and textures
  add(object: Model, attributes?: any): void {
    const { gl, program } = this;

    // Since we've used both the OBJ convention here (e.g. Ka, Kd, Ks, etc.)
    // and descriptive terms throughout the book for educational purposes, we will set defaults for
    // each that doesn't exist to ensure the entire series of demos work.
    // That being said, it's best to stick to one convention throughout your application.
    object.diffuse = object.diffuse || [1, 1, 1, 1];
    object.Kd = object.Kd || object.diffuse.slice(0, 3);

    object.ambient = object.ambient || [0.2, 0.2, 0.2, 1];
    object.Ka = object.Ka || object.ambient.slice(0, 3);

    object.specular = object.specular || [1, 1, 1, 1];
    object.Ks = object.Ks || object.specular.slice(0, 3);

    object.specularExponent = object.specularExponent || 0;
    object.Ns = object.Ns || object.specularExponent;

    object.d = object.d || 1;
    object.transparency = object.transparency || object.d;

    object.illum = object.illum || 1;

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
    if (program.attributeLocations.aVertexPosition >= 0) {
      const vertexBufferObject = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(object.vertices), gl.STATIC_DRAW);
      if (isGLint(program.attributeLocations.aVertexPosition)) {
        gl.enableVertexAttribArray(program.attributeLocations.aVertexPosition);
        gl.vertexAttribPointer(program.attributeLocations.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
      }
    }

    // Normals
    if (program.attributeLocations.aVertexNormal >= 0) {
      const normalBufferObject = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBufferObject);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(
        this.utils.calculateNormals(object.vertices, object.indices)),
        gl.STATIC_DRAW
      );
      if (isGLint(program.attributeLocations.aVertexNormal)) {
        gl.enableVertexAttribArray(program.attributeLocations.aVertexNormal);
        gl.vertexAttribPointer(program.attributeLocations.aVertexNormal, 3, gl.FLOAT, false, 0, 0);
      }
    }

    // Color Scalars
    if (object.scalars && program.attributeLocations.aVertexColor >= 0) {
      const colorBufferObject = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBufferObject);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(object.scalars), gl.STATIC_DRAW);
      if (isGLint(program.attributeLocations.aVertexColor)) {
        gl.enableVertexAttribArray(program.attributeLocations.aVertexColor);
        gl.vertexAttribPointer(program.attributeLocations.aVertexColor, 4, gl.FLOAT, false, 0, 0);
      }
    }

    // Textures coordinates
    if (object.textureCoords && program.attributeLocations.aVertexTextureCoords >= 0) {
      const textureBufferObject = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, textureBufferObject);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(object.textureCoords), gl.STATIC_DRAW);
      if (isGLint(program.attributeLocations.aVertexTextureCoords)) {
        gl.enableVertexAttribArray(program.attributeLocations.aVertexTextureCoords);
        gl.vertexAttribPointer(program.attributeLocations.aVertexTextureCoords, 2, gl.FLOAT, false, 0, 0);
      }

      // Tangents
      if (program.attributeLocations.aVertexTangent >= 0) {
        const tangentBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tangentBufferObject);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(
          this.utils.calculateTangents(object.vertices, object.textureCoords, object.indices)),
          gl.STATIC_DRAW
        );
        if (isGLint(program.attributeLocations.aVertexTangent)) {
          gl.enableVertexAttribArray(program.attributeLocations.aVertexTangent);
          gl.vertexAttribPointer(program.attributeLocations.aVertexTangent, 3, gl.FLOAT, false, 0, 0);
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

  // Traverses over every item in the scene
  traverse(cb: (object: Model, index: number) => void): void {
    for(let i = 0; i < this.objects.length; i++) {
      // Break out of the loop as long as any value is returned
      if (cb(this.objects[i], i) !== undefined) break;
    }
  }

  // Removes an item from the scene with a given alias
  remove(alias: string): void {
    const object = this.get(alias);
    const index = this.objects.indexOf(object);
    this.objects.splice(index, 1);
  }

  // Renders an item first
  renderFirst(alias: string): void {
    const object = this.get(alias);
    const index = this.objects.indexOf(object);
    if (index === 0) return;

    this.objects.splice(index, 1);
    this.objects.splice(0, 0, object);
    this.printRenderOrder();
  }

  // Renders an item last
  renderLast(alias: string): void {
    const object = this.get(alias);
    const index = this.objects.indexOf(object);
    if (index === 0) return;

    this.objects.splice(index, 1);
    this.objects.push(object);
    this.printRenderOrder();
  }

  // Pushes an item up the render priority
  renderSooner(alias: string): void {
    const object = this.get(alias);
    const index = this.objects.indexOf(object);
    if (index === 0) return;

    this.objects.splice(index, 1);
    this.objects.splice(index - 1, 0, object);
    this.printRenderOrder();
  }

  // Pushes an item down the render priority
  renderLater(alias: string): void {
    const object = this.get(alias);
    const index = this.objects.indexOf(object);
    if (index === this.objects.length - 1) return;

    this.objects.splice(index, 1);
    this.objects.splice(index + 1, 0, object);
    this.printRenderOrder();
  }

  // Construct and print a string representing the render order (useful for debugging)
  printRenderOrder(): void {
    const renderOrder = this.objects.map(object => object.alias).join(' > ');
    console.info('Render Order:', renderOrder);
  }

}

export default Scene;