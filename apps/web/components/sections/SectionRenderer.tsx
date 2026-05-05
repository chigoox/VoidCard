import Image from "next/image";
import type { Section } from "@/lib/sections/types";

export function SectionRenderer({ section, verified }: { section: Section; verified?: boolean }) {
  if (!section.visible) return null;
  switch (section.type) {
    case "header": {
      const p = section.props;
      return (
        <header className="flex flex-col items-center pt-8 text-center">
          {p.avatarUrl && (
            <div className="size-24 overflow-hidden rounded-full ring-2 ring-gold/40">
              <Image src={p.avatarUrl} alt={p.name} width={96} height={96} className="size-24 object-cover" />
            </div>
          )}
          <h1 className="mt-4 font-display text-2xl">
            {p.name}
            {verified && p.showVerified && <span className="ml-1 text-gold">✓</span>}
          </h1>
          {p.handle && <p className="mt-1 text-sm text-ivory-dim">@{p.handle}</p>}
          {p.tagline && <p className="mt-3 max-w-sm text-sm text-ivory-dim">{p.tagline}</p>}
        </header>
      );
    }
    case "link": {
      const p = section.props;
      return (
        <a href={p.url} target="_blank" rel="noopener" data-section-type="link"
           className="card flex items-center justify-between px-4 py-3.5 text-sm transition hover:border-gold/40 hover:text-gold">
          <span>{p.label}</span><span className="text-gold">→</span>
        </a>
      );
    }
    case "image": {
      const p = section.props;
      return <Image src={p.src} alt={p.alt} width={800} height={800} className={p.rounded ? "rounded-card" : ""} />;
    }
    case "youtube": {
      const p = section.props;
      return (
        <div className="aspect-video overflow-hidden rounded-card">
          <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${p.id}`} loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
      );
    }
    case "spotify": {
      const p = section.props;
      const src = `https://open.spotify.com/embed/${p.uri.replace("spotify:", "").replace(/:/g, "/")}`;
      return <iframe className="h-[80px] w-full rounded-card" src={src} loading="lazy" />;
    }
    case "video": {
      const p = section.props;
      return <video className="rounded-card" src={p.src} poster={p.poster} controls preload="metadata" />;
    }
    case "social": {
      const p = section.props;
      const map: Record<string, string> = {
        instagram: "https://instagram.com/", tiktok: "https://tiktok.com/@", x: "https://x.com/",
        linkedin: "https://linkedin.com/in/", youtube: "https://youtube.com/@", threads: "https://threads.net/@",
        github: "https://github.com/", facebook: "https://facebook.com/", snapchat: "https://snapchat.com/add/",
      };
      return (
        <div className="flex flex-wrap justify-center gap-3">
          {p.items.map((s) => (
            <a key={s.platform + s.handle} href={`${map[s.platform]}${s.handle}`} target="_blank" rel="noopener"
               className="rounded-pill border border-onyx-600 px-3 py-1 text-xs uppercase tracking-widest hover:border-gold/40 hover:text-gold">
              {s.platform}
            </a>
          ))}
        </div>
      );
    }
    case "markdown":
      return <div className="prose prose-invert max-w-none text-ivory-dim" dangerouslySetInnerHTML={{ __html: escape(section.props.md) }} />;
    case "divider":
      return <hr className="my-2 border-onyx-700" />;
    case "spacer":
      return <div style={{ height: section.props.height }} />;
    case "qr":
      return (
        <div className="card flex flex-col items-center p-4">
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(section.props.url)}`}
               alt={section.props.label ?? "QR"} width={200} height={200} className="rounded-card" />
          {section.props.label && <p className="mt-2 text-xs text-ivory-dim">{section.props.label}</p>}
        </div>
      );
    case "schedule":
      return (
        <a href={section.props.url} target="_blank" rel="noopener" className="btn-gold w-full">Book a time</a>
      );
    case "tip":
      return (
        <div className="card p-4">
          <p className="mb-2 text-sm uppercase tracking-widest text-gold">Leave a tip</p>
          <div className="flex gap-2">
            {section.props.amounts.map((a) => (
              <button key={a} className="btn-ghost flex-1">${(a / 100).toFixed(0)}</button>
            ))}
          </div>
        </div>
      );
    case "gallery":
      return (
        <div className="grid grid-cols-3 gap-2">
          {section.props.images.map((img, i) => (
            <Image key={i} src={img.src} alt={img.alt} width={300} height={300} className="aspect-square rounded-card object-cover" />
          ))}
        </div>
      );
    case "embed":
      return (
        <iframe sandbox="allow-scripts allow-same-origin" srcDoc={section.props.html}
                style={{ height: section.props.height }} className="w-full rounded-card border border-onyx-700" />
      );
    case "form":
      return (
        <form className="card space-y-3 p-4" action={`/api/form/${section.id}`} method="post">
          <p className="font-display text-lg">{section.props.title}</p>
          {section.props.fields.map((f) => (
            <label key={f.name} className="block">
              <span className="text-xs uppercase tracking-widest text-ivory-mute">{f.label}</span>
              {f.type === "textarea" ? (
                <textarea name={f.name} required={f.required}
                  className="mt-1 w-full rounded-card border border-onyx-600 bg-onyx-900 p-3 outline-none focus:border-gold/60" />
              ) : (
                <input type={f.type} name={f.name} required={f.required}
                  className="mt-1 w-full rounded-pill border border-onyx-600 bg-onyx-900 px-4 py-2.5 outline-none focus:border-gold/60" />
              )}
            </label>
          ))}
          <button className="btn-gold w-full" type="submit">Send</button>
        </form>
      );
    case "map":
      return (
        <div className="card overflow-hidden">
          <iframe className="aspect-video w-full" src={`https://www.google.com/maps?q=${section.props.lat},${section.props.lng}&output=embed`} loading="lazy" />
        </div>
      );
  }
}

function escape(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
}
