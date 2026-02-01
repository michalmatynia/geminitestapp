import { vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductFilters } from "@/features/products/components/list/ProductFilters";

describe("ProductFilters Component", () => {
  const mockProps = {
    search: "",
    setSearch: vi.fn(),
    sku: "",
    setSku: vi.fn(),
    minPrice: undefined,
    setMinPrice: vi.fn(),
    maxPrice: undefined,
    setMaxPrice: vi.fn(),
    startDate: "",
    setStartDate: vi.fn(),
    endDate: "",
    setEndDate: vi.fn(),
  };

  it("renders all filter inputs", () => {
    render(<ProductFilters {...mockProps} />);
    
    expect(screen.getByPlaceholderText("Search by name...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search by SKU...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/min price/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/max price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/from date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/to date/i)).toBeInTheDocument();
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
