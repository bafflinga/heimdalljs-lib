let timeNS;

// adapted from
// https://gist.github.com/paulirish/5438650
let now;
if (typeof performance === 'object' && typeof performance.now === 'function') {
  now = function () {
    return performance.now.call(performance);
  };
} else {
  now = Date.now || function () { return new Date().getTime(); };
  const offset = new Date().getTime();
  now = function () {
    return new Date().getTime() - offset;
  };
}

export function timeFromPerformanceNow() {
  let timeMS = now();

  return Math.floor(timeMS * 1e6);
}

export function timeFromHRTime() {
  let hrtime = process.hrtime();
  return hrtime[0] * 1e9 + hrtime[1];
}

if (typeof process === 'object' && typeof process.hrtime === 'function') {
  timeNS = timeFromHRTime;
} else {
  timeNS = timeFromPerformanceNow;
}

export default timeNS;
