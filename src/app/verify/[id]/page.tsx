import { VerifyPanel } from "@/components/verify/VerifyPanel";

export const metadata = {
  title: "Verify a message — Quill",
};

export default async function VerifyIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VerifyPanel id={id} />;
}
