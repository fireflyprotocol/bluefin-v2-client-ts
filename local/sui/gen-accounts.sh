#!/bin/bash

result=()

for ((i=1; i<=12; i++)); do
  output=$(sui client new-address secp256k1)
  address=$(echo "$output" | grep -o '0x[[:xdigit:]]\{64\}')
  phrase=$(echo "$output" | grep -oE 'Secret Recovery Phrase : \[[^]]+\]' | sed 's/Secret Recovery Phrase : \[\(.*\)\]/\1/')
  json_obj=$(jq -n --arg address "$address" --arg phrase "$phrase" '{"address": $address, "phrase": $phrase}')
  result+=("$json_obj")
done

json_array=$(jq -n --slurpfile result <(printf '%s\n' "${result[@]}") '$result')

echo "$json_array" > spawned_accounts.json
