import timeNS from './time';

export default class Cookie {
  constructor(node, heimdall) {
    this._node = node;
    this._restoreNode = node.parent;
    this._heimdall = heimdall;
    this._stopped = false;
    this.previousTimeNS = 0;

    this._recordTime();
  }

  get stats() {
    return this._node.stats.own;
  }

  _recordTime() {
    let time = timeNS();

    // always true except for root
    if (this._heimdall.current) {
      let delta = time - this.previousTimeNS;
      if (delta < time) {
        this._heimdall.current.stats.time.self += delta;
      }
    }
    this.previousTimeNS = time;
  }

  stop() {
    let monitor;

    if (this._heimdall.current !== this._node) {
      console.log(`Cannot stop: not the current node.`);
      return;
    } else if (this.stopped === true) {
      console.log(`Cannot stop: already stopped.`);
      return;
    }

    this._stopped = true;
    this._recordTime();
    this._heimdall._session.current = this._restoreNode;
  }

  resume() {
    if (this._stopped === false) {
      console.log(`Cannot resume: not stopped.`);
      return;
    }

    this._stopped = false;
    this._restoreNode = this._heimdall.current;
    this._heimdall._session.current = this._node;
  }
}
