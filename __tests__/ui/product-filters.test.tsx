/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { ProductFilters } from "@/components/products/ProductFilters";

describe("ProductFilters Component", () => {
  const mockProps = {
    search: "",
    setSearch: jest.fn(),
    sku: "",
    setSku: jest.fn(),
    minPrice: undefined,
    setMinPrice: jest.fn(),
    maxPrice: undefined,
    setMaxPrice: jest.fn(),
    startDate: "",
    setStartDate: jest.fn(),
    endDate: "",
    setEndDate: jest.fn(),
  };

  it("renders all filter inputs", () => {
    render(<ProductFilters {...mockProps} />);
    
    expect(screen.getByPlaceholderText("Search by name...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search by SKU...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Min Price")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Max Price")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Start Date")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("End Date")).toBeInTheDocument();
  });

  it("calls setSearch when name input changes", () => {
    render(<ProductFilters {...mockProps} />);
    const input = screen.getByPlaceholderText("Search by name...");
    fireEvent.change(input, { target: { value: "laptop" } });
    expect(mockProps.setSearch).toHaveBeenCalledWith("laptop");
  });

  it("calls setSku when SKU input changes", () => {
    render(<ProductFilters {...mockProps} />);
    const input = screen.getByPlaceholderText("Search by SKU...");
    fireEvent.change(input, { target: { value: "ABC" } });
    expect(mockProps.setSku).toHaveBeenCalledWith("ABC");
  });
});
