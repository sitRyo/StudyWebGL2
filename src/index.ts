import './common/lib/normalize.css'
import Utils from './common/utils/Utils'
import vertShader from './common/shaders/vertexShader.vert';
import fragShader from './common/shaders/fragmentShader.frag';
import { isGLint } from './common/lib/typeGuards';
import { mat4 } from 'gl-matrix';
import { AttLocation, Model } from './common/utils/types';

const utils = new Utils();
// programオブジェクト内のシェーダへのインデックスを格納する
const attLocation: AttLocation = {};

// Storing relevant values globally to be used throughout application
let gl: WebGL2RenderingContext = null;
let program: WebGLProgram | null = null;
let modelViewMatrix = mat4.create();
let projectionMatrix = mat4.create();
let normalMatrix = mat4.create();
let objects: Model[] = [];
let angle = 0;
let lastTime = 0;
let lightPosition = [4.5, 3, 15];
let shininess = 200;
let distance = -100;

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

  const vertexShader = utils.getShader(gl, vertShader, gl.VERTEX_SHADER);
  const fragmentShader = utils.getShader(gl, fragShader, gl.FRAGMENT_SHADER);

  // Configure `program`
  program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Could not initialize shaders');
  }

  gl.useProgram(program);

  // Setting locations onto `program` instance
  attLocation.aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
  attLocation.aVertexNormal = gl.getAttribLocation(program, 'aVertexNormal');
  attLocation.uProjectionMatrix = gl.getUniformLocation(program, 'uProjectionMatrix');
  attLocation.uModelViewMatrix = gl.getUniformLocation(program, 'uModelViewMatrix');
  attLocation.uNormalMatrix = gl.getUniformLocation(program, 'uNormalMatrix');
  attLocation.uMaterialAmbient = gl.getUniformLocation(program, 'uMaterialAmbient');
  attLocation.uMaterialDiffuse = gl.getUniformLocation(program, 'uMaterialDiffuse');
  attLocation.uMaterialSpecular = gl.getUniformLocation(program, 'uMaterialSpecular');
  attLocation.uShininess = gl.getUniformLocation(program, 'uShininess');
  attLocation.uLightPosition = gl.getUniformLocation(program, 'uLightPosition');
  attLocation.uLightAmbient = gl.getUniformLocation(program, 'uLightAmbient');
  attLocation.uLightDiffuse = gl.getUniformLocation(program, 'uLightDiffuse');
  attLocation.uLightSpecular = gl.getUniformLocation(program, 'uLightSpecular');
}

// Configure lights
function initLights() {
  gl.uniform3fv(attLocation.uLightPosition, lightPosition);
  gl.uniform4f(attLocation.uLightAmbient, 1, 1, 1, 1);
  gl.uniform4f(attLocation.uLightDiffuse, 1, 1, 1, 1);
  gl.uniform4f(attLocation.uLightSpecular, 1, 1, 1, 1);
  gl.uniform4f(attLocation.uMaterialAmbient, 0.1, 0.1, 0.1, 1);
  gl.uniform4f(attLocation.uMaterialDiffuse, 0.5, 0.8, 0.1, 1);
  gl.uniform4f(attLocation.uMaterialSpecular, 0.6, 0.6, 0.6, 1);
  gl.uniform1f(attLocation.uShininess, shininess);
}

