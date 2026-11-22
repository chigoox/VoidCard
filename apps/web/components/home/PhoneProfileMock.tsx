import Image from "next/image";
import { CalendarCheck, Download, Heart, ShoppingBag, Star } from "lucide-react";

const SERVICES = [
  ["Silk press", "$95"],
  ["Lived-in blonde", "$240"],
  ["Cut & finish", "$80"],
] as const;

/** A static, accessible rendering of a stylist's VoidCard page for the hero. */
export function PhoneProfileMock() {
  return (
    <div
      className="relative mx-auto w-[min(100%,300px)] rounded-[44px] border border-black/80 bg-black p-2.5 shadow-[0_40px_90px_-40px_rgba(10,10,10,0.75)]"
      role="img"
      aria-label="Example VoidCard page for a hair studio with buttons to book, shop, tip and save the contact"
    >
      <div className="absolute left-1/2 top-4 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" aria-hidden />
      <div className="overflow-hidden rounded-[36px] bg-[#0f0d0a] text-[#f6efe2]" aria-hidden>
        <div className="relative h-48">
          <Image src="/showcase/photos/hair-hero.jpg" alt="" fill sizes="300px" className="object-cover object-[50%_25%]" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0d0a] via-[#0f0d0a]/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-5 pb-3">
            <p className="text-[9px] uppercase tracking-[0.3em] text-[#e9c98a]">Colour · Silk press</p>
            <p className="mt-1 font-display text-2xl leading-none">Gloss Hair Studio</p>
            <p className="mt-1.5 flex items-center gap-1 text-[10px] text-white/70">
              <Star className="size-3 fill-[#e9c98a] text-[#e9c98a]" /> 4.9 · 400+ reviews
            </p>
          </div>
        </div>
        <div className="space-y-2.5 px-4 pb-5 pt-2">
          <div className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f3d28d] via-[#d9ae5f] to-[#b8893d] py-2.5 text-[12px] font-semibold text-[#1a1408]">
            <CalendarCheck className="size-3.5" /> Book your chair
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            {[
              [ShoppingBag, "Shop"],
              [Heart, "Tip"],
              [Download, "Save contact"],
            ].map(([Icon, label]) => {
              const I = Icon as typeof ShoppingBag;
              return (
                <div key={label as string} className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] py-2">
                  <I className="size-3.5 text-[#e9c98a]" />
                  {label as string}
                </div>
              );
            })}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
            <p className="text-[9px] uppercase tracking-[0.25em] text-white/50">Services</p>
            <ul className="mt-2 space-y-1.5 text-[11px]">
              {SERVICES.map(([name, price]) => (
                <li key={name} className="flex justify-between">
                  <span>{name}</span>
                  <span className="text-[#e9c98a]">{price}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
