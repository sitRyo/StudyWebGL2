import Camera, { CameraTypes } from "../common/js/Camera";
import Clock from "../common/js/Clock";
import Controls from "../common/js/Controls";
import Program from "../common/js/Program";
import Scene from "../common/js/Scene";
import Transforms from '../common/js/Transforms'
import { GLAttribute, GLUniform } from "../common/js/types";
import Utils from "../common/js/Utils";
import { Light, LightsManager } from '../common/js/Light'
import { vec3, vec4, mat4 } from 'gl-matrix';
import Floor from '../common/js/Floor';
import vertexShaders from "../common/shaders/ch06/08_vertexShader.vert";
import fragmentShaders from "../common/shaders/ch06/08_fragmentShader.frag";

const utils = new Utils();

let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let camera: Camera;
let transforms: Transforms;
let clock: Clock;
let lights: LightsManager;
let lightCutOff = 0.75;
// Lights data
let lightsData: {
  id: string;
  name: string;
  position: vec3;
  diffuse: vec4;
  direction: vec3;
}[] = [
    {
      id: 'redLight', name: 'Red Light',
      position: [0, 7, 3], diffuse: [1, 0, 0, 1], direction: [0, -2, -0.1]
    },
    {
      id: 'greenLight', name: 'Green Light',
      position: [2.5, 3, 3], diffuse: [0, 1, 0, 1], direction: [-0.5, 1, -0.1]
    },
    {
      id: 'blueLight', name: 'Blue Light',
      position: [-2.5, 3, 3], diffuse: [0, 0, 1, 1], direction: [0.5, 1, -0.1]
    },
  ];

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
    'uWireframe',
    'uMaterialDiffuse',
    'uMaterialAmbient',
    'uLightAmbient',
    'uLightDiffuse',
    'uLightDirection',
    'uLightPosition',
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

  lightsData.forEach(({ id, position, diffuse, direction }) => {
    const light = new Light(id);
    light.setPosition(position);
    light.setDiffuse(diffuse);
    light.setProperty('direction', direction);
    lights.add(light);
  });

  gl.uniform3fv(program.uniformLocations.uLightPosition, lights.getArray('position'));
  gl.uniform3fv(program.uniformLocations.uLightDirection, lights.getArray('direction'));
  gl.uniform4fv(program.uniformLocations.uLightDiffuse, lights.getArray('diffuse'));

  gl.uniform1f(program.uniformLocations.uCutOff, lightCutOff);
  gl.uniform4fv(program.uniformLocations.uLightAmbient, [1, 1, 1, 1]);
}

function load() {
  scene.add(new Floor(80, 2));
  scene.load('/common/models/geometries/wall.json', 'wall');
  lightsData.forEach(({ id }) => {
    scene.load('/common/models/geometries/sphere3.json', id);
  });
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

      const light = lightsData.find(({ id }) => object.alias === id);
      if (light) {
        const { position, diffuse } = lights.get(light.id);
        mat4.translate(transforms.modelViewMatrix, transforms.modelViewMatrix, position);
        object.diffuse = diffuse as number[];
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
    ...lightsData.reduce((controls, light) => {
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