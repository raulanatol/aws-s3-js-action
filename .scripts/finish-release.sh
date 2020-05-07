#!/usr/bin/env bash

set -eu

function error() {
  echo "🚨 Error: $1"
  exit 1
}

if [[ $# != 1 ]]; then
  error "Please specify npm version parameter (major, minor, patch)"
fi

yarn test
yarn lint
yarn build

VERSION_PARAM=$1
BRANCH=$(git rev-parse --abbrev-ref HEAD)

function new_version() {
  npm version "${VERSION_PARAM}"
}

function verify_master_branch() {
  if [[ ${BRANCH} == 'master' ]]; then
    echo "Master branch"
  else
    error "Invalid branch name ${BRANCH}"
  fi
}

function verify_uncommitted_changes() {
  if [[ $(git status --porcelain) ]]; then
    error "There are uncommitted changes in the working tree."
  fi
}

function publish() {
  npm publish --access public
}

function git_push() {
  git push && git push --tags
}

verify_uncommitted_changes
verify_master_branch
new_version
publish
git_push
