import Camera, { CameraTypes } from "../common/js/Camera";
import Program from "../common/js/Program";
import Scene from "../common/js/Scene";
import Transforms from "../common/js/Transforms";
import { GLAttribute, GLUniform } from "../common/js/types";
import Utils from "../common/js/Utils";
import Controls from "../common/js/Controls";
import Floor from "../common/js/Floor";
import Axis from "../common/js/Axis";
import { mat4 } from 'gl-matrix';
import vertexShader from '../common/shaders/ch05/01_vertexShader.vert';
import fragmentShader from '../common/shaders/ch05/01_fragmentShader.frag';

const utils = new Utils();

let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let camera: Camera;
let transforms: Transforms;
let elapsedTime: number;
let initialTime: number;
let fixedLight = false;
let dxSphere = 0.1;
let dxCone = 0.15;
let spherePosition = 0;
let conePosition = 0;
let frequency = 5;

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
    'uWireframe'
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
  camera.goHome([0, 2, 50]);
  camera.setFocus([0, 0, 0]);
  new Controls(camera, canvas);

  // Configure `transforms`
  transforms = new Transforms(gl, program, camera, canvas);

  gl.uniform3fv(program.uniformLocations.uLightPosition, [0, 120, 120]);
  gl.uniform4fv(program.uniformLocations.uLightAmbient, [0.2, 0.2, 0.2, 1]);
  gl.uniform4fv(program.uniformLocations.uLightDiffuse, [1, 1, 1, 1]);
  gl.uniform4fv(program.uniformLocations.uLightSpecular, [1, 1, 1, 1]);
  gl.uniform1f(program.uniformLocations.uShininess, 230);
}

// Load objects into our scene
function load(): void {
  scene.add(new Floor(80, 2));
  scene.add(new Axis(82));
  scene.load('/common/models/geometries/sphere2.json', 'sphere');
  scene.load('/common/models/geometries/cone3.json', 'cone');
}

function draw(): void {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  transforms.updatePerspective();

  try {
    gl.uniform1i(program.uniformLocations.uUpdateLight, Number(fixedLight));

    // Iterate over every object in the scene
    scene.traverse(object => {
      // Calculate local transformations
      transforms.calculateModelView();
      transforms.push();

      // Depending on which object, apply transformation
      if (object.alias === 'sphere') {
        const sphereTransform = transforms.modelViewMatrix;
        mat4.translate(sphereTransform, sphereTransform, [0, 0, spherePosition]);
      }
      else if (object.alias === 'cone') {
        const coneTransform = transforms.modelViewMatrix;
        mat4.translate(coneTransform, coneTransform, [conePosition, 0, 0]);
      }

      transforms.setMatrixUniforms();
      transforms.pop();

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

// Update object positions
function animate(): void {
  spherePosition += dxSphere;

  if (spherePosition >= 30 || spherePosition <= -30) {
    dxSphere = -dxSphere;
  }

  conePosition += dxCone;
  if (conePosition >= 35 || conePosition <= -35) {
    dxCone = -dxCone;
  }

  draw();
}

function onFrame(): void {
  elapsedTime = (new Date).getTime() - initialTime;
  if (elapsedTime < frequency) return;

  let steps = Math.floor(elapsedTime / frequency);
  while (steps > 0) {
    animate();
    steps -= 1;
  }

  initialTime = (new Date).getTime();
}

function render(): void {
  initialTime = new Date().getTime();
  setInterval(onFrame, frequency / 1000);
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