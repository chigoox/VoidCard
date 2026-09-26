// Renders the generative scenes in scenes.html to seamless-looping H.264
// videos plus JPEG posters/stills for public/showcase.
//
//   FFMPEG=/path/to/ffmpeg node scripts/showcase-media/render.mjs [scene...]
//
// Needs Chromium (Playwright) and an ffmpeg with libx264.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "../../public/showcase");
const ffmpeg = process.env.FFMPEG ?? "ffmpeg";
const FPS = 24;
const SCENES = {
  "gold-dust": { loop: 16 },
  "aurora-silk": { loop: 12 },
  "light-shadow": { loop: 14 },
  "neon-grid": { loop: 6 },
  "botanical-light": { loop: 14 },
};
const selected = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SCENES);

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

for (const scene of selected) {
  const { loop } = SCENES[scene];
  const W = 1280, H = 720;
  const frames = path.join(out, `.frames-${scene}`);
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.goto(`${pathToFileURL(path.join(here, "scenes.html"))}?scene=${scene}&w=${W}&h=${H}&loop=${loop}`);
  await page.waitForFunction(() => window.ready === true);
  const total = loop * FPS;
  for (let i = 0; i < total; i += 1) {
    const data = await page.evaluate((t) => { window.renderFrame(t); return document.getElementById("c").toDataURL("image/png"); }, i / FPS);
    writeFileSync(path.join(frames, `${String(i).padStart(4, "0")}.png`), Buffer.from(data.split(",")[1], "base64"));
  }
  await page.close();

  execFileSync(ffmpeg, [
    "-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(frames, "%04d.png"),
    // A touch of blur keeps grain-heavy scenes small without visible loss.
    "-vf", "gblur=sigma=0.8", "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-profile:v", "high",
    "-movflags", "+faststart", "-an", path.join(out, `${scene}.mp4`),
  ]);
  // VP9 WebM for browsers without H.264 (e.g. open-source Chromium builds).
  execFileSync(ffmpeg, [
    "-y", "-loglevel", "error", "-i", path.join(out, `${scene}.mp4`),
    "-c:v", "libvpx-vp9", "-crf", "38", "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", "-an",
    path.join(out, `${scene}.webm`),
  ]);
  // Poster = first frame; two extra stills from later in the loop.
  for (const [name, frame] of [["", 0], ["-2", Math.floor(total / 3)], ["-3", Math.floor((2 * total) / 3)]]) {
    execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-i", path.join(frames, `${String(frame).padStart(4, "0")}.png`), "-q:v", "3", path.join(out, `${scene}${name}.jpg`)]);
  }
  rmSync(frames, { recursive: true, force: true });
  console.log(`rendered ${scene} (${loop}s)`);
}
await browser.close();
