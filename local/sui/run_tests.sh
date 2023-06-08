#!/bin/bash

cd submodules/bluefin-exchange-contracts-sui
yarn install
yarn build
yarn deploy
yarn test

