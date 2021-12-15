import Camera, { CameraTypes } from "../common/js/Camera";
import Program from "../common/js/Program";
import Scene from "../common/js/Scene";
import Utils from "../common/js/Utils";
import Transforms from "../common/js/Transforms";
import Clock from "../common/js/Clock";
import Controls from "../common/js/Controls";
import { GLAttribute, GLUniform } from "../common/js/types";
import vertexShader from '../common/shaders/ch07/03_vertexShader.vert';
import fragmentShader from '../common/shaders/ch07/03_fragmentShader.frag';

const utils = new Utils();

let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let camera: Camera;
let transforms: Transforms;
let clock: Clock;
let texture: WebGLTexture;

function configure() {
  const canvas = utils.getCanvas('webgl-canvas');
  utils.autoResizeCanvas(canvas);

  gl = utils.getGLContext(canvas);
  gl.clearColor(0.9, 0.9, 0.9, 1);
  gl.clearDepth(100);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  program = new Program(gl, vertexShader, fragmentShader);

  const attributes: GLAttribute[] = [
    'aVertexPosition',
    'aVertexTextureCoords'
  ];

  const uniforms: GLUniform[] = [
    'uProjectionMatrix',
    'uModelViewMatrix',
    'uNormalMatrix',
    'uSampler'
  ];

  program.load(attributes, uniforms);

  clock = new Clock();
  scene = new Scene(gl, program);

  camera = new Camera(CameraTypes.ORBITING_TYPE);
  camera.goHome([0, 0, 0]);
  camera.dolly(-4);
  camera.setFocus([0, 0, 0]);
  camera.setAzimuth(45);
  camera.setElevation(-30);
  new Controls(camera, canvas);

  transforms = new Transforms(gl, program, camera, canvas);

  texture = gl.createTexture();

  const image = new Image();
  image.src = '/common/images/webgl.gif';
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
  };
}

function load() {
  scene.load('/common/models/geometries/cube-texture.json');
}

function draw() {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  transforms.updatePerspective();

  try {
    scene.traverse(object => {
      if (object.hidden) return;

      transforms.calculateModelView();
      transforms.push();
      transforms.setMatrixUniforms();
      transforms.pop();

      // Bind
      gl.bindVertexArray(object.vao);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);

      // Activate texture
      if (object.textureCoords) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(program.uniformLocations.uSampler, 0);
      }

      // Draw
      gl.drawElements(gl.TRIANGLES, object.indices.length, gl.UNSIGNED_SHORT, 0);

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
    Distance: {
      value: 0,
      min: 0, max: 20, step: 0.1,
      onChange: v => {
        camera.dolly(-v);
        camera.update();
      }
    },
    'Mag Filter': {
      value: 'NEAREST',
      options: ['NEAREST', 'LINEAR'],
      onChange: v => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl[v]);
        gl.bindTexture(gl.TEXTURE_2D, null);
      }
    },
    'Min Filter': {
      value: 'NEAREST',
      options: [
        'NEAREST',
        'LINEAR',
        'NEAREST_MIPMAP_NEAREST',
        'LINEAR_MIPMAP_NEAREST',
        'NEAREST_MIPMAP_LINEAR',
        'LINEAR_MIPMAP_LINEAR'
      ],
      onChange: v => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[v]);
        gl.bindTexture(gl.TEXTURE_2D, null);
      }
    }
  });
}