# Honor-fx-crm-backend

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (>=14.x)
- npm (Node Package Manager) or Yarn
- Docker (optional, for containerization)

## Getting Started

1. Clone this repository to your local machine:

    ```bash
    git clone <repo-url>
    ```


2. Navigate to the project directory:

    ```bash
    cd <repo-name>
    ```

3. Install the dependencies:

    ```bash
    npm install
    ```

    or

    ```bash
    yarn install
    ```

4. Rename the `.env.example` file to `.env` and customize the environment variables as needed.

5. Start the server:

    ```bash
    npm start
    ```

Your Express server should now be up and running at http://localhost:5000.

## Docker

If you want to containerize your application using Docker, a Dockerfile is provided. You can build the Docker image using the following commands:

```bash
docker build -t my-express-app .
```

And then run the container:

```bash
docker run -p 5001:5001 --env-file ./.env -d my-express-app
```

## Knex

New Migration
``bash
npx knex --knexfile ./src/knexFile.ts migrate:make <<migration-name>> +x ts

npx knex --knexfile ./src/knexFile.ts migrate:latest +x ts
npx knex --knexfile ./src/knexFile.ts seed:run +x ts
npx knex --knexfile ./src/knexFile.ts migrate:down <filename.ts>
npx knex --knexfile ./src/knexFile.ts migrate:up <filename.ts>

``

## Migration from script

If cannot run bash script
```bash
chmod 754 ./migrate.sh
```

To run migration of a new table
```bash
./migrate.sh table_name
```

This will create 3 migration files in each folder for migration, logs and trigger