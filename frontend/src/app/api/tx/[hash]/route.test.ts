import { describe, expect, it, vi } from "vitest";
import { getTransaction } from "@/lib/horizon";

vi.mock("@/lib/horizon", () => ({
  getTransaction: vi.fn(),
}));

describe("GET /api/tx/[hash] (transaction hash confinement)", () => {
  it.each(["abc", "..%2Fledgers%2F1", "a".repeat(64) + "?limit=1", "g".repeat(64)])(
    "returns 400 without requesting Horizon for %s",
    async (hash) => {
      vi.mocked(getTransaction).mockClear();
      const { GET } = await import("./route");
      const res = await GET(new Request("http://localhost/api/tx/test"), { params: { hash } });
      expect(res.status).toBe(400);
      expect(getTransaction).not.toHaveBeenCalled();
    }
  );
});
