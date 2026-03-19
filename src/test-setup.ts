/**
 * Bun Test Setup
 * 
 * Preload file for Bun test runner
 */

import { beforeAll, afterAll } from "bun:test";

// Setup before all tests
beforeAll(() => {
  // Ensure test environment
  process.env.NODE_ENV = "test";
});

// Cleanup after all tests
afterAll(() => {
  // Cleanup if needed
});
