import { EventEmitter } from 'events';

class DummyRedis extends EventEmitter {
  constructor() {
    super();
    this.isOpen = true;
    this.isReady = true;
  }
  async get() { return null; }
  async set() { return 'OK'; }
  async del() { return 1; }
  async quit() {}
  async disconnect() {}
  async connect() {}
  async expire() { return 1; }
  async hget() { return null; }
  async hset() { return 1; }
}

const dummyInstance = new Proxy(new DummyRedis(), {
  get(target, prop) {
    if (prop in target) return target[prop];
    return async () => null;
  }
});

export const redisClient = dummyInstance;
export const redis = dummyInstance;
export default dummyInstance;
