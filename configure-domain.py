#!/usr/bin/env python3
from pathlib import Path
from urllib.parse import urlparse
import sys

ROOT = Path(__file__).resolve().parent
FILES = [ROOT / "index.html", ROOT / "robots.txt", ROOT / "sitemap.xml"]
TOKEN = "https://YOUR-DOMAIN.com"


def normalize(value: str) -> str:
    value = value.strip().rstrip("/")
    if not value.startswith(("http://", "https://")):
        value = "https://" + value
    parsed = urlparse(value)
    if not parsed.netloc or parsed.path not in ("", "/"):
        raise ValueError("Use only the site origin, e.g. https://skying.example.com")
    return f"{parsed.scheme}://{parsed.netloc}"


def main():
    raw = sys.argv[1] if len(sys.argv) > 1 else input("Skying domain (e.g. https://skying.example.com): ")
    try:
        domain = normalize(raw)
    except ValueError as exc:
        print(f"Error: {exc}")
        raise SystemExit(1)

    changed = 0
    for path in FILES:
        text = path.read_text(encoding="utf-8")
        if TOKEN in text:
            path.write_text(text.replace(TOKEN, domain), encoding="utf-8")
            changed += 1
        elif domain in text:
            pass
        else:
            print(f"Warning: no placeholder found in {path.name}")

    print(f"Configured Skying for {domain}/")
    print(f"Updated {changed} file(s). You can now commit and deploy.")

if __name__ == "__main__":
    main()
