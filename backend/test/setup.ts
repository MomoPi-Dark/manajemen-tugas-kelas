process.env.NODE_ENV = "test";

if (!process.env.TEST_DATABASE_URL) {
  throw new Error("Set TEST_DATABASE_URL to a separate PostgreSQL test database before running tests.");
}
