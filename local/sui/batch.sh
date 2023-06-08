#!/bin/bash

#export PATH="$PWD:$PATH" # while working locally uncomment this to avoid usage like ./gen-accounts.sh
gen-accounts.sh

faucet.sh 64

merge-coins.sh

refresh_test_accounts.sh

run_tests.sh

