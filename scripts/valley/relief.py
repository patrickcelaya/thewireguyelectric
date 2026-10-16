"""Render the valley map's relief from real elevation data (Terrain Tiles, terrarium encoding; in the US the source is
USGS 3DEP/NED), and write the town and range positions the map places on it.

    python3 -I scripts/valley/relief.py TILE_DIR [--download]

TILE_DIR holds zoom-12 terrarium tiles named <x>_<y>.png covering the crop below; --download fetches the missing ones from
https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/<x>/<y>.png (about 700 tiles, 60 MB). Needs numpy and Pillow
with AVIF support. Writes:
  web/public/img/relief/relief-{1200,1800,2600}.{webp,avif}   the relief (late-afternoon light, sand to copper-taupe)
  web/src/data/relief.json                                     crop, aspect, town points (USGS GNIS, from
                                                               migration/local-facts) and range labels, as fractions
Then the map's geometry (wire, lights, labels) is computed at build time by web/src/lib/valley.ts.
Ported from the round-5 design mockups (tools/relief.py)."""
import sys, json, math, urllib.request
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
TILES = Path(sys.argv[1])
OUT = ROOT / 'web/public/img/relief'
OUT_JSON = ROOT / 'web/src/data/relief.json'
Z = 12; N = 2 ** Z; TS = 256
LNG0, LNG1, LAT0, LAT1 = -112.98, -110.90, 32.76, 34.42   # west, east, south, north (tall: the relief reaches the top of the section)


def mx(lng): return (lng + 180) / 360 * N * TS
def my(lat):
    r = math.radians(lat); return (1 - math.asinh(math.tan(r)) / math.pi) / 2 * N * TS


