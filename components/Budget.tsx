"use client";

import { motion } from "framer-motion";
import type { BudgetItem } from "@/lib/schema";
import { formatCurrency } from "@/lib/utils";

export default function Budget({ items }: { items: BudgetItem[] }) {
  if (!items.length) return null;

  const total = items.reduce((sum, i) => sum + i.amount, 0);
  const currency = items[0]?.currency ?? "EUR";

  const byCategory = new Map<string, number>();
  for (const i of items) {
    byCategory.set(i.category, (byCategory.get(i.category) ?? 0) + i.amount);
  }
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);

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
          <p className="eyebrow mb-2">Total estimado</p>
          <p className="font-display text-5xl tracking-tightest">
            {formatCurrency(total, currency)}
          </p>
          <div className="mt-8 space-y-3">
            {categories.map(([cat, amt]) => {
              const pct = total > 0 ? (amt / total) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span>{cat}</span>
                    <span className="font-mono text-[var(--fg-muted)]">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--line)]">
                    <motion.div
                      className="h-full bg-[var(--accent)]"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              );
            })}
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
                    {formatCurrency(item.amount, item.currency)}
                  </td>
                </motion.tr>
              ))}
              <tr className="border-t-2 border-[var(--fg)]">
                <td colSpan={2} className="py-4 font-display text-lg">
                  Total
                </td>
                <td className="py-4 text-right font-display text-2xl">
                  {formatCurrency(total, currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
