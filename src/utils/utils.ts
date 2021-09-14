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
}

export default utils;