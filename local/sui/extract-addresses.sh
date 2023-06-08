#!/bin/bash

# Run the command and capture the output
command_output=$(sui client addresses)

# Extract unique public addresses using grep and a regular expression
addresses=$(echo "$command_output" | grep -oE '0x[0-9a-fA-F]{64}' | sort -u)

# Convert addresses into an array
addresses_array=($addresses)

# Print the array
printf "%s\n" "${addresses_array[@]}"

# Return the addresses array as the output of the script
exit 0
