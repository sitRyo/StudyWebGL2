import Camera, { CameraTypes } from "../common/js/Camera";
import Clock from "../common/js/Clock";
import Controls from "../common/js/Controls";
import Program from "../common/js/Program";
import Scene from "../common/js/Scene";
import Transforms from '../common/js/Transforms'
import { GLAttribute, GLUniform } from "../common/js/types";
import Utils from "../common/js/Utils";
import { vec3, vec4, mat4 } from 'gl-matrix';
import Floor from '../common/js/Floor';
import vertexShaders from "../common/shaders/ch06/09_vertexShader.vert";
import fragmentShaders from "../common/shaders/ch06/09_fragmentShader.frag";

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
let blending = true;
let depthTest = true;
let culling = true;
let lambert = true;
let floor = true;
let coneColor = [0, 1, 1, 1] as vec4;
let sphereColor = [0.7, 0, .7, 1] as vec4;
let blendingColor = [0, 1, 0] as vec3;
let blendingAlpha = 1;

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

  program = new Program(gl, vertexShaders, fragmentShaders);

  const attributes: GLAttribute[] = [
    'aVertexPosition',
    'aVertexNormal'
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
    'uUseLambert'
  ];

  program.load(attributes, uniforms);

  clock = new Clock();

  scene = new Scene(gl, program);

  camera = new Camera(CameraTypes.ORBITING_TYPE);
  camera.goHome([0, 5, 35]);
  camera.setFocus([0, 0, 0]);
  camera.setAzimuth(25);
  camera.setElevation(-25);
  new Controls(camera, canvas);

  transforms = new Transforms(gl, program, camera, canvas);

  gl.uniform3fv(program.uniformLocations.uLightPosition, [0, 5, 20]);
  gl.uniform4fv(program.uniformLocations.uLightAmbient, [1, 1, 1, 1]);
  gl.uniform4fv(program.uniformLocations.uLightDiffuse, [1, 1, 1, 1]);
  gl.uniform1i(program.uniformLocations.uUseLambert, Number(lambert));
}

function load() {
  scene.add(new Floor(80, 2));
  scene.load('/common/models/geometries/cone3.json', 'cone', { diffuse: coneColor });
  scene.load('/common/models/geometries/sphere2.json', 'sphere', { diffuse: sphereColor });
}

function draw() {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  transforms.updatePerspective();

  try {
    scene.traverse(object => {
      const { alias } = object;

      if (alias === 'floor' && !floor) return;

      transforms.calculateModelView();
      transforms.push();

      if (alias === 'cone') {
        mat4.translate(transforms.modelViewMatrix, transforms.modelViewMatrix, [0, 0, -3.5]);
      }

      if (alias === 'sphere') {
        mat4.scale(transforms.modelViewMatrix, transforms.modelViewMatrix, [0.5, 0.5, 0.5]);
        mat4.translate(transforms.modelViewMatrix, transforms.modelViewMatrix, [0, 0, 2.5]);
      }

      transforms.setMatrixUniforms();
      transforms.pop();

      gl.uniform4fv(program.uniformLocations.uMaterialDiffuse, object.diffuse);
      gl.uniform4fv(program.uniformLocations.uMaterialAmbient, object.ambient);
      gl.uniform1i(program.uniformLocations.uWireframe, Number(object.wireframe));
      gl.uniform1i(program.uniformLocations.uUseLambert, Number(lambert));

      // Bind
      gl.bindVertexArray(object.vao);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);

      // Draw
      if (object.wireframe) {
        gl.drawElements(gl.LINES, object.indices.length, gl.UNSIGNED_SHORT, 0);
      }
      else {
        gl.drawElements(gl.TRIANGLES, object.indices.length, gl.UNSIGNED_SHORT, 0);
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

  const getState = v => v ? 'enable' : 'disable';

  function updateBlending(value = true) {
    gl[value ? 'enable' : 'disable'](gl.BLEND);
    gl.blendFunc(blendingSource, blendingTarget);
    gl.blendEquation(blendingEquation);
    gl.blendColor(blendingColor[0], blendingColor[1], blendingColor[2], blendingAlpha);
  }

  utils.configureControls({
    Blending: {
      value: blending,
      onChange: updateBlending
    },
    'Depth Testing': {
      value: depthTest,
      onChange: v => gl[getState(v)](gl.DEPTH_TEST)
    },
    'Back Face Culling': {
      value: culling,
      onChange: v => gl[getState(v)](gl.CULL_FACE)
    },
    Lambert: {
      value: lambert,
      onChange: v => lambert = v
    },
    Floor: {
      value: floor,
      onChange: v => floor = v
    },
    ...[
      { name: 'Sphere', id: 'sphere', color: sphereColor },
      { name: 'Cone', id: 'cone', color: coneColor }
    ].reduce((result, data) => {
      result = {
        ...result,
        [`${data.name} Alpha`]: {
          value: 1,
          min: 0, max: 1, step: 0.1,
          onChange: v => scene.get(data.id).diffuse[3] = v
        },
        [`${data.name} Color`]: {
          value: utils.denormalizeColor(data.color),
          onChange: v => scene.get(data.id).diffuse = utils.normalizeColor(v) as number[]
        }
      };
      return result;
    }, {}),
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
    'Alpha Value': {
      value: 1,
      min: 0, max: 1, step: 0.1,
      onChange: v => {
        blendingAlpha = v;
        updateBlending();
      }
    },
    'Render Order': {
      value: 'Cone First',
      options: ['Cone First', 'Sphere First'],
      onChange: v => {
        if (v === 'Sphere First') {
          scene.renderSooner('sphere');
          scene.renderFirst('floor');
        }
        else {
          scene.renderSooner('cone');
          scene.renderFirst('floor');
        }
      }
    },
    Reset: () => {
      depthTest = true;
      blending = true;
      culling = true;
      lambert = true;
      floor = true;
      blendingEquation = gl.FUNC_ADD;
      blendingSource = gl.SRC_ALPHA;
      blendingTarget = gl.ONE_MINUS_SRC_ALPHA;
      camera.goHome([0, 5, 35]);
      camera.setFocus([0, 0, 0]);
      camera.setAzimuth(25);
      camera.setElevation(-25);
    }
  });
}