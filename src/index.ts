import './common/lib/normalize.css'
import utils from './common/utils/utils'
import vertShader from './common/shaders/vertexShader.vert';
import fragShader from './common/shaders/fragmentShader.frag';
import { isGLint } from './common/lib/typeGuards';
import { mat4 } from 'gl-matrix';
import { Model } from './common/utils/types';

const Utils = new utils();
let gl: WebGL2RenderingContext = null;
let coneVAO: WebGLVertexArrayObject | null = null;
let program: WebGLProgram | null;
let projectionMatrix = mat4.create();
let modelViewMatrix = mat4.create();

let modelIndexBuffer: WebGLBuffer | null = null; // モデルのIBO
let model: Model; // ジオメトリのデータ

const attLocation: { [key: string]: GLint | WebGLUniformLocation | null } = {}; // programオブジェクト内のシェーダへのインデックスを格納する

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
  gl.drawElements(gl.TRIANGLES, model.indices.length, gl.UNSIGNED_SHORT, 0);

  // クリア
  gl.bindVertexArray(null);
}

const load = (filePath: string) => {
  return fetch(filePath)
    .then((res: Response) => res.json())
    .then((data: Model) => {
      model = data;
      coneVAO = gl.createVertexArray();
      gl.bindVertexArray(coneVAO);
      gl.uniform3fv(attLocation['uModelColor'], model.color);
      
      const modelVertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, modelVertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertices), gl.STATIC_DRAW);

      // vaoへ命令
      if (isGLint(attLocation['aVertexPosition'])) {
        gl.enableVertexAttribArray(attLocation['aVertexPosition']);
        gl.vertexAttribPointer(attLocation['aVertexPosition'], 3, gl.FLOAT, false, 0, 0);
      }

      modelIndexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, modelIndexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.indices), gl.STATIC_DRAW);

      gl.bindVertexArray(null);
    })
    // コンソールにエラーを出力
    .catch(console.error);
}

const initProgram = (): void => {
  // プログラムを作成
  program = gl.createProgram();
  // シェーダーのコンパイル
  const vertexShader = Utils.getShader(gl, vertShader, gl.VERTEX_SHADER);
  const fragmentShader = Utils.getShader(gl, fragShader, gl.FRAGMENT_SHADER);

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
  // フラグメントシェーダで使う色情報
  attLocation['uModelColor'] = gl.getUniformLocation(program, 'uModelColor');
}

function render() {
  // window.requestAnimationFrame(render); // ブラウザにアニメーションを行わせる
  draw();
}

const init = (): void => {
  // htmlのcanvasを追加
  const canvas = Utils.getCanvas('webgl-canvas');
  Utils.autoResizeCanvas(canvas);

  // webgl2のコンテキストを取得
  gl = Utils.getGLContext(canvas);
  gl.clearColor(0, 0, 0, 1);

  // デプステスト？
  // 深度に合わせてオブジェクトが描画されるようになる
  gl.enable(gl.DEPTH_TEST); 

  initProgram(); // シェーダコンパイルo
  load('/common/models/geometries/cone1.json')
  .then(render);
}

// html実行時にinitを実行する
(() => init())();