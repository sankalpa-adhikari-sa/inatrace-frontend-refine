import { getCoreRowModel, type SortingState, useReactTable } from "@tanstack/react-table";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { renderWithRefine } from "../../../../test/render";
import { tr } from "../../../../test/tr";
import { SortableHeader } from "./data-table-sorter";

let state: SortingState = [];

function Headers() {
  const [sorting, setSorting] = useState<SortingState>([{ id: "BY_NAME", desc: false }]);
  state = sorting;
  const table = useReactTable({
    data: [],
    columns: [{ id: "BY_NAME" }, { id: "BY_SURNAME" }],
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
  });
  return (
    <>
      <SortableHeader column={table.getColumn("BY_NAME")!} label="First name" />
      <SortableHeader column={table.getColumn("BY_SURNAME")!} label="Last name" />
    </>
  );
}

describe("SortableHeader", () => {
  it("sorts by the clicked column alone, flipping its direction, never unsorted", async () => {
    renderWithRefine(<Headers />, { companyId: null });
    const user = userEvent.setup();
    const lastName = await screen.findByRole("button", { name: tr("table.texts.sortBy", { column: "Last name" }) });

    await user.click(lastName);
    expect(state).toEqual([{ id: "BY_SURNAME", desc: false }]);

    await user.click(screen.getByRole("button", { name: tr("table.texts.sortedAscending", { column: "Last name" }) }));
    expect(state).toEqual([{ id: "BY_SURNAME", desc: true }]);

    await user.click(screen.getByRole("button", { name: tr("table.texts.sortedDescending", { column: "Last name" }) }));
    expect(state).toEqual([{ id: "BY_SURNAME", desc: false }]);

    await user.click(screen.getByRole("button", { name: tr("table.texts.sortBy", { column: "First name" }) }));
    expect(state).toEqual([{ id: "BY_NAME", desc: false }]);
  });
});
