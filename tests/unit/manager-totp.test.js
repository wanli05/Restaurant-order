const {
  extractTotpFromHttp,
  extractTotpForRotateStart,
  normalizeTotpSecret,
} = require("../../lib/manager-totp");

describe("manager-totp HTTP 提取与密钥规范化", () => {
  test("extractTotpFromHttp：有 body 时优先于错误请求头", () => {
    const req = {
      get: (name) => (name === "x-manager-totp" ? "111111" : ""),
      body: { managerTotp: "222222" },
    };
    expect(extractTotpFromHttp(req)).toBe("222222");
  });

  test("extractTotpFromHttp：body 无码时用请求头", () => {
    const req = {
      get: (name) => (name === "x-manager-totp" ? "333333" : ""),
      body: {},
    };
    expect(extractTotpFromHttp(req)).toBe("333333");
  });

  test("extractTotpForRotateStart：优先 rotateTotp", () => {
    const req = {
      get: () => "",
      body: { rotateTotp: "444444", code: "555555" },
    };
    expect(extractTotpForRotateStart(req)).toBe("444444");
  });

  test("normalizeTotpSecret：去掉首尾引号", () => {
    expect(normalizeTotpSecret('"jbswy3dpehpk3pxp"')).toBe("JBSWY3DPEHPK3PXP");
    expect(normalizeTotpSecret("' JBSWY3DPEHPK3PXP '")).toBe("JBSWY3DPEHPK3PXP");
  });
});
