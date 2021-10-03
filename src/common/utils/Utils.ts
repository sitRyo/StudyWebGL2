import { GUI, GUIParams } from 'dat.gui';

export interface ConfigureControl {
  RenderingMode: {
    value: string;
    option: string[];
    onChange: (v: string) => void
  }
}

class Utils {
  constructor() {}

  getCanvas = (id: string): HTMLCanvasElement => {
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) {
      console.error(`There is no canvas with id ${id} on this page`);
      return null;
    }

    return canvas;
  }

  getGLContext = (canvas: HTMLCanvasElement): WebGL2RenderingContext | null => {
    const r = canvas.getContext('webgl2') as WebGL2RenderingContext;
    return r ? r : null;
  }

  // TODO: 後でちゃんと型を付ける
  configureControls = (settings: any, options: any = { width: 300 }) => {
    const gui = options.gui || new GUI(options);
    const state = {};

    const isAction = (v: any) => typeof v === 'function';
    const isFolder = (v: any) => 
      !isAction(v) &&
      typeof v === 'object' &&
      (v.value === null || v.value === undefined);
    const isColor = (v: any) => 
      (typeof v === 'string' && ~v.indexOf('#')) ||
      (Array.isArray(v) && v.length >= 3);

    Object.keys(settings).forEach(key => {
      const settingValue = settings[key];

      if (isAction(settingValue)) {
        state[key] = settingValue;
        return gui.add(state, key);
      }
      if (isFolder(settingValue)) {
        // If it's a folder, recursively call with folder as root settings element
        return this.configureControls(settingValue, { gui: gui.addFolder(key) });
      }

      const {
        value,
        min,
        max,
        step,
        options,
        onChange = () => null,
      } = settingValue;

      // set state
      state[key] = value;

      let controller;

      // There are many other values we can set on top of the dat.GUI
      // API, but we'll only need a few for our purposes
      if (options) {
        controller = gui.add(state, key, options);
      }
      else if (isColor(value)) {
        controller = gui.addColor(state, key)
      }
      else {
        controller = gui.add(state, key, min, max, step)
      }

      controller.onChange(v => onChange(v, state))
    });
  }

  autoResizeCanvas = (canvas: HTMLCanvasElement) => {
    const expandFullScreen = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    // initで呼び出されるときにcanvas幅をウィンドウに合わせる
    expandFullScreen();
    // 次回以降はウィンドウ幅が変わる度にcanvas幅が自動で切り替わる
    window.addEventListener('resize', expandFullScreen);
  }

  getShader = (gl: WebGL2RenderingContext | null, rawShaderString: string, type: GLenum): WebGLShader | null => {
    // タイプに応じたシェーダーを代入
    const shader = gl.createShader(type);
    // 与えられたシェーダコードを仕様してシェーダーをコンパイル
    gl.shaderSource(shader, rawShaderString);
    gl.compileShader(shader);

    // シェーダーに問題がないかを検査する
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.log(gl.getShaderInfoLog(shader));
      return null;
    }

    return shader;
  }

  calculateNormals = (vs: number[], ind: number[]): number[] => {
    const x = 0, y = 1, z = 2
    const ns: number[] = []; // 頂点の法線ベクトル

    // 全ての頂点の法線ベクトルを0で初期化
    for (let i = 0; i < vs.length; i += 3) {
      ns[i + x] = 0.0;
      ns[i + y] = 0.0;
      ns[i + z] = 0.0;
    }

    for (let i = 0; i < ind.length; i += 3) {
      const v1: number[] = [];
      const v2: number[] = [];
      const normal: number[] = [];

      // p2 - p1
      v1[x] = vs[3 * ind[i + 2] + x] - vs[3 * ind[i + 1] + x];
      v1[y] = vs[3 * ind[i + 2] + y] - vs[3 * ind[i + 1] + y];
      v1[z] = vs[3 * ind[i + 2] + z] - vs[3 * ind[i + 1] + z];

      // p0 - p1
      v2[x] = vs[3 * ind[i] + x] - vs[3 * ind[i + 1] + x];
      v2[y] = vs[3 * ind[i] + y] - vs[3 * ind[i + 1] + y];
      v2[z] = vs[3 * ind[i] + z] - vs[3 * ind[i + 1] + z];

      // 外積計算
      normal[x] = v1[y] * v2[z] - v1[z] * v2[y];
      normal[y] = v1[z] * v2[x] - v1[x] * v2[z];
      normal[z] = v1[x] * v2[y] - v1[y] * v2[x];

      // 法線合成
      for (let j = 0; j < 3; j++) {
        ns[3 * ind[i + j] + x] = ns[3 * ind[i + j] + x] + normal[x];
        ns[3 * ind[i + j] + y] = ns[3 * ind[i + j] + y] + normal[y];
        ns[3 * ind[i + j] + z] = ns[3 * ind[i + j] + z] + normal[z];
      }
    }

    for (let i = 0; i < vs.length; i += 3) {
      // With an offset of 3 in the array (due to x, y, z contiguous values)
      const nn: number[] = [];
      nn[x] = ns[i + x];
      nn[y] = ns[i + y];
      nn[z] = ns[i + z];

      let len = Math.sqrt((nn[x] * nn[x]) + (nn[y] * nn[y]) + (nn[z] * nn[z]));
      if (len === 0) len = 1.0;

      nn[x] = nn[x] / len;
      nn[y] = nn[y] / len;
      nn[z] = nn[z] / len;

      ns[i + x] = nn[x];
      ns[i + y] = nn[y];
      ns[i + z] = nn[z];
    }

    return ns;
  }

  // colorはvec4とかにできればいいんだろうなあと思う
  normalizeColor = (color: number[]): number[] => {
    return color.map(c => c / 255);
  }

  denormalizeColor = (color: number[]): number[] => {
    return color.map(c => c * 255);
  }
}

export default Utils;