import './lib/normalize.css'
import utils from './utils/utils'
import vertShader from './shaders/vertexShader.vert';
import fragShader from './shaders/fragmentShader.frag';

const Utils = new utils();
let gl: WebGL2RenderingContext = null;
let trapezoidVAO: WebGLVertexArrayObject | null = null;
let trapezoidIndexBuffer: WebGLBuffer | null = null;
let indices: number[]; 
let program: WebGLProgram | null;
let renderingMode = 'TRIANGLES'
const attLocation: { [key: string]: GLint } = {}; // programオブジェクト内のシェーダへのインデックスを格納する

const initBuffers = (): void => {
  const vertices = [
    -0.5, -0.5, 0,
    -0.25, 0.5, 0,
    0.0, -0.5, 0,
    0.25, 0.5, 0,
    0.5, -0.5, 0
  ];

  // 反時計周りで定義されたインデックス
  indices = [0, 1, 2, 0, 2, 3, 2, 3, 4];

  // VAOインスタンスを作成
  trapezoidVAO = gl.createVertexArray();

  // バインドしてそのうえで処理
  gl.bindVertexArray(trapezoidVAO);

  const trapezoidVertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, trapezoidVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  // VAOの命令を実行する
  gl.vertexAttribPointer(program['aVertexPosition'], 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(attLocation['aVertexPosition']);

  // IBOの準備
  trapezoidIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, trapezoidIndexBuffer);
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
  gl.bindVertexArray(trapezoidVAO);

  // レンダリングモードに応じて、異なる設定で描画する
  switch (renderingMode) {
    case 'TRIANGLES': {
      indices = [0, 1, 2, 2, 3, 4, 1, 2, 3];
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
      break;
    }
    case 'LINES': {
      indices = [0, 1, 1, 2, 2, 3, 3, 4];
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
      gl.drawElements(gl.LINES, indices.length, gl.UNSIGNED_SHORT, 0);
      break;
    }
    case 'POINTS': {
      indices = [1, 2, 3];
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
      gl.drawElements(gl.POINTS, indices.length, gl.UNSIGNED_SHORT, 0);
      break;
    }
    case 'LINE_LOOP': {
      indices = [2, 4, 3, 1, 0];
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
      gl.drawElements(gl.LINE_LOOP, indices.length, gl.UNSIGNED_SHORT, 0);
      break;
    }
    case 'LINE_STRIP': {
      indices = [2, 3, 4, 1, 0];
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
      gl.drawElements(gl.LINE_STRIP, indices.length, gl.UNSIGNED_SHORT, 0);
      break;
    }
    case 'TRIANGLE_STRIP': {
      indices = [0, 1, 2, 3, 4];
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
      gl.drawElements(gl.TRIANGLE_STRIP, indices.length, gl.UNSIGNED_SHORT, 0);
      break;
    }
    case 'TRIANGLE_FAN': {
      indices = [0, 1, 2, 3, 4];
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
      gl.drawElements(gl.TRIANGLE_FAN, indices.length, gl.UNSIGNED_SHORT, 0);
      break;
    }
  }

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

  initControls(); // gui
}

const initControls = () => {
  // dat.GUIのインターフェースをラップするシンプルなAPI
  // この本のために作られたらしい
  Utils.configureControls({
    'Rendering Mode': {
      value: renderingMode,
      options: [
        'TRIANGLES',
        'LINES',
        'POINTS',
        'LINE_LOOP',
        'LINE_STRIP',
        'TRIANGLE_STRIP',
        'TRIANGLE_FAN'
      ],
      onChange: v => renderingMode = v
    }
  })
}

// html実行時にinitを実行する
(() => init())();