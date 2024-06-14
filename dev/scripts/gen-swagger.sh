#!/usr/bin/env sh

npm run infra:down
sleep 5
npm run infra:up
echo "waiting infra is ready 15 seconds"
sleep 15
export OPENAPI_GEN_MOD_ENABLED=1
npm run dev start
npm run infra:down
echo "waiting infra is cleaned 5 seconds"
sleep 5

