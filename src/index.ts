import './lib/normalize.css'
import utils from './utils/utils'

const Utils = new utils();
let gl: WebGL2RenderingContext;

const initBuffers = (): void => {
  console.log('initBuffers');
  const vertices = [
    -0.5, 0.5, 0,
    -0.5, -0.5, 0,
    0.5, -0.5, 0,
    0.5, 0.5, 0,
  ];

  // 反時計周りで定義されたインデックス
  const indices = [0, 1, 2, 0, 2, 3];

  // VBOの準備
  const squareVertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  // IBOの準備
  const squareIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, squareIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  // クリア
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}

const init = (): void => {
  // htmlのcanvasを追加
  const canvas = Utils.getCanvas('webgl-canvas');

  // webgl2のコンテキストを取得
  gl = Utils.getGLContext(canvas);
  if (!gl) {
    console.error('WebGL2 is not available in your browser.');
  }

  initBuffers();
}

// html実行時にinitを実行する
(() => init())();