import './common/lib/normalize.css'
import Utils from './common/js/Utils'
import vertShader from './common/shaders/vertexShader.vert';
import fragShader from './common/shaders/fragmentShader.frag';
import { isGLint } from './common/js/typeGuards';
import { mat4 } from 'gl-matrix';
import { AttributeLocations, GLAttribute, Model } from './common/js/types';
import Program from './common/js/Program';

const utils = new Utils();

// Storing relevant values globally to be used throughout application
let gl: WebGL2RenderingContext = null;
let program: Program;
let modelViewMatrix = mat4.create();
let projectionMatrix = mat4.create();
let normalMatrix = mat4.create();
let clearColor = [0.9, 0.9, 0.9];
let angle = 0;
let lastTime = 0;
let lightPosition = [4.5, 3, 15];
let shininess = 200;
let distance = -100;
let parts: Model[] = [];

function initProgram() {
  // Configure `canvas`
  const canvas = document.getElementById('webgl-canvas');
  utils.autoResizeCanvas(canvas as HTMLCanvasElement);

  // Configure `gl`
  gl = utils.getGLContext(canvas as HTMLCanvasElement);
  gl.clearColor(0.9, 0.9, 0.9, 1);
  gl.clearDepth(100);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  // Configure `program`
  program = new Program(gl, vertShader, fragShader);
  
  const attributes: GLAttribute[] = [
    'aVertexPosition',
    'aVertexNormal',
  ];

  const uniforms: GLAttribute[] = [
    'uProjectionMatrix',
    'uModelViewMatrix',
    'uNormalMatrix',
    'uLightAmbient',
    'uLightPosition',
    'uMaterialSpecular',
    'uMaterialDiffuse',
    'uShininess',
  ];

  program.load(attributes, uniforms);
}

// Configure lights
function initLights() {
  gl.uniform3fv(program.attributeLocations.uLightPosition, lightPosition);
  gl.uniform3f(program.attributeLocations.uLightAmbient, 0.1, 0.1, 0.1);
  gl.uniform3f(program.attributeLocations.uMaterialDiffuse, 0.8, 0.8, 0.8);
  gl.uniform3f(program.attributeLocations.uMaterialDiffuse, 0.8, 0.8, 0.8);
  gl.uniform1f(program.attributeLocations.uShininess, shininess);
}

function draw() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  mat4.perspective(projectionMatrix, 45, gl.canvas.width / gl.canvas.height, 0.1, 1000);
  mat4.identity(modelViewMatrix);
  mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, distance]);
  mat4.rotate(modelViewMatrix, modelViewMatrix, 20 * Math.PI / 180, [1, 0, 0]);
  mat4.rotate(modelViewMatrix, modelViewMatrix, angle * Math.PI / 180, [0, 1, 0]);

  gl.uniformMatrix4fv(program.attributeLocations.uProjectionMatrix, false, projectionMatrix);
  gl.uniformMatrix4fv(program.attributeLocations.uModelViewMatrix, false, modelViewMatrix);
  gl.uniformMatrix4fv(program.attributeLocations.uNormalMatrix, false, normalMatrix);

  parts.forEach(part => {
    gl.bindVertexArray(part.vao);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, part.ibo);

    gl.drawElements(gl.TRIANGLES, part.indices.length, gl.UNSIGNED_SHORT, 0);
  });

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}

function animate() {
  const timeNow = new Date().getTime();
  if (lastTime) {
    const elapsed = timeNow - lastTime;
    angle += (90 * elapsed) / 10000.0;
  }
  lastTime = timeNow;
}

function render() {
  requestAnimationFrame(render);
  draw();
  animate();
}

// Load each individual object
function load() {
  for (let i = 1; i < 179; ++i) {
    fetch(`/common/models/nissan-gtr/part${i}.json`)
    .then(res => res.json())
    .then((part: Model) => {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);

      // 頂点
      const vertexBufferObject = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(part.vertices), gl.STATIC_DRAW);
      if (isGLint(program.attributeLocations.aVertexPosition)) {
        gl.enableVertexAttribArray(program.attributeLocations.aVertexPosition);
        gl.vertexAttribPointer(program.attributeLocations.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
      }

      // 法線
      const normalBufferObject = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBufferObject);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(utils.calculateNormals(part.vertices, part.indices)), gl.STATIC_DRAW);
      if (isGLint(program.attributeLocations.aVertexNormal)) {
        gl.enableVertexAttribArray(program.attributeLocations.aVertexNormal);
        gl.vertexAttribPointer(program.attributeLocations.aVertexNormal, 3, gl.FLOAT, false, 0, 0);
      }

      // インデックス
      const indexBufferObject = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObject);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(part.indices), gl.STATIC_DRAW);

      part.vao = vao;
      part.ibo = indexBufferObject;

      parts.push(part);

      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    });
  }
}

function init() {
  initProgram();
  initLights();
  load();
  render();

  initControls();
}

function initControls() {
  utils.configureControls({
    'Car Color': {
      value: [255, 255, 255],
      onChange: v => gl.uniform3f(program.attributeLocations.uMaterialDiffuse, ...utils.normalizeColor(v))
    },
    Background: {
      value: utils.denormalizeColor(clearColor),
      onChange: v => gl.clearColor(...utils.normalizeColor(v), 1)
    },
    Shininess: {
      value: shininess,
      min: 1, max: 50, step: 0.1,
      onChange: value => gl.uniform1f(program.attributeLocations.uShininess, value)
    },
    Distance: {
      value: distance,
      min: -600, max: -80, step: 1,
      onChange: value => distance = value
    },
    // Spread all values from the reduce onto the controls
    ...['Translate X', 'Translate Y', 'Translate Z'].reduce((result, name, i) => {
      result[name] = {
        value: lightPosition[i],
        min: -1000, max: 1000, step: -0.1,
        onChange(v, state) {
          gl.uniform3fv(program.attributeLocations.uLightPosition, [
            state['Translate X'],
            state['Translate Y'],
            state['Translate Z']
          ]);
        }
      };
      return result;
    }, {}),
  });
}

// html実行時にinitを実行する
(() => init())();