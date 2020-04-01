module.exports = {
  globals: {
    "ts-jest": {
      tsConfig: "tsconfig.json",
    }
  },
  testRegex: "(/tests/.*|(\\.|/)(test|spec))\\.(ts?|tsx?)$",
  preset: "ts-jest",
  testEnvironment: "node",
};
