import { test, expect } from "bun:test";
import { validateFile, FILE_SIZE_LIMITS } from "./file-upload";

test("validateFile should allow valid image files", () => {
  const file = {
    size: 1024,
    type: "image/jpeg",
  } as File;

  expect(validateFile(file)).toBeNull();
});

test("validateFile should allow valid document files", () => {
  const file = {
    size: 1024,
    type: "application/pdf",
  } as File;

  expect(validateFile(file)).toBeNull();
});

test("validateFile should reject unsupported file types", () => {
  const file = {
    size: 1024,
    type: "application/x-executable",
  } as File;

  const result = validateFile(file);
  expect(result).not.toBeNull();
  expect(result?.type).toBe("type");
  expect(result?.message).toContain("not supported");
});

test("validateFile should reject oversized images", () => {
  const file = {
    size: FILE_SIZE_LIMITS.image + 1,
    type: "image/png",
  } as File;

  const result = validateFile(file);
  expect(result).not.toBeNull();
  expect(result?.type).toBe("size");
  expect(result?.message).toContain("size exceeds");
});

test("validateFile should reject oversized documents", () => {
  const file = {
    size: FILE_SIZE_LIMITS.document + 1,
    type: "application/pdf",
  } as File;

  const result = validateFile(file);
  expect(result).not.toBeNull();
  expect(result?.type).toBe("size");
  expect(result?.message).toContain("size exceeds");
});

test("validateFile should use default limit for other allowed types (video)", () => {
  const file = {
    size: FILE_SIZE_LIMITS.default + 1,
    type: "video/mp4",
  } as File;

  const result = validateFile(file);
  expect(result).not.toBeNull();
  expect(result?.type).toBe("size");
});

test("validateFile should allow files exactly at the size limit", () => {
  const file = {
    size: FILE_SIZE_LIMITS.image,
    type: "image/jpeg",
  } as File;

  expect(validateFile(file)).toBeNull();
});
