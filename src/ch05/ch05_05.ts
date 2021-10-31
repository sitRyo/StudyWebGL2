import Camera, { CameraTypes } from "../common/js/Camera";
import Program from "../common/js/Program";
import Scene from "../common/js/Scene";
import Transforms from "../common/js/Transforms";
import { GLAttribute, GLUniform } from "../common/js/types";
import Utils from "../common/js/Utils";
import Controls from "../common/js/Controls";
import Floor from "../common/js/Floor";
import { mat4, vec3 } from 'gl-matrix';
import vertexShader from '../common/shaders/ch05/01_vertexShader.vert';
import fragmentShader from '../common/shaders/ch05/01_fragmentShader.frag';

const utils = new Utils();

let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let camera: Camera;
let transforms: Transforms;
let fixedLight = false;
let sceneTime = 0;
let position = [];
let initialPosition: vec3 = [-25, 0, 20];
let finalPosition: vec3 = [40, 0, -20];
let incrementSteps = 1000;
let ballColor = [1, 1, 0, 1];
let flagStartColor = [0, 1, 0, 1];
let flagEndColor = [0, 0, 1, 1];

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
    'uWireframe'
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
}

function load(): void {
  scene.add(new Floor(80, 2));
  scene.load('/common/models/geometries/ball.json', 'ball');
  scene.load('/common/models/geometries/flag.json', 'flagStart');
  scene.load('/common/models/geometries/flag.json', 'flagEnd');
  interpolate();
}

function draw(): void {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  transforms.updatePerspective();

  try {
    scene.traverse(object => {
      transforms.calculateModelView();
      transforms.push();

      const { alias } = object;
      if (alias === 'ball') {
        mat4.translate(transforms.modelViewMatrix, transforms.modelViewMatrix, position[sceneTime]);
        object.diffuse = ballColor;
      }
      else if (alias === 'flagStart') {
        mat4.translate(transforms.modelViewMatrix, transforms.modelViewMatrix, initialPosition);
        object.diffuse = flagStartColor;
      }
      else if (alias === 'flagEnd') {
        mat4.translate(transforms.modelViewMatrix, transforms.modelViewMatrix, finalPosition);
        object.diffuse = flagEndColor;
      }
      transforms.setMatrixUniforms();
      transforms.pop();

      // Set uniforms
      gl.uniform1i(program.uniformLocations.uUpdateLight, Number(fixedLight));
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

function interpolate(): void {
  const [X0, Y0, Z0] = initialPosition;
  const [X1, Y1, Z1] = finalPosition;

  const dX = (X1 - X0) / incrementSteps;
  const dY = (Y1 - Y0) / incrementSteps;
  const dZ = (Z1 - Z0) / incrementSteps;

  for (let i = 0; i < incrementSteps; i++) {
    position.push([X0 + (dX * i), Y0 + (dY * i), Z0 + (dZ * i)]);
  }
}

function animate(): void {
  sceneTime += 1;
  if (sceneTime === incrementSteps) sceneTime = 0;
  draw();
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
    'Static Light Position': {
      value: fixedLight,
      onChange: v => fixedLight = v
    },
    'Go Home': () => camera.goHome()
  });
}