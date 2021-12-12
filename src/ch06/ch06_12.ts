import Camera, { CameraTypes } from "../common/js/Camera";
import { mat4 } from "gl-matrix";
import Clock from "../common/js/Clock";
import Program from "../common/js/Program";
import Scene from "../common/js/Scene";
import Transforms from "../common/js/Transforms";
import { GLAttribute, GLUniform } from "../common/js/types";
import Utils from "../common/js/Utils";
import Controls from "../common/js/Controls";
import Floor from "../common/js/Floor";
import vertexShader from "../common/shaders/ch06/12_vertexShader.vert";
import fragmentShader from "../common/shaders/ch06/12_fragmentShader.frag";

const utils = new Utils();

let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let camera: Camera;
let transforms: Transforms;
let clock: Clock;

function configure() {
  const canvas = utils.getCanvas('webgl-canvas');
  utils.autoResizeCanvas(canvas);

  gl = utils.getGLContext(canvas);
  gl.clearColor(0.9, 0.9, 0.9, 1);
  gl.clearDepth(1);
  // enabling depth testing
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
  // enabling alpha testing
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  program = new Program(gl, vertexShader, fragmentShader);

  const attributes: GLAttribute[]= [
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
    'uMaterialSpecular',
    'uLightAmbient',
    'uLightDiffuse',
    'uPositionLight',
    'uWireframe'
  ];

  program.load(attributes, uniforms);

  scene = new Scene(gl, program);

  clock = new Clock();

  camera = new Camera(CameraTypes.ORBITING_TYPE);
  camera.goHome([0, 5, 35]);
  camera.setFocus([0, 0, 0]);
  camera.setAzimuth(-47);
  camera.setElevation(-3);
  new Controls(camera, canvas);

  transforms = new Transforms(gl, program, camera, canvas);

  gl.uniform3fv(program.uniformLocations.uPositionLight, [0, 7, 3]);
  gl.uniform4fv(program.uniformLocations.uLightAmbient, [1, 1, 1, 1]);
  gl.uniform4fv(program.uniformLocations.uLightDiffuse, [1, 1, 1, 1]);
}

function load() {
  scene.add(new Floor(80, 20));
  scene.load('/common/models/geometries/cone3.json', 'cone');
  scene.load('/common/models/geometries/wall.json', 'wall', {
    diffuse: [0.5, 0.5, 0.2, 1.0],
    ambient: [0.2, 0.2, 0.2, 1.0]
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

      if (object.alias === 'cone') {
        mat4.translate(transforms.modelViewMatrix, transforms.modelViewMatrix, [0, 0, -5]);
      }
      if (object.alias === 'wall') {
        mat4.translate(transforms.modelViewMatrix, transforms.modelViewMatrix, [0, 0, 5]);
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
      options: [CameraTypes.ORBITING_TYPE, CameraTypes.TRACKING_TYPE],
      onChange: v => {
        camera.goHome();
        camera.setType(v);
      }
    },
    'Render Order': {
      value: 'Cone First',
      options: ['Cone First', 'Wall First'],
      onChange: v => {
        if (v === 'Wall First') {
          scene.renderSooner('wall');
          scene.renderFirst('floor');
        }
        else {
          scene.renderSooner('cone');
          scene.renderFirst('floor');
        }
      }
    },
    ...[
      { name: 'Wall Alpha', id: 'wall' },
      { name: 'Cone Alpha', id: 'cone' },
    ].reduce((result, { name, id }) => {
      result[name] = {
        value: 1,
        min: 0, max: 1, step: 0.1,
        onChange: v => {
          scene.get(id).diffuse[3] = v;
        }
      };
      return result;
    }, {}),
    'Go Home': () => {
      camera.goHome();
      camera.setType(CameraTypes.ORBITING_TYPE);
    }
  });
}