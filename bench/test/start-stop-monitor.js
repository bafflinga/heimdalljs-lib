module.exports = {
  name: 'Start Stop (with monitor)',
  setup: function() {
    var heimdall = new Heimdall();
    var x = heimdall.registerMonitor('mon', 'x');
  },
  fn: function() {
    var a = heimdall.start('a');
    heimdall.increment(x);
    heimdall.stop(a);
  }
};