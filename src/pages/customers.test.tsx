import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ep } from "@/lib/endpoints";
import { companyCustomer, countries } from "../../test/factories";
import { ok, on, paged, requestsTo, server } from "../../test/msw";
import { renderWithRefine } from "../../test/render";
import { tr, trLabel } from "../../test/tr";
import { CustomerForm } from "./customers";

describe("CustomerForm", () => {
  // LocationFields loads the country list.
  beforeEach(() => {
    server.use(on(ep.getCountries, () => paged(Object.values(countries))));
  });

  it("blocks submit until the name is filled, then creates the customer for the selected company", async () => {
    server.use(on(ep.createCompanyCustomer, ({ body }) => ok({ ...body, id: 1 })));
    const { user } = renderWithRefine(<CustomerForm />, { route: "/my-customers/add", path: "/my-customers/add", companyId: 7 });

    const save = await screen.findByRole("button", { name: tr("buttons.save") });
    await user.click(save);
    expect(await screen.findByText(tr("common.errors.companyNameIsRequired"))).toBeVisible();
    expect(requestsTo(ep.createCompanyCustomer)).toHaveLength(0);

    await user.type(screen.getByLabelText(trLabel("common.fields.companyName")), "Acme");
    // Country is a searchable Base UI combobox; a non-Rwandan country shows city / state.
    await user.type(screen.getByRole("combobox", { name: trLabel("common.fields.country") }), "Germ");
    await user.click(await screen.findByRole("option", { name: "Germany" }));
    await user.type(await screen.findByLabelText(/^City/), "Hamburg");
    await user.type(screen.getByLabelText(/^State/), "Hamburg");
    await user.click(save);

    await waitFor(() => expect(screen.getByTestId("elsewhere")).toBeInTheDocument()); // back to the list
    expect(requestsTo(ep.createCompanyCustomer)[0].body).toMatchObject({
      name: "Acme",
      companyId: 7,
      location: { country: countries.germany, city: "Hamburg", state: "Hamburg" },
    });
  });

  it("pre-fills the edit form with a single GET and saves with the id in the body", async () => {
    server.use(
      on(ep.getCompanyCustomer, ({ params }) => ok(companyCustomer({ id: Number(params.id) }))),
      on(ep.updateCompanyCustomer, ({ body }) => ok(body)),
    );
    const { user } = renderWithRefine(<CustomerForm />, { route: "/my-customers/edit/5", path: "/my-customers/edit/:id" });

    const name = await screen.findByLabelText(trLabel("common.fields.companyName"));
    await waitFor(() => expect(name).toHaveValue("Acme Roasters"));
    expect(screen.getByLabelText(trLabel("customers.fields.contact"))).toHaveValue("Jane Doe");
    expect(requestsTo(ep.getCompanyCustomer)).toHaveLength(1);

    await user.clear(name);
    await user.type(name, "Acme GmbH");
    await user.click(screen.getByRole("button", { name: tr("buttons.save") }));

    await waitFor(() => expect(requestsTo(ep.updateCompanyCustomer)).toHaveLength(1));
    expect(requestsTo(ep.updateCompanyCustomer)[0].body).toMatchObject({ id: 5, name: "Acme GmbH" });
  });
});
