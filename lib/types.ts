export type SessionUser = {
  username: string;
  role: string;
};

export type CartItem = {
  id: number | null;
  nombre: string;
  precio: number;
  cantidad: number;
  sourceType?: "producto" | "manual" | "equipo";
  sourceId?: number | null;
};

export type ProductoListItem = {
  id: number;
  nombre: string;
  codigo_barras: string;
  stock: number;
  precio: string;
  precio_costo: string;
};

export type RepairOrderListItem = {
  id: number;
  nro_orden: string;
  nombre_cliente: string;
  marca: string;
  modelo: string;
  tipo_reparacion: string;
  estado: string;
  fecha: string;
  monto: string;
};

export type SparePartPriceItem = {
  id: string;
  categoria: string;
  marca: string;
  modelo: string;
  precio: number;
  descripcion: string;
};

export type SupplierCategory = {
  id: number;
  name: string;
  slug: string;
  count: number;
};

export type SupplierProduct = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  permalink: string;
  category: string;
  categoryId: number | null;
  image: string;
  description: string;
  wholesalePrice: number;
  publicPrice: number;
  isInStock: boolean;
  stockText: string;
  maxQuantity: number | null;
};

export type SupplierCatalogResponse = {
  products: SupplierProduct[];
  categories: SupplierCategory[];
  page: number;
  totalPages: number;
  totalProducts: number;
  query: string;
  category: string;
  updatedAt: string;
};

export type DateRange = {
  fechaDesde: string;
  fechaHasta: string;
};

export type SaleReceipt = {
  fecha: string;
  dniCliente: string;
  total: number;
  items: Array<{
    nombre: string;
    cantidad: number;
    precio: number;
    total: number;
  }>;
  pagos: Array<{
    tipo: string;
    monto: number;
  }>;
};
