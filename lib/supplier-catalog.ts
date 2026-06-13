import type { SupplierCatalogResponse, SupplierCategory, SupplierProduct } from "@/lib/types";

const SUPPLIER_BASE_URL = "https://aftecnocenter.com";
const STORE_API_URL = `${SUPPLIER_BASE_URL}/wp-json/wc/store/v1`;
const HIGH_VALUE_THRESHOLD = 10000;
const DEFAULT_MARKUP_RATE = 1.6;
const HIGH_VALUE_MARKUP_RATE = 1.3;
const PRICE_ROUNDING_STEP = 100;
const DEFAULT_PER_PAGE = 24;

type WooPrice = {
  price?: string;
  regular_price?: string;
};

type WooImage = {
  src?: string;
  thumbnail?: string;
  alt?: string;
};

type WooCategory = {
  id: number;
  name: string;
  slug: string;
  count?: number;
};

type WooProduct = {
  id: number;
  name: string;
  slug: string;
  sku?: string;
  permalink: string;
  short_description?: string;
  description?: string;
  prices?: WooPrice;
  images?: WooImage[];
  categories?: WooCategory[];
  is_in_stock?: boolean;
  stock_availability?: {
    text?: string;
    class?: string;
  };
  add_to_cart?: {
    maximum?: number;
    minimum?: number;
  };
};

function stripHtml(value: string | undefined) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getNumberParam(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function getWholesalePrice(product: WooProduct) {
  const rawPrice = product.prices?.price || product.prices?.regular_price || "0";
  const amount = Number(rawPrice);
  return Number.isFinite(amount) ? amount : 0;
}

function getPublicPrice(wholesalePrice: number) {
  const markupRate = wholesalePrice > HIGH_VALUE_THRESHOLD ? HIGH_VALUE_MARKUP_RATE : DEFAULT_MARKUP_RATE;
  const markedPrice = wholesalePrice * markupRate;
  return Math.max(PRICE_ROUNDING_STEP, Math.floor(markedPrice / PRICE_ROUNDING_STEP) * PRICE_ROUNDING_STEP);
}

function mapProduct(product: WooProduct): SupplierProduct {
  const wholesalePrice = getWholesalePrice(product);
  const category = product.categories?.[0] ?? null;
  const image = product.images?.[0]?.src || product.images?.[0]?.thumbnail || "";

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku ?? "",
    permalink: product.permalink,
    category: category?.name ?? "Sin categoria",
    categoryId: category?.id ?? null,
    image,
    description: stripHtml(product.short_description || product.description),
    wholesalePrice,
    publicPrice: getPublicPrice(wholesalePrice),
    isInStock: Boolean(product.is_in_stock),
    stockText: product.stock_availability?.text || (product.is_in_stock ? "Disponible" : "Sin stock"),
    maxQuantity: typeof product.add_to_cart?.maximum === "number" ? product.add_to_cart.maximum : null
  };
}

function mapCategory(category: WooCategory): SupplierCategory {
  return {
    id: category.id,
    name: cleanCategoryName(category.name),
    slug: category.slug,
    count: category.count ?? 0
  };
}

function cleanCategoryName(name: string) {
  const parts = name
    .split(",")
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (!parts.length) {
    return name.replace(/\s+/g, " ").trim();
  }

  const uniqueParts = parts.filter(
    (part, index) => parts.findIndex((candidate) => candidate.toLowerCase() === part.toLowerCase()) === index
  );

  return uniqueParts[0] ?? name.replace(/\s+/g, " ").trim();
}

async function fetchJson<T>(url: URL) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    },
    next: { revalidate: 300 }
  });

  if (!response.ok) {
    throw new Error(`No se pudo leer el catalogo del proveedor (${response.status}).`);
  }

  return {
    data: (await response.json()) as T,
    totalPages: Number(response.headers.get("x-wp-totalpages") ?? 1),
    totalProducts: Number(response.headers.get("x-wp-total") ?? 0)
  };
}

export async function getSupplierCategories() {
  const url = new URL(`${STORE_API_URL}/products/categories`);
  url.searchParams.set("per_page", "100");

  const { data } = await fetchJson<WooCategory[]>(url);
  const categoriesByName = new Map<string, SupplierCategory>();

  for (const category of data
    .map(mapCategory)
    .filter((category) => category.count > 0)) {
    const key = category.name.toLowerCase();
    const existing = categoriesByName.get(key);
    if (!existing || category.count > existing.count) {
      categoriesByName.set(key, category);
    }
  }

  return Array.from(categoriesByName.values())
    .sort((left, right) => left.name.localeCompare(right.name, "es"));
}

export async function getSupplierCatalog(searchParams?: URLSearchParams): Promise<SupplierCatalogResponse> {
  const query = String(searchParams?.get("q") ?? "").trim();
  const category = String(searchParams?.get("category") ?? "").trim();
  const page = getNumberParam(searchParams?.get("page") ?? null, 1, 1, 500);
  const perPage = getNumberParam(searchParams?.get("per_page") ?? null, DEFAULT_PER_PAGE, 6, 48);

  const productUrl = new URL(`${STORE_API_URL}/products`);
  productUrl.searchParams.set("page", String(page));
  productUrl.searchParams.set("per_page", String(perPage));
  productUrl.searchParams.set("orderby", "date");
  productUrl.searchParams.set("order", "desc");

  if (query) {
    productUrl.searchParams.set("search", query);
  }

  if (category) {
    productUrl.searchParams.set("category", category);
  }

  const [productsResult, categories] = await Promise.all([
    fetchJson<WooProduct[]>(productUrl),
    getSupplierCategories()
  ]);

  return {
    products: productsResult.data.map(mapProduct).filter((product) => product.wholesalePrice > 0),
    categories,
    page,
    totalPages: Math.max(1, productsResult.totalPages || 1),
    totalProducts: productsResult.totalProducts || 0,
    query,
    category,
    updatedAt: new Date().toISOString()
  };
}
