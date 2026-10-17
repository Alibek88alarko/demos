"""Animated video thumbnail for email: play button on frame one (older Outlook shows only the first frame).

Usage: python3 make_thumb.py  ->  writes thumb.gif next to this file.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 560, 315
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def frame(pulse: float) -> Image.Image:
    img = Image.new("RGB", (W, H), "#0f2a3d")
    d = ImageDraw.Draw(img)
    # soft diagonal bands so the frame doesn't look like a flat block
    for i in range(0, W + H, 28):
        d.line([(i, 0), (i - H, H)], fill="#123349", width=12)
    d.rectangle([0, H - 64, W, H], fill="#0b2131")
    title = ImageFont.truetype(FONT, 24)
    sub = ImageFont.truetype(FONT_REG, 16)
    d.text((24, H - 54), "How we work, in 90 seconds", font=title, fill="#ffffff")
    d.text((24, H - 24), "Click to watch and pick a time", font=sub, fill="#9fc3d8")
    # play button: ring grows on later frames, the button itself is always there
    cx, cy, r = W // 2, (H - 64) // 2 + 6, 40
    ring = r + int(14 * pulse)
    d.ellipse([cx - ring, cy - ring, cx + ring, cy + ring], outline="#3fb6a8", width=3)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill="#3fb6a8")
    d.polygon([(cx - 13, cy - 20), (cx - 13, cy + 20), (cx + 22, cy)], fill="#ffffff")
    return img


def main() -> None:
    steps = [0.0, 0.25, 0.5, 0.75, 1.0, 0.75, 0.5, 0.25]
    frames = [frame(p).convert("P", palette=Image.ADAPTIVE, colors=32) for p in steps]
    out = Path(__file__).with_name("thumb.gif")
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=120, loop=0, optimize=True)
    print(f"{out.name}: {out.stat().st_size // 1024} KB, {len(frames)} frames")


if __name__ == "__main__":
    main()
