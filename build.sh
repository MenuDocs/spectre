#!/bin/sh
BRANCH=$(git rev-parse --abbrev-ref HEAD)
COMMIT_SHA=$(git rev-parse --short HEAD)
TIMESTAMP=$(date +%s)

npm ci
npx grunt
go build -ldflags="-w -s -X main.VERSION=${BRANCH}.${COMMIT_SHA}.${TIMESTAMP}" -o build/ghostbin
cp *.yml build/
rm -rf .tmp

# move to dest dir if exists
if [ -d "/home/websites/apps/ghostbin" ]
then
    rm -rf /home/websites/apps/ghostbin/build/
    mv ./build/ /home/websites/apps/ghostbin/
fi

#go build -ldflags="-w -s -X main.VERSION=1.0.0"
