"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CartLine = {
  kind: "workflow" | "bundle";
  key: string;
  name: string;
  price: number;
  mrp: number;
};

type CartContextValue = {
  items: CartLine[];
  add: (line: CartLine) => void;
  remove: (kind: CartLine["kind"], key: string) => void;
  clear: () => void;
  has: (kind: CartLine["kind"], key: string) => boolean;
  count: number;
  totalPrice: number;
  totalMrp: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

const KEY = "wc:cart";
const MAX_LINES = 100;

function readCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as CartLine[]) : [];
    return Array.isArray(list) ? list.slice(0, MAX_LINES) : [];
  } catch {
    return [];
  }
}

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Deferred so the client-only localStorage read never runs during hydration.
    const t = setTimeout(() => {
      setItems(readCart());
      setLoaded(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* private mode / storage full */
    }
  }, [items, loaded]);

  const add = useCallback((line: CartLine) => {
    setItems((prev) => {
      if (prev.some((l) => l.kind === line.kind && l.key === line.key)) return prev;
      return [...prev, line].slice(0, MAX_LINES);
    });
  }, []);

  const remove = useCallback((kind: CartLine["kind"], key: string) => {
    setItems((prev) => prev.filter((l) => !(l.kind === kind && l.key === key)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const has = useCallback(
    (kind: CartLine["kind"], key: string) =>
      items.some((l) => l.kind === kind && l.key === key),
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      add,
      remove,
      clear,
      has,
      count: items.length,
      totalPrice: items.reduce((s, l) => s + l.price, 0),
      totalMrp: items.reduce((s, l) => s + (l.mrp > l.price ? l.mrp : l.price), 0),
    }),
    [items, add, remove, clear, has]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
