/**
 * 与收银台前端 normalizeItemStatus / 金额汇总逻辑保持一致（后端为最终权威）。
 */

function normalizeItemStatus(item, orderStatus) {
  if (item?.status === "done" || item?.status === "pending") return item.status;
  return orderStatus === "done" ? "done" : "pending";
}

function isItemDoneForBilling(item, orderStatus) {
  return normalizeItemStatus(item, orderStatus) === "done";
}

function sumLineTotal(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => {
    const qty = Number(item?.quantity) || 0;
    const price = Number(item?.price) || 0;
    if (qty <= 0 || price < 0) return sum;
    return sum + price * qty;
  }, 0);
}

module.exports = {
  normalizeItemStatus,
  isItemDoneForBilling,
  sumLineTotal,
};
