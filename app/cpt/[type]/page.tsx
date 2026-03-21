// app/cpt/[type]/page.tsx
// Preusmeri na admin dashboard z ustreznim pogledom
import { redirect } from "next/navigation";
import { CPT_CONFIGS } from "@/types/wordpress";

interface Props {
  params: Promise<{ type: string }>;
}

export async function generateStaticParams() {
  return CPT_CONFIGS.map((cpt) => ({ type: cpt.slug }));
}

export default async function CPTListPage({ params }: Props) {
  const { type } = await params;
  redirect(`/admin?view=${type}`);
}
