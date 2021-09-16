import './lib/normalize.css'
import utils from './utils/utils'
import vertShader from './shaders/vertexShader.vert';
import fragShader from './shaders/fragmentShader.frag';

const Utils = new utils();
let gl: WebGL2RenderingContext = null;
let squareVAO: WebGLVertexArrayObject | null = null;
let squareIndexBuffer: WebGLBuffer | null = null;
let indices: number[]; 
let program: WebGLProgram | null;
const attLocation: { [key: string]: GLint } = {}; // programオブジェクト内のシェーダへのインデックスを格納する

const initBuffers = (): void => {
  console.log('initBuffers');
  const vertices = [
    -0.5, 0.5, 0,
    -0.5, -0.5, 0,
    0.5, -0.5, 0,
    0.5, 0.5, 0,
    0, 1, 0,
  ];

  // 反時計周りで定義されたインデックス
  indices = [0, 1, 2, 0, 2, 3];

  // VAOインスタンスを作成
  squareVAO = gl.createVertexArray();

  // バインドしてそのうえで処理
  gl.bindVertexArray(squareVAO);

  const squareVertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  // draw内で後ほどデータを使用するためにVAOの命令を実行する
  gl.enableVertexAttribArray(attLocation['aVertexPosition']);
  gl.vertexAttribPointer(program['aVertexPosition'], 3, gl.FLOAT, false, 0, 0);

  // IBOの準備
  squareIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, squareIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

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

  // VAOをバインド
  gl.bindVertexArray(squareVAO);

  // IBOをバインド
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, squareIndexBuffer)

  // トライアングルプリミティブを用いてシーンを描画
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

  // クリア
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
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
}

const init = (): void => {
  // htmlのcanvasを追加
  const canvas = Utils.getCanvas('webgl-canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // webgl2のコンテキストを取得
  gl = Utils.getGLContext(canvas);
  if (!gl) {
    console.error('WebGL2 is not available in your browser.');
  }

  gl.clearColor(0, 0, 0, 1);

  initProgram(); // シェーダコンパイル
  initBuffers(); // VBO, IBO作成
  draw(); // 描画
}

// html実行時にinitを実行する
(() => init())();