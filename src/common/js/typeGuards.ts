export const isGLint = (arg: any): arg is GLint => {
  return arg !== null && typeof arg === 'number';
}