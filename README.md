cuke-skywalker
==============

Distribute Cucumber features to workers run in parallel.

Installation
------------

This module requires a peerDependency of the `cucumber` package.

```shell
npm install --save-dev cucumber cuke-skywalker
```

Usage
-----

```shell
./node_modules/.bin/cuke-skywalker --tags '@this and not @that'
```

All arguments will be passed directly to the workers. Features will be pre-filtered to get an accurate
feature count, which is used to chunk them for the "uniform" distribution method.

### Distribution Methods

#### roundrobin

This creates a queue of features and a set of worker pipelines. These pipelines grab features one at a time
until the queue is exhausted. Use this method to leverage workers more efficiently.

#### uniform

This chunks features into uniformly-sized groups and sends them to each worker all at once. It results in fewer
output files but can leave workers with nothing to do while longer feature sets are still running elsewhere.

Options
-------

Options are passed as environment variables.

| Variable                       | Default                         | Description |
| ------------------------------ | ----------                      | ----------- |
| CUCUMBER_PARALLEL_WORKERS      | 4                               | Number of worker processes to distribute features to |
| CUCUMBER_PARALLEL_REPORT_DIR   | ./reports                       | Output directory for worker output JSON files |
| CUCUMBER_PARALLEL_DISTRIBUTION | roundrobin                      | Method for distributing features (roundrobin or uniform) |
| CUCUMBER_JS_PATH               | ./node_modules/.bin/cucumber-js | Path to the cucumber-js bin |

HTML Report
-----------

`cucumber-html-reporter` is available to generate a decent-looking HTML reporter across all workers.

```shell
./node_modules/.bin/cuke-skywalker-report
```

`CUCUMBER_PARALLEL_REPORT_DIR` is used for the reports directory containing the worker output, and is also where
the output is written. `PLATFORM` and `ENVIRONMENT` are available for metadata values.
