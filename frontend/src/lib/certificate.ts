/**
 * Shareable mastery certificate — a 1200×630 (social-card ratio) PNG drawn
 * entirely client-side on a canvas. No AI, no backend, works in demo mode.
 * Split into a pure render function (testable: returns a data URL) and a
 * download wrapper.
 */

export interface CertificateOptions {
  userName: string;
  workspaceTitle: string;
  masteryPct: number;
  conceptsMastered: number;
  conceptTotal: number;
  rankName: string;
  level: number;
}

/** Display name for the certificate: real Clerk name when signed in,
 *  friendly fallback in demo/anon mode. Same window.Clerk escape hatch the
 *  rest of the app uses outside React components. */
export function certificateDisplayName(): string {
  if (typeof window === "undefined") return "Prism Learner";
  try {
    const clerk = (window as unknown as Record<string, unknown>).Clerk as
      | { user?: { fullName?: string | null; firstName?: string | null } | null }
      | undefined;
    return clerk?.user?.fullName || clerk?.user?.firstName || "Prism Learner";
  } catch {
    return "Prism Learner";
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Ellipsize text so it fits maxWidth at the current font. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 3 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

export function renderCertificateDataUrl(opts: CertificateOptions): string {
  const W = 1200;
  const H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Aurora background — violet → fuchsia diagonal with soft color orbs.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#ede9fe");
  bg.addColorStop(0.5, "#fdf4ff");
  bg.addColorStop(1, "#ecfeff");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const orb = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  orb(120, 90, 260, "rgba(167,139,250,0.35)");
  orb(1080, 540, 300, "rgba(103,232,249,0.30)");
  orb(1050, 100, 220, "rgba(240,171,252,0.30)");

  // Glass card.
  ctx.save();
  roundedRect(ctx, 70, 60, W - 140, H - 120, 28);
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.shadowColor = "rgba(124,58,237,0.18)";
  ctx.shadowBlur = 40;
  ctx.fill();
  ctx.restore();

  // Prism triangle mark + brand.
  ctx.save();
  const px = 120;
  const py = 128;
  const tri = ctx.createLinearGradient(px, py - 26, px + 44, py + 18);
  tri.addColorStop(0, "#8b5cf6");
  tri.addColorStop(0.6, "#d946ef");
  tri.addColorStop(1, "#22d3ee");
  ctx.fillStyle = tri;
  ctx.beginPath();
  ctx.moveTo(px + 22, py - 26);
  ctx.lineTo(px + 46, py + 18);
  ctx.lineTo(px - 2, py + 18);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#1e1b4b";
  ctx.font = "bold 30px Arial, sans-serif";
  ctx.fillText("PrismLearning.AI", 182, 138);

  ctx.fillStyle = "#7c3aed";
  ctx.font = "600 21px Arial, sans-serif";
  ctx.fillText("CERTIFICATE OF MASTERY", 120, 208);

  // Name.
  ctx.fillStyle = "#111827";
  ctx.font = "bold 58px Georgia, serif";
  ctx.fillText(fitText(ctx, opts.userName, 940), 120, 288);

  // Subject line.
  ctx.fillStyle = "#4b5563";
  ctx.font = "24px Arial, sans-serif";
  ctx.fillText("has demonstrated mastery of", 120, 336);
  ctx.fillStyle = "#111827";
  ctx.font = "bold 34px Arial, sans-serif";
  ctx.fillText(fitText(ctx, `“${opts.workspaceTitle}”`, 940), 120, 384);

  // Stat pills.
  const pills = [
    `${opts.masteryPct}% mastery`,
    `${opts.conceptsMastered}/${opts.conceptTotal} concepts`,
    `${opts.rankName} · Lv ${opts.level}`,
  ];
  let pillX = 120;
  const pillY = 428;
  ctx.font = "bold 20px Arial, sans-serif";
  for (const pill of pills) {
    const w = ctx.measureText(pill).width + 44;
    roundedRect(ctx, pillX, pillY, w, 44, 22);
    ctx.fillStyle = "rgba(139,92,246,0.12)";
    ctx.fill();
    ctx.fillStyle = "#6d28d9";
    ctx.fillText(pill, pillX + 22, pillY + 29);
    pillX += w + 14;
  }

  // Date + verification footer.
  ctx.fillStyle = "#6b7280";
  ctx.font = "19px Arial, sans-serif";
  const date = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  ctx.fillText(`Earned ${date} · every step verified by Lumi, the agentic AI tutor`, 120, 516);
  ctx.fillStyle = "#9ca3af";
  ctx.font = "17px Arial, sans-serif";
  ctx.fillText("Powered by gpt-oss-120b · Fireworks AI · AMD Instinct™ GPUs", 120, 546);

  return canvas.toDataURL("image/png");
}

export function downloadMasteryCertificate(opts: CertificateOptions): void {
  const url = renderCertificateDataUrl(opts);
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = `prism_certificate_${opts.workspaceTitle.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}.png`;
  a.click();
}
