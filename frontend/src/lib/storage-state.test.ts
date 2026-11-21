import { describe, expect, it } from "vitest";
import { classifyStorageEntry, storageStateLabel, withStorageState } from "./storage-state";

describe("classifyStorageEntry", () => {
  it("treats an entry whose TTL is still in the future as live", () => {
    expect(classifyStorageEntry("temporary", 200, 100)).toBe("live");
    expect(classifyStorageEntry("temporary", 101, 100)).toBe("live");
  });

  it("treats a temporary entry past its TTL as expired (deleted)", () => {
    expect(classifyStorageEntry("temporary", 100, 100)).toBe("expired");
    expect(classifyStorageEntry("temporary", 90, 100)).toBe("expired");
  });

  it("treats a persistent entry past its TTL as archived (restorable)", () => {
    expect(classifyStorageEntry("persistent", 90, 100)).toBe("archived");
  });

  it("stays live when the TTL is unknown", () => {
    expect(classifyStorageEntry("persistent", null, 100)).toBe("live");
    expect(classifyStorageEntry("temporary", undefined, 100)).toBe("live");
  });
});

describe("storageStateLabel", () => {
  it("spells out the restore-versus-gone difference", () => {
    expect(storageStateLabel("expired")).toBe("expired (temporary — deleted)");
    expect(storageStateLabel("archived")).toBe("archived (persistent — restorable)");
    expect(storageStateLabel("live")).toBe("live");
  });
});

describe("withStorageState", () => {
  it("keeps every field and adds the computed state", () => {
    expect(
      withStorageState(
        { key: "session", value: "7", durability: "temporary", liveUntilLedgerSeq: 90 },
        100
      )
    ).toEqual({
      key: "session",
      value: "7",
      durability: "temporary",
      liveUntilLedgerSeq: 90,
      state: "expired",
    });
  });
});
