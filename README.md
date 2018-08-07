![build status](https://travis-ci.org/heimdalljs/heimdalljs-lib.svg)

## Global Session

Heimdall tracks a graph of timing and domain-specific stats for performance.
Stat collection and monitoring is separated from graph construction to provide
control over context detail.  Users can create fewer nodes to have reduced
performance overhead, or create more nodes to provide more detail.

The graph obviously needs to be global.  This is not a problem in the browser,
but in node we may have multiple different versions of heimdalljs loaded at
once.  Each one will have its own `Heimdall` instance, but will use the same
session, saved on `process`.  This means that the session will have a
heterogeneous graph of `HeimdallNode`s.  For this reason, versions of heimdalljs
that change `Session`, or the APIs of `HeimdallNode` or `Cookie` will use a
different property to store their session (`process._heimdall_session_<n>`).  It
is quite easy for this to result in lost detail & lost stats, although it is
also easy to detect this situation and issue a warning.

## API

### Heimdall

### Creating a Heimdall instance

`require('heimdalljs')` to access an instance using the globally shared session.

You can create your own instance with its own session, but this is generally
reommended only for testing.

```js
var Heimdall = require('heimdalljs/heimdall');
// this will create its own session and not use the global session
var myInstance = new Heimdall();
```

#### Properties

- `heimdall.current` Return the leaf `HeimdallNode` of the currently active nodes.
- `heimdall.root` Return the root `HeimdallNode`

#### Functions

- `heimdall.start(id, Schema)` Create a new node with id `id`.  This node becomes the
  active node.  Its parent is the currently active node.  Return this node's
  `Cookie`.
- `heimdall.node(id, [Schema], callback, [context])` Create a new node, invoke
  `callback` passing in the newly created node's `stats` object and then stop
  the node.
- `registerMonitor(name, Schema)` register a monitor under namespace `name`.  An
  error will be thrown if the reserved names `own` or `time` are used, or if a
  monitor with that name has already been registered for this session.
- `statsFor(name)` return the stats object for the monitor under namespace
  `name`.
- `configFor(name)` return the config object under `name`.  Heimdall does not do
  anything with these config objects: it is a place for downstream consumers to
  share config across a heimdall session (see eg
  [heimdalljs-logger](https://github.com/heimdalljs/heimdalljs-logger)).
- `toJSON()` return the json for the entire graph.  This is intended to be
  written via `JSON.stringify` and then consumed by downstream apps (see eg
  [broccoli-viz](https://github.com/stefanpenner/broccoli-viz)).
- `visitPreOrder(callback)` sugar for `root.visitPreOrder(callback)`
- `visitPostOrder(callback)` sugar for `root.visitPostOrder(callback)`


### HeimdallNode

#### Identifiers

#### Properties

- `isRoot` returns true for the root node, and false for all other nodes.

#### Functions

- `visitPreOrder(callback)` visit the subtree rooted at this node with a
  depth-first pre-order traversal.
- `visitPostOrder(callback)` visit the subtree rooted at this node with a
  depth-first post-order traversal.
- `forEachChild(callback)` invoke `callback` for each child of this node (but
  not other descendants).
- `remove` remove this node from its parent.  May only be called on an inactive,
  non-root node.  Intended for long-running applications to free up memory after
  saving a subgraph via `toJSONSubgraph`.
- `toJSON()` Return the serialized representation of this ndoe.
- `toJSONSubgraph()` Return the serialized representation of the subtree rooted at
  this node.

### Cookie

#### Functions

- `stop()` stop the node associated with this cookie.  May only be called on the
  current node.
- `resume()` resume a stopped node.  This is useful for nodes that are restarted
  asynchronously.

## Example Usage

### Simple

```js
var heimdall = require('heimdall');

function BroccoliNodeSchema() {
  this.builds = 0;
}


heimdall.node('broccoli', function () {
  heimdall.node('node:babel', BroccoliNodeSchema, function (h) {
    h.builds++;

    heimdall.node('node:persistent-filter', BroccoliNodeSchema, function (h) {
      h.builds++;
    });

    heimdall.node('node:caching-writer', BroccoliNodeSchema, function (h) {
      h.builds++;
    });
  });
});

```

```json
{
  "nodes": [{
    "id": 0,
    "name": "broccoli",
    "stats": {
      "cpu": {
        "self": 10,
      },
    },
    "children": {
      "start": [1],
      "end": [1],
    },
  }, {
    "id": 1,
    "name": "node:babel",
    "stats": {
      "builds": 1,
      "cpu": {
        "self": 20,
      },
    },
    "children": {
      "start": [2, 3],
      "end": [2, 3],
    },
  }, {
    "id": 2,
    "name": "node:persistent-filter",
    "stats": {
      "builds": 1,
      "cpu": {
        "self": 30,
      },
    },
  }, {
    "id": 3,
    "name": "node:caching-writer",
    "stats": {
      "builds": 1,
      "cpu": {
        "self": 40,
      },
    },
  }],
}
```

### With Monitors

```js
var heimdall = require('heimdall');
var fs = require('fs');

var origLstatSync = fs.lstatSync;
var origMkdirSync = fs.mkdirSync;

heimdall.registerMonitor('fs', function FSSchema() {
  this.lstatCount = 0;
  this.mkdirCount = 0;
});

fs.lstatSync = function () {
  heimdall.statsFor('fs').lstatCount++;
  return origLstatSync.apply(fs, arguments);
}

fs.mkdirSync = function () {
  heimdall.statsFor('fs').mkdirCount++;
  return origMkdirSync.apply(fs, arguments);
}


function BroccoliNodeSchema() {
  this.builds = 0;
}


heimdall.node('broccoli', function () {
  heimdall.node('node:babel', BroccoliNodeSchema, function (h) {
    h.builds++;

    heimdall.node('node:persistent-filter', BroccoliNodeSchema, function (h) {
      h.builds++;
      fs.mkdirSync('./tmp');
    });

    heimdall.node('node:caching-writer', BroccoliNodeSchema, function (h) {
      h.builds++;
      fs.lstatSync('./tmp');
    });
  });
});

```

```json
{
  "nodes": [{
    "id": 0,
    "name": "broccoli",
    "stats": {
      "cpu": {
        "self": 10,
      },
      "fs": {
        "lstatCount": 0,
        "mkdirCount": 0,
      },
    },
    "children": {
      "start": [1],
      "end": [1],
    },
  }, {
    "id": 1,
    "name": "node:babel",
    "stats": {
      "builds": 1,
      "cpu": {
        "self": 20,
      },
      "fs": {
        "lstatCount": 0,
        "mkdirCount": 0,
      },
    },
    "children": {
      "start": [2, 3],
      "end": [2, 3],
    },
  }, {
    "id": 2,
    "name": "node:persistent-filter",
    "stats": {
      "builds": 1,
      "cpu": {
        "self": 30,
      },
      "fs": {
        "lstatCount": 0,
        "mkdirCount": 1,
      },
    },
  }, {
    "id": 3,
    "name": "node:caching-writer",
    "stats": {
      "builds": 1,
      "cpu": {
        "self": 40,
      },
      "fs": {
        "lstatCount": 1,
        "mkdirCount": 0,
      },
    },
  }],
}
```

### New time calcings (0.2.6)
```js
const
  heimdalljs = require('heimdalljs'),
  stats = ['first', 'second', 'third'];

let tokens = [];

function startCounting() {
  return new Promise((res,rej) => {
    function innerStarter() {
      let token;
      if (tokens.length < stats.length) {
        token = heimdalljs.start(stats[tokens.length]);
        tokens.push( token );
        // tokens are with empty timings here (as i expect)
        console.log(`created "${token._node.id.name}" (${JSON.stringify(token._node.stats)})`);
        setImmediate(innerStarter);
      } else {
        console.log('all counters started');
        res();
      }
    }
    innerStarter();
  });
}

function stopCounting() {
  return new Promise((res,rej) => {
    function innerStopper() {
      const token = tokens.pop();
      if (token) {
        console.log(`stopping "${token._node.id.name}" (${JSON.stringify(token._node.stats)})...`);
        token.stop();
        console.log(`stopped "${token._node.id.name}": (${JSON.stringify(token._node.stats)})`);

        setImmediate(innerStopper);
      } else {
        console.log('all counters stopped');
        res();
      }
    }

    innerStopper();
  });
}

function main() {
  startCounting()
  .then(stopCounting)
  .then(() => {
    console.log(`started and stopped..`);
    console.log(JSON.stringify(heimdalljs.toJSON(), null, 2));
  }).catch(err => {
    console.error(`failure`, err);
  })
  .then(() => {
    console.log('finished fuss.');
  });
}

if (!module.parent) {
  main();
}
```
stdout:
```
created "first" ({"own":{},"time":{"self":0}})
created "second" ({"own":{},"time":{"self":0}})
created "third" ({"own":{},"time":{"self":0}})
all counters started
stopping "third" ({"own":{},"time":{"self":0}})...
stopped "third": ({"own":{},"time":{"self":991808}})
stopping "second" ({"own":{},"time":{"self":0}})...
stopped "second": ({"own":{},"time":{"self":1858408}})
stopping "first" ({"own":{},"time":{"self":0}})...
stopped "first": ({"own":{},"time":{"self":10207077}})
all counters stopped
started and stopped..
```

heimdall json on finish:
```json
{
  "nodes": [
    {
      "_id": 0,
      "id": {
        "name": "heimdall"
      },
      "stats": {
        "own": {},
        "time": {
          "self": 0
        }
      },
      "children": [
        1
      ]
    },
    {
      "_id": 1,
      "id": {
        "name": "first"
      },
      "stats": {
        "own": {},
        "time": {
          "self": 10207077
        }
      },
      "children": [
        2
      ]
    },
    {
      "_id": 2,
      "id": {
        "name": "second"
      },
      "stats": {
        "own": {},
        "time": {
          "self": 1858408
        }
      },
      "children": [
        3
      ]
    },
    {
      "_id": 3,
      "id": {
        "name": "third"
      },
      "stats": {
        "own": {},
        "time": {
          "self": 991808
        }
      },
      "children": []
    }
  ]
}
```
