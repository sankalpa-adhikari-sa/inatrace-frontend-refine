import { UnsavedChangesNotifier } from "@refinedev/react-router";
import { screen, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { TextField } from "@/components/app/form-fields";
import { renderWithRefine } from "../../test/render";
import { anyDirty, useWarnWhenDirty } from "./use-warn-when-dirty";

describe("anyDirty", () => {
  it("finds a dirty leaf in nested objects and field arrays", () => {
    expect(anyDirty({ headquarters: { city: true } })).toBe(true);
    expect(anyDirty({ certifications: [undefined, { type: true }] })).toBe(true);
  });

  it("ignores branches left behind when a field is changed back", () => {
    expect(anyDirty({})).toBe(false);
    expect(anyDirty({ headquarters: {}, certifications: [{ type: false }] })).toBe(false);
    expect(anyDirty(undefined)).toBe(false);
  });
});

/** A plain react-hook-form form (not Refine's useForm) that navigates away after saving. */
function PlainForm() {
  const navigate = useNavigate();
  const { control, handleSubmit } = useForm({ defaultValues: { name: "" } });
  const release = useWarnWhenDirty(control);
  return (
    <>
      <UnsavedChangesNotifier />
      <form
        onSubmit={handleSubmit(() => {
          release();
          navigate("/saved");
        })}
      >
        <TextField control={control} name="name" label="Name" />
        <button type="submit">Save</button>
      </form>
      <Link to="/elsewhere">Leave</Link>
    </>
  );
}

describe("useWarnWhenDirty", () => {
  it("asks before leaving a changed form, but not after saving it", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { user } = renderWithRefine(<PlainForm />, { route: "/form", path: "/form", companyId: null });

    // Untouched: leaving doesn't ask.
    await user.type(await screen.findByLabelText("Name"), "x");
    await user.click(screen.getByRole("link", { name: "Leave" }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("elsewhere")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByTestId("elsewhere")).toBeInTheDocument());
    expect(confirm).toHaveBeenCalledTimes(1);
  });
});
