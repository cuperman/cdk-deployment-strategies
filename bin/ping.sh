#!/bin/bash

API_URL=$1
API_KEY=$2

while [ true ]; do
  curl -X GET -H "x-api-key: $API_KEY" -w "\n" "$API_URL/contacts"
  sleep 1
done
