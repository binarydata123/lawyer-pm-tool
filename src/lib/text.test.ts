import { expect, test, describe } from "bun:test";
import { capitalizeFirst, parseInviteEmails } from "./text";

describe("capitalizeFirst", () => {
  test("returns empty string for null or undefined", () => {
    expect(capitalizeFirst(null)).toBe("");
    expect(capitalizeFirst(undefined)).toBe("");
  });

  test("returns empty string for empty or whitespace string", () => {
    expect(capitalizeFirst("")).toBe("");
    expect(capitalizeFirst("   ")).toBe("");
  });

  test("capitalizes first letter", () => {
    expect(capitalizeFirst("hello")).toBe("Hello");
    expect(capitalizeFirst("world")).toBe("World");
  });

  test("preserves rest of string", () => {
    expect(capitalizeFirst("hello WORLD")).toBe("Hello WORLD");
  });

  test("handles leading whitespace", () => {
    expect(capitalizeFirst("  hello")).toBe("Hello");
  });
});

describe("parseInviteEmails", () => {
  test("parses single email", () => {
    expect(parseInviteEmails("test@example.com")).toEqual(["test@example.com"]);
  });

  test("parses comma-separated emails", () => {
    expect(parseInviteEmails("test@example.com,test2@example.com")).toEqual(["test@example.com", "test2@example.com"]);
  });

  test("parses newline-separated emails", () => {
    expect(parseInviteEmails("test@example.com\ntest2@example.com")).toEqual(["test@example.com", "test2@example.com"]);
  });

  test("parses semicolon-separated emails", () => {
    expect(parseInviteEmails("test@example.com;test2@example.com")).toEqual(["test@example.com", "test2@example.com"]);
  });

  test("parses mixed separators", () => {
    expect(parseInviteEmails("test@example.com, test2@example.com\ntest3@example.com; test4@example.com")).toEqual(["test@example.com", "test2@example.com", "test3@example.com", "test4@example.com"]);
  });

  test("trims and lowercases emails", () => {
    expect(parseInviteEmails(" TEST@example.com ,  TeSt2@EXAMPLE.com ")).toEqual(["test@example.com", "test2@example.com"]);
  });

  test("removes empty emails", () => {
    expect(parseInviteEmails("test@example.com,,test2@example.com")).toEqual(["test@example.com", "test2@example.com"]);
  });

  test("removes duplicate emails", () => {
    expect(parseInviteEmails("test@example.com,test@example.com")).toEqual(["test@example.com"]);
    expect(parseInviteEmails("test@example.com, TEST@example.com")).toEqual(["test@example.com"]);
  });
});
