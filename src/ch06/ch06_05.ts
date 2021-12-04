import Camera, { CameraTypes } from "../common/js/Camera";
import Clock from "../common/js/Clock";
import Controls from "../common/js/Controls";
import Program from "../common/js/Program";
import Scene from "../common/js/Scene";
import Transforms from '../common/js/Transforms'
import { GLAttribute, GLUniform } from "../common/js/types";
import Utils from "../common/js/Utils";
import { Light, LightsManager } from '../common/js/Light'
import { vec3, mat4 } from 'gl-matrix';
import Floor from '../common/js/Floor';
import vertexShaders from "../common/shaders/ch06/05_vertexShader.vert";
import fragmentShaders from "../common/shaders/ch06/05_fragmentShader.frag";

const utils = new Utils();

let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let camera: Camera;
let transforms: Transforms;
let clock: Clock;
let lights: LightsManager;
let lightCutOff = 0.5;
let redLightPosition: vec3 = [0, 7, 3];
let greenLightPosition: vec3 = [2.5, 3, 3];
let blueLightPosition: vec3 = [-2.5, 3, 3];
let whiteLightPosition: vec3 = [0, 10, 2];

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
    'uLightDiffuse',
    'uLightPosition',
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

  // Helper to manage multiple lights
  lights = new LightsManager();

  const redLight = new Light('redLight');
  redLight.setPosition(redLightPosition);
  redLight.setDiffuse([1, 0, 0, 1]);

  const greenLight = new Light('greenLight');
  greenLight.setPosition(greenLightPosition);
  greenLight.setDiffuse([0, 1, 0, 1]);

  const blueLight = new Light('blueLight');
  blueLight.setPosition(blueLightPosition);
  blueLight.setDiffuse([0, 0, 1, 1]);

  const whiteLight = new Light('whiteLight');
  whiteLight.setPosition(whiteLightPosition);
  whiteLight.setDiffuse([1.0, 1.0, 1.0, 1.0]);

  lights.add(redLight);
  lights.add(blueLight);
  lights.add(greenLight);
  lights.add(whiteLight);

  gl.uniform3fv(program.uniformLocations.uLightPosition, lights.getArray('position'));
  gl.uniform4fv(program.uniformLocations.uLightDiffuse, lights.getArray('diffuse'));

  gl.uniform1f(program.uniformLocations.uCutOff, lightCutOff);
  gl.uniform4fv(program.uniformLocations.uLightAmbient, [1, 1, 1, 1]);
}

function load() {
  scene.add(new Floor(80, 2));
  scene.load('/common/models/geometries/wall.json', 'wall');
  scene.load('/common/models/geometries/sphere3.json', 'redLight');
  scene.load('/common/models/geometries/sphere3.json', 'greenLight');
  scene.load('/common/models/geometries/sphere3.json', 'blueLight');
  scene.load('/common/models/geometries/sphere3.json', 'whiteLight');
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
        const redLight = lights.get(alias);
        mat4.translate(transforms.modelViewMatrix, transforms.modelViewMatrix, redLight.position);
        object.diffuse = redLight.diffuse as number[];
        gl.uniform1i(program.uniformLocations.uLightSource, Number(true));
      }

      if (alias === 'greenLight') {
        const greenLight = lights.get(alias);
        mat4.translate(transforms.modelViewMatrix, transforms.modelViewMatrix, greenLight.position);
        object.diffuse = greenLight.diffuse as number[];
        gl.uniform1i(program.uniformLocations.uLightSource, Number(true));
      }

      if (alias === 'blueLight') {
        const blueLight = lights.get(alias);
        mat4.translate(transforms.modelViewMatrix, transforms.modelViewMatrix, blueLight.position);
        object.diffuse = blueLight.diffuse as number[];
        gl.uniform1i(program.uniformLocations.uLightSource, Number(true));
      }

      if (alias === 'whiteLight') {
        const whiteLight = lights.get(alias);
        mat4.translate(transforms.modelViewMatrix, transforms.modelViewMatrix, whiteLight.position);
        object.diffuse = whiteLight.diffuse as number[];
        gl.uniform1i(program.uniformLocations.uLightSource, Number(true));
      }

      transforms.setMatrixUniforms();
      transforms.pop();

      // Set light positions
      gl.uniform3fv(program.uniformLocations.uLightPosition, lights.getArray('position'));
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
        id: 'redLight',
        position: redLightPosition
      },
      {
        name: 'Green Light',
        id: 'greenLight',
        position: greenLightPosition
      },
      {
        name: 'Blue Light',
        id: 'blueLight',
        position: blueLightPosition
      },
      {
        name: 'White Light',
        id: 'whiteLight',
        position: whiteLightPosition,
      }
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
            lights.get(light.id).position = positionKeys.map(p => state[p]) as vec3;
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