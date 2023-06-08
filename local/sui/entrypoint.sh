#!/bin/bash
sui genesis
nohup sui start &
sleep 20
nohup sui-faucet --write-ahead-log 2 &
sleep 20
curl localhost:5003
batch.sh

tail -f /dev/null


