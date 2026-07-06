const { sqliteQuickCheck } = require("../../lib/sqlite-quick-check");

describe("sqliteQuickCheck", () => {
  test("ok when single ok row", async () => {
    const dbAll = jest.fn().mockResolvedValue([{ quick_check: "ok" }]);
    const r = await sqliteQuickCheck(dbAll);
    expect(r.ok).toBe(true);
    expect(r.messages).toEqual(["ok"]);
    expect(dbAll).toHaveBeenCalledWith("PRAGMA quick_check");
  });

  test("not ok when corruption message", async () => {
    const dbAll = jest.fn().mockResolvedValue([{ quick_check: "*** in database main ***" }]);
    const r = await sqliteQuickCheck(dbAll);
    expect(r.ok).toBe(false);
    expect(r.messages[0]).toContain("database main");
  });
});
