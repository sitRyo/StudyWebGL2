import { GUI, GUIParams } from 'dat.gui';

export interface ConfigureControl {
  RenderingMode: {
    value: string;
    option: string[];
    onChange: (v: string) => void
  }
}

class utils {
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
}

export default utils;