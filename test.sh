#!/bin/bash

./bin/cuke-skywalker.js --tags '@google and not @yahoo' || exit $?
./bin/cuke-skywalker.js features/yahoo.feature:7 || exit $?
./bin/cuke-skywalker.js # allowed to fail

./bin/cuke-skywalker-report.js || exit $?
