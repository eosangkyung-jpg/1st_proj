"""DIVE 소개 페이지(site/) 재료 만들기 — 11/2

site/ 는 제출 저장소에 들어가는 서비스 결과물(소개 페이지 + 시연)이다.
원본이 git 밖(test-web/, ref_image/, records/)에 있어서, 원본을 고친 뒤 이 스크립트로 다시 복사한다.

    python site/build_site.py

1. 시연: test-web/ 의 화면 파일 → site/demo/  (config.js 의 시트 주소는 비움 — 시연은 기록을 보내지 않음)
2. 첫 화면 루프(폴더 이름은 footer 그대로): ref_image/footer_loop/ 의 그림 → site/footer/ (PNG → WebP로 용량 줄임)
(11/2 첫 화면이 바다 루프로 바뀌어 B v2 캡처 그림은 쓰지 않음)
"""
import re
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
TW = ROOT / "test-web"


def demo():
    out = SITE / "demo"
    if out.exists():
        shutil.rmtree(out)
    (out / "css").mkdir(parents=True)
    (out / "js" / "artworks").mkdir(parents=True)
    (out / "assets").mkdir(parents=True)
    shutil.copy(TW / "index.html", out / "index.html")
    shutil.copy(TW / "css" / "style.css", out / "css" / "style.css")
    for f in (TW / "js").glob("*.js"):
        shutil.copy(f, out / "js" / f.name)
    for f in (TW / "js" / "artworks").glob("*.js"):
        shutil.copy(f, out / "js" / "artworks" / f.name)
    for pat in ("*.jpg", "*.webp"):
        for f in (TW / "assets").glob(pat):
            shutil.copy(f, out / "assets" / f.name)
    cfg = out / "js" / "config.js"
    text = cfg.read_text(encoding="utf-8")
    text = re.sub(r"SHEET_URL:\s*'[^']*'", "SHEET_URL: ''", text)
    cfg.write_text(text, encoding="utf-8")
    # 시연 화면 탭 이름
    html = out / "index.html"
    html.write_text(html.read_text(encoding="utf-8").replace("<title>명화 해설 화면 테스트</title>", "<title>DIVE 시연</title>"), encoding="utf-8")


def footer():
    src = ROOT / "ref_image" / "footer_loop"
    out = SITE / "footer"
    out.mkdir(parents=True, exist_ok=True)
    Image.open(src / "bg.png").convert("RGB").save(out / "bg.webp", "WEBP", quality=88, method=6)
    Image.open(src / "paint.png").save(out / "paint.webp", "WEBP", quality=88, method=6)
    Image.open(src / "sub.png").save(out / "sub.webp", "WEBP", quality=92, method=6)
    shutil.copy(src / "config.js", out / "config.js")


def shots():
    src = ROOT / "records" / "screens_board_20261102_v3" / "shots"
    out = SITE / "img"
    out.mkdir(parents=True, exist_ok=True)
    pick = {"B_12.png": "scene_spot.webp"}  # 01 문제 다음 "DIVE는 이렇게 풀어요" (11/2)
    for name, dst in pick.items():
        im = Image.open(src / name).convert("RGB")
        im = im.resize((603, round(im.height * 603 / im.width)), Image.LANCZOS)
        im.save(out / dst, "WEBP", quality=82, method=6)


def illus():
    """01 문제 일러스트: 딥틱 한 장을 가운데 틈(x 740~796)에서 반씩 자르고, 바탕 크림(#FEEBCB)을 페이지 크림(#FFEFD1)에 맞춤"""
    src = ROOT / "ref_image" / "골동품 판화풍 미술 감상 딥틱.png"
    out = SITE / "img"
    out.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert("RGB")
    w, h = im.size
    fx = [255 / 254, 239 / 235, 209 / 203]  # 이미지 크림 → 페이지 크림
    im = Image.merge("RGB", [ch.point(lambda v, f=f: min(255, round(v * f))) for ch, f in zip(im.split(), fx)])
    mid = 768
    for box, name in [((0, 0, mid, h), "problem_audio.webp"), ((mid, 0, w, h), "problem_text.webp")]:
        part = im.crop(box).resize((600, round(h * 600 / (box[2] - box[0]))), Image.LANCZOS)
        part.save(out / name, "WEBP", quality=84, method=6)


