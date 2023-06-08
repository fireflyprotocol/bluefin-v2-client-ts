#!/bin/bash

execute_command() {
  local owner=$1
  change_active_address="sui client switch --address ${owner}"
  eval "$change_active_address"

  input=$(sui client gas)

  addresses=$(echo "$input" | grep -o '0x[0-9a-fA-F]\{64\}')
  num_addresses=$(echo "$addresses" | wc -l)

  if [ "$num_addresses" -lt 3 ]; then
    # Exit the function, don't call it recursively
    return 0
  fi

  addresses=($addresses)
  primary_coin="${addresses[0]}"
  coin_to_merge="${addresses[1]}"

  command="sui client merge-coin --primary-coin $primary_coin --coin-to-merge $coin_to_merge --gas-budget 50000000"
  eval "$command"

  # Call the function recursively
  execute_command "${owner}"
}

command_output=$(sui client addresses)
addresses=$(echo "$command_output" | grep -oE '0x[0-9a-fA-F]{64}' | sort -u)
addresses_array=($addresses)

for address in "${addresses_array[@]}"; do
  execute_command "$address"
done
