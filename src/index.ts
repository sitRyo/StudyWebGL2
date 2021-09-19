import './lib/normalize.css'
import utils from './utils/utils'
import vertShader from './shaders/vertexShader.vert';
import fragShader from './shaders/fragmentShader.frag';
import { isGLint } from './lib/typeGuards';
import { mat4 } from 'gl-matrix';

const Utils = new utils();
let gl: WebGL2RenderingContext = null;
let coneVAO: WebGLVertexArrayObject | null = null;
let coneIndexBuffer: WebGLBuffer | null = null;
let indices: number[]; 
let program: WebGLProgram | null;
let vboName: string;
let iboName: string;
let vboSize, vboUsage, iboSize, iboUsage: any; // webgl2がanyを返してくるのでしょうがない
let isVerticesVbo: boolean;
let isIndicesIbo: boolean;
let isConeVertexBufferVbo: boolean;
let isConeIndexBufferIbo: boolean;
let projectionMatrix = mat4.create();
let modelViewMatrix = mat4.create();
const attLocation: { [key: string]: GLint | WebGLUniformLocation | null } = {}; // programオブジェクト内のシェーダへのインデックスを格納する

const initBuffers = (): void => {
  const vertices = [
    1.5, 0, 0,
    -1.5, 1, 0,
    -1.5, 0.809017, 0.587785,
    -1.5, 0.309017, 0.951057,
    -1.5, -0.309017, 0.951057,
    -1.5, -0.809017, 0.587785,
    -1.5, -1, 0,
    -1.5, -0.809017, -0.587785,
    -1.5, -0.309017, -0.951057,
    -1.5, 0.309017, -0.951057,
    -1.5, 0.809017, -0.587785
  ];

  // 反時計周りで定義されたインデックス
  indices = [
    0, 1, 2,
    0, 2, 3,
    0, 3, 4,
    0, 4, 5,
    0, 5, 6,
    0, 6, 7,
    0, 7, 8,
    0, 8, 9,
    0, 9, 10,
    0, 10, 1
  ];

  // VAOインスタンスを作成
  coneVAO = gl.createVertexArray();

  // バインドしてそのうえで処理
  gl.bindVertexArray(coneVAO);

  const coneVertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, coneVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  // VAOの命令を実行する
  gl.vertexAttribPointer(program['aVertexPosition'], 3, gl.FLOAT, false, 0, 0);
  if (isGLint(attLocation['aVertexPosition'])) {
    gl.enableVertexAttribArray(attLocation['aVertexPosition']);
  }

  // IBOの準備
  coneIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, coneIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  // パラメータの型に基づいてグローバル変数を設定
  if (coneVertexBuffer === gl.getParameter(gl.ARRAY_BUFFER_BINDING)) {
    vboName = 'coneVertexBuffer';
  }

  if (coneIndexBuffer === gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING)) {
    iboName = 'coneIndexBuffer';
  }

  // 頂点オブジェクトとインデックスオブジェクトの情報を取得
  vboSize = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE);
  vboUsage = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_USAGE);

  iboSize = gl.getBufferParameter(gl.ELEMENT_ARRAY_BUFFER, gl.BUFFER_SIZE);
  iboUsage = gl.getBufferParameter(gl.ELEMENT_ARRAY_BUFFER, gl.BUFFER_USAGE);

  // vboに紐づけられている頂点配列がwebglバッファか？
  // 当たり前だが, No
  try {
    isVerticesVbo = gl.isBuffer(vertices);
  }
  catch (e) {
    isVerticesVbo = false;
  }

  // iboに紐づけられているインデックスがwebglバッファか？
  // こちらも当たり前だが, No
  try {
    isIndicesIbo = gl.isBuffer(indices);
  }
  catch (e) {
    isIndicesIbo = false;
  }

  isConeVertexBufferVbo = gl.isBuffer(coneVertexBuffer);
  isConeIndexBufferIbo = gl.isBuffer(coneIndexBuffer);

  // クリア
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}

