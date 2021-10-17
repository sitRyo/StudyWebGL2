import { mat3, mat4, vec3, vec4 } from 'gl-matrix';

const CameraTypes = {
  ORBITING_TYPE: 'ORBITING_TYPE' as 'ORBITING_TYPE',
  TRACKING_TYPE: 'TRACKING_TYPE' as 'TRACKING_TYPE',
}

export type CameraType = keyof typeof CameraTypes;

class Camera {
  position: vec3;
  focus: vec3;
  home: vec3;
  up: vec3;
  right: vec3;
  normal: vec3;
  matrix: mat4;
  steps: number;
  azimuth: number;
  elevation: number;
  fov: number;
  minZ: number;
  maxZ: number;
  type: CameraType;

  constructor(type: CameraType = CameraTypes.ORBITING_TYPE) {
    this.position = vec3.create();
    this.focus = vec3.create();
    this.home = vec3.create();

    this.up = vec3.create();
    this.right = vec3.create();
    this.normal = vec3.create();

    this.matrix = mat4.create();

    // You could have these options be passed in via the constructor
    // or allow the consumer to change them directly
    this.steps = 0;
    this.azimuth = 0;
    this.elevation = 0;
    this.fov = 45;
    this.minZ = 0.1;
    this.maxZ = 10000;

    this.setType(type);
  }

  // Return whether the camera is in orbiting mode
  isOrbiting(): boolean {
    return this.type === CameraTypes.ORBITING_TYPE;
  }

  // Return whether the camera is in tracking mode
  isTracking(): boolean {
    return this.type === CameraTypes.TRACKING_TYPE;
  }

  // Change camera type
  setType(type: CameraType): void {
    this.type = type;
  }

  // Position the camera back home
  goHome(home): void {
    if (home) {
      this.home = home;
    }

    this.setPosition(this.home);
    this.setAzimuth(0);
    this.setElevation(0);
  }

  // Dolly the camera
  dolly(stepIncrement): void {
    const normal = vec3.create();
    const newPosition = vec3.create();
    vec3.normalize(normal, this.normal);

    const step = stepIncrement - this.steps;

    if (this.isTracking()) {
      newPosition[0] = this.position[0] - step * normal[0];
      newPosition[1] = this.position[1] - step * normal[1];
      newPosition[2] = this.position[2] - step * normal[2];
    }
    else {
      newPosition[0] = this.position[0];
      newPosition[1] = this.position[1];
      newPosition[2] = this.position[2] - step;
    }

    this.steps = stepIncrement;
    this.setPosition(newPosition);
  }

  // Change camera position
  setPosition(position): void {
    vec3.copy(this.position, position);
    this.update();
  }

  // Change camera focus
  setFocus(focus): void {
    vec3.copy(this.focus, focus);
    this.update();
  }

  // Set camera azimuth
  setAzimuth(azimuth): void {
    this.changeAzimuth(azimuth - this.azimuth);
  }

  // Change camera azimuth
  changeAzimuth(azimuth): void {
    this.azimuth += azimuth;

    if (this.azimuth > 360 || this.azimuth < -360) {
      this.azimuth = this.azimuth % 360;
    }

    this.update();
  }

  // Set camera elevation
  setElevation(elevation): void {
    this.changeElevation(elevation - this.elevation);
  }

  // Change camera elevation
  changeElevation(elevation): void {
    this.elevation += elevation;

    if (this.elevation > 360 || this.elevation < -360) {
      this.elevation = this.elevation % 360;
    }

    this.update();
  }

  // Update the camera orientation
  calculateOrientation(): void {
    const right: vec4 = vec4.create();
    vec4.set(right, 1, 0, 0, 0);
    vec4.transformMat4(right, right, this.matrix);
    vec3.copy(this.right, [right[0], right[1], right[2]]);

    const up = vec4.create();
    vec4.set(up, 0, 1, 0, 0);
    vec4.transformMat4(up, up, this.matrix);
    vec3.copy(this.up, [up[0], up[1], up[2]]);

    const normal = vec4.create();
    vec4.set(normal, 0, 0, 1, 0);
    vec4.transformMat4(normal, normal, this.matrix);
    vec3.copy(this.normal, [normal[0], normal[1], normal[2]]);
  }

  // Update camera values
  update(): void {
    mat4.identity(this.matrix);

    if (this.isTracking()) {
      mat4.translate(this.matrix, this.matrix, this.position);
      mat4.rotateY(this.matrix, this.matrix, this.azimuth * Math.PI / 180);
      mat4.rotateX(this.matrix, this.matrix, this.elevation * Math.PI / 180);
    }
    else {
      mat4.rotateY(this.matrix, this.matrix, this.azimuth * Math.PI / 180);
      mat4.rotateX(this.matrix, this.matrix, this.elevation * Math.PI / 180);
      mat4.translate(this.matrix, this.matrix, this.position);
    }

    // We only update the position if we have a tracking camera.
    // For an orbiting camera we do not update the position. If
    // Why do you think we do not update the position?
    if (this.isTracking()) {
      const position = vec4.create();
      vec4.set(position, 0, 0, 0, 1);
      vec4.transformMat4(position, position, this.matrix);
      vec3.copy(this.position, [position[0], position[1], position[2]]);
    }

    this.calculateOrientation();
  }

  // Returns the view transform
  getViewTransform(): mat4 {
    const matrix = mat4.create();
    mat4.invert(matrix, this.matrix);
    return matrix;
  }

}

export default Camera;