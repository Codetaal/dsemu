"""Draws the CramLab logo (a cheese flask) in the same pixel style as the CramBoy icon
(tools/make_cramboy_icon.py): 16 x 16 grid, 30 px pixels with room around, flat cream shapes with a
one-pixel shadow to the right and below, a 16-band gradient and half-size sparkles.
Run: python3 tools/make_cramlab_icon.py [palette] [out.png]   (palettes: amber, grape, mint)"""
from PIL import Image
import os, sys

# C cream, O holes and the rim line under the collar (where the neck meets the body). The shadow (D) is added automatically one pixel right and below.
FLASK = [
    "................",
    "................",
    "....CCCCCCCC....",
    "......CCCC......",
    "......CCCC......",
    ".....CCCCCC.....",
    ".....OOOOOOO....",
    "....CCCCCCCC....",
    "....CCOCCCCC....",
    "...CCCCCCCCCC...",
    "...CCCCCCOOCC...",
    "..CCOCCCCOOCCC..",
    "..CCCCCCCCCCCC..",
    "................",
    "................",
    "................",
]
PALETTES = {
    # top / bottom of the background, cream, shadow + holes
    'amber': ((255, 214, 102), (242, 140, 40), (255, 248, 231), (176, 82, 18)),
    'grape': ((196, 160, 255), (124, 82, 224), (255, 248, 231), (74, 40, 150)),
    'mint':  ((134, 232, 200), (32, 168, 140), (255, 248, 231), (12, 92, 84)),
}
CELL = 30

def draw(pal):
    TOP, BOT, CREAM, DEEP = PALETTES[pal]
    img = Image.new('RGB', (512, 512)); px = img.load()
    for band in range(16):
        t = band / 15
        c = tuple(round(TOP[i] + (BOT[i] - TOP[i]) * t) for i in range(3))
        for y in range(band * 32, band * 32 + 32):
            for x in range(512): px[x, y] = c
    ox = oy = round(256 - 8 * CELL)
    def cell(x0, y0, size, col):
        for y in range(int(y0), int(y0 + size)):
            for x in range(int(x0), int(x0 + size)): px[x, y] = col
    solid = {(x, y) for y, row in enumerate(FLASK) for x, ch in enumerate(row) if ch in 'CO'}
    # Shadow first: the shape moved one pixel right and down, where the shape itself isn't.
    for (x, y) in solid:
        if (x + 1, y + 1) not in solid: cell(ox + (x + 1) * CELL, oy + (y + 1) * CELL, CELL, DEEP)
    for y, row in enumerate(FLASK):
        for x, ch in enumerate(row):
            if ch == 'C': cell(ox + x * CELL, oy + y * CELL, CELL, CREAM)
            elif ch == 'O': cell(ox + x * CELL, oy + y * CELL, CELL, DEEP)
    # Sparkles (half-size pixels), like CramBoy's.
    h = CELL // 2
    for cx, cy in [(ox + 1.5 * CELL, oy + 3.5 * CELL), (ox + 14.5 * CELL, oy + 1.5 * CELL), (ox + 13.5 * CELL, oy + 6.5 * CELL)]:
        for dx, dy in [(0, 0), (-h, 0), (h, 0), (0, -h), (0, h)]:
            cell(cx + dx - h / 2, cy + dy - h / 2, h, CREAM)
    return img

if __name__ == '__main__':
    pal = sys.argv[1] if len(sys.argv) > 1 else 'amber'
    here = os.path.dirname(os.path.abspath(__file__))
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, '..', 'docs', 'icons', 'cramlab-logo-512.png')
    draw(pal).save(out); print('wrote', out)
