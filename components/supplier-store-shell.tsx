"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Bike,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X
} from "lucide-react";
import type { SupplierCatalogResponse, SupplierProduct } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type CartLine = {
  product: SupplierProduct;
  quantity: number;
};

const SERVICELL_WHATSAPP_NUMBER = "5493804717316";

function clampQuantity(value: number, maxQuantity: number | null) {
  const max = maxQuantity && maxQuantity > 0 ? maxQuantity : 99;
  return Math.max(1, Math.min(max, value));
}

function getBeforePrice(publicPrice: number) {
  return Math.ceil((publicPrice * 1.6) / 100) * 100;
}

function buildWhatsAppText(cart: CartLine[], name: string, delivery: string) {
  const lines = cart.map((item) => {
    const subtotal = item.product.publicPrice * item.quantity;
    return `- ${item.quantity} x ${item.product.name} (${formatCurrency(item.product.publicPrice)}) = ${formatCurrency(subtotal)}`;
  });
  const total = cart.reduce((sum, item) => sum + item.product.publicPrice * item.quantity, 0);

  return [
    "Hola Servicell, quiero pedir estos productos:",
    ...lines,
    `Total estimado: ${formatCurrency(total)}`,
    name ? `Cliente: ${name}` : "",
    delivery ? `Entrega: ${delivery}` : "",
    "Confirmame disponibilidad y horario."
  ]
    .filter(Boolean)
    .join("\n");
}

