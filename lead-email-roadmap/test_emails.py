"""Checks that the email templates stay Gmail- and Outlook-safe. Run: python3 -m unittest test_emails.py"""
import re
import unittest
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
EMAILS = ["email-autoreply.html", "email-followup.html"]
GMAIL_CLIP = 102 * 1024  # Gmail clips messages over ~102 KB


class EmailTemplates(unittest.TestCase):
    def test_under_gmail_clip_limit(self):
        for name in EMAILS:
            self.assertLess((HERE / name).stat().st_size, GMAIL_CLIP, name)

    def test_no_external_css_or_scripts(self):
        for name in EMAILS:
            html = (HERE / name).read_text()
            self.assertNotIn("<script", html, name)
            self.assertNotRegex(html, r'<link[^>]+stylesheet', name)

    def test_outlook_button_fallback(self):
        for name in EMAILS:
            html = (HERE / name).read_text()
            self.assertIn("<v:roundrect", html, name)
            self.assertIn('xmlns:w="urn:schemas-microsoft-com:office:word"', html, name)

    def test_images_have_size_and_alt(self):
        for name in EMAILS:
            for img in re.findall(r"<img\b[^>]*>", (HERE / name).read_text()):
                for attr in ("width=", "height=", "alt="):
                    self.assertIn(attr, img, f"{name}: {img}")

    def test_roadmap_has_four_steps(self):
        html = (HERE / "email-autoreply.html").read_text()
        self.assertIn("step 1 of 4", html)
        self.assertEqual(len(re.findall(r'<td width="25%"', html)), 4)


class Thumbnail(unittest.TestCase):
    def test_gif_animated_small_and_play_on_first_frame(self):
        path = HERE / "thumb.gif"
        self.assertLess(path.stat().st_size, 1024 * 1024)
        with Image.open(path) as gif:
            self.assertGreater(gif.n_frames, 1)
            gif.seek(0)
            first = gif.convert("RGB")
            w, h = first.size
            # centre of the play button circle, teal (#3fb6a8) on frame one
            r, g, b = first.getpixel((w // 2 - 30, (h - 64) // 2 + 6))
            self.assertTrue(abs(r - 0x3F) < 30 and abs(g - 0xB6) < 30 and abs(b - 0xA8) < 30, (r, g, b))


if __name__ == "__main__":
    unittest.main()
