import argparse
import asyncio
import json
import os
import subprocess
import time
import urllib.request
from pathlib import Path

import websockets


CHROME_PATHS = [
    Path(os.environ.get("PROGRAMFILES", "")) / "Google/Chrome/Application/chrome.exe",
    Path(os.environ.get("PROGRAMFILES(X86)", "")) / "Google/Chrome/Application/chrome.exe",
]


def resolve_chrome_path() -> Path:
    for candidate in CHROME_PATHS:
        if candidate.exists():
            return candidate
    raise FileNotFoundError("Could not find chrome.exe")


def wait_for_debugger(port: int, timeout_seconds: int = 20) -> str:
    deadline = time.time() + timeout_seconds
    version_url = f"http://127.0.0.1:{port}/json/version"

    while time.time() < deadline:
        try:
            with urllib.request.urlopen(version_url, timeout=2) as response:
                payload = json.loads(response.read().decode("utf-8"))
                ws_url = payload.get("webSocketDebuggerUrl", "")
                if ws_url:
                    return ws_url
        except Exception:
            time.sleep(0.5)

    raise TimeoutError("Chrome remote debugger did not start in time.")


async def get_cookies(ws_url: str):
    async with websockets.connect(ws_url, max_size=None) as websocket:
        await websocket.send(json.dumps({"id": 1, "method": "Storage.getCookies"}))
        while True:
            message = json.loads(await websocket.recv())
            if message.get("id") == 1:
                return message["result"]["cookies"]


def to_netscape_rows(cookies: list[dict], domains: list[str]):
    rows = []
    for cookie in cookies:
        domain = cookie.get("domain", "")
        if not any(entry in domain for entry in domains):
            continue
        expires = int(cookie.get("expires", 0) or 0)
        rows.append(
            "\t".join(
                [
                    domain,
                    "TRUE" if domain.startswith(".") else "FALSE",
                    cookie.get("path", "/"),
                    "TRUE" if cookie.get("secure") else "FALSE",
                    str(expires),
                    cookie.get("name", ""),
                    cookie.get("value", ""),
                ]
            )
        )
    return rows


def main():
    parser = argparse.ArgumentParser(description="Export Google/YouTube cookies through Chrome DevTools Protocol.")
    parser.add_argument("--profile", default="Profile 1")
    parser.add_argument("--output", required=True)
    parser.add_argument("--port", type=int, default=9222)
    parser.add_argument(
        "--domain",
        action="append",
        dest="domains",
        default=["youtube.com", "google.com", "accounts.google.com"],
    )
    args = parser.parse_args()

    user_data_dir = Path(os.environ["LOCALAPPDATA"]) / "Google/Chrome/User Data"
    chrome_path = resolve_chrome_path()

    subprocess.run(["taskkill", "/IM", "chrome.exe", "/F"], capture_output=True)

    process = subprocess.Popen(
        [
            str(chrome_path),
            f"--remote-debugging-port={args.port}",
            "--remote-allow-origins=*",
            f'--user-data-dir={user_data_dir}',
            f'--profile-directory={args.profile}',
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    try:
        ws_url = wait_for_debugger(args.port)
        cookies = asyncio.run(get_cookies(ws_url))
        rows = to_netscape_rows(cookies, args.domains)
        if not rows:
            raise SystemExit("No matching cookies were returned from Chrome.")

        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text("# Netscape HTTP Cookie File\n" + "\n".join(rows) + "\n", "utf-8")
        print(
            json.dumps(
                {
                    "profile": args.profile,
                    "cookie_count": len(rows),
                    "output": str(output_path),
                },
                indent=2,
            )
        )
    finally:
        process.terminate()


if __name__ == "__main__":
    main()
