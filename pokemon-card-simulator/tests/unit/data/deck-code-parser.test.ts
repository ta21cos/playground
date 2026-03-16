import { describe, it, expect } from "vitest";
import { isValidDeckCode } from "../../../src/domain/deck-code-parser";

describe("デッキコードパーサー", () => {
  it("正しいデッキコード形式を受け入れる", () => {
    expect(isValidDeckCode("xYcD8c-E3GkJG-8Jcccx")).toBe(true);
    expect(isValidDeckCode("ccGcD8-6uyz7H-YcaccY")).toBe(true);
  });

  it("不正な形式を拒否する", () => {
    expect(isValidDeckCode("")).toBe(false);
    expect(isValidDeckCode("abc")).toBe(false);
    expect(isValidDeckCode("xYcD8c-E3GkJG")).toBe(false);
    expect(isValidDeckCode("xYcD8c_E3GkJG_8Jcccx")).toBe(false);
    expect(isValidDeckCode("xYcD8c-E3GkJ!-8Jcccx")).toBe(false);
  });

  it("前後の空白を無視する", () => {
    expect(isValidDeckCode("  xYcD8c-E3GkJG-8Jcccx  ")).toBe(true);
  });
});

describe("@edge-case FR-1: デッキコードフォーマット不正", () => {
  it("末尾にハイフンが付いた不正形式は拒否する", () => {
    expect(isValidDeckCode("XXXXXX-YYYYYY-")).toBe(false);
  });

  it("セグメント数が2つしかない形式は拒否する", () => {
    expect(isValidDeckCode("XXXXXX-YYYYYY")).toBe(false);
  });

  it("セグメントの長さが合わない形式は拒否する", () => {
    expect(isValidDeckCode("XXXXX-YYYYYY-ZZZZZZ")).toBe(false);
  });
});
