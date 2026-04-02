import { RepairQuoteCalculator } from "@/components/repair-quote-calculator";
import { getPublicSparePartOptions } from "@/lib/public-price-list";

export default async function CotizarPage() {
  const spareParts = await getPublicSparePartOptions();

  return <RepairQuoteCalculator spareParts={spareParts} />;
}
