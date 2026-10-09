import Link from "next/link";
import { notFound } from "next/navigation";
import { ShowcaseProfile, showcaseCover } from "@/components/showcase/ShowcaseProfile";
import { SHOWCASE_TEMPLATES } from "@/lib/editor/showcaseTemplates";
import { buildMetadata } from "@/lib/seo";

type Params = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return SHOWCASE_TEMPLATES.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  const template = SHOWCASE_TEMPLATES.find((t) => t.id === id);
  if (!template) return {};
  return buildMetadata({ title: `${template.name} — example page`, description: template.description, path: `/examples/${template.id}` });
}

export default async function ExamplePage({ params }: Params) {
  const { id } = await params;
  const template = SHOWCASE_TEMPLATES.find((t) => t.id === id);
  if (!template) notFound();
  const { accent } = showcaseCover(template);

  return (
    <>
      <ShowcaseProfile template={template} handle={template.id} />
      <nav
        aria-label="Example page"
        className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-40 mx-auto flex max-w-xl items-center gap-2 rounded-full border border-white/15 bg-black/70 p-1.5 pl-4 text-white shadow-2xl backdrop-blur-xl"
        data-testid="example-bar"
      >
        <Link href="/examples" className="shrink-0 text-sm text-white/70 transition hover:text-white">← Examples</Link>
        <span className="min-w-0 flex-1 truncate text-center text-sm font-medium">{template.name}</span>
        <Link
          href={`/edit?template=${template.id}`}
          className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
          style={{ background: accent }}
        >
          Use this design
        </Link>
      </nav>
    </>
  );
}
