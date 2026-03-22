// Developed by Sydney Edwards
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatRelativeTime } from "../src/lib/formatRelativeTime";

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns just now under one minute", () => {
    expect(formatRelativeTime(new Date("2025-06-15T11:59:30.000Z"))).toBe("just now");
  });

  it("formats minutes", () => {
    expect(formatRelativeTime(new Date("2025-06-15T11:58:00.000Z"))).toBe("2 minutes ago");
    expect(formatRelativeTime(new Date("2025-06-15T11:59:00.000Z"))).toBe("1 minute ago");
  });

  it("formats hours", () => {
    expect(formatRelativeTime(new Date("2025-06-15T10:00:00.000Z"))).toBe("2 hours ago");
    expect(formatRelativeTime(new Date("2025-06-15T11:00:00.000Z"))).toBe("1 hour ago");
  });

  it("returns yesterday between 1 and 2 days", () => {
    expect(formatRelativeTime(new Date("2025-06-14T10:00:00.000Z"))).toBe("yesterday");
  });

  it("formats multiple days ago", () => {
    expect(formatRelativeTime(new Date("2025-06-10T12:00:00.000Z"))).toBe("5 days ago");
  });

  it("accepts ISO string input", () => {
    expect(formatRelativeTime("2025-06-14T10:00:00.000Z")).toBe("yesterday");
  });
});
