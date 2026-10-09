import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AmbientVideo } from "@/components/sections/AmbientVideo";
import { showcaseCover } from "@/components/showcase/ShowcaseProfile";
import { SHOWCASE_TEMPLATES } from "@/lib/editor/showcaseTemplates";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Example pages",
  description: "Fully designed VoidCard pages for boutiques, salons, artists, studios and more. Open one live, then make it yours in a click.",
  path: "/examples",
});

export default function ExamplesPage() {
  const cards = SHOWCASE_TEMPLATES.map((template) => ({ template, ...showcaseCover(template) }));

  return (
    <main className="min-h-screen bg-white text-ink">
      <SiteHeader />

      <section className="mx-auto max-w-4xl px-6 pb-12 pt-20 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-ink-700">Examples</p>
        <h1 className="mt-3 font-display text-5xl tracking-tight md:text-6xl">Pages people remember.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-500">
          Every page below was built in the VoidCard editor, with video banners, motion and custom layouts for phone, tablet and desktop.
          Open one live, then use it as your starting point.
        </p>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-20 sm:px-6 md:grid-cols-2 lg:grid-cols-3" data-testid="examples-grid">
        {cards.map(({ template, image, video, accent }, index) => (
          <article key={template.id} className="group relative overflow-hidden rounded-[28px] bg-onyx-950 text-white shadow-[0_30px_60px_-30px_rgba(0,0,0,0.45)]">
            <Link href={`/examples/${template.id}`} className="block" aria-label={`View the ${template.name} example`}>
              <div className="relative aspect-[4/5] overflow-hidden">
                {image ? (
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover transition duration-700 group-hover:scale-[1.04]"
                    priority={index < 3}
                  />
                ) : null}
                {video ? <AmbientVideo src={video} poster={image} className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-[1.04]" /> : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <span className="mb-3 block h-px w-10" style={{ background: accent }} />
                  <h2 className="font-display text-3xl leading-tight">{template.name}</h2>
                  <p className="mt-2 text-sm text-white/75">{template.description}</p>
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-2 border-t border-white/10 p-4">
              <Link href={`/examples/${template.id}`} className="flex-1 rounded-full border border-white/20 px-4 py-2.5 text-center text-sm transition hover:border-white/50">
                View live
              </Link>
              <Link
                href={`/edit?template=${template.id}`}
                className="flex-1 rounded-full px-4 py-2.5 text-center text-sm font-semibold text-black transition hover:brightness-110"
                style={{ background: accent }}
                data-testid={`use-template-${template.id}`}
              >
                Use this design
              </Link>
            </div>
          </article>
        ))}
      </section>

      <SiteFooter />
    </main>
  );
}