if '--download' in sys.argv:
    TILES.mkdir(parents=True, exist_ok=True)
    for x in range(int(mx(LNG0) // TS), int(mx(LNG1) // TS) + 1):
        for y in range(int(my(LAT1) // TS), int(my(LAT0) // TS) + 1):
            f = TILES / f'{x}_{y}.png'
            if not f.exists():
                urllib.request.urlretrieve(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png', f)

xs = sorted({int(p.stem.split('_')[0]) for p in TILES.glob('*.png')}); ys = sorted({int(p.stem.split('_')[1]) for p in TILES.glob('*.png')})
mos = np.zeros(((ys[-1] - ys[0] + 1) * TS, (xs[-1] - xs[0] + 1) * TS), np.float32)
for x in xs:
    for y in ys:
        a = np.asarray(Image.open(TILES / f'{x}_{y}.png').convert('RGB'), np.float32)
        mos[(y - ys[0]) * TS:(y - ys[0] + 1) * TS, (x - xs[0]) * TS:(x - xs[0] + 1) * TS] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
ox, oy = xs[0] * TS, ys[0] * TS
cx0, cx1, cy0, cy1 = mx(LNG0) - ox, mx(LNG1) - ox, my(LAT1) - oy, my(LAT0) - oy
assert cx0 >= 0 and cy0 >= 0 and cx1 <= mos.shape[1] and cy1 <= mos.shape[0], (cx0, cx1, cy0, cy1, mos.shape)
dem = mos[int(cy0):int(cy1), int(cx0):int(cx1)]
def blur(a, r=1):
    # a small separable box blur (two passes ~ gaussian): tames the zoom-12 data's 1-px noise and tile seams
    k = 2 * r + 1
    for ax in (0, 1):
        c = np.cumsum(np.pad(a, [(r + 1, r)] if False else ([(r + 1, r), (0, 0)] if ax == 0 else [(0, 0), (r + 1, r)]), mode='edge'), axis=ax)
        a = ((c[k:] - c[:-k]) if ax == 0 else (c[:, k:] - c[:, :-k])) / k
    return a.astype(np.float32)
dem = blur(blur(dem.copy()))
H, W = dem.shape
print('crop px', W, H)

lat_mid = (LAT0 + LAT1) / 2
mpp = 156543.03 * math.cos(math.radians(lat_mid)) / N           # metres per pixel
gy, gx = np.gradient(dem, mpp)


def shade(az, alt, z=1.7):
    az, alt = math.radians(az), math.radians(alt)
    slope = np.arctan(z * np.hypot(gx, gy)); aspect = np.arctan2(-gx, gy)
    return np.clip(np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect), 0, 1)


# late-afternoon light from the west-north-west, softened by a second, higher light (multidirectional)
hs = 0.68 * shade(292, 38) + 0.32 * shade(340, 55)
flat = math.sin(math.radians(38)) * 0.68 + math.sin(math.radians(55)) * 0.32
d = hs - flat                                                          # 0 on the flat valley floor, <0 shadow, >0 light
del hs


def hexc(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32)


FLOOR_LO, FLOOR_HI = hexc('#F3EDE3'), hexc('#E6D7BF')    # valley floor (330 m) → high desert (1,000 m+): a touch more sand
SHADOW, LIGHT = hexc('#8C6649'), hexc('#FFFDF8')          # warmer, deeper copper-taupe shadow
e = np.clip((dem - 320) / 900, 0, 1)[..., None]
base = FLOOR_LO * (1 - e) + FLOOR_HI * e
dn = np.clip(-d / 0.5, 0, 1)[..., None] ** 0.8
up = np.clip(d / 0.35, 0, 1)[..., None]
img = base * (1 - 0.88 * dn) + SHADOW * 0.88 * dn
img = img * (1 - 0.55 * up) + LIGHT * 0.55 * up
del base, dn, up, e

# faint 100 m contours (copper), stronger every 500 m
lv = np.floor(dem / 100.0)
edge = np.zeros_like(dem, bool)
edge[:, 1:] |= lv[:, 1:] != lv[:, :-1]
edge[1:, :] |= lv[1:, :] != lv[:-1, :]
f5 = np.floor(dem / 500.0)
major = np.zeros_like(edge)
major[:, 1:] |= f5[:, 1:] != f5[:, :-1]
major[1:, :] |= f5[1:, :] != f5[:-1, :]
COP = hexc('#AA502E')
a = (edge * 0.13 + major * 0.14)[..., None]
img = img * (1 - a) + COP * a

out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
out = out.filter(ImageFilter.GaussianBlur(0.45))
OUT.mkdir(parents=True, exist_ok=True)
for old in OUT.glob('relief-*'):
    old.unlink()
for w in (1200, 1800, 2600):
    im = out.resize((w, round(out.height * w / out.width)), Image.LANCZOS)
    im.save(OUT / f'relief-{w}.webp', quality=72, method=6)
    im.save(OUT / f'relief-{w}.avif', quality=48)


def frac(lng, lat):
    return [round((mx(lng) - ox - cx0) / (cx1 - cx0), 5), round((my(lat) - oy - cy0) / (cy1 - cy0), 5)]


# city positions as fractions of the crop (same Web Mercator space), from the GNIS points the business's local facts carry
LF = json.loads((ROOT / 'migration/local-facts/locations.json').read_text())['locations']
ME = json.loads((ROOT / 'migration/local-facts/mesa.json').read_text())['mesa']
pts = {k: v['geo']['value'] for k, v in LF.items()}
pts['mesa'] = ME['geo']['value']
pos = {k: frac(p['lng'], p['lat']) for k, p in pts.items()}
# the ranges a local navigates by (label centres on each range's real position)
MTN = {'mcdowell': ('McDowell Mountains', -111.815, 33.715), 'superstition': ('Superstition Mountains', -111.40, 33.455),
       'south': ('South Mountain', -112.165, 33.322), 'santan': ('San Tan Mountains', -111.68, 33.125),
       'estrella': ('Sierra Estrella', -112.255, 33.262), 'phxmtns': ('Phoenix Mountains', -112.035, 33.60),
       'whitetank': ('White Tank Mountains', -112.56, 33.585)}
mtn = {k: [nm] + frac(lng, lat) for k, (nm, lng, lat) in MTN.items()}
json.dump({'crop': [LNG0, LNG1, LAT0, LAT1], 'w': W, 'h': H, 'aspect': round(W / H, 5), 'cities': pos, 'mountains': mtn,
           'source': 'Terrain Tiles (terrarium, zoom 12): USGS 3DEP / NED elevation; city points: USGS GNIS'},
          open(OUT_JSON, 'w'), indent=1)
print(json.dumps(pos))
