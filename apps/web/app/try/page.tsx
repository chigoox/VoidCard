import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import TryClient from "./TryClient";

export default function TryPage() {
  return (
    <main className="min-h-screen bg-paper-50 text-ink">
      <SiteHeader />
      <TryClient />
      <SiteFooter />
    </main>
  );
}
