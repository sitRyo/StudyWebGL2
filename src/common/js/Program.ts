import { AttributeLocations, GLAttribute, GLUniform, UniformLocations } from "./types";
import Utils from "./Utils";

class Program {
  utils: Utils;
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  attributeLocations: AttributeLocations;
  uniformLocations: UniformLocations;

  constructor(gl: WebGL2RenderingContext, vertShaderRawString: string, fragShaderRawString: string) {
    this.utils = new Utils();
    this.gl = gl;
    this.program = gl.createProgram();
    this.attributeLocations = {};
    this.uniformLocations = {};

    if (!(vertShaderRawString && fragShaderRawString)) {
      console.error('No shader IDs were provided');
      return;
    }

    gl.attachShader(this.program, this.utils.getShader(this.gl, vertShaderRawString, gl.VERTEX_SHADER));
    gl.attachShader(this.program, this.utils.getShader(this.gl, fragShaderRawString, gl.FRAGMENT_SHADER));
    gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error('Could not initialize shaders.');
      return;
    }

    this.useProgram();
  }

  useProgram = (): void => {
    this.gl.useProgram(this.program);
  }

  load = (attributes: GLAttribute[], uniforms: GLUniform[]) => {
    this.useProgram();
    this.setAttributeLocations(attributes);
    this.setUniformLocations(uniforms);
  }

  setAttributeLocations = (attributes: GLAttribute[]): void => {
    attributes.forEach(attribute => {
      console.log(this);
      this.attributeLocations[attribute] = this.gl.getAttribLocation(this.program, attribute);
    });
  }

  setUniformLocations = (uniforms: GLUniform[]): void => {
    uniforms.forEach(uniform => {
      this.uniformLocations[uniform] = this.gl.getUniformLocation(this.program, uniform);
    });
  }

  // gl.getUniform has any return type.
  getUniform = (uniformLocation: WebGLUniformLocation): any => {
    return this.gl.getUniform(this.program, uniformLocation);
  }
}

export default Program;