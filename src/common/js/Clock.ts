import { EventEmitter } from "./EventEmitter";

class Clock extends EventEmitter {
  isRunning: boolean;

  constructor() {
    super();
    this.isRunning = true;

    this.tick = this.tick.bind(this);
    this.tick();

    window.onblur = () => {
      this.stop();
      console.info('Clock stopped');
    };

    window.onfocus = () => {
      this.start();
      console.info('Clock resumed');
    };
  }

  tick = (): void => {
    if (this.isRunning) {
      this.emit('tick');
    }
    requestAnimationFrame(this.tick);
  }

  start = (): void => { this.isRunning = true; }
  stop = (): void => { this.isRunning = false; }
}

export default Clock;