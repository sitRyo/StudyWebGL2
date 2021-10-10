import '../common/lib/normalize.css';
import Utils from '../common/js/Utils';
import vertShader from '../common/shaders/ch04/01_vertexShader.vert';
import fragShader from '../common/shaders/ch04/01_fragmentShader.frag';
import { mat4, vec3 } from 'gl-matrix';
import { GLAttribute, Model } from '../common/js/types';
import { Program } from '../common/js/Program';
import Clock from '../common/js/Clock';
import { Scene } from '../common/js/Scene';
import { Floor } from '../common/js/Floor';
import { Axis } from '../common/js/Axis';

const utils = new Utils();

// Storing relevant values globally to be used throughout application
let gl: WebGL2RenderingContext = null;
let program: Program;
let modelViewMatrix = mat4.create();
let cameraMatrix = mat4.create();
let projectionMatrix = mat4.create();
let normalMatrix = mat4.create();
const WORLD_COORDINATES = 'World Coordinates';
const CAMERA_COORDINATES = 'Camera Coordinates';
let coordinates = '';
let clock: Clock;
let scene: Scene;
let home = [0, -2, -50];
let position = [0, -2, -50];
let rotation = [0, 0, 0];

function configure(): void {
  // canvas要素の設定
  const canvas = utils.getCanvas('webgl-canvas');
  utils.autoResizeCanvas(canvas);

  // Webgl2RenderingContextの設定
  gl = utils.getGLContext(canvas);
  gl.clearColor(0.9, 0.9, 0.9, 1);
  gl.clearDepth(1);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  clock = new Clock();

  program = new Program(gl, vertShader, fragShader);

  const uniforms = [
    'uProjectionMatrix',
    'uModelViewMatrix',
    'uNormalMatrix',
    'uMaterialDiffuse',
    'uLightAmbient',
    'uLightDiffuse',
    'uLightPosition',
    'uWireframe'    
  ] as GLAttribute[];

  const attributes = [
    'aVertexPosition',
    'aVertexNormal',
    'aVertexColor'
  ] as GLAttribute[];

  // uniformとattributeをシェーダーにロード
  program.load(attributes, uniforms);

  // シーンの設定
  scene = new Scene(gl, program);

  // ライトの設定
  gl.uniform3fv(program.attLocation.uLightPosition, [0, 120, 120]);
  gl.uniform4fv(program.attLocation.uLightAmbient, [0.20, 0.20, 0.20, 1]);
  gl.uniform4fv(program.attLocation.uLightDiffuse, [1, 1, 1, 1]);

  initTransforms();
}

function load() {
  scene.add(new Floor(80, 2));
  scene.add(new Axis(82));
  scene.load('/common/models/geometries/cone3.json', 'cone');
}

function initTransforms() {
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

function updateTransforms(): void {
  mat4.perspective(projectionMatrix, 45, gl.canvas.width / gl.canvas.height, 0.1, 1000);

  if (coordinates === WORLD_COORDINATES) {
    mat4.identity(modelViewMatrix);
    mat4.translate(modelViewMatrix, modelViewMatrix, position);
  } else {
    mat4.identity(cameraMatrix);
    mat4.translate(cameraMatrix, cameraMatrix, position);
  }
}

function setMatrixUniforms(): void {
  if (coordinates === WORLD_COORDINATES) {
    mat4.invert(cameraMatrix, modelViewMatrix);
  } else {
    mat4.invert(modelViewMatrix, cameraMatrix);
  }

  gl.uniformMatrix4fv(program.attLocation.uProjectionMatrix, false, projectionMatrix);
  gl.uniformMatrix4fv(program.attLocation.uModelViewMatrix, false, modelViewMatrix);
  mat4.transpose(normalMatrix, cameraMatrix);
  gl.uniformMatrix4fv(program.attLocation.uNormalMatrix, false, normalMatrix);
}

function draw(): void {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  try {
    updateTransforms();
    setMatrixUniforms();

    // シーンのオブジェクト全てに処理を実行
    scene.traverse((object: Model) => {
      gl.uniform4fv(program.attLocation.uMaterialDiffuse, object.diffuse);
      gl.uniform1i(program.attLocation.uWireframe, object.wireframe);

      // Bind
      gl.bindVertexArray(object.vao);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);

      // Draw
      if (object.wireframe) {
        gl.drawElements(gl.LINES, object.indices.length, gl.UNSIGNED_SHORT, 0);
      } else {
        gl.drawElements(gl.TRIANGLES, object.indices.length, gl.UNSIGNED_SHORT, 0);
      }

      // Clean
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    })
  }
  catch (error) {
    console.error(error);
  }
}

function init() {
  configure();
  load();
  clock.on('tick', draw);

  initControls();
}

function initControls() {
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

// html実行時にinitを実行する
(() => init())();