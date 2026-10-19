import { type FormEvent, useEffect, useState } from "react";
import { fetchJson, type Order, type Product, type Store } from "./api";

type OrderFormProps = {
  deliveryDate: string;
  minimumDeliveryDate: string;
  onDeliveryDateChange: (date: string) => void;
  onOrderCreated: () => void;
};

export default function OrderForm({
  deliveryDate,
  minimumDeliveryDate,
  onDeliveryDateChange,
  onOrderCreated,
}: OrderFormProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetchJson<Store[]>("/stores", { signal: controller.signal }),
      fetchJson<Product[]>("/products", { signal: controller.signal }),
    ])
      .then(([storeData, productData]) => {
        setStores(storeData);
        setProducts(productData);
      })
      .catch((requestError: Error) => {
        if (requestError.name !== "AbortError") setLoadError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    setSubmitError(null);
    setSuccess(null);
  }, [deliveryDate]);

  function updateQuantity(productId: number, value: string) {
    setQuantities((current) => ({ ...current, [productId]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSuccess(null);

    if (!selectedStoreId) {
      setSubmitError("Wybierz sklep.");
      return;
    }
    if (!deliveryDate) {
      setSubmitError("Wybierz datę dostawy.");
      return;
    }

    const items: Array<{ product_id: number; quantity: number }> = [];
    for (const product of products) {
      const rawQuantity = quantities[product.id]?.trim();
      if (!rawQuantity) continue;

      const quantity = Number(rawQuantity);
      if (!Number.isInteger(quantity) || quantity < 0) {
        setSubmitError("Ilości muszą być nieujemnymi liczbami całkowitymi.");
        return;
      }
      if (quantity > 0) items.push({ product_id: product.id, quantity });
    }

    if (items.length === 0) {
      setSubmitError("Podaj ilość dla co najmniej jednego produktu.");
      return;
    }

    setSubmitting(true);
    try {
      const order = await fetchJson<Order>("/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: Number(selectedStoreId),
          delivery_date: deliveryDate,
          items,
        }),
      });
      setQuantities({});
      setSuccess(`Zamówienie nr ${order.id} zostało zapisane.`);
      onOrderCreated();
    } catch (requestError) {
      setSubmitError(
        requestError instanceof Error
          ? requestError.message
          : "Nie udało się zapisać zamówienia.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="order-heading">
      <h2 id="order-heading">Nowe zamówienie</h2>
      <p className="section-description">
        Wybierz sklep i wpisz ilości aktywnych produktów na {deliveryDate || "wybraną datę"}.
      </p>

      {loading && <p className="status">Ładowanie formularza…</p>}
      {loadError && (
        <p className="error" role="alert">
          Nie udało się pobrać danych formularza: {loadError}
        </p>
      )}
      {!loading && !loadError && (
        <form onSubmit={handleSubmit}>
          <div className="form-fields">
            <label className="field">
              <span>Sklep</span>
              <select
                value={selectedStoreId}
                onChange={(event) => setSelectedStoreId(event.target.value)}
                required
              >
                <option value="">Wybierz sklep</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name} — {store.address}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Data dostawy</span>
              <input
                type="date"
                value={deliveryDate}
                min={minimumDeliveryDate}
                onChange={(event) => onDeliveryDateChange(event.target.value)}
                required
              />
            </label>
          </div>

          <div className="table-scroll">
            <table className="order-table">
              <thead>
                <tr>
                  <th>Produkt</th>
                  <th>Kategoria</th>
                  <th className="num">Cena</th>
                  <th className="num">Ilość</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.category}</td>
                    <td className="num">{Number(product.unit_price).toFixed(2)} zł</td>
                    <td className="num">
                      <input
                        className="quantity-input"
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        aria-label={`Ilość: ${product.name}`}
                        value={quantities[product.id] ?? ""}
                        onChange={(event) =>
                          updateQuantity(product.id, event.target.value)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {submitError && (
            <p className="error" role="alert">
              {submitError}
            </p>
          )}
          {success && (
            <p className="success" role="status">
              {success}
            </p>
          )}

          <button type="submit" disabled={submitting || !deliveryDate}>
            {submitting ? "Zapisywanie…" : "Złóż zamówienie"}
          </button>
        </form>
      )}
    </section>
  );
}
