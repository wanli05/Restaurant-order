const { isValidTableId } = require("../../lib/table-ids");

describe("table id whitelist", () => {
  test("should accept known ids", () => {
    expect(isValidTableId("1A")).toBe(true);
    expect(isValidTableId("3B")).toBe(true);
    expect(isValidTableId("1C")).toBe(true);
    expect(isValidTableId("2C")).toBe(true);
    expect(isValidTableId("3C")).toBe(true);
    expect(isValidTableId("T")).toBe(true);
  });

  test("should reject unknown ids", () => {
    expect(isValidTableId("A12")).toBe(false);
    expect(isValidTableId("")).toBe(false);
  });
});
