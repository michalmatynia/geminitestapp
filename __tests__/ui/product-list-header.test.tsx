/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { ProductListHeader } from "@/components/products/ProductListHeader";

describe("ProductListHeader Component", () => {
  const mockProps = {
    onOpenCreateModal: jest.fn(),
    page: 1,
    totalPages: 5,
    setPage: jest.fn(),
    pageSize: 24,
    setPageSize: jest.fn(),
    nameLocale: "name_en" as const,
    setNameLocale: jest.fn(),
    currencyCode: "USD",
    setCurrencyCode: jest.fn(),
    currencyOptions: ["USD", "PLN", "EUR"],
    catalogFilter: "all",
    setCatalogFilter: jest.fn(),
    catalogs: [
      {
        id: "cat-1",
        name: "Catalog 1",
        description: null,
        isDefault: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        languageIds: ["en"],
        priceGroupIds: ["pg-1"],
      },
      {
        id: "cat-2",
        name: "Catalog 2",
        description: null,
        isDefault: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        languageIds: ["en"],
        priceGroupIds: ["pg-1"],
      },
    ],
  };

  it("renders title and buttons", () => {
    render(<ProductListHeader {...mockProps} />);
    
    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByLabelText("Create product")).toBeInTheDocument();
  });

  it("calls onOpenCreateModal when create button is clicked", () => {
    render(<ProductListHeader {...mockProps} />);
    fireEvent.click(screen.getByLabelText("Create product"));
    expect(mockProps.onOpenCreateModal).toHaveBeenCalled();
  });

  it("renders pagination info correctly", () => {
    render(<ProductListHeader {...mockProps} />);
    expect(screen.getByText("1 / 5")).toBeInTheDocument();
  });

  it("calls setPage when Prev/Next buttons are clicked", () => {
    render(<ProductListHeader {...mockProps} page={2} />);
    fireEvent.click(screen.getByText("Prev"));
    expect(mockProps.setPage).toHaveBeenCalledWith(1);
    
    fireEvent.click(screen.getByText("Next"));
    expect(mockProps.setPage).toHaveBeenCalledWith(3);
  });
});
