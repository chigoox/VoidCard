import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-static";
export const revalidate = 3600;

const SCRIPT = `(function(){
  "use strict";
  var ORIGIN = (function(){
    try {
      var s = document.currentScript || (function(){ var l = document.getElementsByTagName("script"); return l[l.length-1]; })();
      if (!s) return "";
      var src = s.getAttribute("src") || "";
      try { return new URL(src, location.href).origin; } catch (e) { return ""; }
    } catch (e) { return ""; }
  })();

  function findHosts(){
    var nodes = document.querySelectorAll("[data-voidcard]");
    if (nodes.length) return Array.prototype.slice.call(nodes);
    var sNodes = document.querySelectorAll("script[data-user]");
    return Array.prototype.slice.call(sNodes).filter(function(s){
      var src = s.getAttribute("src") || "";
      return src.indexOf("/embed.js") !== -1;
    });
  }

  function mount(host){
    var user = host.getAttribute("data-voidcard") || host.getAttribute("data-user") || "";
    if (!user) return;
    user = user.replace(/^@/, "").trim();
    if (!user) return;
    var mode = (host.getAttribute("data-mode") || "card").toLowerCase();
    if (["card","button","full"].indexOf(mode) === -1) mode = "card";
    var theme = host.getAttribute("data-theme") || "";
    var width = host.getAttribute("data-width") || "";
    var height = host.getAttribute("data-height") || "";

    var container;
    if (host.tagName === "SCRIPT") {
      container = document.createElement("div");
      host.parentNode.insertBefore(container, host);
    } else {
      container = host;
    }
    container.setAttribute("data-voidcard-mounted","1");

    var iframe = document.createElement("iframe");
    var qs = "mode=" + encodeURIComponent(mode);
    if (theme) qs += "&theme=" + encodeURIComponent(theme);
    iframe.src = ORIGIN + "/embed/" + encodeURIComponent(user) + "?" + qs;
    iframe.title = "VoidCard — @" + user;
    iframe.loading = "lazy";
    iframe.referrerPolicy = "no-referrer-when-downgrade";
    iframe.setAttribute("sandbox","allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms");
    iframe.setAttribute("allow","clipboard-write");
    iframe.style.border = "0";
    iframe.style.width = width || "100%";
    iframe.style.maxWidth = "100%";
    iframe.style.display = "block";
    iframe.style.background = "transparent";
    iframe.style.colorScheme = "light dark";
    if (mode === "button") {
      iframe.style.height = height || "56px";
    } else if (mode === "card") {
      iframe.style.height = height || "320px";
    } else {
      iframe.style.height = height || "640px";
    }
    container.appendChild(iframe);

    window.addEventListener("message", function(ev){
      if (!ev || !ev.data || ev.source !== iframe.contentWindow) return;
      if (ev.origin !== ORIGIN) return;
      var d = ev.data;
      if (d && d.type === "voidcard:resize" && typeof d.height === "number" && d.height > 0) {
        iframe.style.height = Math.min(Math.max(d.height, 80), 4000) + "px";
      }
    }, false);
  }

  function init(){ findHosts().forEach(function(h){ if (!h.getAttribute("data-voidcard-mounted")) mount(h); }); }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();`;

export async function GET() {
  return new NextResponse(SCRIPT, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      "x-content-type-options": "nosniff",
      "access-control-allow-origin": "*",
    },
  });
}
