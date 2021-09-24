import './common/lib/normalize.css'
import utils from './common/utils/utils'
import vertShader from './common/shaders/vertexShader.vert';
import fragShader from './common/shaders/fragmentShader.frag';
import { isGLint } from './common/lib/typeGuards';
import { mat4 } from 'gl-matrix';
import { AttributeKind, Model } from './common/utils/types';
import { vertices, indices } from './info'; // ch03で使用する頂点とインデックス情報
import { AttLocation } from './common/utils/types';

const Utils = new utils();
let gl: WebGL2RenderingContext = null;
let sphereVAO: WebGLVertexArrayObject | null = null;
let sphereIndicesBuffer: WebGLBuffer | null = null;
let lightDiffuseColor = [1, 1, 1];
let lightDirection = [0, -1, -1];
let sphereColor = [0.5, 0.8, 0.1];
let program: WebGLProgram | null;
let projectionMatrix = mat4.create();
let modelViewMatrix = mat4.create();
let normalMatrix = mat4.create();

let modelIndexBuffer: WebGLBuffer | null = null; // モデルのIBO
let model: Model; // ジオメトリのデータ

// programオブジェクト内のシェーダへのインデックスを格納する
const attLocation: AttLocation = {}; 

const draw = (): void => {
  // シーンのクリア
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  mat4.perspective(projectionMatrix, 45, gl.canvas.width / gl.canvas.height, 0.1, 10000);
  mat4.identity(modelViewMatrix);
  mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -1.5]);

  mat4.copy(normalMatrix, modelViewMatrix);
  mat4.invert(normalMatrix, normalMatrix);
  mat4.transpose(normalMatrix, normalMatrix);

  gl.uniformMatrix4fv(attLocation.uModelViewMatrix, false, modelViewMatrix);
  gl.uniformMatrix4fv(attLocation.uProjectionMatrix, false, projectionMatrix);
  gl.uniformMatrix4fv(attLocation.uNormalMatrix, false, normalMatrix);

  try {
    // Bind
    gl.bindVertexArray(sphereVAO);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIndicesBuffer);

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

const initProgram = (): void => {
  // canvasを設定
  const canvas = Utils.getCanvas('webgl-canvas');
  Utils.autoResizeCanvas(canvas);

  // glcontext取得
  gl = Utils.getGLContext(canvas);
  gl.clearColor(0.9, 0.9, 0.9, 1);
  gl.enable(gl.DEPTH_TEST);

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
  attLocation.aVertexPosition = gl.getAttribLocation(program, AttributeKind.aVertexPosition);
  attLocation.aVertexNormal = gl.getAttribLocation(program, AttributeKind.aVertexNormal)
  attLocation.uProjectionMatrix = gl.getUniformLocation(program, AttributeKind.uProjectionMatrix);
  attLocation.uModelViewMatrix = gl.getUniformLocation(program, AttributeKind.uModelViewMatrix);
  attLocation.uNormalMatrix = gl.getUniformLocation(program, AttributeKind.uNormalMatrix);
  attLocation.uMaterialDiffuse = gl.getUniformLocation(program, AttributeKind.uMaterialDiffuse);
  attLocation.uLightDiffuse = gl.getUniformLocation(program, AttributeKind.uLightDiffuse);
  attLocation.uLightDirection = gl.getUniformLocation(program, AttributeKind.uLightDirection);
}

const initLights = () => {
  gl.uniform3fv(attLocation.uLightDirection, lightDirection);
  gl.uniform3fv(attLocation.uLightDiffuse, lightDiffuseColor);
  gl.uniform3fv(attLocation.uMaterialDiffuse, sphereColor);
}

const initBuffers = () => {
  // コードの見通しが非常に悪くなるため
  // verticesとindicesは./info.tsからインポートする
  const normals = Utils.calculateNormals(vertices, indices);
  
  // Create VAO
  sphereVAO = gl.createVertexArray();

  // Bind VAO
  gl.bindVertexArray(sphereVAO);

  // Vertices
  const sphereVerticesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereVerticesBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  // Configure VAO instructions
  if (isGLint(attLocation.aVertexPosition)) {
    gl.enableVertexAttribArray(attLocation.aVertexPosition);
    gl.vertexAttribPointer(attLocation.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
  }

  // 法線
  const sphereNormalsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereNormalsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  if (isGLint(attLocation.aVertexNormal)) {
    gl.enableVertexAttribArray(attLocation.aVertexNormal);
    gl.vertexAttribPointer(attLocation.aVertexNormal, 3, gl.FLOAT, false, 0, 0);
  }

  // インデックス
  sphereIndicesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIndicesBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  // Clean
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
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

  initControls();
}

const initControls = () => {
  Utils.configureControls({
    'Sphere Color': {
      value: Utils.denormalizeColor(sphereColor),
      onChange: v => gl.uniform3fv(attLocation.uMaterialDiffuse, Utils.normalizeColor(v))
    },
    'Light Diffuse Color': {
      value: Utils.denormalizeColor(lightDiffuseColor),
      onChange: v => gl.uniform3fv(attLocation.uLightDiffuse, Utils.normalizeColor(v))
    },
    // Spread all values from the reduce onto the controls
    ...['Translate X', 'Translate Y', 'Translate Z'].reduce((result, name, i) => {
      result[name] = {
        value: lightDirection[i],
        min: -10, max: 10, step: -0.1,
        onChange(v, state) {
          gl.uniform3fv(attLocation.uLightDirection, [
            -state['Translate X'],
            -state['Translate Y'],
            state['Translate Z']
          ]);
        }
      };
      return result;
    }, {})
  });
}

// html実行時にinitを実行する
(() => init())();