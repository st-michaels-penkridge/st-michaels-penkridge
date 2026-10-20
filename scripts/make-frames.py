"""Carved gilt picture frames for the St Michael's site.

Each frame is drawn as a height map (outer edge to inner edge) and lit from the top left,
then saved as a square image for CSS border-image. Every pattern repeats a whole number
of times along the 552px edge slice, so the browser can tile the sides without seams.
Usage: python scripts/make-frames.py images   (needs numpy and Pillow)
"""
import sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SS = 2          # draw at double size, then shrink for smooth edges
MID = 552       # length of each side's repeating slice, in final pixels

def blur(a, r):
    if r <= 0: return a
    im = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255

# ---------- repeating relief tiles (height maps, rows = across the band, cols = along it)
def canvas(P, H, k=4):
    W = P * 3
    im = Image.new("L", (W * k, H * k), 0)
    return im, ImageDraw.Draw(im), k

def finish(im, P, H, k, soft, crisp):
    a = np.asarray(im.resize((P * 3, H), Image.LANCZOS), dtype=np.float32) / 255
    h = 0.62 * blur(a, soft) + 0.38 * blur(a, crisp)
    h = h[:, P:2 * P]
    return h / max(h.max(), 1e-6)

def leaf(d, k, u, v, ang, L, Wd, fill=235):
    poly = [(q / 40 * L, math.sin(math.pi * q / 40) ** 0.75 * Wd * (1 - 0.35 * q / 40)) for q in range(41)]
    poly += [(q / 40 * L, -math.sin(math.pi * q / 40) ** 0.75 * Wd * (1 - 0.35 * q / 40)) for q in range(40, -1, -1)]
    ca, sa = math.cos(ang), math.sin(ang)
    d.polygon([((u + x * ca - y * sa) * k, (v + x * sa + y * ca) * k) for x, y in poly], fill=fill)

def tile_scroll(P, H, dense=False):
    """A scrolling vine: a wavy stem with a curl filling each hollow, and leaves."""
    im, d, k = canvas(P, H)
    amp = 0.25 * H
    def stem_v(u): return H / 2 - amp * math.sin(2 * math.pi * u / P)
    stem = [(i / k * k, stem_v(i / k) * k) for i in range(0, 3 * P * k + 1, 2)]
    d.line(stem, fill=255, width=max(2, int(H * 0.11)) * k, joint="curve")
    for rep in range(3):
        for crest, side in ((0.25, 1), (0.75, -1)):
            # side 1: stem is high (crest near the outer edge), so the curl sits below it
            uc = (rep + crest) * P
            cx = uc + 0.04 * P * side
            cy = H / 2 + side * 0.20 * H
            R = 0.31 * H
            pts = []
            turns = 1.8 * 2 * math.pi
            start = -math.pi / 2 * side - 0.5 * side
            for q in range(0, 260):
                f = q / 259
                th = start - side * f * turns
                r = R * (1 - 0.82 * f)
                pts.append(((cx + r * math.cos(th)) * k, (cy + side * 0 + r * math.sin(th)) * k))
            # branch from the stem into the curl
            bx = uc - 0.16 * P * side
            d.line([(bx * k, stem_v(bx) * k), pts[0]], fill=255, width=int(H * 0.075) * k)
            d.line(pts, fill=255, width=int(H * 0.075) * k, joint="curve")
            rr = 0.07 * H
            d.ellipse([(cx - rr) * k, (cy - rr) * k, (cx + rr) * k, (cy + rr) * k], fill=255)
            # leaves along the outside of the curl
            for j, f in enumerate((0.12, 0.30, 0.48) if dense else (0.18, 0.40)):
                th = start - side * f * turns
                r = R * (1 - 0.82 * f)
                lx, ly = cx + r * math.cos(th), cy + r * math.sin(th)
                leaf(d, k, lx, ly, th + side * 0.5, 0.26 * H, 0.09 * H)
            # a fan of leaves where the stem crosses the middle
            ux = (rep + crest + 0.25) * P
            for a_ in (-0.8, 0.0, 0.8) if dense else (-0.7, 0.7):
                leaf(d, k, ux, stem_v(ux), -side * (math.pi / 2) + a_, 0.24 * H, 0.08 * H)
    h = finish(im, P, H, k, soft=H * 0.035, crisp=0.7)
    rng = np.random.default_rng(3)
    ground = blur((rng.random(h.shape) > 0.86).astype(np.float32), 0.6) * 0.07
    return np.maximum(h, ground)

