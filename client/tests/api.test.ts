// Developed by Sydney Edwards
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, ApiClientError } from "../src/lib/api";

function mockResponse(body: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body
  } as Response;
}

describe("api client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("teamMembers.getAll unwraps envelope data", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(JSON.stringify({ data: [], error: null }))
    );
    const data = await api.teamMembers.getAll();
    expect(data).toEqual([]);
  });

  it("throws ApiClientError when envelope contains error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(
        JSON.stringify({ data: null, error: { message: "Not found", code: "NOT_FOUND" } }),
        404
      )
    );
    await expect(api.teamMembers.getById("x")).rejects.toMatchObject({
      message: "Not found",
      code: "NOT_FOUND"
    });
  });

  it("throws ApiClientError when response is not valid JSON", async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse("not json", 200));
    await expect(api.settings.get()).rejects.toBeInstanceOf(ApiClientError);
    await expect(api.settings.get()).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("stories.getAll passes sprintId query param", async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(JSON.stringify({ data: [], error: null })));
    await api.stories.getAll({ sprintId: "backlog" });
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain("sprintId=backlog");
  });

  it("teams.delete encodes cascade mode", async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(JSON.stringify({ data: null, error: null })));
    await api.teams.delete("tid", "cascade");
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain("mode=cascade");
  });

  it("dashboard.get calls /dashboard", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(JSON.stringify({ data: { activeSprint: null }, error: null }))
    );
    await api.dashboard.get();
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain("/dashboard");
  });
});
