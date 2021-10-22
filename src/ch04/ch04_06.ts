import { mat4, vec3 } from 'gl-matrix';
import Utils from '../common/js/Utils';
import Clock from '../common/js/Clock';
import Program from '../common/js/Program';
import Scene from '../common/js/Scene';
import Floor from '../common/js/Floor';
import Axis from '../common/js/Axis';
import vertexShader from '../common/shaders/ch04/05_vertexShader.vert';
import fragmentShader from '../common/shaders/ch04/05_fragmentShader.frag';
import { GLAttribute, GLUniform } from '../common/js/types';
import Camera, { CameraTypes } from '../common/js/Camera';
import Controls from '../common/js/Controls';

let gl: WebGL2RenderingContext;
let fov = 45;
let camera: Camera;
let scene: Scene;
let program: Program;
let clock: Clock;
let modelViewMatrix = mat4.create();
let projectionMatrix = mat4.create();
let normalMatrix = mat4.create();
let fixedLight = false;
let PERSPECTIVE_PROJECTION = 'Perspective Projection';
let ORTHOGRAPHIC_PROJECTION = 'Orthographic Projection';
let projectionMode = PERSPECTIVE_PROJECTION;

const utils = new Utils();

function configure() {
  // Configure `canvas`
  const canvas = utils.getCanvas('webgl-canvas');
  utils.autoResizeCanvas(canvas);

  // Configure `gl`
  gl = utils.getGLContext(canvas);
  gl.clearColor(0.9, 0.9, 0.9, 1);
  gl.clearDepth(100);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  // Configure `clock` which we can subscribe to on every `tick`.
  // We will discuss this in a later chapter, but it's simply a way to
  // abstract away the `requestAnimationFrame` we have been using.
  clock = new Clock();

  // Configure `program`
  program = new Program(gl, vertexShader, fragmentShader);

  // Uniforms to be set
  const uniforms: GLUniform[] = [
    'uProjectionMatrix',
    'uModelViewMatrix',
    'uNormalMatrix',
    'uMaterialDiffuse',
    'uLightAmbient',
    'uLightDiffuse',
    'uLightPosition',
    'uWireframe',
    'uFixedLight'
  ];

  // Attributes to be set
  const attributes: GLAttribute[] = [
    'aVertexPosition',
    'aVertexColor',
    'aVertexNormal'
  ];

  // Load uniforms and attributes
  program.load(attributes, uniforms);

  // Configure `scene`. We will discuss this in a later chapter, but
  // this is a simple way to add objects into our scene, rather than
  // maintaining sets of global arrays as we've done in previous chapters.
  scene = new Scene(gl, program);

  // Configure `camera` and set it to be in orbiting mode
  camera = new Camera(CameraTypes.ORBITING_TYPE);
  camera.goHome([0, 20, 120]);

  // Configure controls by allowing user driven events to move camera around
  new Controls(camera, canvas);

  // Configure lights
  gl.uniform4fv(program.uniformLocations.uLightAmbient, [0.1, 0.1, 0.1, 1]);
  gl.uniform3fv(program.uniformLocations.uLightPosition, [0, 0, 5000]);
  gl.uniform4fv(program.uniformLocations.uLightDiffuse, [0.7, 0.7, 0.7, 1]);
  gl.uniform1i(program.uniformLocations.uFixedLight, Number(fixedLight));

  initTransforms();
}

// Load objects into our `scene`
function load() {
  scene.add(new Floor(2000, 100));
  scene.add(new Axis(2000));
  // Helper function that iterates over the number of parts count
  // and loads them asynchronously into our application
  scene.loadByParts('/common/models/nissan-gtr/part', 178);
}

// Initialize the necessary transforms
function initTransforms() {
  modelViewMatrix = camera.getViewTransform();
  mat4.identity(projectionMatrix);
  updateTransforms();
  mat4.identity(normalMatrix);
  mat4.copy(normalMatrix, modelViewMatrix);
  mat4.invert(normalMatrix, normalMatrix);
  mat4.transpose(normalMatrix, normalMatrix);
}

// Update transforms
function updateTransforms() {
  const { width, height } = gl.canvas;
  if (projectionMode === PERSPECTIVE_PROJECTION) {
    mat4.perspective(projectionMatrix, fov, width / height, 1, 5000);
  }
  else {
    mat4.ortho(projectionMatrix, -width / fov, width / fov, -height / fov, height / fov, -5000, 5000);
  }
}

// Set the matrix uniforms
function setMatrixUniforms() {
  gl.uniformMatrix4fv(program.uniformLocations.uModelViewMatrix, false, camera.getViewTransform());
  gl.uniformMatrix4fv(program.uniformLocations.uProjectionMatrix, false, projectionMatrix);
  mat4.transpose(normalMatrix, camera.matrix);
  gl.uniformMatrix4fv(program.uniformLocations.uNormalMatrix, false, normalMatrix);
}

