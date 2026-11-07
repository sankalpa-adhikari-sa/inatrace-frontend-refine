import { screen, waitFor, within } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { focusFirstError } from "@/lib/form-errors";
import { renderWithRefine } from "../../../test/render";
import { tr } from "../../../test/tr";
import { TextField } from "./form-fields";
import { TranslationTabs } from "./translation-tabs";

const LANGUAGES = ["EN", "DE"] as const;

function Form() {
  const { control, handleSubmit } = useForm({ defaultValues: { names: ["Mill", ""] } });
  return (
    <form onSubmit={handleSubmit(() => {}, focusFirstError)}>
      <TranslationTabs languages={LANGUAGES}>
        {(l, i) => (
          <TextField control={control} name={`names.${i}`} label={`Name ${l}`} rules={l === "DE" ? { required: "German name is required" } : undefined} />
        )}
      </TranslationTabs>
      <button type="submit">Save</button>
    </form>
  );
}

describe("TranslationTabs", () => {
  it("marks the language tab holding an error and opens it on a failed submit", async () => {
    const { user } = renderWithRefine(<Form />, { companyId: null });
    const de = await screen.findByRole("tab", { name: "DE" });
    expect(screen.getByLabelText(/^Name DE/)).not.toBeVisible();

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(within(de).getByRole("img", { name: tr("common.texts.hasErrors") })).toBeInTheDocument());
    expect(within(screen.getByRole("tab", { name: "EN" })).queryByRole("img")).toBeNull();
    await waitFor(() => expect(screen.getByLabelText(/^Name DE/)).toHaveFocus());
    expect(de).toHaveAttribute("aria-selected", "true");
  });
});
