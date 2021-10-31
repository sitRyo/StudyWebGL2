import Camera, { CameraTypes } from "../common/js/Camera";
import Program from "../common/js/Program";
import Scene from "../common/js/Scene";
import Transforms from "../common/js/Transforms";
import { GLAttribute, GLUniform, Model } from "../common/js/types";
import Utils from "../common/js/Utils";
import Controls from "../common/js/Controls";
import Floor from "../common/js/Floor";
import { mat4, vec3 } from 'gl-matrix';
import Axis from "../common/js/Axis";
import vertexShader from '../common/shaders/ch05/01_vertexShader.vert';
import fragmentShader from '../common/shaders/ch05/01_fragmentShader.frag';

const utils = new Utils();

let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let camera: Camera;
let transforms: Transforms;
let fixedLight = false;
let position = [];
let sceneTime = 0;
let incrementSteps = 1000;
let ballColor = [1, 1, 0, 1];
let flagStartColor = [0, 1, 0, 1];
let flagEndColor = [0, 0, 1, 1];
let flagColor = [0.5, 0.5, 0.5, 1];
let flagColorHighlight = [1, 0, 0, 1];
let zDimension = 150;
let linearInterpolation = 'Linear Interpolation';
let polynomialInterpolation = 'Polynomial Interpolation';
let bSplineInterpolation = 'B-Spline Interpolation';
let interpolationType = linearInterpolation;
let controlPoints: vec3[] = [
    [-25, 0, 20],
    [-40, 0, -10],
    [0, 0, 10],
    [25, 0, -5],
    [40, 0, -20]
  ];

function configure(): void {
  const canvas = utils.getCanvas('webgl-canvas');
  utils.autoResizeCanvas(canvas);

  gl = utils.getGLContext(canvas);
  gl.clearColor(0.9, 0.9, 0.9, 1);
  gl.clearDepth(100);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  program = new Program(gl, vertexShader, fragmentShader);

  const uniforms: GLUniform[] = [
    'uProjectionMatrix',
    'uModelViewMatrix',
    'uNormalMatrix',
    'uMaterialDiffuse',
    'uMaterialAmbient',
    'uMaterialSpecular',
    'uLightAmbient',
    'uLightDiffuse',
    'uLightSpecular',
    'uLightPosition',
    'uShininess',
    'uUpdateLight',
    'uWireframe',
    'uPerVertexColor'
  ];

  const attributes: GLAttribute[] = [
    'aVertexPosition',
    'aVertexNormal',
    'aVertexColor',
  ];

  program.load(attributes, uniforms);

  scene = new Scene(gl, program);

  camera = new Camera(CameraTypes.ORBITING_TYPE);
  camera.goHome([0, 2, 80]);
  camera.setElevation(-20);
  new Controls(camera, canvas);

  transforms = new Transforms(gl, program, camera, canvas);

  gl.uniform3fv(program.uniformLocations.uLightPosition, [0, 120, 120]);
  gl.uniform4fv(program.uniformLocations.uLightAmbient, [0.2, 0.2, 0.2, 1]);
  gl.uniform4fv(program.uniformLocations.uLightDiffuse, [1, 1, 1, 1]);
  gl.uniform4fv(program.uniformLocations.uLightSpecular, [1, 1, 1, 1]);
  gl.uniform1f(program.uniformLocations.uShininess, 230.0);

  doLinearInterpolation();
}

function load(): void {
  scene.add(new Floor(zDimension, 2));
  scene.add(new Axis(zDimension));
  scene.load('/common/models/geometries/ball.json', 'ball', { 'diffuse': ballColor });
  scene.load('/common/models/geometries/flag.json', 'flagStart', { 'diffuse': flagStartColor });
  scene.load('/common/models/geometries/flag.json', 'flagEnd', { 'diffuse': flagEndColor });
  scene.load('/common/models/geometries/flag.json', 'flag1', { 'diffuse': flagColor });
  scene.load('/common/models/geometries/flag.json', 'flag2', { 'diffuse': flagColor });
  scene.load('/common/models/geometries/flag.json', 'flag3', { 'diffuse': flagColor });
}

