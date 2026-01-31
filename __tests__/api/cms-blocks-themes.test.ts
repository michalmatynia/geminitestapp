import { NextRequest } from "next/server";
import { GET as GET_blocks, POST as POST_blocks } from "@/app/api/cms/blocks/route";
import { GET as GET_block, PUT as PUT_block, DELETE as DELETE_block } from "@/app/api/cms/blocks/[id]/route";
import { GET as GET_themes, POST as POST_themes } from "@/app/api/cms/themes/route";
import { getCmsRepository } from "@/features/cms/services/cms-repository";
import type { Block, CmsTheme } from "@/features/cms/types";

describe("CMS Blocks and Themes API", () => {
  let cmsRepository: any;

  beforeEach(async () => {
    cmsRepository = await getCmsRepository();
    
    // Cleanup: Delete all blocks and themes
    const blocks = await cmsRepository.getBlocks();
    for (const b of blocks) {
      await cmsRepository.deleteBlock(b.id);
    }
    
    const themes = await cmsRepository.getThemes();
    for (const t of themes) {
      await cmsRepository.deleteTheme(t.id);
    }
  });

  describe("CMS Blocks API", () => {
    it("should create a new block", async () => {
      const req = new NextRequest("http://localhost/api/cms/blocks", {
        method: "POST",
        body: JSON.stringify({ 
          name: "Test Block",
          content: { html: "<p>Hello</p>" }
        }),
      });

      const res = await POST_blocks(req);
      const data = await res.json() as Block;

      expect(res.status).toBe(200);
      expect(data.name).toBe("Test Block");
      expect(data.id).toBeDefined();
    });

    it("should fetch all blocks", async () => {
      await cmsRepository.createBlock({ name: "Block 1", content: {} });
      await cmsRepository.createBlock({ name: "Block 2", content: {} });

      const res = await GET_blocks(new NextRequest("http://localhost/api/cms/blocks"), {} as any);
      const data = await res.json() as Block[];
      expect(res.status).toBe(200);
      expect(data.length).toBe(2);
    });

    it("should fetch a single block by id", async () => {
      const block = await cmsRepository.createBlock({ name: "Single Block", content: { a: 1 } });

      const res = await GET_block(new NextRequest(`http://localhost/api/cms/blocks/${block.id}`), { params: { id: block.id } } as any);
      const data = await res.json() as Block;

      expect(res.status).toBe(200);
      expect(data.name).toBe("Single Block");
      expect(data.id).toBe(block.id);
    });

    it("should update a block", async () => {
      const block = await cmsRepository.createBlock({ name: "Old Block", content: { x: 1 } });

      const req = new NextRequest(`http://localhost/api/cms/blocks/${block.id}`, {
        method: "PUT",
        body: JSON.stringify({ 
          name: "Updated Block",
          content: { x: 2 }
        }),
      });

      const res = await PUT_block(req, { params: { id: block.id } } as any);
      const data = await res.json() as Block;

      expect(res.status).toBe(200);
      expect(data.name).toBe("Updated Block");
      expect(data.content).toEqual({ x: 2 });
    });

    it("should delete a block", async () => {
      const block = await cmsRepository.createBlock({ name: "To Delete", content: {} });

      const req = new NextRequest(`http://localhost/api/cms/blocks/${block.id}`, {
        method: "DELETE",
      });

      const res = await DELETE_block(req, { params: { id: block.id } } as any);
      expect(res.status).toBe(204);

      const deletedBlock = await cmsRepository.getBlockById(block.id);
      expect(deletedBlock).toBeNull();
    });
  });

  describe("CMS Themes API", () => {
    const validTheme = {
      name: "Default Theme",
      colors: {
        primary: "#000000",
        secondary: "#ffffff",
        accent: "#ff0000",
        background: "#ffffff",
        surface: "#f0f0f0",
        text: "#333333",
        muted: "#999999"
      },
      typography: {
        headingFont: "Inter",
        bodyFont: "Inter",
        baseSize: 16,
        headingWeight: 700,
        bodyWeight: 400
      },
      spacing: {
        sectionPadding: "2rem",
        containerMaxWidth: "1200px"
      },
      customCss: ".test { color: red; }"
    };

    it("should create a new theme", async () => {
      const req = new NextRequest("http://localhost/api/cms/themes", {
        method: "POST",
        body: JSON.stringify(validTheme),
      });

      const res = await POST_themes(req);
      const data = await res.json() as CmsTheme;

      expect(res.status).toBe(200);
      expect(data.name).toBe("Default Theme");
      expect(data.id).toBeDefined();
    });

    it("should fetch all themes", async () => {
      await cmsRepository.createTheme(validTheme);

      const res = await GET_themes(new NextRequest("http://localhost/api/cms/themes"), {} as any);
      const data = await res.json() as CmsTheme[];
      expect(res.status).toBe(200);
      expect(data.length).toBe(1);
      expect(data[0].name).toBe("Default Theme");
    });
  });
});
