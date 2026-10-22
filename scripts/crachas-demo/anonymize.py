"""
Anonymizes the badge-management screens for the public portfolio (Ana, 2026-10-22: "Anonimizar"): the client's logo
(header of every screen + the badge preview) becomes a neutral fictional mark, "ENERGIA S.A.", and the one real e-mail
domain becomes @empresa.com.br. The logo is found by its exact yellow (the "BR" box; rendered ≈ rgb(242,192,66)) inside two windows, so it
follows small layout shifts between screens. Usage: python3 anonymize.py <dir with p1.jpg…> (renders, any width).
"""
import sys, glob, os
from PIL import Image, ImageDraw, ImageFont

FONT = '/System/Library/Fonts/HelveticaNeue.ttc'
GREEN = (0, 155, 85)

def yellow_box(px, x0, y0, x1, y1):
    xs, ys = [], []
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b = px[x, y][:3]
            if r > 228 and 178 < g < 210 and 40 < b < 95:
                xs.append(x); ys.append(y)
    if len(xs) < 20:
        return None
    return min(xs), min(ys), max(xs), max(ys)

def mark(img, draw, x, y, k):
    """neutral mark at the logo's origin: a green tile with "ID" and the word ENERGIA S.A."""
    s = round(27 * k)
    draw.rounded_rectangle([x, y, x + s, y + s], radius=round(6 * k), fill=GREEN)
    f = ImageFont.truetype(FONT, round(12 * k), index=1)
    tw = draw.textlength('ID', font=f)
    draw.text((x + (s - tw) / 2, y + s / 2), 'ID', font=f, fill='white', anchor='lm')
    w = ImageFont.truetype(FONT, round(14 * k), index=1)
    draw.text((x + s + round(8 * k), y + s / 2), 'ENERGIA S.A.', font=w, fill=GREEN, anchor='lm')

def cover(img, draw, box, k, pad):
    x0, y0, x1, y1 = box
    # the logo is ~135 × 28 (1100-px page units) from its yellow corner; sample the background just above it (to its
    # left the header has a faint grey edge, which showed as a box)
    bg = img.getpixel((x0 + round(60 * k), max(0, y0 - round(pad * k) - 3)))
    draw.rectangle([x0 - round(pad * k), y0 - round(pad * k), x0 + round(138 * k), y0 + round(31 * k)], fill=bg)
    mark(img, draw, x0, y0, k)

for path in sorted(glob.glob(os.path.join(sys.argv[1], 'p*.jpg'))):
    img = Image.open(path).convert('RGB'); px = img.load(); draw = ImageDraw.Draw(img)
    k = img.width / 1100
    n = int(os.path.basename(path)[1:-4])
    head = yellow_box(px, round(25 * k), round(5 * k), round(90 * k), round(55 * k))
    if head: cover(img, draw, head, k, 4)
    # the badge preview on the request and tracking screens
    badge = yellow_box(px, round(780 * k), round(150 * k), round(1000 * k), min(img.height, round(560 * k)))
    if badge: cover(img, draw, badge, k, 4)
    if n == 5:  # the one e-mail on screen
        x, y = round(399 * k), round(771 * k)
        bg = img.getpixel((round(395 * k), round(781 * k)))
        draw.rectangle([x, y, round(610 * k), round(792 * k)], fill=bg)
        draw.text((round(401 * k), round(782 * k)), 'joao.miguel@empresa.com.br', font=ImageFont.truetype(FONT, round(11.5 * k), index=0), fill=(51, 51, 51), anchor='lm')
    img.save(path, quality=84)
    print(os.path.basename(path), 'header' if head else '-', 'badge' if badge else '-')