// 文字列をシェーダーとしてコンパイルして返す
// シェーダー文字列とタイプ（頂点シェーダやフラグメントシェーダ）を指定
const getShader = (rawShaderString: string, type: GLenum): WebGLShader | null => {
  // タイプに応じたシェーダーを代入
  const shader = gl.createShader(type);
  // 与えられたシェーダコードを仕様してシェーダーをコンパイル
  gl.shaderSource(shader, rawShaderString);
  gl.compileShader(shader);

  // シェーダーに問題がないかを検査する
  if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log(gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

const draw = (): void => {
  // シーンのクリア
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  mat4.perspective(projectionMatrix, 45, gl.canvas.width / gl.canvas.height, 0.1, 10000);
  mat4.identity(modelViewMatrix);
  mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -5]);

  gl.uniformMatrix4fv(attLocation['uProjectionMatrix'], false, projectionMatrix);
  gl.uniformMatrix4fv(attLocation['uModelViewMatrix'], false, modelViewMatrix);

  // VAOをバインド
  gl.bindVertexArray(coneVAO);

  // Draw
  gl.drawElements(gl.LINE_LOOP, indices.length, gl.UNSIGNED_SHORT, 0);

  // クリア
  gl.bindVertexArray(null);
}

const initProgram = (): void => {
  // プログラムを作成
  program = gl.createProgram();
  // シェーダーのコンパイル
  const vertexShader = getShader(vertShader, gl.VERTEX_SHADER);
  const fragmentShader = getShader(fragShader, gl.FRAGMENT_SHADER);

  // プログラムにシェーダーをアタッチ
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log('Could not initialize shaders');
  }

  // プログラムインスタンスを使用
  gl.useProgram(program);

  // コード後半で簡単にアクセスできるように
  // シェーダーの値のロケーションをプログラムインスタンスにアタッチする
  attLocation['aVertexPosition'] = gl.getAttribLocation(program, 'aVertexPosition');
  attLocation['uProjectionMatrix'] = gl.getUniformLocation(program, 'uProjectionMatrix');
  attLocation['uModelViewMatrix'] = gl.getUniformLocation(program, 'uModelViewMatrix');
}

const updateInfo = () => {
  document.getElementById('t-vbo-name').innerText = vboName;
  document.getElementById('t-ibo-name').innerText = iboName;
  document.getElementById('t-vbo-size').innerText = vboSize;
  document.getElementById('t-vbo-usage').innerText = vboUsage;
  document.getElementById('t-ibo-size').innerText = iboSize;
  document.getElementById('t-ibo-usage').innerText = iboUsage;
  document.getElementById('s-is-vertices-vbo').innerText = isVerticesVbo ? 'Yes' : 'No';
  document.getElementById('s-is-indices-ibo').innerText = isIndicesIbo ? 'Yes' : 'No';
  document.getElementById('s-is-cone-vertex-buffer-vbo').innerText = isConeVertexBufferVbo ? 'Yes' : 'No';
  document.getElementById('s-is-cone-Index-buffer-ibo').innerText = isConeIndexBufferIbo ? 'Yes' : 'No';
}

function render() {
  window.requestAnimationFrame(render); // ブラウザにアニメーションを行わせる
  draw();
}

const init = (): void => {
  // htmlのcanvasを追加
  const canvas = Utils.getCanvas('webgl-canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // webgl2のコンテキストを取得
  gl = Utils.getGLContext(canvas);
  gl.clearColor(0, 0, 0, 1);

  // デプステスト？
  // 深度に合わせてオブジェクトが描画されるようになる
  gl.enable(gl.DEPTH_TEST); 

  initProgram(); // シェーダコンパイル
  initBuffers(); // VAO, IBO作成
  render(); // 描画

  // レンダリング情報
  updateInfo();
}

// html実行時にinitを実行する
(() => init())();