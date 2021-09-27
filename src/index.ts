import './common/lib/normalize.css'
import utils from './common/utils/utils'
import vertShader from './common/shaders/vertexShader.vert';
import fragShader from './common/shaders/fragmentShader.frag';
import { isGLint } from './common/lib/typeGuards';
import { mat4 } from 'gl-matrix';
import { AttLocation } from './common/utils/types';

const Utils = new utils();
let gl: WebGL2RenderingContext = null;
let vao: WebGLVertexArrayObject | null = null;
let indicesBuffer: WebGLBuffer | null = null;
let shininess = 10;
let lightColor = [1, 1, 1, 1];
let lightAmbient = [0.03, 0.03, 0.03, 1];
let lightSpecular = [1, 1, 1, 1];
let lightDirection = [-0.25, -0.25, -0.25];
let materialDiffuse = [46 / 256, 99 / 256, 191 / 256, 1];
let materialAmbient = [1, 1, 1, 1];
let materialSpecular = [1, 1, 1, 1];
let program: WebGLProgram | null;
let projectionMatrix = mat4.create();
let modelViewMatrix = mat4.create();
let normalMatrix = mat4.create();
let indices: number[];

// programオブジェクト内のシェーダへのインデックスを格納する
const attLocation: AttLocation = {}; 

const initProgram = (): void => {
  // canvasを設定
  const canvas = Utils.getCanvas('webgl-canvas');
  Utils.autoResizeCanvas(canvas);

  // glcontext取得
  gl = Utils.getGLContext(canvas);
  gl.clearColor(0.9, 0.9, 0.9, 1);
  gl.clearDepth(100);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL); // 深度テストの評価方法（奥にあるものが隠れる）

  // シェーダーのコンパイル
  const vertexShader = Utils.getShader(gl, vertShader, gl.VERTEX_SHADER);
  const fragmentShader = Utils.getShader(gl, fragShader, gl.FRAGMENT_SHADER);

  // プログラムを作成
  // プログラムにシェーダーをアタッチ
  program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log('Could not initialize shaders');
  }

  // プログラムインスタンスを使用
  gl.useProgram(program);

  // シェーダーの値のロケーションをプログラムインスタンスにアタッチする
  attLocation.aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
  attLocation.aVertexNormal = gl.getAttribLocation(program, 'aVertexNormal');
  attLocation.uProjectionMatrix = gl.getUniformLocation(program, 'uProjectionMatrix');
  attLocation.uModelViewMatrix = gl.getUniformLocation(program, 'uModelViewMatrix');
  attLocation.uNormalMatrix = gl.getUniformLocation(program, 'uNormalMatrix');
  attLocation.uLightDirection = gl.getUniformLocation(program, 'uLightDirection');
  attLocation.uLightAmbient = gl.getUniformLocation(program, 'uLightAmbient');
  attLocation.uLightDiffuse = gl.getUniformLocation(program, 'uLightDiffuse');
  attLocation.uMaterialDiffuse = gl.getUniformLocation(program, 'uMaterialDiffuse');
}

const initLights = () => {
  gl.uniform3fv(attLocation.uLightDirection, [0, 0, -1]);
  gl.uniform4fv(attLocation.uLightAmbient, [0.01, 0.01, 0.01, 1]);
  gl.uniform4fv(attLocation.uLightDiffuse, [0.5, 0.5, 0.5, 1]);
  gl.uniform4f(attLocation.uMaterialDiffuse, 0.1, 0.5, 0.8, 1);
}

const initBuffers = () => {
  const vertices = [
    -20, -8, 20, // 0
    -10, -8, 0,  // 1
    10, -8, 0,   // 2
    20, -8, 20,  // 3
    -20, 8, 20,  // 4
    -10, 8, 0,   // 5
    10, 8, 0,    // 6
    20, 8, 20    // 7
  ];

  indices = [
    0, 5, 4,
    1, 5, 0,
    1, 6, 5,
    2, 6, 1,
    2, 7, 6,
    3, 7, 2
  ];

  // Create VAO
  vao = gl.createVertexArray();

  // Bind VAO
  gl.bindVertexArray(vao);

  const normals = Utils.calculateNormals(vertices, indices);

  // Vertices
  const verticesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  // Configure VAO instructions
  if (isGLint(attLocation.aVertexPosition)) {
    gl.enableVertexAttribArray(attLocation.aVertexPosition);
    gl.vertexAttribPointer(attLocation.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
  }

  // 法線
  const normalsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  if (isGLint(attLocation.aVertexNormal)) {
    gl.enableVertexAttribArray(attLocation.aVertexNormal);
    gl.vertexAttribPointer(attLocation.aVertexNormal, 3, gl.FLOAT, false, 0, 0);
  }

  // インデックス
  indicesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  // Clean
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}

const draw = (): void => {
  const { width, height } = gl.canvas;

  // シーンのクリア
  gl.viewport(0, 0, width, height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  mat4.perspective(projectionMatrix, 45, width / height, 0.1, 10000);
  mat4.identity(modelViewMatrix);
  mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -40]);

  mat4.copy(normalMatrix, modelViewMatrix);
  mat4.invert(normalMatrix, normalMatrix);
  mat4.transpose(normalMatrix, normalMatrix);

  gl.uniformMatrix4fv(attLocation.uModelViewMatrix, false, modelViewMatrix);
  gl.uniformMatrix4fv(attLocation.uProjectionMatrix, false, projectionMatrix);
  gl.uniformMatrix4fv(attLocation.uNormalMatrix, false, normalMatrix);

  try {
    // Bind
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);

    // Draw
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

    // Clean
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }
  // We catch the `error` and simply output to the screen for testing/debugging purposes
  catch (error) {
    console.error(error);
  }
}

const render = () => {
  window.requestAnimationFrame(render); // ブラウザにアニメーションを行わせる
  draw();
}

const init = (): void => {
  initProgram();
  initBuffers();
  initLights();
  render();
}

// html実行時にinitを実行する
(() => init())();