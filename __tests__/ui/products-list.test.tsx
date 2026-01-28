/**
 * @vitest-environment jsdom
 */

import { vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AdminProductsPage from "@/app/(admin)/admin/products/page";
import { ToastProvider } from "@/shared/ui/toast";
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

const mockProducts = [
  {
    id: "product-1",
    name_en: "Product Alpha",
    name_pl: null,
    name_de: null,
    sku: "ALPHA1",
    price: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    images: [],
  },
  {
    id: "product-2",
    name_en: "Product Beta",
    name_pl: null,
    name_de: null,
    sku: "BETA2",
    price: 200,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    images: [],
  },
];

describe("Admin Products List UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    server.use(
      http.get("/api/products", () => {
        return HttpResponse.json(mockProducts);
      }),
      http.get("/api/products/count", () => {
        return HttpResponse.json({ count: mockProducts.length });
      }),
      http.get("/api/catalogs", () => {
        return HttpResponse.json({ data: [], total: 0 });
      })
    );
  });

  it("renders product rows", async () => {
    render(
      <ToastProvider>
        <AdminProductsPage />
      </ToastProvider>
    );

    expect(await screen.findByText("Product Alpha")).toBeInTheDocument();
    expect(screen.getByText("Product Beta")).toBeInTheDocument();
  });

  it("shows row actions menu with Edit, Duplicate, and Remove", async () => {
    render(
      <ToastProvider>
        <AdminProductsPage />
      </ToastProvider>
    );
    await screen.findByText("Product Alpha");

    const user = userEvent.setup();
    const actionButtons = screen.getAllByLabelText("Open row actions");
    await user.click(actionButtons[0]!);

    expect(await screen.findByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Duplicate")).toBeInTheDocument();
    expect(screen.getByText("Remove")).toBeInTheDocument();
  });

  it("prompts for SKU before opening the create modal and pre-fills SKU", async () => {
    const promptMock = vi
      .spyOn(window, "prompt")
      .mockReturnValue("abc123");
    
    render(
      <ToastProvider>
        <AdminProductsPage />
      </ToastProvider>
    );

    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Create product"));

    await screen.findByRole("heading", { name: "Product" });
    const skuInput = screen.getByLabelText<HTMLInputElement>(/SKU/i);
    await waitFor(() => {
      expect(skuInput.value).toBe("ABC123");
    });

    promptMock.mockRestore();
  });
});