def tile_laurel(P, H):
    im, d, k = canvas(P, H)
    d.line([(0, H / 2 * k), (3 * P * k, H / 2 * k)], fill=150, width=max(2, int(H * 0.07)) * k)
    n = 2
    for rep in range(3):
        for i in range(n):
            u = (rep + i / n) * P
            for side in (1, -1):
                ang = side * 0.62
                L, Wd = 0.62 * P, 0.15 * H
                poly = [(q / 40 * L, math.sin(math.pi * q / 40) ** 0.8 * Wd) for q in range(41)]
                poly += [(q / 40 * L, -math.sin(math.pi * q / 40) ** 0.8 * Wd) for q in range(40, -1, -1)]
                ca, sa = math.cos(ang), math.sin(ang)
                d.polygon([((u + x * ca - y * sa) * k, (H / 2 + x * sa + y * ca) * k) for x, y in poly], fill=255)
            r = 0.07 * H
            d.ellipse([(u + 0.5 * P / n - r) * k, (H / 2 - r) * k, (u + 0.5 * P / n + r) * k, (H / 2 + r) * k], fill=255)
    return finish(im, P, H, k, soft=H * 0.05 * SS / 2, crisp=0.5)

def tile_eggdart(P, H):
    im, d, k = canvas(P, H)
    for rep in range(3):
        c = (rep + 0.5) * P
        ro, rv = 0.44 * P, 0.44 * H
        d.ellipse([(c - ro) * k, (H * .52 - rv) * k, (c + ro) * k, (H * .52 + rv) * k], outline=200, width=max(2, int(H * .06)) * k)
        ri, rvi = 0.33 * P, 0.34 * H
        d.ellipse([(c - ri) * k, (H * .52 - rvi) * k, (c + ri) * k, (H * .52 + rvi) * k], fill=255)
        u = rep * P
        d.polygon([(u * k, H * .05 * k), ((u - .07 * P) * k, H * .45 * k), (u * k, H * .97 * k), ((u + .07 * P) * k, H * .45 * k)], fill=235)
    return finish(im, P, H, k, soft=H * 0.06 * SS / 2, crisp=0.5)

def tile_tongues(P, H):
    im, d, k = canvas(P, H)
    for rep in range(3):
        c = (rep + 0.5) * P
        w = 0.40 * P
        pts = [((c - w) * k, 0)]
        for q in range(0, 41):
            a = q / 40 * math.pi
            pts.append(((c - w * math.cos(a)) * k, (H * 0.55 + H * 0.38 * math.sin(a)) * k))
        pts.append(((c + w) * k, 0))
        d.polygon(pts, fill=255)
        d.line([(c * k, H * .05 * k), (c * k, H * .8 * k)], fill=120, width=max(2, int(H * .05)) * k)
    return finish(im, P, H, k, soft=H * 0.05 * SS / 2, crisp=0.5)

TILES = {"scroll": tile_scroll, "scroll2": lambda P, H: tile_scroll(P, H, dense=True),
         "laurel": tile_laurel, "eggdart": tile_eggdart, "tongues": tile_tongues}