function draw() {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  try {
    updateTransforms();
    setMatrixUniforms();

    // Iterate over every object in the scene
    scene.traverse(object => {
      gl.uniform4fv(program.uniformLocations.uMaterialDiffuse, object.diffuse);
      gl.uniform1i(program.uniformLocations.uWireframe, Number(object.wireframe));

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
  generateDOM();
  configure();
  load();
  clock.on('tick', draw);

  initControls();
}

function initControls() {
  utils.configureControls({
    'Camera Type': {
      value: camera.type,
      options: [CameraTypes.TRACKING_TYPE, CameraTypes.ORBITING_TYPE],
      onChange: v => {
        camera.goHome();
        camera.setType(v);
      }
    },
    'Projection Mode': {
      value: projectionMode,
      options: [PERSPECTIVE_PROJECTION, ORTHOGRAPHIC_PROJECTION],
      onChange: v => projectionMode = v
    },
    fov: {
      value: fov,
      min: 1, max: 200, step: 1,
      onChange: v => fov = v
    },
    Dolly: {
      value: 0,
      min: -100, max: 100, step: 0.1,
      onChange: v => camera.dolly(v)
    },
    Position: {
      ...['X', 'Y', 'Z'].reduce((result, name, i) => {
        result[name] = {
          value: camera.position[i],
          min: -200, max: 200, step: 0.1,
          onChange: (v, state) => {
            camera.setPosition([
              state.X,
              state.Y,
              state.Z
            ]);
          }
        };
        return result;
      }, {}),
    },
    Rotation: {
      Elevation: {
        value: camera.elevation,
        min: -180, max: 180, step: 0.1,
        onChange: v => camera.setElevation(v)
      },
      Azimuth: {
        value: camera.azimuth,
        min: -180, max: 180, step: 0.1,
        onChange: v => camera.setAzimuth(v)
      }
    },
    'Static Light Position': {
      value: fixedLight,
      onChange: v => gl.uniform1i(program.uniformLocations.uFixedLight, v)
    },
    'Go Home': () => camera.goHome()
  });

  // On every `tick` (i.e. requestAnimationFrame cycle), invoke callback
  clock.on('tick', () => {
    camera.matrix.forEach((data, i) => {
      document.getElementById(`m${i}`).innerText = data.toFixed(1);
    });
  });
}

/* 行列の値を表示するDOM要素を生成する */
function generateDOM(): void {
  const body = document.getElementById('body');

  // info
  const divInfo = document.createElement('div');
  divInfo.setAttribute('id', 'info');
  
  const pCoordinates = document.createElement('p');
  pCoordinates.setAttribute('id', 'coordinates');
  const tableMatrix = document.createElement('table');
  tableMatrix.setAttribute('id', 'table');
  
  const row1 = document.createElement('tr');
  const m0 = document.createElement('td');
  const m4 = document.createElement('td');
  const m8 = document.createElement('td');
  const m12 = document.createElement('td');
  m0.setAttribute('id', 'm0');
  m4.setAttribute('id', 'm4');
  m8.setAttribute('id', 'm8');
  m12.setAttribute('id', 'm12');
  row1.append(m0, m4, m8, m12);

  const row2 = document.createElement('tr');
  const m1 = document.createElement('td');
  const m5 = document.createElement('td');
  const m9 = document.createElement('td');
  const m13 = document.createElement('td');
  m1.setAttribute('id', 'm1');
  m5.setAttribute('id', 'm5');
  m9.setAttribute('id', 'm9');
  m13.setAttribute('id', 'm13');
  row2.append(m1, m5, m9, m13);

  const row3 = document.createElement('tr');
  const m2 = document.createElement('td');
  const m6 = document.createElement('td');
  const m10 = document.createElement('td');
  const m14 = document.createElement('td');
  m2.setAttribute('id', 'm2');
  m6.setAttribute('id', 'm6');
  m10.setAttribute('id', 'm10');
  m14.setAttribute('id', 'm14');
  row3.append(m2, m6, m10, m14);

  const row4 = document.createElement('tr');
  const m3 = document.createElement('td');
  const m7 = document.createElement('td');
  const m11 = document.createElement('td');
  const m15 = document.createElement('td');
  m3.setAttribute('id', 'm3');
  m7.setAttribute('id', 'm7');
  m11.setAttribute('id', 'm11');
  m15.setAttribute('id', 'm15');
  row4.append(m3, m7, m11, m15);

  tableMatrix.append(row1, row2, row3, row4);
  divInfo.append(pCoordinates, tableMatrix);

  body.appendChild(divInfo);
}
