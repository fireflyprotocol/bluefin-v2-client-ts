#!/bin/bash

# Check if the number of arguments is correct
if [ $# -ne 1 ]; then
  echo "Usage: $0 <n>"
  exit 1
fi

# Get the number of times to run the command
n=$1

# Run the command for 'n' times
for ((i=1; i<=n; i++)); do
  gas.sh spawned_accounts.json
done
