import Camera, { CameraTypes } from "../common/js/Camera";
import Program from "../common/js/Program";
import Scene from "../common/js/Scene";
import Utils from "../common/js/Utils";
import Transforms from "../common/js/Transforms";
import Clock from "../common/js/Clock";
import Controls from "../common/js/Controls";
import { GLAttribute, GLUniform } from "../common/js/types";
import vertexShader from '../common/shaders/ch07/06_vertexShader.vert';
import fragmentShader from '../common/shaders/ch07/06_fragmentShader.frag';
import Texture from "../common/js/Texture";

const utils = new Utils();

let gl: WebGL2RenderingContext;
let scene: Scene;
let program: Program;
let camera: Camera;
let transforms: Transforms;
let clock: Clock;
let texture: Texture;
let texture2: Texture;

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
    'aVertexTextureCoords',
  ];

  const uniforms: GLUniform[] = [
    'uProjectionMatrix',
    'uModelViewMatrix',
    'uNormalMatrix',
    'uSampler',
    'uSampler2',
  ];

  program.load(attributes, uniforms);

  clock = new Clock();
  scene = new Scene(gl, program);

  camera = new Camera(CameraTypes.ORBITING_TYPE);
  camera.goHome([0, 0, 4]);
  camera.setFocus([0, 0, 0]);
  camera.setAzimuth(45);
  camera.setElevation(-30);
  new Controls(camera, canvas);

  transforms = new Transforms(gl, program, camera, canvas);

  texture = new Texture(gl);
  texture.setImage('/common/images/webgl.png');
  texture2 = new Texture(gl);
  texture2.setImage('/common/images/light.png');
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

      // Activate texture
      if (object.textureCoords) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture.glTexture);
        gl.uniform1i(program.uniformLocations.uSampler, 0);

        // gl.bindTexture(gl.TEXTURE_2D, null);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, texture2.glTexture);
        gl.uniform1i(program.uniformLocations.uSampler2, 1);
      }

      // Draw
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);
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
}