def weed_front():
    """(11/2 사용자) 첫 화면 DIVE 글자를 왼쪽 해초 뒤에 두기 위한 앞 레이어: 바다 그림 왼쪽(x 0~780)에서
    크림색 선만 남기고 파란 바다는 투명하게 (두 색 판화라 밝기로 가름). 장면과 같은 1915×821 크기"""
    import numpy as np
    bg = Image.open(ROOT / "ref_image" / "footer_loop" / "bg.png").convert("RGB")
    a = np.asarray(bg).astype(np.float32)
    lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    # 바다(약 60) → 0, 크림(약 235) → 1 사이를 부드럽게
    t = np.clip((lum - 95) / (200 - 95), 0, 1)
    alpha = t * t * (3 - 2 * t)
    # 잎 안쪽의 파란 해칭선까지 채움(닫기 = 넓혔다 좁히기) → 글자가 잎 속으로 비치지 않고 잎이 통째로 앞에 옴
    from PIL import ImageFilter
    m = Image.fromarray((alpha * 255).astype(np.uint8), "L")
    m = m.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9)).filter(ImageFilter.GaussianBlur(0.8))
    alpha = np.maximum(alpha, np.asarray(m).astype(np.float32) / 255)
    alpha[:, 780:] = 0                                   # 왼쪽 해초만
    alpha[:150, :] = 0                                   # 해초 위 빈 바다
    fade = np.clip((780 - np.arange(a.shape[1])) / 40, 0, 1)  # 오른쪽 끝은 40px에 걸쳐 흐리게
    alpha *= fade[None, :]
    rgba = np.dstack([a, alpha * 255]).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(SITE / "footer" / "weed_front.webp", "WEBP", quality=90, method=6)


def og():
    """링크 공유 미리보기(og.jpg 1200×630): 바다 그림 위쪽에 같은 바다색을 이어 붙이고 DIVE (Marcellus)
    글꼴 파일 경로는 환경 변수 MARCELLUS_TTF (Google Fonts, OFL)"""
    import os
    from PIL import ImageDraw, ImageFont
    bg = Image.open(ROOT / "ref_image" / "footer_loop" / "bg.png").convert("RGB")
    sub = Image.open(ROOT / "ref_image" / "footer_loop" / "sub.png").convert("RGBA")
    W, H = 1915, round(1915 * 630 / 1200)              # 1915×1005
    canvas = Image.new("RGB", (W, H), (2, 50, 127))      # 바다 #02327F
    # 위쪽 빈 곳은 그림의 빈 바다 질감(왼쪽 위, 물체 없는 곳)을 뒤집어 이어 붙여 경계가 안 보이게
    top = H - bg.height
    patch = bg.crop((0, 0, 1100, top)).transpose(Image.FLIP_TOP_BOTTOM)
    for x in range(0, W, patch.width):
        canvas.paste(patch, (x, 0))
    canvas.paste(bg, (0, top))
    canvas.paste(sub, (798, H - bg.height + 404), sub)   # config.js의 잠수함 자리
    d = ImageDraw.Draw(canvas)
    font = ImageFont.truetype(os.environ["MARCELLUS_TTF"], 230)
    x, y = 150, 120
    for ch, kern in zip("DIVE", [-0.08, -0.03, -0.03, 0]):  # 첫 화면과 같은 자간
        d.text((x, y), ch, font=font, fill=(255, 247, 215))
        x += font.getlength(ch) + kern * 230
    canvas.resize((1200, 630), Image.LANCZOS).save(SITE / "img" / "og.jpg", quality=85, optimize=True)


if __name__ == "__main__":
    demo()
    footer()
    illus()
    shots()
    weed_front()
    og()
    for f in sorted(SITE.rglob("*")):
        if f.is_file() and f.suffix in {".webp", ".jpg"}:
            print(f"{f.stat().st_size / 1024:8.0f} KB  {f.relative_to(SITE)}")
