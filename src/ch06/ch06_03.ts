import Camera, { CameraTypes } from "../common/js/Camera";
import Clock from "../common/js/Clock";
import Controls from "../common/js/Controls";
import Program from "../common/js/Program";
import Scene from "../common/js/Scene";
import Transforms from '../common/js/Transforms'
import { GLAttribute, GLUniform } from "../common/js/types";
import Utils from "../common/js/Utils";
import { Light } from '../common/js/Light'
import { vec3, mat4 } from 'gl-matrix';
import Floor from '../common/js/Floor';
import vertexShaders from "../common/shaders/ch06/03_vertexShader.vert";
import fragmentShaders from "../common/shaders/ch06/03_fragmentShader.frag";

const utils = new Utils();

let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let camera: Camera;
let transforms: Transforms; 
let clock: Clock;
let lightCutOff = 0.5;
let redLightPosition: vec3 = [0, 7, 3];
let greenLightPosition: vec3 = [2.5, 3, 3];

function configure() {
  const canvas = utils.getCanvas('webgl-canvas');
  utils.autoResizeCanvas(canvas);

  gl = utils.getGLContext(canvas);
  gl.clearColor(0.9, 0.9, 0.9, 1);
  gl.clearDepth(1);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendEquation(gl.FUNC_ADD);
  gl.depthFunc(gl.LEQUAL);

  program = new Program(gl, vertexShaders, fragmentShaders);

  const attributes: GLAttribute[] = [
    'aVertexPosition',
    'aVertexNormal',
    'aVertexColor'
  ];

  const uniforms: GLUniform[] = [
    'uProjectionMatrix',
    'uModelViewMatrix',
    'uNormalMatrix',
    'uMaterialDiffuse',
    'uMaterialAmbient',
    'uLightAmbient',
    'uDiffuseRedLight',
    'uDiffuseGreenLight',
    'uDiffuseBlueLight',
    'uPositionRedLight',
    'uPositionGreenLight',
    'uPositionBlueLight',
    'uWireframe',
    'uLightSource',
    'uCutOff'
  ];

  program.load(attributes, uniforms);

  clock = new Clock();

  scene = new Scene(gl, program);

  camera = new Camera(CameraTypes.ORBITING_TYPE);
  camera.goHome([0, 5, 30]);
  camera.setFocus([0, 0, 0]);
  camera.setAzimuth(0);
  camera.setElevation(-3);
  new Controls(camera, canvas);

  transforms = new Transforms(gl, program, camera, canvas);

  const redLight = new Light('redLight');
  redLight.setPosition(redLightPosition);
  redLight.setDiffuse([1, 0, 0, 1]);

  const greenLight = new Light('greenLight');
  greenLight.setPosition(greenLightPosition);
  greenLight.setDiffuse([0, 1, 0, 1]);

  const blueLight = new Light('blueLight');
  blueLight.setPosition([-2.5, 3, 3]);
  blueLight.setDiffuse([0, 0, 1, 1]);

  gl.uniform3fv(program.uniformLocations.uPositionRedLight, redLight.position);
  gl.uniform3fv(program.uniformLocations.uPositionGreenLight, greenLight.position);
  gl.uniform3fv(program.uniformLocations.uPositionBlueLight, blueLight.position);

  gl.uniform4fv(program.uniformLocations.uDiffuseRedLight, redLight.diffuse);
  gl.uniform4fv(program.uniformLocations.uDiffuseGreenLight, greenLight.diffuse);
  gl.uniform4fv(program.uniformLocations.uDiffuseBlueLight, blueLight.diffuse);

  gl.uniform1f(program.uniformLocations.uCutOff, lightCutOff);
  gl.uniform4fv(program.uniformLocations.uLightAmbient, [1, 1, 1, 1]);
}

function load() {
  scene.add(new Floor(80, 2));
  scene.load('/common/models/geometries/wall.json', 'wall');
  scene.load('/common/models/geometries/sphere3.json', 'redLight');
  scene.load('/common/models/geometries/sphere3.json', 'greenLight');
  scene.load('/common/models/geometries/sphere3.json', 'blueLight');
}

function draw() {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  transforms.updatePerspective();

  try {
    scene.traverse(object => {
      transforms.calculateModelView();
      transforms.push();

      gl.uniform1i(program.uniformLocations.uLightSource, Number(false));

      const { alias } = object;
      if (alias === 'redLight') {
        mat4.translate(transforms.modelViewMatrix, transforms.modelViewMatrix, program.getUniform(program.uniformLocations.uPositionRedLight));
        object.diffuse = program.getUniform(program.uniformLocations.uDiffuseRedLight);
        gl.uniform1i(program.uniformLocations.uLightSource, Number(true));
      }

      if (alias === 'greenLight') {
        mat4.translate(transforms.modelViewMatrix, transforms.modelViewMatrix, program.getUniform(program.uniformLocations.uPositionGreenLight));
        object.diffuse = program.getUniform(program.uniformLocations.uDiffuseGreenLight);
        gl.uniform1i(program.uniformLocations.uLightSource, Number(true));
      }

      if (alias === 'blueLight') {
        mat4.translate(transforms.modelViewMatrix, transforms.modelViewMatrix, program.getUniform(program.uniformLocations.uPositionBlueLight));
        object.diffuse = program.getUniform(program.uniformLocations.uDiffuseBlueLight);
        gl.uniform1i(program.uniformLocations.uLightSource, Number(true));
      }

      transforms.setMatrixUniforms();
      transforms.pop();

      gl.uniform4fv(program.uniformLocations.uMaterialDiffuse, object.diffuse);
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

export function init() {
  configure();
  load();
  clock.on('tick', draw);

  initControls();
}

function initControls() {
  utils.configureControls({
    'Camera Type': {
      value: camera.type,
      options: [CameraTypes.TRACKING_TYPE, CameraTypes.ORBITING_TYPE],
      onChange: v => {
        camera.goHome();
        camera.setType(v);
      }
    },
    ...[
      {
        name: 'Red Light',
        position: redLightPosition,
        uniform: program.uniformLocations.uPositionRedLight
      },
      {
        name: 'Green Light',
        position: greenLightPosition,
        uniform: program.uniformLocations.uPositionGreenLight
      },
    ].reduce((controls, light) => {
      const positionKeys = [
        `X - ${light.name}`,
        `Y - ${light.name}`,
        `Z - ${light.name}`
      ];
      controls[light.name] = positionKeys.reduce((positionControls, position, i) => {
        positionControls[position] = {
          value: light.position[i],
          min: -15, max: 15, step: 0.1,
          onChange: (v, state) => {
            gl.uniform3fv(light.uniform, positionKeys.map(p => state[p]));
          }
        };
        return positionControls;
      }, {});
      return controls;
    }, {}),
    'Light Cone Cut Off': {
      value: lightCutOff,
      min: 0, max: 1, step: 0.01,
      onChange: v => gl.uniform1f(program.uniformLocations.uCutOff, v)
    },
    'Go Home': () => {
      camera.goHome();
      camera.setType(CameraTypes.ORBITING_TYPE);
    }
  });
}