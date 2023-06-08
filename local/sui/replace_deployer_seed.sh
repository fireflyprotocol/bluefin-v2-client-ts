#!/bin/bash

# Check if the required arguments are provided
if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <source_json_file> <target_file>"
  exit 1
fi

# Parse the arguments
source_json_file=$1
target_file=$2

# Read the JSON content from the source file
json_content=$(cat "$source_json_file")

# Parse the last phrase from the JSON content
last_phrase=$(echo "$json_content" | jq -r '.[-1].phrase')

# Replace the value of DEPLOYER_SEED in the target file with the last phrase
awk -v new_value="$last_phrase" '/^DEPLOYER_SEED=/ {$0="DEPLOYER_SEED="new_value} 1' "$target_file" > "$target_file.tmp" && mv "$target_file.tmp" "$target_file"

# Remove the last item from the source JSON array
updated_json_content=$(echo "$json_content" | jq 'del(.[-1])')

# Overwrite the source JSON file with the updated content
echo "$updated_json_content" > "$source_json_file"

echo "DEPLOYER_SEED value replaced with: $last_phrase"
echo "Last item removed from the source JSON array"
