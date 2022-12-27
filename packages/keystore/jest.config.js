module.exports = {
  verbose: true,
  collectCoverage: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    "ts-jest": {
      "packageJson": "../../package.json"
    }
  },
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "lib/index.ts"
  ]
};