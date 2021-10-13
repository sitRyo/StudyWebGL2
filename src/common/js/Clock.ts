import EventEmitter from './EventEmitter';

// Abstracts away the requestAnimationFrame in an effort to provie a clock instance
// to sync various parts of an application
class Clock extends EventEmitter {
  isRunning: boolean;

  constructor() {
    super();
    this.isRunning = true;

    this.tick = this.tick.bind(this);
    this.tick();

    window.onblur = (): void => {
      this.stop();
      console.info('Clock stopped');
    };

    window.onfocus = (): void => {
      this.start();
      console.info('Clock resumed');
    };
  }

  // Gets called on every requestAnimationFrame cycle
  tick(): void {
    if (this.isRunning) {
      this.emit('tick');
    }
    requestAnimationFrame(this.tick);
  }

  // Starts the clock
  start(): void {
    this.isRunning = true;
  }

  // Stops the clock
  stop(): void {
    this.isRunning = false;
  }

}

export default Clock;