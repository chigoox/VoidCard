import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import TryClient from "./TryClient";

export default function TryPage() {
  return (
    <main className="home-theme min-h-screen bg-onyx-grad">
      <SiteHeader />
      <TryClient />
      <SiteFooter />
    </main>
  );
}
