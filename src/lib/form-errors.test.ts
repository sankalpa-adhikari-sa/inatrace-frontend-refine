import { afterEach, describe, expect, it, vi } from "vitest";
import { countErrors, revealFirstError } from "./form-errors";

describe("countErrors", () => {
  it("counts leaf errors in nested objects and field arrays, without descending into refs", () => {
    const ref = { type: "not-an-error", nested: { type: "also-not" } };
    expect(
      countErrors({
        name: { type: "required", message: "x", ref },
        headquarters: { city: { type: "required" }, country: { type: "required" } },
        certifications: [undefined, { type: { type: "required" } }],
      } as never)
    ).toBe(4);
    expect(countErrors({})).toBe(0);
    expect(countErrors(undefined)).toBe(0);
  });
});

describe("revealFirstError", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("focuses the first invalid field in page order, even inside a field wrapper", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    document.body.innerHTML = `
      <div data-invalid="false"><input id="ok" /></div>
      <div data-invalid="true"><label>Country</label><button id="country">Pick</button></div>
      <div data-invalid="true"><input id="later" /></div>`;
    expect(revealFirstError()).toBe(true);
    expect(document.activeElement?.id).toBe("country");
  });

  it("activates the tab whose hidden panel holds the error", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    document.body.innerHTML = `
      <button id="tab-de" role="tab">DE</button>
      <div role="tabpanel" aria-labelledby="tab-de" hidden><input id="name-de" aria-invalid="true" /></div>`;
    const panel = document.querySelector<HTMLElement>('[role="tabpanel"]')!;
    document.getElementById("tab-de")!.addEventListener("click", () => (panel.hidden = false));

    expect(revealFirstError()).toBe(true);
    expect(panel.hidden).toBe(false);
    expect(document.activeElement?.id).toBe("name-de");
  });

  it("does nothing when the form is valid", () => {
    document.body.innerHTML = `<input />`;
    expect(revealFirstError()).toBe(false);
  });
});
