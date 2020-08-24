#!/bin/sh
BRANCH=$(git rev-parse --abbrev-ref HEAD)
COMMIT_SHA=$(git rev-parse --short HEAD)
TIMESTAMP=$(date +%s)

npm ci
npx grunt
go build -ldflags="-w -s -X main.VERSION=${BRANCH}.${COMMIT_SHA}.${TIMESTAMP}" -o build/ghostbin
cp *.yml build/
rm -rf .tmp
#go build -ldflags="-w -s -X main.VERSION=1.0.0"
