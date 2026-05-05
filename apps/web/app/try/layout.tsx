import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Try VoidCard — interactive profile preview",
  description:
    "Build a live VoidCard profile in your browser. No signup required — see how your digital business card will look on every device.",
  path: "/try",
});

export default function TryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
