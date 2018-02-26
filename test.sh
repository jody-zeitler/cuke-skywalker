#!/bin/bash

./bin/cuke-skywalker.js --tags '@google and not @yahoo' || exit $?
./bin/cuke-skywalker.js # allowed to fail

./bin/cuke-skywalker-report.js || exit $?
