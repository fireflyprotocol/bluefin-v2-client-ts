#!/bin/bash

# Check if the input file is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <input_file>"
    exit 1
fi

input_file="$1"

# Read the input from the file
input=$(cat "$input_file")

# Iterate over each element in the JSON array
echo "${input}" | jq -c '.[]' | while IFS= read -r row; do
  address=$(echo "$row" | jq -r '.address')
  phrase=$(echo "$row" | jq -r '.phrase')

  # Print the extracted values for each element
  echo "Address: $address"
  echo "Phrase: $phrase"

  # Make the API request using curl
  curl --location --request POST 'localhost:5003/gas' \
    --header 'Content-Type: application/json' \
    --data-raw '{"FixedAmountRequest": {"recipient": "'"$address"'"}}'
  echo "---"


done
