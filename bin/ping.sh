#!/bin/bash

API_URL="https://zzuvlzgl6c.execute-api.us-east-1.amazonaws.com/Prod"
API_KEY="S1FBNabfTJaXf9Vi13wC52MyOhOvLUHt7ERmQzfm"

while [ true ]; do
  curl -X GET -H "x-api-key: $API_KEY" -w "\n" "$API_URL/contacts"
  sleep 1
done
