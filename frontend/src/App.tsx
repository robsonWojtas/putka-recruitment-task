import { useState } from "react";
import OrderForm from "./OrderForm";
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
  const [minimumDeliveryDate] = useState(tomorrowInWarsaw);
  const [deliveryDate, setDeliveryDate] = useState(minimumDeliveryDate);
  const [planDate, setPlanDate] = useState(minimumDeliveryDate);
  const [planRefreshVersion, setPlanRefreshVersion] = useState(0);

  function handleOrderCreated() {
    if (deliveryDate === planDate) {
      setPlanRefreshVersion((version) => version + 1);
    }
  }

  return (
    <main>
      <header>
        <h1>Putka</h1>
        <p className="subtitle">Plan produkcji</p>
      </header>

      <OrderForm
        deliveryDate={deliveryDate}
        minimumDeliveryDate={minimumDeliveryDate}
        onDeliveryDateChange={setDeliveryDate}
        onOrderCreated={handleOrderCreated}
      />

      <ProductionPlan
        date={planDate}
        onDateChange={setPlanDate}
        refreshVersion={planRefreshVersion}
      />
    </main>
  );
}