# ---------- frame assembly
def build(name, B, profile, out):
    b = B * SS; S = (MID + 2 * B) * SS
    y, x = np.mgrid[0:S, 0:S].astype(np.float32)
    dist = np.stack([y, S - 1 - y, x, S - 1 - x])
    side = dist.argmin(0); v = dist.min(0)
    u = np.where(side < 2, x, y)
    t = np.clip(v / b, 0, 1)
    h = np.zeros_like(t)
    for seg in profile:
        kind, t0, t1 = seg[0], seg[1], seg[2]
        m = (t >= t0) & (t < t1)
        s = (t[m] - t0) / (t1 - t0)          # 0 at the outer side of the segment, 1 at the inner
        wpx = (t1 - t0) * b
        if kind == "lip":
            h[m] = seg[3] + seg[4] * np.sqrt(np.clip(1 - (2 * s - 1) ** 2, 0, 1))
        elif kind == "flat":
            h[m] = seg[3]
        elif kind == "cove":
            h[m] = seg[3] + seg[4] * (2 * s - 1) ** 2
        elif kind == "ogee":
            h[m] = seg[3] + seg[4] * (0.5 + 0.5 * np.cos(np.pi * s))
        elif kind == "beads":
            P = seg[3] * SS
            du = (u[m] % P) - P / 2; dv = (s - 0.5) * wpx; rb = min(P * 0.46, wpx * 0.5)
            h[m] = seg[4] + seg[5] * np.sqrt(np.clip(rb ** 2 - du ** 2 - dv ** 2, 0, None)) / rb
        elif kind == "rope":
            P = seg[3] * SS
            xx = 2 * s - 1
            band = np.sqrt(np.clip(1 - xx ** 2, 0, 1))
            tw = np.abs(np.cos(np.pi * (u[m] / P * 2 + xx * 0.6))) ** 0.7
            h[m] = seg[4] + seg[5] * band * (0.7 + 0.3 * tw)
        elif kind == "tile":
            P = seg[4] * SS; Hb = max(4, int(round(wpx)))
            T = TILES[seg[3]](P, Hb)
            iu = (u[m].astype(np.int64)) % P
            iv = np.clip((s * Hb).astype(np.int64), 0, Hb - 1)
            h[m] = seg[5] + seg[6] * T[iv, iu]
        elif kind == "sight":
            h[m] = seg[3] * (1 - s) ** 1.4 + 0.03
    # faint wear that also repeats exactly along each side
    rng = np.random.default_rng(11)
    wear = sum(np.cos(2 * np.pi * (int(rng.integers(20, 160)) * u / (MID * SS) + rng.uniform(-30, 30) * t) + rng.uniform(0, 6.3)) for _ in range(12))
    h = h + wear / 12 * 0.012
    h = np.where(v < b, h, 0)
    # lighting
    gy, gx = np.gradient(h * 9.0 * SS)
    N = np.stack([-gx, -gy, np.ones_like(gx)]); N /= np.linalg.norm(N, axis=0)
    L = np.array([-0.45, -0.55, 0.70]); L /= np.linalg.norm(L)
    ndl = np.clip((N * L[:, None, None]).sum(0), 0, 1)
    Hv = L + np.array([0, 0, 1.0]); Hv /= np.linalg.norm(Hv)
    spec = np.clip((N * Hv[:, None, None]).sum(0), 0, 1) ** 28
    hb = blur(np.clip(h, 0, 1), 3 * SS)
    ao = np.clip(1 - (hb - h) * 2.4, 0.4, 1) * (0.62 + 0.38 * np.clip(h / 0.95, 0, 1))
    gold = np.array([0.88, 0.67, 0.22]); deep = np.array([0.30, 0.17, 0.03]); shine = np.array([1.0, 0.92, 0.62])
    lit = 0.36 + 0.80 * ndl
    col = gold[:, None, None] * lit * ao + deep[:, None, None] * (1 - ao) * 0.9
    col += shine[:, None, None] * spec * 0.55 * ao
    # a little burnish on the high points
    col *= (0.92 + 0.12 * np.clip(h, 0, 1))
    col = np.clip(col, 0, 1)
    img = Image.fromarray((np.moveaxis(col, 0, -1) * 255).astype(np.uint8)).resize((S // SS, S // SS), Image.LANCZOS)
    img.save(f"{out}/frame-{name}.webp", quality=90, method=6)
    print(name, img.size, "slice", B)

FRAMES = {
    # wide scrollwork frame, like a classic gilt picture frame
    "scroll": (108, [("lip", 0, .09, .55, .40), ("beads", .09, .15, 12, .40, .30), ("flat", .15, .18, .32),
                     ("tile", .18, .74, "scroll", 92, .30, .50), ("flat", .74, .78, .46),
                     ("beads", .78, .86, 12, .38, .30), ("sight", .86, 1.01, .62)]),
    # slimmer laurel leaf frame with a rope inner edge
    "laurel": (76, [("lip", 0, .16, .50, .42), ("flat", .16, .20, .36), ("tile", .20, .64, "laurel", 46, .32, .52),
                    ("flat", .64, .70, .48), ("rope", .70, .86, 23, .34, .40), ("sight", .86, 1.01, .58)]),
    # egg and dart with a beaded outer edge
    "eggdart": (92, [("ogee", 0, .16, .45, .45), ("beads", .16, .24, 12, .36, .30), ("flat", .24, .27, .34),
                     ("tile", .27, .66, "eggdart", 46, .30, .52), ("flat", .66, .70, .48),
                     ("tile", .70, .84, "tongues", 24, .32, .32), ("sight", .84, 1.01, .60)]),
    # deepest frame, for the giving section: rope, dense scrollwork, pearls
    "acanthus": (116, [("lip", 0, .08, .55, .42), ("rope", .08, .19, 23, .36, .44), ("flat", .19, .22, .30),
                       ("tile", .22, .73, "scroll2", 138, .28, .52), ("flat", .73, .77, .46),
                       ("beads", .77, .85, 12, .38, .30), ("sight", .85, 1.01, .64)]),
}

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    only = sys.argv[2:] or list(FRAMES)
    for n in only:
        B, prof = FRAMES[n]
        build(n, B, prof, out)
