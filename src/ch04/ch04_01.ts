import { mat4, vec3 } from 'gl-matrix';
import Utils from '../common/js/Utils';
import Clock from '../common/js/Clock';
import Program from '../common/js/Program';
import Scene from '../common/js/Scene';
import Floor from '../common/js/Floor';
import Axis from '../common/js/Axis';
import vertexShader from '../common/shaders/ch04/01_vertexShader.vert';
import fragmentShader from '../common/shaders/ch04/01_fragmentShader.frag';
import { GLAttribute, GLUniform } from '../common/js/types';

const utils = new Utils();

let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let clock: Clock;
let WORLD_COORDINATES = 'World Coordinates';
let CAMERA_COORDINATES = 'Camera Coordinates';
let coordinates = WORLD_COORDINATES;
let home = [0, -2, -50];
let position = [0, -2, -50]
let rotation = [0, 0, 0];
let cameraMatrix = mat4.create();
let modelViewMatrix = mat4.create();
let projectionMatrix = mat4.create();
let normalMatrix = mat4.create();

function configure(): void {
  // Configure `canvas`
  const canvas = utils.getCanvas('webgl-canvas');
  utils.autoResizeCanvas(canvas);

  // Configure `gl`
  gl = utils.getGLContext(canvas);
  gl.clearColor(0.9, 0.9, 0.9, 1);
  gl.clearDepth(1);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  // Configure `clock` which we can subscribe to on every `tick`.
  // We will discuss this in a later chapter, but it's simply a way to
  // abstract away the `requestAnimationFrame` we have been using.
  clock = new Clock();

  // Configure `program`
  program = new Program(gl, vertexShader, fragmentShader);

  // Uniforms to be set
  const uniforms = [
    'uProjectionMatrix',
    'uModelViewMatrix',
    'uNormalMatrix',
    'uMaterialDiffuse',
    'uLightAmbient',
    'uLightDiffuse',
    'uLightPosition',
    'uWireframe'
  ] as GLUniform[];

  // Attributes to be set
  const attributes = [
    'aVertexPosition',
    'aVertexNormal',
    'aVertexColor'
  ] as GLAttribute[];

  // Load uniforms and attributes
  program.load(attributes, uniforms);

  // Configure `scene`. We will discuss this in a later chapter, but
  // this is a simple way to add objects into our scene, rather than
  // maintaining sets of global arrays as we've done in previous chapters.
  scene = new Scene(gl, program);

  // Configure lights
  gl.uniform3fv(program.uniformLocations.uLightPosition, [0, 120, 120]);
  gl.uniform4fv(program.uniformLocations.uLightAmbient, [0.20, 0.20, 0.20, 1]);
  gl.uniform4fv(program.uniformLocations.uLightDiffuse, [1, 1, 1, 1]);

  initTransforms();
}

// Load objects into our `scene`
function load(): void {
  scene.add(new Floor(80, 2));
  scene.add(new Axis(82));
  scene.load('/common/models/geometries/cone3.json', 'cone');
}

// Initialize the necessary transforms
function initTransforms(): void {
  mat4.identity(modelViewMatrix);
  mat4.translate(modelViewMatrix, modelViewMatrix, home);

  mat4.identity(cameraMatrix);
  mat4.invert(cameraMatrix, modelViewMatrix);

  mat4.identity(projectionMatrix);

  mat4.identity(normalMatrix);
  mat4.copy(normalMatrix, modelViewMatrix);
  mat4.invert(normalMatrix, normalMatrix);
  mat4.transpose(normalMatrix, normalMatrix);
}

// Update transforms
function updateTransforms(): void {
  mat4.perspective(projectionMatrix, 45, gl.canvas.width / gl.canvas.height, 0.1, 1000);

  if (coordinates === WORLD_COORDINATES) {
    mat4.identity(modelViewMatrix);
    mat4.translate(modelViewMatrix, modelViewMatrix, position);
  }
  else {
    mat4.identity(cameraMatrix);
    mat4.translate(cameraMatrix, cameraMatrix, position);
  }
}

// Set the matrix uniforms
function setMatrixUniforms(): void {
  if (coordinates === WORLD_COORDINATES) {
    mat4.invert(cameraMatrix, modelViewMatrix);
  }
  else {
    mat4.invert(modelViewMatrix, cameraMatrix);
  }

  gl.uniformMatrix4fv(program.uniformLocations.uProjectionMatrix, false, projectionMatrix);
  gl.uniformMatrix4fv(program.uniformLocations.uModelViewMatrix, false, modelViewMatrix);
  mat4.transpose(normalMatrix, cameraMatrix);
  gl.uniformMatrix4fv(program.uniformLocations.uNormalMatrix, false, normalMatrix);
}

function draw(): void {
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

export function init(): void {
  generateDOM();

  configure();
  load();
  clock.on('tick', draw);

  initControls();
}

function initControls(): void {
  // DOM element to change values
  const coordinatesElement = document.getElementById('coordinates');

  utils.configureControls({
    Coordinates: {
      value: coordinates,
      options: [WORLD_COORDINATES, CAMERA_COORDINATES],
      onChange: v => {
        coordinates = v;
        coordinatesElement.innerText = coordinates;
        vec3.copy(home, position);
        rotation = [0, 0, 0];
        if (coordinates === CAMERA_COORDINATES) {
          vec3.negate(position, position);
        }
      }
    },
    ...['Translate X', 'Translate Y', 'Translate Z'].reduce((result, name, i) => {
      result[name] = {
        value: position[i],
        min: -100, max: 100, step: -0.1,
        onChange(v, state) {
          position = [
            state['Translate X'],
            state['Translate Y'],
            state['Translate Z']
          ];
        }
      };
      return result;
    }, {}),
  });

  // On every `tick` (i.e. requestAnimationFrame cycle), invoke callback
  clock.on('tick', () => {
    // Update the values in the DOM
    const matrix = (coordinates === WORLD_COORDINATES) ? modelViewMatrix : cameraMatrix;
    matrix.forEach((data, i) => {
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
