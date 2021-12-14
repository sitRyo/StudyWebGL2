import Camera, { CameraTypes } from "../common/js/Camera";
import Clock from "../common/js/Clock";
import Program from "../common/js/Program";
import Scene from "../common/js/Scene";
import Transforms from "../common/js/Transforms";
import Utils from "../common/js/Utils";
import vertexShader from "../common/shaders/ch07/02_vertexShader.vert";
import fragmentShader from "../common/shaders/ch07/02_fragmentShader.frag";
import Controls from "../common/js/Controls";
import { GLAttribute, GLUniform } from "../common/js/types";

const utils = new Utils();

let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let camera: Camera;
let transforms: Transforms;
let clock: Clock;
let useVertexColors = false;
let texture: WebGLTexture; 

function configure() {
  const canvas = utils.getCanvas('webgl-canvas');
  utils.autoResizeCanvas(canvas);

  gl = utils.getGLContext(canvas);
  gl.clearColor(0.9, 0.9, 0.9, 1);
  gl.clearDepth(100);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  program = new Program(gl, vertexShader, fragmentShader);

  const attributes: GLAttribute[] = [
    'aVertexPosition',
    'aVertexNormal',
    'aVertexColor',
    'aVertexTextureCoords',
  ];

  const uniforms: GLUniform[] = [
    'uProjectionMatrix',
    'uModelViewMatrix',
    'uNormalMatrix',
    'uMaterialDiffuse',
    'uMaterialAmbient',
    'uLightAmbient',
    'uLightDiffuse',
    'uLightPosition',
    'uWireframe',
    'uAlpha',
    'uUseVertexColor',
    'uUseLambert',
    'uSampler',
  ];

  program.load(attributes, uniforms);

  clock = new Clock();

  scene = new Scene(gl, program);

  camera = new Camera(CameraTypes.ORBITING_TYPE);
  camera.goHome([0, 0, 4]);
  camera.setFocus([0, 0, 0]);
  camera.setAzimuth(45);
  camera.setElevation(-30);
  new Controls(camera, canvas);

  transforms = new Transforms(gl, program, camera, canvas);

  gl.uniform3fv(program.uniformLocations.uLightPosition, [0, 5, 20]);
  gl.uniform3fv(program.uniformLocations.uLightAmbient, [1, 1, 1, 1]);
  gl.uniform4fv(program.uniformLocations.uLightDiffuse, [1, 1, 1, 1]);
  gl.uniform1f(program.uniformLocations.uAlpha, 1.0);
  gl.uniform1i(program.uniformLocations.uUseVertexColor, Number(useVertexColors));
  gl.uniform1i(program.uniformLocations.uUseLambert, Number(true));

  texture = gl.createTexture();
  const image = new Image();

  image.src = '/common/images/webgl.png';

  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
}

function load() {
  scene.load('/common/models/geometries/cube-texture.json');
}

function draw() {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  transforms.updatePerspective();

  try {
    scene.traverse(object => {
      if (object.hidden) return;

      transforms.calculateModelView();
      transforms.push();
      transforms.setMatrixUniforms();
      transforms.pop();

      gl.uniform4fv(program.uniformLocations.uMaterialDiffuse, object.diffuse);
      gl.uniform4fv(program.uniformLocations.uMaterialAmbient, object.ambient);
      gl.uniform1i(program.uniformLocations.uWireframe, Number(object.wireframe));
      gl.uniform1i(program.uniformLocations.uUseVertexColor, Number(useVertexColors));

      // Bind
      gl.bindVertexArray(object.vao);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);

      if (object.textureCoords) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(program.uniformLocations.uSampler, 0);
      }

      // Draw
      if (object.wireframe) {
        gl.drawElements(gl.LINES, object.indices.length, gl.UNSIGNED_SHORT, 0);
      }
      else {
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
        gl.drawElements(gl.TRIANGLES, object.indices.length, gl.UNSIGNED_SHORT, 0);
        gl.cullFace(gl.BACK);
        gl.drawElements(gl.TRIANGLES, object.indices.length, gl.UNSIGNED_SHORT, 0);
        gl.disable(gl.CULL_FACE);
      }

      // Clean
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    });
  }
  catch (error) {
    console.error(error);
  }
}

export function init() {
  configure();
  load();
  clock.on('tick', draw);

  initControls();
}

function initControls() {
  utils.configureControls({
    'Use Lambert Term': {
      value: true,
      onChange: v => gl.uniform1i(program.uniformLocations.uUseLambert, v)
    },
    'Use Per Vertex': {
      value: useVertexColors,
      onChange: v => useVertexColors = v
    },
    'Alpha Value': {
      value: 1,
      min: 0, max: 1, step: 0.1,
      onChange: v => gl.uniform1f(program.uniformLocations.uAlpha, v)
    }
  });
}
