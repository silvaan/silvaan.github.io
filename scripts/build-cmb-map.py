# Reprojects the WMAP 9-year ILC map of the cosmic microwave background
# (NASA / WMAP Science Team, public domain) from its galactic Mollweide
# projection to an equatorial equirectangular texture, the frame the Cosmology
# sims draw the sky in.
#
#   python3 scripts/build-cmb-map.py [cache-dir]
#
# Needs Pillow and numpy.

import os
import sys
import urllib.request

import numpy as np
from PIL import Image

CACHE = sys.argv[1] if len(sys.argv) > 1 else 'node_modules/.cache/cosmos'
SRC = 'https://upload.wikimedia.org/wikipedia/commons/e/ed/WMAP_2012.png'
OUT = 'public/data/cosmos/cmb.jpg'
W, H = 2048, 1024

os.makedirs(CACHE, exist_ok=True)
src_path = os.path.join(CACHE, 'wmap.png')
if not os.path.exists(src_path):
    req = urllib.request.Request(SRC, headers={'User-Agent': 'silvaan.xyz build script'})
    with urllib.request.urlopen(req) as r, open(src_path, 'wb') as f:
        f.write(r.read())

img = np.asarray(Image.open(src_path).convert('RGB'))
SH, SW = img.shape[:2]

# every output pixel is a direction in equatorial coordinates
ra = (np.arange(W) + 0.5) / W * 2 * np.pi
dec = np.pi / 2 - (np.arange(H) + 0.5) / H * np.pi
RA, DEC = np.meshgrid(ra, dec)
v = np.stack([np.cos(DEC) * np.cos(RA), np.cos(DEC) * np.sin(RA), np.sin(DEC)], -1)

# equatorial (J2000) to galactic
R = np.array([
    [-0.0548755604, -0.8734370902, -0.4838350155],
    [+0.4941094279, -0.4448296300, +0.7469822445],
    [-0.8676661490, -0.1980763734, +0.4559837762],
])
g = v @ R.T
l = np.arctan2(g[..., 1], g[..., 0])  # -pi..pi, 0 at the galactic centre
b = np.arcsin(np.clip(g[..., 2], -1, 1))

# Mollweide: solve 2t + sin 2t = pi sin b by Newton
t = b.copy()
for _ in range(30):
    f = 2 * t + np.sin(2 * t) - np.pi * np.sin(b)
    t -= f / (2 + 2 * np.cos(2 * t) + 1e-12)
x = 2 * np.sqrt(2) / np.pi * l * np.cos(t)  # longitude grows to the left on the map
y = np.sqrt(2) * np.sin(t)
px = ((-x / (2 * np.sqrt(2))) * 0.5 + 0.5) * (SW - 1)
py = (0.5 - y / (2 * np.sqrt(2))) * (SH - 1)
out = img[np.clip(np.round(py).astype(int), 0, SH - 1), np.clip(np.round(px).astype(int), 0, SW - 1)]
Image.fromarray(out).save(OUT, quality=82)
print(OUT, os.path.getsize(OUT) // 1024, 'KB')
