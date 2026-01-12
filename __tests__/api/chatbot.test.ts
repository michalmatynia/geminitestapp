import { GET, POST } from "@/app/api/chatbot/route";

describe("Chatbot API", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    global.fetch = jest.fn();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.resetAllMocks();
  });

  it("should list available Ollama models", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          models: [{ name: "llama3" }, { name: "llava" }],
        })
      )
    );

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.models).toEqual(["llama3", "llava"]);
  });

  it("should return an error when model listing fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response("Provider down", { status: 502 })
    );

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error).toContain("Failed to load models");
    expect(data.errorId).toBeDefined();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("should reject invalid chat payloads", async () => {
    const req = new Request("http://localhost/api/chatbot", {
      method: "POST",
      body: JSON.stringify({ messages: [] }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("No messages provided.");
  });

  it("should proxy chat requests to Ollama", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ message: { content: "Hello from model." } })
      )
    );

    const req = new Request("http://localhost/api/chatbot", {
      method: "POST",
      body: JSON.stringify({
        model: "llama3",
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("Hello from model.");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/chat"),
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("should return a debug errorId when chat proxy fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response("Model unavailable", { status: 502 })
    );

    const req = new Request("http://localhost/api/chatbot", {
      method: "POST",
      body: JSON.stringify({
        model: "llama3",
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error).toContain("Ollama error");
    expect(data.errorId).toBeDefined();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("should return a debug errorId on unexpected chat errors", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network down"));

    const req = new Request("http://localhost/api/chatbot", {
      method: "POST",
      body: JSON.stringify({
        model: "llama3",
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.errorId).toBeDefined();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
