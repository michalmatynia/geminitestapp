import { vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductTableFooter } from "@/features/products/components/list/ProductTableFooter";
import { Table } from "@tanstack/react-table";
import { ToastProvider } from "@/shared/ui/toast";

describe("ProductTableFooter Component", () => {
  const mockTable = {
    getFilteredSelectedRowModel: () => ({ rows: [] }),
    getFilteredRowModel: () => ({ rows: { length: 100 } }),
    getSelectedRowModel: () => ({ rows: [] }),
    setRowSelection: vi.fn(),
  } as unknown as Table<object>;

  const mockProps = {
    table: mockTable,
    setRefreshTrigger: vi.fn(),
    setActionError: vi.fn(),
  };

  it("renders selection count", () => {
    render(
      <ToastProvider>
        <ProductTableFooter {...mockProps} />
      </ToastProvider>
    );
    expect(screen.getByText((_content, element) => {
      return element?.textContent === "0 of 100 row(s) selected.";
    })).toBeInTheDocument();
  });

  it("disables delete button when no selection", () => {
    render(
      <ToastProvider>
        <ProductTableFooter {...mockProps} />
      </ToastProvider>
    );
    const deleteButton = screen.getByRole("button", { name: /Delete Selected/i });
    expect(deleteButton).toBeDisabled();
  });

  it("enables delete button when there is a selection", () => {
    const tableWithSelection = {
      ...mockTable,
      getFilteredSelectedRowModel: () => ({ rows: [{}, {}] }),
    } as unknown as Table<object>;

    render(
      <ToastProvider>
        <ProductTableFooter {...mockProps} table={tableWithSelection} />
      </ToastProvider>
    );
    const deleteButton = screen.getByRole("button", { name: /Delete Selected/i });
    expect(deleteButton).not.toBeDisabled();
  });
});