function draw(): void {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  transforms.updatePerspective();

  try {
    gl.uniform1i(program.uniformLocations.uUpdateLight, Number(fixedLight));

    scene.traverse(object => {
      transforms.calculateModelView();
      transforms.push();

      const { alias } = object;
      if (alias === 'ball' && position[sceneTime]) {
        mat4.translate(transforms.modelViewMatrix, transforms.modelViewMatrix, position[sceneTime]);
      }
      else if (alias === 'flagStart') {
        mat4.translate(transforms.modelViewMatrix, transforms.modelViewMatrix, controlPoints[0]);
      }
      else if (alias === 'flagEnd') {
        mat4.translate(transforms.modelViewMatrix, transforms.modelViewMatrix, controlPoints[4]);
      }
      else if (alias === 'flag1') {
        if (interpolationType !== linearInterpolation) {
          mat4.translate(transforms.modelViewMatrix, transforms.modelViewMatrix, controlPoints[1]);
          object.diffuse = close(controlPoints[1], position[sceneTime], 3)
            ? flagColorHighlight
            : flagColor;
        }
        else {
          transforms.pop();
          return;
        }
      }
      else if (alias === 'flag2') {
        if (interpolationType !== linearInterpolation) {
          mat4.translate(transforms.modelViewMatrix, transforms.modelViewMatrix, controlPoints[2]);
          object.diffuse = close(controlPoints[2], position[sceneTime], 3)
            ? flagColorHighlight
            : flagColor;
        }
        else {
          transforms.pop();
          return;
        }
      }
      else if (alias === 'flag3') {
        if (interpolationType !== linearInterpolation) {
          mat4.translate(transforms.modelViewMatrix, transforms.modelViewMatrix, controlPoints[3]);
          object.diffuse = close(controlPoints[3], position[sceneTime], 3)
            ? flagColorHighlight
            : flagColor;
        }
        else {
          transforms.pop();
          return;
        }
      }

      transforms.setMatrixUniforms();
      transforms.pop();

      gl.uniform4fv(program.uniformLocations.uMaterialDiffuse, object.diffuse);
      gl.uniform4fv(program.uniformLocations.uMaterialSpecular, object.specular);
      gl.uniform4fv(program.uniformLocations.uMaterialAmbient, object.ambient);
      gl.uniform1i(program.uniformLocations.uWireframe, Number(object.wireframe));
      // bug? don't use in the VertexShader.
      // gl.uniform1i(program.uniformLocations.uPerVertexColor, object.perVertexColor);

      // Bind
      gl.bindVertexArray(object.vao);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);

      // Draw
      if (object.wireframe) {
        gl.drawElements(gl.LINES, object.indices.length, gl.UNSIGNED_SHORT, 0);
      }
      else {
        gl.drawElements(gl.TRIANGLES, object.indices.length, gl.UNSIGNED_SHORT, 0);
      }

      // Clean
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    });
  }
  catch (error) {
    console.error(error);
  }
}

function animate(): void {
  sceneTime += 1;
  if (sceneTime === incrementSteps) sceneTime = 0;
  draw();
}

function resetAnimation(): void {
  sceneTime = 0;
  position.length = 0;
}

function render(): void {
  setInterval(animate, 30 / 1000);
}

export function init(): void {
  configure();
  load();
  render();

  initControls();
}

function initControls(): void {
  utils.configureControls({
    'Camera Type': {
      value: camera.type,
      options: [CameraTypes.ORBITING_TYPE, CameraTypes.TRACKING_TYPE],
      onChange: v => {
        camera.goHome();
        camera.setType(v);
      }
    },
    Points: [0, 1, 2, 3, 4].reduce((result, i) => {
      result[`Point ${i + 1}`] = {
        value: controlPoints[i][0],
        min: -70, max: 70, step: 1,
        onChange: v => {
          controlPoints[i][0] = v;
          interpolate();
        }
      };
      return result;
    }, {}),
    Interpolation: {
      value: interpolationType,
      options: [
        linearInterpolation,
        polynomialInterpolation,
        bSplineInterpolation
      ],
      onChange: v => {
        resetAnimation();
        interpolationType = v;
        if (interpolationType === linearInterpolation) {
          controlPoints = [
            [-25, 0, 20],
            [-40, 0, -10],
            [0, 0, 10],
            [25, 0, -5],
            [40, 0, -20]
          ];
          incrementSteps = 1000;
        }
        else if (interpolationType === polynomialInterpolation) {
          controlPoints = [
            [21, 0, 23],
            [-3, 0, -10],
            [-21, 0, -53],
            [50, 0, -31],
            [-24, 0, 2]
          ];
          incrementSteps = 1355;
        }
        else if (interpolationType === bSplineInterpolation) {
          controlPoints = [
            [-21, 0, 23],
            [32, 0, -10],
            [0, 0, -53],
            [-32, 0, -10],
            [21, 0, 23]
          ];
          incrementSteps = 1000;
        }
        interpolate();
      }
    },
    'Interpolation Steps': {
      value: incrementSteps,
      min: 10, max: 1500, step: 1,
      onChange: v => {
        incrementSteps = v;
        interpolate();
      }
    },
    'Static Light Position': {
      value: fixedLight,
      onChange: v => fixedLight = v
    },
    'Go Home': () => camera.goHome()
  });
}

