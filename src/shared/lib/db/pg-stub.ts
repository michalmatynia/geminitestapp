/**
 * PostgreSQL Stub Client
 * 
 * Stub implementation for the removed PostgreSQL database client.
 * This module ensures that any remaining imports or attempts to use 
 * PostgreSQL result in a clear, descriptive error, guiding developers 
 * towards the MongoDB-only architecture.
 */

/**
 * Base class for removed PostgreSQL components that throws an error on instantiation.
 */
class RemovedPostgresClient {
  constructor() {
    // PostgreSQL support was removed; all database operations now use MongoDB
    throw new Error('PostgreSQL support has been removed. The application is MongoDB-only.');
  }
}

/** Stub for the PostgreSQL Client class. */
export class Client extends RemovedPostgresClient {}

/** Stub for the PostgreSQL Pool class. */
export class Pool extends RemovedPostgresClient {}

const pg = { Client, Pool };

export default pg;
