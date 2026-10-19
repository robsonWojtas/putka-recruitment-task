import { useEffect, useState } from "react";
import { fetchJson, type ProductionPlan as ProductionPlanData } from "./api";

type ProductionPlanProps = {
  date: string;
  refreshVersion: number;
};

export default function ProductionPlan({
  date,
  refreshVersion,
}: ProductionPlanProps) {
  const [plan, setPlan] = useState<ProductionPlanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) {
      setPlan(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchJson<ProductionPlanData>(
      `/production-plan?date=${encodeURIComponent(date)}`,
      { signal: controller.signal },
    )
      .then(setPlan)
      .catch((requestError: Error) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [date, refreshVersion]);

  return (
    <section className="panel" aria-labelledby="plan-heading">
      <div className="section-heading">
        <div>
          <h2 id="plan-heading">Plan produkcji</h2>
          <p className="section-description">Suma zamówień wszystkich sklepów.</p>
        </div>
        {date && <span className="date-badge">{date}</span>}
      </div>

      {loading && <p className="status">Ładowanie planu…</p>}
      {error && (
        <p className="error" role="alert">
          Nie udało się pobrać planu: {error}
        </p>
      )}
      {!loading && !error && plan?.categories.length === 0 && (
        <p className="status">Brak produktów w planie.</p>
      )}
      {!loading && !error && plan && plan.categories.length > 0 && (
        <div className="table-scroll">
          <table className="production-table">
            <thead>
              <tr>
                <th>Produkt</th>
                <th className="num">Ilość</th>
              </tr>
            </thead>
            {plan.categories.map((category) => (
              <tbody key={category.category}>
                <tr className="category-row">
                  <th colSpan={2} scope="rowgroup">
                    {category.category}
                  </th>
                </tr>
                {category.products.map((product) => (
                  <tr key={product.product_id}>
                    <td>{product.name}</td>
                    <td className="num quantity">{product.quantity}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </section>
  );
}
