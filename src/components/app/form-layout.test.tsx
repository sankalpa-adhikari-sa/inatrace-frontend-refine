import { screen, waitFor, within } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { focusFirstError } from "@/lib/form-errors";
import { renderWithRefine } from "../../../test/render";
import { tr } from "../../../test/tr";
import { TextField } from "./form-fields";
import { FormLayout } from "./form-layout";
import { FormActions, Section } from "./page";

type Values = { a: string; b: string; c: string; d: string };

function LongForm({ sections = 4 }: { sections?: number }) {
  const { control, handleSubmit } = useForm<Values>({ defaultValues: { a: "", b: "", c: "", d: "" } });
  const names = (["a", "b", "c", "d"] as const).slice(0, sections);
  return (
    <form onSubmit={handleSubmit(() => {}, focusFirstError)}>
      <FormLayout control={control}>
        {names.map((n) => (
          <Section key={n} id={`section-${n}`} title={`Section ${n.toUpperCase()}`}>
            <TextField control={control} name={n} label={`Field ${n}`} rules={n === "c" ? { required: "C is required" } : undefined} />
          </Section>
        ))}
        <FormActions sticky control={control}>
          <button type="submit">Save</button>
        </FormActions>
      </FormLayout>
    </form>
  );
}

const rail = () => screen.getByRole("navigation", { name: tr("common.titles.onThisPage") });

describe("FormLayout", () => {
  it("lists the form's sections in page order in the table of contents", async () => {
    renderWithRefine(<LongForm />, { companyId: null });
    const links = await within(await waitFor(rail)).findAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Section A", "Section B", "Section C", "Section D"]);
    expect(links[0]).toHaveAttribute("href", "#section-a");
  });

  it("leaves out the table of contents on short forms", async () => {
    renderWithRefine(<LongForm sections={3} />, { companyId: null });
    await screen.findByText("Section A");
    expect(screen.queryByRole("navigation", { name: tr("common.titles.onThisPage") })).toBeNull();
  });

  it("after a failed submit, marks the section with the error and counts fields to fix", async () => {
    const { user } = renderWithRefine(<LongForm />, { companyId: null });
    await waitFor(rail);
    await user.type(screen.getByLabelText("Field a"), "x");
    expect(screen.getByText(tr("common.texts.unsavedChanges"))).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText(tr("common.texts.fieldsToFix", { count: 1 }))).toBeInTheDocument();
    const sectionC = within(rail()).getByRole("link", { name: /Section C/ });
    await waitFor(() => expect(within(sectionC).getByRole("img", { name: tr("common.texts.hasErrors") })).toBeInTheDocument());
    expect(within(rail()).getByRole("link", { name: /Section A/ }).querySelector('[role="img"]')).toBeNull();
    await waitFor(() => expect(screen.getByLabelText(/^Field c/)).toHaveFocus());
  });
});
