#!/bin/bash

replace_deployer_seed.sh spawned_accounts.json submodules/bluefin-exchange-contracts-sui/.env
cp -f spawned_accounts.json submodules/bluefin-exchange-contracts-sui/tests/helpers/
