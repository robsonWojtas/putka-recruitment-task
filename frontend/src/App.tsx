import { useState } from "react";
import OrderForm from "./OrderForm";
import ProductList from "./ProductList";
import ProductionPlan from "./ProductionPlan";

function tomorrowInWarsaw(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const tomorrow = new Date(
    Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day) + 1,
    ),
  );
  return tomorrow.toISOString().slice(0, 10);
}

export default function App() {
  const [selectedDate, setSelectedDate] = useState(tomorrowInWarsaw);
  const [planRefreshVersion, setPlanRefreshVersion] = useState(0);

  return (
    <main>
      <header>
        <h1>Putka</h1>
        <p className="subtitle">Plan produkcji</p>
      </header>

      <section className="panel date-panel" aria-labelledby="date-heading">
        <div>
          <h2 id="date-heading">Data dostawy</h2>
          <p className="section-description">
            Wybrana data jest wspólna dla zamówienia i planu produkcji.
          </p>
        </div>
        <label className="date-control">
          <span>Data</span>
          <input
            type="date"
            value={selectedDate}
            min={tomorrowInWarsaw()}
            onChange={(event) => setSelectedDate(event.target.value)}
            required
          />
        </label>
      </section>

      <OrderForm
        deliveryDate={selectedDate}
        onOrderCreated={() => setPlanRefreshVersion((version) => version + 1)}
      />

      <ProductionPlan
        date={selectedDate}
        refreshVersion={planRefreshVersion}
      />

      <section className="panel" aria-labelledby="products-heading">
        <h2 id="products-heading">Aktywne produkty</h2>
        <p className="section-description">
          Katalog produktów dostępnych obecnie do zamówienia.
        </p>
        <ProductList />
      </section>
    </main>
  );
}