export function SupplierStoreShell({ initialCatalog }: { initialCatalog: SupplierCatalogResponse }) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [query, setQuery] = useState(initialCatalog.query);
  const deferredQuery = useDeferredValue(query);
  const [category, setCategory] = useState(initialCatalog.category);
  const [page, setPage] = useState(initialCatalog.page);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [delivery, setDelivery] = useState("Retiro por local");
  const [previewProduct, setPreviewProduct] = useState<SupplierProduct | null>(null);

  useEffect(() => {
    setPage(1);
  }, [deferredQuery, category]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const params = new URLSearchParams({
      q: deferredQuery,
      category,
      page: String(page),
      per_page: "24"
    });

    async function loadCatalog() {
      setLoading(true);
      try {
        const response = await fetch(`/api/tienda-proveedor?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store"
        });
        if (!response.ok) {
          throw new Error("No se pudo cargar el catalogo.");
        }
        const nextCatalog = (await response.json()) as SupplierCatalogResponse;
        if (!cancelled) {
          setCatalog(nextCatalog);
        }
      } catch {
        if (!cancelled) {
          setCatalog((current) => ({ ...current, products: [] }));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCatalog();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [category, deferredQuery, page]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.publicPrice * item.quantity, 0),
    [cart]
  );
  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const whatsappUrl = `https://wa.me/${SERVICELL_WHATSAPP_NUMBER}?text=${encodeURIComponent(
    buildWhatsAppText(cart, customerName, delivery)
  )}`;

  function addToCart(product: SupplierProduct) {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: clampQuantity(item.quantity + 1, product.maxQuantity) }
            : item
        );
      }
      return [...current, { product, quantity: 1 }];
    });
  }

  function updateQuantity(productId: number, quantity: number) {
    setCart((current) =>
      current.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: clampQuantity(quantity, item.product.maxQuantity) }
          : item
      )
    );
  }

  function removeFromCart(productId: number) {
    setCart((current) => current.filter((item) => item.product.id !== productId));
  }

  return (
    <main className="store-page">
      <header className="store-topbar">
        <a className="store-brand" href="/inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Servicell"
            src="https://res.cloudinary.com/dqsacd9ez/image/upload/v1775083849/logo_1_cd2ojk.png"
          />
        </a>
        <a className="store-topbar-link" href="#pedido">
          <ShoppingBag size={18} />
          Pedido
          <span>{itemCount}</span>
        </a>
      </header>

      <section className="store-hero">
        <div className="store-hero-copy">
          <span className="store-eyebrow">Catalogo Servicell</span>
          <h1>Tienda mayorista Servicell.</h1>
          <p>
            Elegi productos disponibles, armamos el pedido y coordinamos retiro por local o envio a domicilio.
          </p>
          <div className="store-hero-metrics">
            <span>
              <Clock size={18} />
              Entrega aprox. 1 hora
            </span>
            <span>
              <Bike size={18} />
              Envio a domicilio
            </span>
            <span>
              <PackageCheck size={18} />
              Stock del proveedor
            </span>
          </div>
          <div className="store-minimum-note">
            Precio promo disponible en pedidos desde 3 productos combinados.
          </div>
        </div>
        <div className="store-hero-panel">
          <strong>{catalog.totalProducts}</strong>
          <span>productos disponibles para consultar</span>
          <small>Consulta disponibilidad y coordinamos tu entrega.</small>
        </div>
      </section>

      <section className="store-layout">
        <div className="store-catalog">
          <div className="store-filters">
            <label className="store-search">
              <Search size={18} />
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar parlantes, cargadores, fundas..."
                value={query}
              />
            </label>
            <select
              aria-label="Categoria"
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            >
              <option value="">Todas las categorias</option>
              {catalog.categories.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="store-result-head">
            <div>
              <strong>{loading ? "Actualizando catalogo..." : "Productos"}</strong>
              <span>
                Pagina {catalog.page} de {catalog.totalPages}
              </span>
            </div>
            <span>Actualizado en vivo desde proveedor</span>
          </div>

          {catalog.products.length ? (
            <div className="store-grid">
              {catalog.products.map((product) => (
                <article className="store-product" key={product.id}>
                  <div className="store-product-image">
                    <button
                      className="store-image-button"
                      onClick={() => setPreviewProduct(product)}
                      title="Ver imagen grande"
                      type="button"
                    >
                      {product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt={product.name} src={product.image} />
                      ) : (
                        <ShoppingBag size={38} />
                      )}
                    </button>
                    <span className={product.isInStock ? "store-stock in" : "store-stock out"}>
                      {product.stockText}
                    </span>
                  </div>
                  <div className="store-product-body">
                    <span className="store-category">{product.category}</span>
                    <div className="store-product-copy">
                      <h2>{product.name}</h2>
                      <p>{product.description || "Producto disponible para pedido en Servicell."}</p>
                    </div>
                    <div className="store-price-row">
                      <div>
                        <span className="store-before-price">Antes {formatCurrency(getBeforePrice(product.publicPrice))}</span>
                        <strong>
                          <span aria-hidden="true">🔥</span> Hoy {formatCurrency(product.publicPrice)}
                        </strong>
                      </div>
                    </div>
                    <div className="store-product-actions">
                      <button
                        className="button"
                        disabled={!product.isInStock}
                        onClick={() => addToCart(product)}
                        type="button"
                      >
                        <Plus size={16} />
                        Agregar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="store-empty">
              <ShoppingBag size={34} />
              <strong>No encontre productos con esos filtros.</strong>
              <span>Proba con otra busqueda o cambia la categoria.</span>
            </div>
          )}

          <div className="store-pagination">
            <button
              className="button secondary"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              <ChevronLeft size={17} />
              Anterior
            </button>
            <span>
              {catalog.page} / {catalog.totalPages}
            </span>
            <button
              className="button secondary"
              disabled={page >= catalog.totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Siguiente
              <ChevronRight size={17} />
            </button>
          </div>
        </div>

        <aside className="store-cart" id="pedido">
          <div className="store-cart-head">
            <div>
              <span>Pedido</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
            <ShoppingBag size={24} />
          </div>

          <div className="store-cart-lines">
            {cart.length ? (
              cart.map((item) => (
                <div className="store-cart-line" key={item.product.id}>
                  <div>
                    <strong>{item.product.name}</strong>
                    <span>{formatCurrency(item.product.publicPrice)} c/u</span>
                  </div>
                  <div className="store-qty">
                    <button
                      aria-label="Restar"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      type="button"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      aria-label="Cantidad"
                      min={1}
                      onChange={(event) => updateQuantity(item.product.id, Number(event.target.value))}
                      type="number"
                      value={item.quantity}
                    />
                    <button
                      aria-label="Sumar"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      type="button"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      aria-label="Quitar"
                      className="store-remove"
                      onClick={() => removeFromCart(item.product.id)}
                      type="button"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="store-cart-empty">
                <ShoppingBag size={30} />
                <span>Agrega productos para armar el pedido.</span>
              </div>
            )}
          </div>

          <label className="field">
            <span>Nombre del cliente</span>
            <input onChange={(event) => setCustomerName(event.target.value)} value={customerName} />
          </label>
          <label className="field">
            <span>Entrega</span>
            <select onChange={(event) => setDelivery(event.target.value)} value={delivery}>
              <option>Retiro por local</option>
              <option>Envio a domicilio</option>
            </select>
          </label>

          <a className={`button store-checkout ${cart.length ? "" : "is-disabled"}`} href={whatsappUrl}>
            <Check size={18} />
            Confirmar por WhatsApp
          </a>
          <p className="store-cart-note">
            Este pedido no modifica el stock real de Servicell. Primero se confirma disponibilidad.
          </p>
        </aside>
      </section>

      {previewProduct ? (
        <div className="store-lightbox" onClick={() => setPreviewProduct(null)}>
          <div className="store-lightbox-panel" onClick={(event) => event.stopPropagation()}>
            <button
              aria-label="Cerrar imagen"
              className="store-lightbox-close"
              onClick={() => setPreviewProduct(null)}
              type="button"
            >
              <X size={20} />
            </button>
            <div className="store-lightbox-image">
              {previewProduct.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={previewProduct.name} src={previewProduct.image} />
              ) : (
                <ShoppingBag size={48} />
              )}
            </div>
            <div className="store-lightbox-copy">
              <span className="store-category">{previewProduct.category}</span>
              <h2>{previewProduct.name}</h2>
              <p>{previewProduct.description || "Producto disponible para pedido en Servicell."}</p>
              <div className="store-lightbox-price">
                <span>Antes {formatCurrency(getBeforePrice(previewProduct.publicPrice))}</span>
                <strong>
                  <span aria-hidden="true">🔥</span> Hoy {formatCurrency(previewProduct.publicPrice)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
