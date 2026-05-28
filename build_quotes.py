import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent
TXT_DIR = ROOT / "txt"
OUTPUT_PATH = ROOT / "data" / "quotes.json"

ENTRY_PATTERN = re.compile(
    r"日语：\s*\n(?P<jp>.*?)\n中文：\s*\n(?P<zh>.*?)(?=\n\s*\n日语：|\Z)",
    re.DOTALL,
)


def detect_volume(path: Path) -> int:
    match = re.search(r"(\d+)(?=\.txt$)", path.name, re.IGNORECASE)
    if not match:
        raise ValueError(f"无法从文件名识别卷号: {path.name}")
    return int(match.group(1))


def parse_entries(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8").replace("\r\n", "\n").strip()
    volume = detect_volume(path)
    entries = []

    for match in ENTRY_PATTERN.finditer(text):
        jp = match.group("jp").strip()
        zh = match.group("zh").strip()
        if not jp or not zh:
            continue
        entries.append(
            {
                "jp": jp,
                "zh": zh,
                "volume": volume,
            }
        )

    return entries


def main() -> None:
    if not TXT_DIR.exists():
        raise SystemExit(f"找不到目录: {TXT_DIR}")

    all_entries = []
    for path in sorted(TXT_DIR.glob("*.txt")):
        all_entries.extend(parse_entries(path))

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(all_entries, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"已生成 {OUTPUT_PATH} ，共 {len(all_entries)} 条。")


if __name__ == "__main__":
    main()
