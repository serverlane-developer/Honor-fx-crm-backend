#!/bin/bash

if [ $# -eq 0 ]
then
    echo "No arguments supplied"
    exit 1
fi

if [ -z "$1" ]
then
    echo "No argument supplied"
    exit 1
fi

npx knex --knexfile ./src/knexFile.ts --migrations-directory ./data/migrations migrate:make "$@" +x ts
npx knex --knexfile ./src/knexFile.ts migrate:make --migrations-directory ./data/migrations/logs "$@_logs" +x ts
npx knex --knexfile ./src/knexFile.ts migrate:make --migrations-directory ./data/migrations/triggers "$@_logs_trigger" +x ts

echo "Migration created successfully."