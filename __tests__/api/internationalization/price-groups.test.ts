import { GET, POST } from "../../../app/api/price-groups/route";
import prisma from "@/lib/prisma";

describe("Price Groups API", () => {
  beforeEach(async () => {
    await prisma.priceGroup.deleteMany({});
    await prisma.currency.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("GET /api/price-groups", () => {
    it("should return empty list initially", async () => {
      const res = await GET();
      const groups = await res.json();
      expect(res.status).toEqual(200);
      expect(groups).toEqual([]);
    });

    it("should return created price groups", async () => {
      const currency = await prisma.currency.create({
        data: { code: "USD", name: "US Dollar" },
      });
      await prisma.priceGroup.create({
        data: {
          groupId: "PG1",
          name: "Group 1",
          currencyId: currency.id,
          type: "standard",
          basePriceField: "price",
        },
      });

      const res = await GET();
      const groups = await res.json();
      expect(res.status).toEqual(200);
      expect(groups).toHaveLength(1);
      expect(groups[0].groupId).toBe("PG1");
    });
  });

  describe("POST /api/price-groups", () => {
    it("should create a standard price group", async () => {
      const currency = await prisma.currency.create({
        data: { code: "USD", name: "US Dollar" },
      });

      const newGroup = {
        groupId: "STD",
        name: "Standard Group",
        currencyId: currency.id,
        type: "standard",
        basePriceField: "price",
        priceMultiplier: 1,
        addToPrice: 0,
        isDefault: true,
      };

      const req = new Request("http://localhost/api/price-groups", {
        method: "POST",
        body: JSON.stringify(newGroup),
      });

      const res = await POST(req);
      const group = await res.json();

      expect(res.status).toEqual(200);
      expect(group.groupId).toBe("STD");
      expect(group.isDefault).toBe(true);
    });

    it("should create a dependent price group", async () => {
      const currency = await prisma.currency.create({
        data: { code: "EUR", name: "Euro" },
      });
      const sourceGroup = await prisma.priceGroup.create({
        data: {
          groupId: "BASE",
          name: "Base Group",
          currencyId: currency.id,
          type: "standard",
          basePriceField: "price",
        },
      });

      const newGroup = {
        groupId: "DEP",
        name: "Dependent Group",
        currencyId: currency.id,
        type: "dependent",
        basePriceField: "price",
        sourceGroupId: sourceGroup.id,
        priceMultiplier: 1.2,
        addToPrice: 10,
      };

      const req = new Request("http://localhost/api/price-groups", {
        method: "POST",
        body: JSON.stringify(newGroup),
      });

      const res = await POST(req);
      const group = await res.json();

      expect(res.status).toEqual(200);
      expect(group.type).toBe("dependent");
      expect(group.sourceGroupId).toBe(sourceGroup.id);
    });

    it("should fail validation for dependent group without source", async () => {
      const currency = await prisma.currency.create({
        data: { code: "EUR", name: "Euro" },
      });

      const newGroup = {
        groupId: "DEP_FAIL",
        name: "Dependent Fail",
        currencyId: currency.id,
        type: "dependent",
        basePriceField: "price",
        // sourceGroupId missing
        priceMultiplier: 1.2,
        addToPrice: 10,
      };

      const req = new Request("http://localhost/api/price-groups", {
        method: "POST",
        body: JSON.stringify(newGroup),
      });

      const res = await POST(req);
      expect(res.status).toEqual(400);
      const body = await res.json();
      expect(body.error).toContain("Invalid payload");
    });
  });
});
