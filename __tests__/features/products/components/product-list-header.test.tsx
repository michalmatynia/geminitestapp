import { vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductListHeader } from "@/features/products/components/list/ProductListHeader";

describe("ProductListHeader Component", () => {
  const mockProps = {
    onCreateProduct: vi.fn(),
    page: 1,
    totalPages: 5,
    setPage: vi.fn(),
    pageSize: 24,
    setPageSize: vi.fn(),
    nameLocale: "name_en" as const,
    setNameLocale: vi.fn(),
    languageOptions: [
      { value: "name_en" as const, label: "English" },
      { value: "name_pl" as const, label: "Polish" },
      { value: "name_de" as const, label: "German" },
    ],
    currencyCode: "USD",
    setCurrencyCode: vi.fn(),
    currencyOptions: ["USD", "PLN", "EUR"],
    catalogFilter: "all",
    setCatalogFilter: vi.fn(),
    catalogs: [
      {
        id: "cat-1",
        name: "Catalog 1",
        description: null,
        isDefault: false,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
        languageIds: ["en"],
        priceGroupIds: ["pg-1"],
      },
      {
        id: "cat-2",
        name: "Catalog 2",
        description: null,
        isDefault: false,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
        languageIds: ["en"],
        priceGroupIds: ["pg-1"],
      },
    ],
  };

  it("renders title and buttons", () => {
    render(<ProductListHeader {...mockProps} />);

    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByLabelText("Create new product")).toBeInTheDocument();
  });

  it("calls onCreateProduct when create button is clicked", () => {
    render(<ProductListHeader {...mockProps} />);
    fireEvent.click(screen.getByLabelText("Create new product"));
    expect(mockProps.onCreateProduct).toHaveBeenCalled();
  });

  it("renders pagination info correctly", () => {
    render(<ProductListHeader {...mockProps} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("/")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("calls setPage when Prev/Next buttons are clicked", () => {
    render(<ProductListHeader {...mockProps} page={2} />);
    fireEvent.click(screen.getByLabelText("Previous page"));
    expect(mockProps.setPage).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByLabelText("Next page"));
    expect(mockProps.setPage).toHaveBeenCalledWith(3);
  });
});