function close(c1, c0, r): boolean {
  return Math.sqrt(
    (c1[0] - c0[0]) *
    (c1[0] - c0[0]) +
    (c1[1] - c0[1]) *
    (c1[1] - c0[1]) +
    (c1[2] - c0[2]) *
    (c1[2] - c0[2])
  ) <= r;
}

function doLinearInterpolation(): void {
  position = [];
  const [X0, Y0, Z0] = controlPoints[0];
  const [X1, Y1, Z1] = controlPoints[controlPoints.length - 1];

  for (let i = 0; i < incrementSteps; i++) {
    const s = i / incrementSteps;
    position.push([X0 * (1 - s) + X1 * s, Y0 * (1 - s) + Y1 * s, Z0 * (1 - s) + Z1 * s]);
  }
}

function doLagrangeInterpolation(): void {
  position = [];

  const N = controlPoints.length;
  const dT = incrementSteps / (N - 1);
  const D = [];

  for (let i = 0; i < N; i++) {
    D[i] = 1;
    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      D[i] *= dT * (i - j);
    }
  }

  function Lk(x, axis) {
    const R = [];

    let S = 0;
    for (let i = 0; i < N; i++) {
      R[i] = 1;
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        R[i] *= (x - j * dT);
      }
      R[i] /= D[i];
      S += (R[i] * controlPoints[i][axis]);
    }

    return S;
  }

  for (let k = 0; k < incrementSteps; k++) {
    position.push([Lk(k, 0), Lk(k, 1), Lk(k, 2)]);
  }
}

// Creating the knot vector (clamped):
// http://web.mit.edu/hyperbook/Patrikalakis-Maekawa-Cho/node17.html
function doBSplineInterpolation(): void {
  position = [];

  const N = controlPoints.length - 1;
  const P = 3;
  const U = [];
  const M = N + P + 1;
  const deltaKnot = 1 / (M - (2 * P));

  for (let i = 0; i <= P; i++) {
    U.push(0);
  }

  let v = deltaKnot;
  for (let i = P + 1; i < M - P + 1; i++) {
    U.push(v);
    v += deltaKnot;
  }

  for (let i = M - P + 1; i <= M; i++) {
    U.push(1);
  }

  function No(u, i) {
    return U[i] <= u && u < U[i + 1] ? 1 : 0;
  }

  function Np(u, i, p) {
    let A = 0, B = 0;

    if (p - 1 === 0) {
      A = No(u, i);
      B = No(u, i + 1);
    }
    else {
      A = Np(u, i, p - 1);
      B = Np(u, i + 1, p - 1);
    }

    let coefficientA = 0, coefficientB = 0;

    if (U[i + p] - U[i] !== 0) {
      coefficientA = (u - U[i]) / (U[i + p] - U[i]);
    }
    if (U[i + p + 1] - U[i + 1] !== 0) {
      coefficientB = (U[i + p + 1] - u) / (U[i + p + 1] - U[i + 1]);
    }

    return coefficientA * A + coefficientB * B;
  }

  function C(t) {
    const result = [];

    for (let j = 0; j < 3; j++) {
      let sum = 0;
      for (let i = 0; i <= N; i++) {
        sum += controlPoints[i][j] * Np(t, i, P);
      }
      result[j] = sum;
    }

    return result;
  }

  const dT = 1 / incrementSteps;

  let t = 0;
  do {
    position.push(C(t));
    t += dT;
  } while (t < 1.0);

  position.push(C(1.0));
}

function interpolate(): void {
  const interpolate = {
    [linearInterpolation]: doLinearInterpolation,
    [polynomialInterpolation]: doLagrangeInterpolation,
    [bSplineInterpolation]: doBSplineInterpolation
  }[interpolationType];
  interpolate && interpolate();
}