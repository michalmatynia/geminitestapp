/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AdminProductsPage from "@/app/(admin)/admin/products/page";
import { getProducts } from "@/lib/api";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: jest.fn(),
  }),
}));

jest.mock("@/lib/api", () => ({
  getProducts: jest.fn(),
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
    jest.clearAllMocks();
    (getProducts as jest.Mock).mockResolvedValue(mockProducts);
  });

  it("renders product rows", async () => {
    render(<AdminProductsPage />);

    expect(await screen.findByText("Product Alpha")).toBeInTheDocument();
    expect(screen.getByText("Product Beta")).toBeInTheDocument();
  });

  it("shows row actions menu with Edit, Duplicate, and Remove", async () => {
    render(<AdminProductsPage />);
    await screen.findByText("Product Alpha");

    const user = userEvent.setup();
    const actionButtons = screen.getAllByLabelText("Open row actions");
    await user.click(actionButtons[0]);

    expect(await screen.findByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Duplicate")).toBeInTheDocument();
    expect(screen.getByText("Remove")).toBeInTheDocument();
  });

  it("prompts for SKU before opening the create modal and pre-fills SKU", async () => {
    const promptMock = jest
      .spyOn(window, "prompt")
      .mockReturnValue("abc123");
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

    render(<AdminProductsPage />);

    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Create product"));

    await screen.findByText("Create Product");
    const skuInput = screen.getByLabelText("SKU") as HTMLInputElement;
    await waitFor(() => {
      expect(skuInput.value).toBe("ABC123");
    });

    promptMock.mockRestore();
    fetchMock.mockRestore();
  });
});
