"use client";

import { motion } from "framer-motion";
import type { BudgetItem } from "@/lib/schema";
import { formatCurrency } from "@/lib/utils";

type CurrencyGroup = {
  currency: string;
  total: number;
  categoryMagnitude: number;
  categories: Array<[string, number]>;
};

function normalizeCurrency(currency: string | null | undefined): string {
  return currency?.trim().toUpperCase() || "EUR";
}

export default function Budget({ items }: { items: BudgetItem[] }) {
  if (!items.length) return null;

  const grouped = new Map<
    string,
    { total: number; byCategory: Map<string, number> }
  >();

  for (const item of items) {
    const currency = normalizeCurrency(item.currency);
    const amount = Number.isFinite(item.amount) ? item.amount : 0;
    const current = grouped.get(currency) ?? {
      total: 0,
      byCategory: new Map<string, number>(),
    };
    current.total += amount;
    current.byCategory.set(
      item.category,
      (current.byCategory.get(item.category) ?? 0) + amount
    );
    grouped.set(currency, current);
  }

  const currencyGroups: CurrencyGroup[] = [...grouped.entries()]
    .map(([currency, group]) => {
      const categories = [...group.byCategory.entries()].sort(
        (a, b) => Math.abs(b[1]) - Math.abs(a[1])
      );
      return {
        currency,
        total: group.total,
        categoryMagnitude: categories.reduce(
          (sum, [, amount]) => sum + Math.abs(amount),
          0
        ),
        categories,
      };
    })
    .sort(
      (a, b) =>
        Math.abs(b.total) - Math.abs(a.total) ||
        a.currency.localeCompare(b.currency)
    );

  const hasMultipleCurrencies = currencyGroups.length > 1;

  return (
    <section className="container-editorial py-16 md:py-24">
      <div className="flex items-baseline justify-between gap-4 pb-6">
        <h2 className="display-md tracking-tightest">Presupuesto</h2>
        <span className="section-number">02</span>
      </div>
      <div className="rule mb-12" />

      <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="md:col-span-4"
        >
          <p className="eyebrow mb-2">
            {hasMultipleCurrencies ? "Totales por moneda" : "Total estimado"}
          </p>
          <div className="space-y-1">
            {currencyGroups.map((group) => (
              <p
                key={group.currency}
                className="font-display text-4xl tracking-tightest sm:text-5xl"
              >
                {formatCurrency(group.total, group.currency)}
              </p>
            ))}
          </div>
          <div className="mt-8 space-y-6">
            {currencyGroups.map((group) => (
              <div key={group.currency} className="space-y-3">
                {hasMultipleCurrencies && (
                  <p className="font-mono text-[11px] uppercase tracking-widest2 text-[var(--fg-muted)]">
                    Distribución en {group.currency}
                  </p>
                )}
                {group.categories.map(([category, amount]) => {
                  const percentage =
                    group.categoryMagnitude > 0
                      ? Math.min(
                          100,
                          (Math.abs(amount) / group.categoryMagnitude) * 100
                        )
                      : 0;
                  return (
                    <div key={`${group.currency}-${category}`}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span>{category}</span>
                        <span className="font-mono text-[var(--fg-muted)]">
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--line)]">
                        <motion.div
                          className="h-full bg-[var(--accent)]"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${percentage}%` }}
                          viewport={{ once: true }}
                          transition={{
                            duration: 0.8,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </motion.div>

        <div className="md:col-span-8 overflow-x-auto">
          <table className="w-full min-w-[460px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th className="pb-3 text-left font-mono text-xs uppercase tracking-widest2 text-[var(--fg-muted)]">
                  Categoría
                </th>
                <th className="pb-3 text-left font-mono text-xs uppercase tracking-widest2 text-[var(--fg-muted)]">
                  Detalle
                </th>
                <th className="pb-3 text-right font-mono text-xs uppercase tracking-widest2 text-[var(--fg-muted)]">
                  Importe
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.03 }}
                  className="border-b border-[var(--line)] last:border-b-0"
                >
                  <td className="py-4 align-top">
                    <span className="rounded-full bg-[var(--bg-alt)] px-3 py-1 text-xs">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-4 pl-2 align-top text-sm text-[var(--fg-muted)]">
                    {item.description || "—"}
                  </td>
                  <td className="py-4 pl-2 text-right align-top font-mono text-sm">
                    {formatCurrency(
                      Number.isFinite(item.amount) ? item.amount : 0,
                      normalizeCurrency(item.currency)
                    )}
                  </td>
                </motion.tr>
              ))}
              {currencyGroups.map((group, index) => (
                <tr
                  key={group.currency}
                  className={index === 0 ? "border-t-2 border-[var(--fg)]" : ""}
                >
                  <td colSpan={2} className="py-3 font-display text-lg">
                    {hasMultipleCurrencies
                      ? `Total ${group.currency}`
                      : "Total"}
                  </td>
                  <td className="py-3 text-right font-display text-2xl">
                    {formatCurrency(group.total, group.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
