const {
  normalizeItemStatus,
  isItemDoneForBilling,
  sumLineTotal,
} = require("../../lib/order-math");

describe("order-math", () => {
  test("normalizeItemStatus should fallback to order status", () => {
    expect(normalizeItemStatus({}, "done")).toBe("done");
    expect(normalizeItemStatus({}, "pending")).toBe("pending");
  });

  test("isItemDoneForBilling should respect item status", () => {
    expect(isItemDoneForBilling({ status: "done" }, "pending")).toBe(true);
    expect(isItemDoneForBilling({ status: "pending" }, "done")).toBe(false);
  });

  test("sumLineTotal should calculate legal lines only", () => {
    const items = [
      { quantity: 2, price: 300 },
      { quantity: 1, price: 120 },
      { quantity: -1, price: 500 },
      { quantity: 2, price: -10 },
    ];
    expect(sumLineTotal(items)).toBe(720);
  });
});
