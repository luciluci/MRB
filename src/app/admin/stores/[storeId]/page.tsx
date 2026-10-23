import { notFound } from "next/navigation";
import StoreDetails from "@/components/StoreDetails";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";
export default async function StorePage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const state = await readState();
  if (!state.stores.some(store => store.id === storeId)) notFound();
  return <StoreDetails key={storeId} initialState={state} storeId={storeId} />;
}
