var Heimdall = require('../heimdall');
var _global = typeof window !== 'undefined' ? window : global;
var benchmarkRunner = require('do-you-even-bench');

_global.Heimdall = Heimdall;

var benchmarks = [
  require('./test/start-stop'),
  require('./test/start-stop-monitor'),
  require('./test/monitor'),
];

benchmarkRunner(benchmarks);
