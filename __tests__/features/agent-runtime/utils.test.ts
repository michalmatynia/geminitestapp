import { describe, it, expect } from "vitest";
import {
  extractTargetUrl,
  getTargetHostname,
  isAllowedUrl,
  normalizeProductNames,
  normalizeEmailCandidates,
  parseRobotsRules,
  evaluateRobotsRules,
  parseCredentials,
  parseExtractionRequest,
  buildEvidenceSnippets,
} from "@/features/agent-runtime/tools/utils";

describe("Agent Runtime - Utils", () => {
  describe("extractTargetUrl", () => {
    it("should extract http/https URLs", () => {
      expect(extractTargetUrl("Go to https://example.com/page")).toBe("https://example.com/page");
      expect(extractTargetUrl("Visit http://test.org")).toBe("http://test.org");
    });

    it("should extract domain names and prepend https", () => {
      expect(extractTargetUrl("Check example.com")).toBe("https://example.com");
      expect(extractTargetUrl("Go to shop.mysite.co.uk now")).toBe("https://shop.mysite.co.uk");
    });

    it("should return null if no URL or domain found", () => {
      expect(extractTargetUrl("Hello world")).toBeNull();
    });
  });

  describe("getTargetHostname", () => {
    it("should return hostname without www", () => {
      expect(getTargetHostname("Go to https://www.google.com/search")).toBe("google.com");
      expect(getTargetHostname("Visit http://blog.example.org")).toBe("blog.example.org");
    });
  });

  describe("isAllowedUrl", () => {
    it("should allow subdomains", () => {
      const target = "example.com";
      expect(isAllowedUrl("https://example.com/path", target)).toBe(true);
      expect(isAllowedUrl("https://shop.example.com/", target)).toBe(true);
      expect(isAllowedUrl("https://deep.sub.example.com/", target)).toBe(true);
    });

    it("should block different domains", () => {
      const target = "example.com";
      expect(isAllowedUrl("https://other.com", target)).toBe(false);
      expect(isAllowedUrl("https://example.net", target)).toBe(false);
    });
  });

  describe("normalizeProductNames", () => {
    it("should filter out UI noise and duplicates", () => {
      const input = ["Product A", "Add to Cart", "Product A", "In Stock", "  Product B  "];
      const output = normalizeProductNames(input);
      expect(output).toEqual(["Product A", "Product B"]);
    });

    it("should filter out hex IDs and prices", () => {
      const input = ["Real Product", "abcdef0123456789", "0123456789abcdef0123456789abcdef", "$19.99", "123.45"];
      const output = normalizeProductNames(input);
      expect(output).toEqual(["Real Product"]);
    });
  });

  describe("normalizeEmailCandidates", () => {
    it("should filter valid unique emails", () => {
      const input = ["TEST@example.com", "not-an-email", "test@example.com", "valid@test.org"];
      const output = normalizeEmailCandidates(input);
      expect(output).toEqual(["test@example.com", "valid@test.org"]);
    });
  });

  describe("Robots.txt logic", () => {
    it("should parse and evaluate rules correctly", () => {
      const txt = "User-agent: *\nDisallow: /admin\nAllow: /admin/login\nDisallow: /private";
      const rulesMap = parseRobotsRules(txt);
      const rules = rulesMap.get("*" as string)!;
      
      expect(evaluateRobotsRules(rules, "/public").allowed).toBe(true);
      expect(evaluateRobotsRules(rules, "/admin").allowed).toBe(false);
      expect(evaluateRobotsRules(rules, "/admin/login").allowed).toBe(true);
      expect(evaluateRobotsRules(rules, "/private/data").allowed).toBe(false);
    });
  });

  describe("parseCredentials", () => {
    it("should parse email and password", () => {
      expect(parseCredentials("Login with email: user@test.com password: secret123")).toEqual({
        email: "user@test.com",
        password: "secret123"
      });
    });

    it("should return null if password missing", () => {
      expect(parseCredentials("user: admin")).toBeNull();
    });
  });

  describe("parseExtractionRequest", () => {
    it("should detect product extraction with count", () => {
      expect(parseExtractionRequest("Extract 20 products")).toEqual({
        type: "product_names",
        count: 20
      });
    });

    it("should detect email extraction", () => {
      expect(parseExtractionRequest("Find emails on this page")).toEqual({
        type: "emails",
        count: null
      });
    });
  });

  describe("buildEvidenceSnippets", () => {
    it("should find snippets for items", () => {
      const dom = "Welcome to our shop. We have Product Alpha in stock. Product Alpha is great.";
      const items = ["Product Alpha"];
      const snippets = buildEvidenceSnippets(items, dom);
      expect(snippets).toHaveLength(2);
      expect(snippets[0]!.snippet).toContain("Product Alpha");
    });
  });
});