function draw() {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  mat4.perspective(projectionMatrix, 45, gl.canvas.width / gl.canvas.height, 0.1, 1000);

  // We will start using the `try/catch` to capture any errors from our `draw` calls
  try {
    // Iterate over every object
    objects.forEach(object => {
      // We will cover these operations in later chapters
      mat4.identity(modelViewMatrix);
      mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, distance]);
      mat4.rotate(modelViewMatrix, modelViewMatrix, 30 * Math.PI / 180, [1, 0, 0]);
      mat4.rotate(modelViewMatrix, modelViewMatrix, angle * Math.PI / 180, [0, 1, 0]);

      // If object is the light, we update its position
      if (object.alias === 'light') {
        const lightPosition = gl.getUniform(program, attLocation.uLightPosition);
        mat4.translate(modelViewMatrix, modelViewMatrix, lightPosition);
      }

      mat4.copy(normalMatrix, modelViewMatrix);
      mat4.invert(normalMatrix, normalMatrix);
      mat4.transpose(normalMatrix, normalMatrix);

      gl.uniformMatrix4fv(attLocation.uModelViewMatrix, false, modelViewMatrix);
      gl.uniformMatrix4fv(attLocation.uProjectionMatrix, false, projectionMatrix);
      gl.uniformMatrix4fv(attLocation.uNormalMatrix, false, normalMatrix);

      // Set lighting data
      gl.uniform4fv(attLocation.uMaterialAmbient, object.ambient);
      gl.uniform4fv(attLocation.uMaterialDiffuse, object.diffuse);
      gl.uniform4fv(attLocation.uMaterialSpecular, object.specular);

      // Bind
      gl.bindVertexArray(object.vao);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);

      // Draw
      gl.drawElements(gl.TRIANGLES, object.indices.length, gl.UNSIGNED_SHORT, 0);

      // Clean
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    });
  }
  // We catch the `error` and simply output to the screen for testing/debugging purposes
  catch (error) {
    console.error(error);
  }
}

// Return the associated object, given its `alias`
function getObject(alias) {
  return objects.find(object => object.alias === alias);
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

function loadObject(filePath, alias) {
  fetch(filePath)
    .then(res => res.json())
    .then(data => {
      data.alias = alias;

      // Configure VAO
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);

      // Vertices
      const vertexBufferObject = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.vertices), gl.STATIC_DRAW);
      // Configure instructions for VAO
      if (isGLint(attLocation.aVertexPosition)) {
        gl.enableVertexAttribArray(attLocation.aVertexPosition);
        gl.vertexAttribPointer(attLocation.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
      }

      // Normals
      const normalBufferObject = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBufferObject);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(utils.calculateNormals(data.vertices, data.indices)), gl.STATIC_DRAW);
      // Configure instructions for VAO
      if (isGLint(attLocation.aVertexNormal)) {
        gl.enableVertexAttribArray(attLocation.aVertexNormal);
        gl.vertexAttribPointer(attLocation.aVertexNormal, 3, gl.FLOAT, false, 0, 0);
      }

      // Indices
      const indexBufferObject = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObject);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data.indices), gl.STATIC_DRAW);

      // Attach values to be able to reference later for drawing
      data.vao = vao;
      data.ibo = indexBufferObject;

      // Push onto objects for later reference
      objects.push(data);

      // Clean
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    });
}

// Load each individual object
function load() {
  loadObject('/common/models/geometries/plane.json', 'plane');
  loadObject('/common/models/geometries/cone2.json', 'cone');
  loadObject('/common/models/geometries/sphere1.json', 'sphere');
  loadObject('/common/models/geometries/sphere3.json', 'light');
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
    'Sphere Color': {
      value: [0, 255, 0],
      onChange: v => getObject('sphere').diffuse = [...utils.normalizeColor(v), 1.0]
    },
    'Cone Color': {
      value: [235, 0, 210],
      onChange: v => getObject('cone').diffuse = [...utils.normalizeColor(v), 1.0]
    },
    Shininess: {
      value: shininess,
      min: 1, max: 50, step: 0.1,
      onChange: v => gl.uniform1f(attLocation.uShininess, v)
    },
    // Spread all values from the reduce onto the controls
    ...['Translate X', 'Translate Y', 'Translate Z'].reduce((result, name, i) => {
      result[name] = {
        value: lightPosition[i],
        min: -50, max: 50, step: -0.1,
        onChange(v, state) {
          gl.uniform3fv(attLocation.uLightPosition, [
            state['Translate X'],
            state['Translate Y'],
            state['Translate Z']
          ]);
        }
      };
      return result;
    }, {}),
    Distance: {
      value: distance,
      min: -200, max: -50, step: 0.1,
      onChange: v => distance = v
    }
  });
}


// html実行時にinitを実行する
(() => init())();