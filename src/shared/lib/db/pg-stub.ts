class RemovedPostgresClient {
  constructor() {
    throw new Error('PostgreSQL support has been removed. The application is MongoDB-only.');
  }
}

export class Client extends RemovedPostgresClient {}
export class Pool extends RemovedPostgresClient {}

const pg = { Client, Pool };

export default pg;
