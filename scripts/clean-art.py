import sys, os
from PIL import Image, ImageOps, ImageFilter, ImageChops
inp, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
def load(name): return ImageOps.exif_transpose(Image.open(os.path.join(inp, name))).convert('RGB')
def crop_frac(im, box):
    w, h = im.size; return im.crop((int(box[0]*w), int(box[1]*h), int(box[2]*w), int(box[3]*h)))
def pct(im, p):
    h = im.histogram(); n = sum(h); acc = 0
    for v, c in enumerate(h):
        acc += c
        if acc >= n * p / 100: return v
    return 255
def ink(im, ink_rgb=(27,22,32), gamma=0.7, lo_pct=1.5, hi_pct=97.0, max_w=1800):
    """pencil on paper -> ink + alpha. Additive flat-field (L - blur + 200) kills paper tint, shading and shadows."""
    if im.width > max_w: im = im.resize((max_w, int(im.height*max_w/im.width)), Image.LANCZOS)
    L = im.convert('L')
    blur = L.filter(ImageFilter.GaussianBlur(60))
    flat = ImageChops.subtract(L, blur, 1.0, 200)
    h = flat.histogram(); mode = max(range(256), key=lambda v: h[v])
    lo, hi = pct(flat, lo_pct), mode - 8  # paper = histogram mode → fully transparent
    span = max(hi - lo, 1)
    lut = [int(255 * (min(max((hi - v) / span, 0.0), 1.0) ** gamma)) for v in range(256)]
    a = flat.point(lut)
    rgba = Image.new('RGBA', im.size, ink_rgb + (0,)); rgba.putalpha(a)
    return rgba
def even_light(im, max_w=1600):
    """photographed painting: per-channel additive flat-field removes the shadow band, then autocontrast"""
    if im.width > max_w: im = im.resize((max_w, int(im.height*max_w/im.width)), Image.LANCZOS)
    L = im.convert('L').filter(ImageFilter.GaussianBlur(260))
    target = pct(L, 95)
    chans = [ImageChops.subtract(c, L, 1.0, target) for c in im.split()]
    return ImageOps.autocontrast(Image.merge('RGB', chans), cutoff=0.5)
def trim_alpha(im, pad=8):
    bbox = im.getchannel('A').point(lambda v: 255 if v > 18 else 0).getbbox()
    if not bbox: return im
    return im.crop((max(0,bbox[0]-pad), max(0,bbox[1]-pad), min(im.width,bbox[2]+pad), min(im.height,bbox[3]+pad)))

p1 = load('page1.webp')
pieces = {
  'eyes':    (p1, (0.05, 0.11, 0.66, 0.27)),
  'lily':    (p1, (0.055, 0.25, 0.52, 0.60)),
  'dagger':  (p1, (0.50, 0.27, 0.95, 0.98)),
  'vine':    (p1, (0.08, 0.50, 0.66, 0.88)),
  'punchlines': (load('punchlines.jpg'), (0.11, 0.02, 0.98, 0.98)),
  'portrait-sketch': (load('portrait-sketch.jpg'), (0.12, 0.17, 0.88, 0.98)),
}
for name, (im, box) in pieces.items():
    r = trim_alpha(ink(crop_frac(im, box))); r.save(os.path.join(out, f'{name}.png')); print(name, r.size)
mart = even_light(crop_frac(load('martini.jpg'), (0.06, 0.19, 0.93, 0.93))); mart.save(os.path.join(out, 'martini.png')); print('martini', mart.size)
por = even_light(crop_frac(load('portrait-paint.jpg'), (0.12, 0.02, 0.82, 0.80))); por.save(os.path.join(out, 'portrait-paint.png')); print('portrait-paint', por.size)
names = ['eyes','lily','dagger','vine','punchlines','portrait-sketch','martini','portrait-paint']
sheet = Image.new('RGBA', (440*4, 440*2), (247,241,230,255))
for i, n in enumerate(names):
    im = Image.open(os.path.join(out, n + '.png')).convert('RGBA'); im.thumbnail((420, 420), Image.LANCZOS)
    tile = Image.new('RGBA', (440, 440), (247, 241, 230, 255)); tile.alpha_composite(im, ((440-im.width)//2, (440-im.height)//2))
    sheet.paste(tile, ((i%4)*440, (i//4)*440))
sheet.convert('RGB').save(os.path.join(out, '_sheet.jpg'), quality=80)
