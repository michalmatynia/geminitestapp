/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { ProductTableFooter } from "@/components/products/ProductTableFooter";
import { Table } from "@tanstack/react-table";

describe("ProductTableFooter Component", () => {
  const mockTable = {
    getFilteredSelectedRowModel: () => ({ rows: [] }),
    getFilteredRowModel: () => ({ rows: { length: 100 } }),
    getSelectedRowModel: () => ({ rows: [] }),
    setRowSelection: jest.fn(),
  } as unknown as Table<any>;

  const mockProps = {
    table: mockTable,
    setRefreshTrigger: jest.fn(),
    setActionError: jest.fn(),
  };

  it("renders selection count", () => {
    render(<ProductTableFooter {...mockProps} />);
    expect(screen.getByText("0 of 100 row(s) selected.")).toBeInTheDocument();
  });

  it("disables delete button when no selection", () => {
    render(<ProductTableFooter {...mockProps} />);
    const deleteButton = screen.getByText("Delete Selected");
    expect(deleteButton).toBeDisabled();
  });

  it("enables delete button when there is a selection", () => {
    const tableWithSelection = {
      ...mockTable,
      getFilteredSelectedRowModel: () => ({ rows: [{}, {}] }),
    } as unknown as Table<any>;

    render(<ProductTableFooter {...mockProps} table={tableWithSelection} />);
    const deleteButton = screen.getByText("Delete Selected");
    expect(deleteButton).not.toBeDisabled();
  });
});
