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
let shininess = 10;
let clearColor = [0.9, 0.9, 0.9, 1];
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
let angle = 0;
let lastTime: number | null = null;
let wireframe = false;

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
  attLocation.uMaterialAmbient = gl.getUniformLocation(program, 'uMaterialAmbient');
  attLocation.uMaterialDiffuse = gl.getUniformLocation(program, 'uMaterialDiffuse');
  attLocation.uMaterialSpecular = gl.getUniformLocation(program, 'uMaterialSpecular');
  attLocation.uShininess = gl.getUniformLocation(program, 'uShininess');
  attLocation.uLightAmbient = gl.getUniformLocation(program, 'uLightAmbient');
  attLocation.uLightDiffuse = gl.getUniformLocation(program, 'uLightDiffuse');
  attLocation.uLightSpecular = gl.getUniformLocation(program, 'uLightSpecular');
  attLocation.uLightDirection = gl.getUniformLocation(program, 'uLightDirection');
}

const initLights = () => {
  // 光源
  gl.uniform4fv(attLocation.uLightDiffuse, lightColor); // 拡散反射光
  gl.uniform4fv(attLocation.uLightAmbient, lightAmbient); // 環境光
  gl.uniform4fv(attLocation.uLightSpecular, lightSpecular); // 鏡面反射光
  gl.uniform3fv(attLocation.uLightDirection, lightDirection); // 方向
  // マテリアル
  gl.uniform4fv(attLocation.uMaterialDiffuse, materialDiffuse); // 拡散反射光
  gl.uniform4fv(attLocation.uMaterialAmbient, materialAmbient); // 環境光
  gl.uniform4fv(attLocation.uMaterialSpecular, materialSpecular); // 鏡面反射光
  gl.uniform1f(attLocation.uShininess, shininess); // 光沢度
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

const draw = (): void => {
  // シーンのクリア
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  mat4.perspective(projectionMatrix, 45, gl.canvas.width / gl.canvas.height, 0.1, 10000);
  mat4.identity(modelViewMatrix);
  mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -1.5]);
  mat4.rotate(modelViewMatrix, modelViewMatrix, angle * Math.PI / 180, [0, 1, 0]);

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

    const type = wireframe ? gl.LINES : gl.TRIANGLES;
    // Draw
    gl.drawElements(type, indices.length, gl.UNSIGNED_SHORT, 0);

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

const animate = () => {
  let timeNow = new Date().getTime();
  if (lastTime) {
    const elapsed = timeNow - lastTime;
    angle += (90 * elapsed) / 1000.0;
  }
  lastTime = timeNow;
}

const render = () => {
  window.requestAnimationFrame(render); // ブラウザにアニメーションを行わせる
  animate();
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
    'Light Color': {
      value: Utils.denormalizeColor(lightColor),
      onChange: v => gl.uniform4fv(attLocation.uLightDiffuse, Utils.normalizeColor(v))
    },
    'Light Ambient Term': {
      value: lightAmbient[0],
      min: 0, max: 1, step: 0.01,
      onChange: v => gl.uniform4fv(attLocation.uLightAmbient, [v, v, v, 1])
    },
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
    }, {}),
    'Sphere Color': {
      value: Utils.denormalizeColor(materialDiffuse),
      onChange: v => gl.uniform4fv(attLocation.uMaterialDiffuse, Utils.normalizeColor(v))
    },
    'Material Ambient Term': {
      value: materialAmbient[0],
      min: 0, max: 1, step: 0.01,
      onChange: v => gl.uniform4fv(attLocation.uMaterialAmbient, [v, v, v, 1])
    },
    'Material Specular Term': {
      value: materialSpecular[0],
      min: 0, max: 1, step: 0.01,
      onChange: v => gl.uniform4fv(attLocation.uMaterialSpecular, [v, v, v, 1])
    },
    Shininess: {
      value: shininess,
      min: 0, max: 50, step: 0.1,
      onChange: v => gl.uniform1f(attLocation.uShininess, v)
    },
    Background: {
      value: Utils.denormalizeColor(clearColor),
      onChange: v => gl.clearColor(Utils.normalizeColor(v)[0], Utils.normalizeColor(v)[1], Utils.normalizeColor(v)[2], 1)
    },
    Wireframe: {
      value: wireframe,
      onChange: v => wireframe = v
    }
  })
}

// html実行時にinitを実行する
(() => init())();