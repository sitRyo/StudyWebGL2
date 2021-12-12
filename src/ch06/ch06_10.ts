import Camera, { CameraTypes } from "../common/js/Camera";
import Clock from "../common/js/Clock";
import Program from "../common/js/Program";
import Scene from "../common/js/Scene";
import Transforms from "../common/js/Transforms";
import { GLAttribute, GLUniform } from "../common/js/types";
import Utils from "../common/js/Utils";
import Controls from "../common/js/Controls";
import vertexShader from "../common/shaders/ch06/10_vertexShader.vert";
import fragmentShader from "../common/shaders/ch06/10_fragmentShader.frag";

const utils = new Utils();

let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let camera: Camera;
let transforms: Transforms;
let clock: Clock;
let blendingEquation: number;
let blendingSource: number;
let blendingTarget: number;
let blendingColor = [0, 1, 0];
let blendingAlpha = 1;
let showFrontFace = true;
let showBackFace = true;

function configure() {
  const canvas = utils.getCanvas('webgl-canvas');
  utils.autoResizeCanvas(canvas);

  gl = utils.getGLContext(canvas);
  gl.clearColor(0.9, 0.9, 0.9, 1);
  gl.clearDepth(1);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.blendColor(blendingColor[0], blendingColor[1], blendingColor[2], blendingAlpha);
  gl.enable(gl.CULL_FACE);

  // Set values
  blendingEquation = gl.FUNC_ADD;
  blendingSource = gl.SRC_ALPHA;
  blendingTarget = gl.ONE_MINUS_SRC_ALPHA;

  program = new Program(gl, vertexShader, fragmentShader);

  const attributes: GLAttribute[] = [
    'aVertexPosition',
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
    'uWireframe',
    'uAlpha',
    'uUseLambert'
  ];

  program.load(attributes, uniforms);

  clock = new Clock();
  scene = new Scene(gl, program);

  camera = new Camera(CameraTypes.ORBITING_TYPE);
  camera.goHome([0, 0, 4]);
  camera.setFocus([0, 0, 0]);
  camera.setAzimuth(50);
  camera.setElevation(-30);
  new Controls(camera, canvas);

  transforms = new Transforms(gl, program, camera, canvas);

  gl.uniform3fv(program.uniformLocations.uLightPosition, [0, 5, 20]);
  gl.uniform4fv(program.uniformLocations.uLightAmbient, [1, 1, 1, 1]);
  gl.uniform4fv(program.uniformLocations.uLightDiffuse, [1, 1, 1, 1]);
  gl.uniform1f(program.uniformLocations.uAlpha, 0.5);
  gl.uniform1i(program.uniformLocations.uUseLambert, Number(false));
}

function load() {
  scene.load('/common/models/geometries/cube-complex.json', 'cube');
}

function draw() {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  transforms.updatePerspective();

  try {
    scene.traverse(object => {
      transforms.calculateModelView();
      transforms.push();
      transforms.setMatrixUniforms();
      transforms.pop();

      gl.uniform4fv(program.uniformLocations.uMaterialDiffuse, object.diffuse);
      gl.uniform4fv(program.uniformLocations.uMaterialAmbient, object.ambient);
      gl.uniform1i(program.uniformLocations.uWireframe, Number(object.wireframe));

      // Bind
      gl.bindVertexArray(object.vao);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);

      // Draw
      if (object.wireframe) {
        gl.drawElements(gl.LINES, object.indices.length, gl.UNSIGNED_SHORT, 0);
      }
      else {
        if (showBackFace) {
          gl.cullFace(gl.FRONT);
          gl.drawElements(gl.TRIANGLES, object.indices.length, gl.UNSIGNED_SHORT, 0);
        }
        if (showFrontFace) {
          gl.cullFace(gl.BACK);
          gl.drawElements(gl.TRIANGLES, object.indices.length, gl.UNSIGNED_SHORT, 0);
        }
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
  const blendFuncs = [
    'ZERO',
    'ONE',
    'SRC_COLOR',
    'DST_COLOR',
    'SRC_ALPHA',
    'DST_ALPHA',
    'CONSTANT_COLOR',
    'CONSTANT_ALPHA',
    'ONE_MINUS_SRC_ALPHA',
    'ONE_MINUS_DST_ALPHA',
    'ONE_MINUS_SRC_COLOR',
    'ONE_MINUS_DST_COLOR',
    'ONE_MINUS_CONSTANT_COLOR',
    'ONE_MINUS_CONSTANT_ALPHA'
  ];

  function updateBlending(value = true) {
    gl[value ? 'enable' : 'disable'](gl.BLEND);
    gl.blendEquation(blendingEquation);
    gl.blendFunc(blendingSource, blendingTarget);
    gl.blendColor(blendingColor[0], blendingColor[1], blendingColor[2], blendingAlpha);
  }

  utils.configureControls({
    'Alpha Blending': {
      value: true,
      onChange: updateBlending
    },
    'Render Front Face': {
      value: true,
      onChange: v => showFrontFace = v
    },
    'Render Back Face': {
      value: true,
      onChange: v => showBackFace = v
    },
    'Alpha Value': {
      value: 0.5,
      min: 0, max: 1, step: 0.1,
      onChange: v => gl.uniform1f(program.uniformLocations.uAlpha, v)
    },
    'Blend Function': {
      value: blendingEquation,
      options: ['FUNC_ADD', 'FUNC_SUBTRACT', 'FUNC_REVERSE_SUBTRACT'],
      onChange: v => {
        blendingEquation = gl[v];
        updateBlending();
      }
    },
    Source: {
      value: blendingSource,
      options: [...blendFuncs, 'SRC_ALPHA_SATURATE'],
      onChange: v => {
        blendingSource = gl[v];
        updateBlending();
      }
    },
    Destination: {
      value: blendingTarget,
      options: blendFuncs,
      onChange: v => {
        blendingTarget = gl[v];
        updateBlending();
      }
    },
    'Blending Color': {
      value: [0, 0, 0],
      onChange: v => {
        blendingColor = utils.normalizeColor(v);
        updateBlending();
      }
    },
    'Constant Alpha': {
      value: 1,
      min: 0, max: 1, step: 0.1,
      onChange: v => {
        blendingAlpha = v;
        updateBlending();
      }
    },
  });
}