/**
 * @vitest-environment jsdom
 */

import { vi, Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AdminProductsPage from "@/app/(admin)/admin/products/page";
import { getProducts, countProducts } from "@/lib/api";
import { ToastProvider } from "@/components/ui/toast";

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

vi.mock("@/lib/api", () => ({
  getProducts: vi.fn(() => Promise.resolve([])),
  countProducts: vi.fn(() => Promise.resolve(0)),
}));

const mockProducts = [
  {
    id: "product-1",
    name_en: "Product Alpha",
    name_pl: null,
    name_de: null,
    sku: "ALPHA1",
    price: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    images: [],
  },
  {
    id: "product-2",
    name_en: "Product Beta",
    name_pl: null,
    name_de: null,
    sku: "BETA2",
    price: 200,
    createdAt: new Date(),
    updatedAt: new Date(),
    images: [],
  },
];

describe("Admin Products List UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    ) as Mock;
    
    global.fetch = mockFetch;
    window.fetch = mockFetch;

    (getProducts as Mock).mockResolvedValue(mockProducts);
    (countProducts as Mock).mockResolvedValue(2);
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
