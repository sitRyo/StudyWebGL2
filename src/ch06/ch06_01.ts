import Camera, { CameraTypes } from "../common/js/Camera";
import Clock from "../common/js/Clock";
import Controls from "../common/js/Controls";
import Program from "../common/js/Program";
import Scene from "../common/js/Scene";
import Transforms from '../common/js/Transforms'
import { GLAttribute, GLUniform } from "../common/js/types";
import Utils from "../common/js/Utils";
import vertexShaders from "../common/shaders/ch06/01_vertexShader.vert";
import fragmentShaders from "../common/shaders/ch06/01_fragmentShader.frag";

const utils = new Utils();

let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let camera: Camera;
let transforms: Transforms; 
let clock: Clock;
let useVertexColors = false;

function configure() {
  const canvas = utils.getCanvas('webgl-canvas');
  utils.autoResizeCanvas(canvas);

  gl = utils.getGLContext(canvas);
  gl.clearColor(0.9, 0.9, 0.9, 1);
  gl.clearDepth(1);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);

  // Uncomment
  // gl.disable(gl.DEPTH_TEST);
  // gl.enable(gl.BLEND);
  // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  program = new Program(gl, vertexShaders, fragmentShaders);

  const attributes: GLAttribute[] = [
    'aVertexPosition',
    'aVertexNormal',
    'aVertexColor'
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
    'uAlpha',
    'uUseVertexColor',
    'uUseLambert'
  ];

  program.load(attributes, uniforms);

  clock = new Clock();
  scene = new Scene(gl, program);

  camera = new Camera(CameraTypes.ORBITING_TYPE);
  camera.goHome([0, 0, 3]);
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
}

function load() {
  scene.load('/common/models/geometries/cube-simple.json', 'simpleCube', { hidden: false });
  scene.load('/common/models/geometries/cube-complex.json', 'complexCube', { hidden: true });
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

      gl.uniform1i(program.uniformLocations.uUseVertexColor, Number(useVertexColors));
      gl.uniform4fv(program.uniformLocations.uMaterialDiffuse, object.diffuse);
      gl.uniform4fv(program.uniformLocations.uMaterialAmbient, object.ambient);

      // Bind
      gl.bindVertexArray(object.vao);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);

      // Draw
      gl.drawElements(gl.TRIANGLES, object.indices.length, gl.UNSIGNED_SHORT, 0);

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
    Lambert: {
      value: true,
      onChange: v => gl.uniform1i(program.uniformLocations.uUseLambert, v)
    },
    'Per Vertex': {
      value: useVertexColors,
      onChange: v => useVertexColors = v
    },
    'Complex Cube': {
      value: false,
      onChange: v => {
        const simpleCube = scene.get('simpleCube');
        const complexCube = scene.get('complexCube');
        if (v) {
          simpleCube.hidden = true;
          complexCube.hidden = false;
        }
        else {
          simpleCube.hidden = false;
          complexCube.hidden = true;
        }
      }
    },
    'Alpha Value': {
      value: 1,
      min: 0, max: 1, step: 0.1,
      onChange: v => gl.uniform1f(program.uniformLocations.uAlpha, v)
    }
  });
}