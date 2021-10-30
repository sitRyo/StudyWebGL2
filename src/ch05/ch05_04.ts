import Camera, { CameraTypes } from "../common/js/Camera";
import Program from "../common/js/Program";
import Scene from "../common/js/Scene";
import Transforms from "../common/js/Transforms";
import { GLAttribute, GLUniform, Model } from "../common/js/types";
import Utils from "../common/js/Utils";
import Controls from "../common/js/Controls";
import Floor from "../common/js/Floor";
import { vec3 } from 'gl-matrix';
import vertexShader from '../common/shaders/ch05/04_vertexShader.vert';
import fragmentShader from '../common/shaders/ch05/04_fragmentShader.frag';
import Axis from "../common/js/Axis";

const utils = new Utils();

let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let camera: Camera;
let transforms: Transforms;
let elapsedTime: number;
let initialTime: number;
let fixedLight = false;
let balls: BouncingBall[] = [];
let sceneTime = 0;
let animationRate = 15;
let gravity = 9.8;
let ballsCount = 500;

// Helper class to encapsulate the the bouncing ball behavior.
class BouncingBall {
  position: vec3;
  H0: number;
  V0: number;
  VF: number;
  HF: number;
  bouncingTime: number;
  BOUNCINESS: number;
  color: number[];

  constructor() {
    this.position = generatePosition();

    this.H0 = this.position[1];
    this.V0 = 0;
    this.VF = Math.sqrt(2 * gravity * this.H0);
    this.HF = 0;

    this.bouncingTime = 0;
    this.BOUNCINESS = (Math.random() + 0.5);

    this.color = [Math.random(), Math.random(), Math.random(), 1];
  }

  update(time: number): void {
    const t = time - this.bouncingTime;
    const h = this.H0 + (this.V0 * t) - (0.5 * gravity * t * t);

    if (h <= 0) {
      this.bouncingTime = time;
      this.V0 = this.VF * this.BOUNCINESS;
      this.HF = (this.V0 * this.V0) / (2 * gravity);
      this.VF = Math.sqrt(2 * gravity * this.HF);
      this.H0 = 0;
    }
    else {
      this.position[1] = h;
    }
  }

}

// Generate a random position
function generatePosition(): vec3 {
  return [
    Math.floor(Math.random() * 50) - Math.floor(Math.random() * 50),
    Math.floor(Math.random() * 30) + 50,
    Math.floor(Math.random() * 50)
  ];
}

function configure(): void {
  // Configure `canvas`
  const canvas = utils.getCanvas('webgl-canvas');
  utils.autoResizeCanvas(canvas);

  // Configure `gl`
  gl = utils.getGLContext(canvas);
  gl.clearColor(0.9, 0.9, 0.9, 1);
  gl.clearDepth(100);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  // Configure `program`
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
    'uPerVertexColor',
    'uTranslation',
    'uTranslate'
  ];

  const attributes: GLAttribute[] = [
    'aVertexPosition',
    'aVertexNormal',
    'aVertexColor',
  ];

  // Load attributes and uniforms
  program.load(attributes, uniforms);

  // Configure `scene`
  scene = new Scene(gl, program);

  // Configure `camera` and `controls`
  camera = new Camera(CameraTypes.ORBITING_TYPE);
  camera.goHome([0, 2, 70]);
  camera.setFocus([0, 0, 0]);
  new Controls(camera, canvas);

  // Configure `transforms`
  transforms = new Transforms(gl, program, camera, canvas);

  // Set uniforms
  gl.uniform3fv(program.uniformLocations.uLightPosition, [0, 120, 120]);
  gl.uniform4fv(program.uniformLocations.uLightAmbient, [0.2, 0.2, 0.2, 1]);
  gl.uniform4fv(program.uniformLocations.uLightDiffuse, [1, 1, 1, 1]);
  gl.uniform4fv(program.uniformLocations.uLightSpecular, [1, 1, 1, 1]);
  gl.uniform1f(program.uniformLocations.uShininess, 230);

  // Create program variable that maps the uniform uTranslation
  gl.uniform3fv(program.uniformLocations.uTranslation, [0, 0, 0]);

  // Create program variable that maps the uniform uTranslate
  gl.uniform1i(program.uniformLocations.uTranslate, Number(false));

  for (let i = 0; i < ballsCount; i++) {
    // Bug?
    // ボールはコンストラクタに初期位置を持たない
    // balls.push(new BouncingBall(...generatePosition()));
    balls.push(new BouncingBall());
  }
}

// Load objects into our scene
function load(): void {
  scene.add(new Floor(80, 2));
  scene.add(new Axis(82));
  // We use the same geometry for every ball
  scene.load('/common/models/geometries/ball.json', 'ball');
}

function drawBall(ball: BouncingBall, sphere: Model) {
  gl.uniform3fv(program.uniformLocations.uTranslation, ball.position);
  gl.uniform4fv(program.uniformLocations.uMaterialDiffuse, ball.color);
  gl.drawElements(gl.TRIANGLES, sphere.indices.length, gl.UNSIGNED_SHORT, 0);
}

function drawBalls(object: Model) {
  gl.uniform4fv(program.uniformLocations.uMaterialSpecular, object.specular);
  gl.uniform4fv(program.uniformLocations.uMaterialAmbient, object.ambient);
  gl.uniform1i(program.uniformLocations.uWireframe, Number(false));
  gl.uniform1i(program.uniformLocations.uTranslate, Number(true));

  // Bind
  gl.bindVertexArray(object.vao);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);

  // Iterate over `balls` array and draw each one
  balls.forEach(ball => drawBall(ball, object));

  // Clean
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}

function draw(): void {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  transforms.updatePerspective();

  try {
    gl.uniform1i(program.uniformLocations.uUpdateLight, Number(fixedLight));

    // Iterate over every object in the scene
    scene.traverse(object => {
      transforms.calculateModelView();
      transforms.setMatrixUniforms();

      // If the object is a `ball`, then return with
      // the optimized draw commands
      if (object.alias === 'ball') {
        return drawBalls(object);
      }

      // Set uniforms
      gl.uniform1i(program.uniformLocations.uTranslate, Number(false));
      gl.uniform4fv(program.uniformLocations.uMaterialDiffuse, object.diffuse);
      gl.uniform4fv(program.uniformLocations.uMaterialSpecular, object.specular);
      gl.uniform4fv(program.uniformLocations.uMaterialAmbient, object.ambient);
      gl.uniform1i(program.uniformLocations.uWireframe, Number(object.wireframe));

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
  balls.forEach(ball => ball.update(sceneTime));
  sceneTime += 33 / 1000;
  draw();
}

function onFrame(): void {
  elapsedTime = (new Date).getTime() - initialTime;
  if (elapsedTime < animationRate) return;

  let steps = Math.floor(elapsedTime / animationRate);
  while (steps > 0) {
    animate();
    steps -= 1;
  }

  initialTime = (new Date).getTime();
}

function render(): void {
  initialTime = (new Date).getTime();
  setInterval(onFrame, animationRate / 1000);
}

export function init(): void {
  configure();
  load();
  render();

  initControls();
}

// window.onload = init;

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
    'Static Light Position': {
      value: fixedLight,
      onChange: v => fixedLight = v
    },
    'Go Home': () => camera.goHome()
  });
}