// Simple implementation of the pub/sub pattern to decouple components
type SubscriberCallback = () => void;

class EventEmitter {
  events: { [key: string]: SubscriberCallback[] };

  constructor() {
    this.events = {};
  }

  on(event: string, callback: SubscriberCallback): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  remove(event: string, listener): void {
    if (this.events[event]) {
      const index = this.events[event].indexOf(listener);
      if (~index) {
        this.events[event].splice(index, 1);
      }
    }
  }

  emit(event: string): void {
    const events = this.events[event];
    if (events) {
      events.forEach(event => event());
    }
  }

}

export default EventEmitter;