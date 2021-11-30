import { vec3, vec4 } from 'gl-matrix';

export class Light {
  id: string;
  position: vec3;
  ambient: vec4;
  diffuse: vec4;
  specular: vec4;

  constructor(id: string) {
    this.id = id;
    this.position = [0, 0, 0];

    this.ambient = [0, 0, 0, 0];
    this.diffuse = [0, 0, 0, 0];
    this.specular = [0, 0, 0, 0];
  }

  setPosition(position: vec3): void {
    this.position = position.slice(0) as vec3;
  }

  setDiffuse(diffuse: vec4): void {
    this.diffuse = diffuse.slice(0) as vec4;
  }

  setAmbient(ambient: vec4): void {
    this.ambient = ambient.slice(0) as vec4;
  }

  setSpecular(specular: vec4): void {
    this.specular = specular.slice(0) as vec4;
  }

  // FIXME. delete any!
  setProperty(property: string, value: any): void {
    this[property] = value;
  }
}

export class LightManager {
  list: Light[];

  constructor() {
    this.list = [];
  }

  add(light: Light): void {
    this.list.push(light);
  }

  // type = kind of attribute, uniform types
  getArray(type: any): any[] {
    return this.list.reduce((result, light) => {
      result = result.concat(light[type]);
      return result;
    }, [])
  }

  get(index: number): Light {
    if (typeof index === 'string') {
      return this.list.find(light => light.id === index);
    } else {
      return this.list[index];
    }
  }
}