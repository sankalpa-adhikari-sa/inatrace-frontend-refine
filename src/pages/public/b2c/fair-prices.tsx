import { useTranslate } from "@refinedev/core";
import { RichHtml } from "@/components/app/rich-html";
import { useB2c } from "./context";
import { farmGatePrices, producerPrices } from "./fair-prices-math";
import { B2cMain } from "./layout";

const GRAPH_HEIGHT = 220;

export function B2cFairPrices() {
  const translate = useTranslate();
  const { settings: s, qr, field, productName } = useB2c();
  const producerMode = s.graphicPriceToProducer;
  const farmGateMode = s.graphicFarmGatePrice;

  const { world, fair, product } = producerPrices(s, qr);
  const money = (v: number) => (producerMode === "PERCENT_VALUE" ? `${v}%` : `$${v}`);
  const unit = {
    PER_CONTAINER: translate("b2c.fields.perContainer"),
    PER_KG: translate("b2c.fields.perKg"),
    PERCENT_VALUE: translate("b2c.fields.value"),
  }[producerMode as string];

  const farmGate = farmGatePrices(s, qr);
  const incomeTitle = `${translate("b2c.titles.increaseOfFarmersIncomeThrough")} ${productName}`;

  return (
    <B2cMain title={translate("b2c.titles.fairPrices")}>
      {producerMode && producerMode !== "DISABLED" && (
        <>
          <p>
            {translate("b2c.texts.yourCoffeePackageIsPart", { orderId: qr.orderId ?? "", unit })}
          </p>
          <Bars
            bars={[
              {
                label: translate("b2c.fields.worldMarketPriceForArabica"),
                value: money(world),
                height: world,
                color: s.secondaryColor,
              },
              {
                label: translate("b2c.fields.fairtradePrice"),
                value: money(fair),
                height: fair,
                color: s.secondaryColor,
              },
              { label: productName, value: money(product), height: product, color: s.primaryColor },
            ]}
          />
          <RichHtml html={field("comparisonOfPrice.description")} />
        </>
      )}
      {farmGateMode && farmGateMode !== "DISABLED" && (
        <>
          <h2 className="mt-4 text-xl font-semibold">{incomeTitle}</h2>
          <StackedBar
            total={farmGate.total}
            caption={incomeTitle}
            top={{
              label: translate("b2c.fields.pricePaidIfSoldAs", { productName }),
              value: farmGate.increase,
              color: s.primaryColor,
            }}
            base={{
              label: translate("b2c.fields.averagePricePaidIfNot", { productName }),
              value: `$${farmGate.average}`,
            }}
          />
          <RichHtml html={field("settings.incomeIncreaseDescription")} />
        </>
      )}
    </B2cMain>
  );
}

/**
 * Vertical bars with the value above each bar and the label below it. Values are
 * labelled directly (3 bars), so no legend is needed; text stays in text ink.
 */
function Bars({ bars }: { bars: { label: string; value: string; height: number; color?: string }[] }) {
  const max = Math.max(...bars.map((b) => b.height), 1);
  return (
    <figure
      className="flex justify-center gap-6 py-4"
      role="img"
      aria-label={bars.map((b) => `${b.label}: ${b.value}`).join(", ")}
    >
      {bars.map((b) => (
        <div key={b.label} className="flex w-24 flex-col items-center gap-2" title={`${b.label}: ${b.value}`}>
          <div className="flex flex-col items-center justify-end" style={{ height: GRAPH_HEIGHT + 24 }}>
            <span className="mb-1 text-sm font-semibold tabular-nums">{b.value}</span>
            <span
              className="w-12 rounded-t"
              style={{ height: Math.max(2, (b.height / max) * GRAPH_HEIGHT), backgroundColor: b.color ?? "#a3a3a3" }}
            />
          </div>
          <span className="text-center text-xs text-neutral-600">{b.label}</span>
        </div>
      ))}
    </figure>
  );
}

type StackPart = { label: string; value: string; color?: string };


function StackedBar({ total, top, base, caption }: { total: number; top: StackPart; base: StackPart; caption: string }) {
  const scale = GRAPH_HEIGHT / Math.max(Number.isFinite(total) ? total : 0, 100);
  const baseHeight = 100 * scale;
  const topHeight = GRAPH_HEIGHT - baseHeight;
  const part = (p: StackPart, height: number, color: string) => (
    <div className="flex border-t border-neutral-400" style={{ height }}>
      <span className="w-40 pt-1 pr-1 text-[11px]/normal text-neutral-500">{p.label}</span>
      <span
        className="w-24 shrink-0 pt-[10%] text-center text-base/tight font-semibold text-white tabular-nums"
        style={{ backgroundColor: color }}
      >
        {p.value}
      </span>
    </div>
  );
  return (
    <figure
      className="mx-auto my-4 flex w-64 flex-col"
      role="img"
      aria-label={`${top.label}: ${top.value}, ${base.label}: ${base.value}`}
    >
      {topHeight > 0 && part(top, topHeight, top.color ?? "#a3a3a3")}
      {part(base, baseHeight, "#D8D8D8")}
      <figcaption className="px-2 pt-3 text-center text-xs text-neutral-500">{caption}</figcaption>
    </figure>
  );
}
