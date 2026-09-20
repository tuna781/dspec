"""Render the two label strips that sit above each pane of the split recording."""
from PIL import Image, ImageDraw, ImageFont

BG = (28, 28, 44); DIM = (127, 132, 156); RULE = (49, 50, 68)
RED = (243, 139, 168); GREEN = (166, 227, 161)
W, H = 1000, 64

bold = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 26)
small = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 18)


def strip(path, title, sub, accent):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 6, H], fill=accent)
    d.text((26, 14), title, font=bold, fill=accent)
    d.text((28 + d.textlength(title, font=bold), 22), "   " + sub, font=small, fill=DIM)
    d.line([(0, H - 1), (W, H - 1)], fill=RULE)
    im.save(path)


strip("label-without.png", "WITHOUT dspec", "same repo, no .ds/ map", RED)
strip("label-with.png", "WITH dspec", "the map is committed", GREEN)
