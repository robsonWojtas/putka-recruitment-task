export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type Product = {
  id: number;
  name: string;
  category: string;
  unit_price: string;
};

export type Store = {
  id: number;
  name: string;
  address: string;
};

export type Order = {
  id: number;
  store_id: number;
  delivery_date: string;
  created_at: string;
  items: Array<{
    id: number;
    product_id: number;
    quantity: number;
    unit_price: string;
  }>;
};

export type ProductionPlan = {
  date: string;
  categories: Array<{
    category: string;
    products: Array<{
      product_id: number;
      name: string;
      quantity: number;
    }>;
  }>;
};

type ApiErrorBody = {
  detail?: string | Array<{ msg?: string }>;
};

async function errorMessage(response: Response): Promise<string> {
  const fallback = `HTTP ${response.status}`;

  try {
    const body = (await response.json()) as ApiErrorBody;
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail) && body.detail[0]?.msg) {
      return body.detail[0].msg;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }
  return response.json() as Promise<T>;
}
