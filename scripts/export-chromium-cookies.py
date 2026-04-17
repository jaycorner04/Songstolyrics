import argparse
import base64
import ctypes
import ctypes.wintypes
import json
import shutil
import sqlite3
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


CHROME_EPOCH_OFFSET = 11644473600
SUPPORTED_BROWSERS = {
    "chrome": Path.home() / "AppData/Local/Google/Chrome/User Data",
    "edge": Path.home() / "AppData/Local/Microsoft/Edge/User Data",
}
DEFAULT_DOMAINS = [
    "youtube.com",
    ".youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "accounts.google.com",
    ".google.com",
    "google.com",
]
DEFAULT_AUTH_NAMES = {
    "SAPISID",
    "__Secure-1PAPISID",
    "__Secure-3PAPISID",
    "SID",
    "HSID",
    "SSID",
    "LOGIN_INFO",
    "VISITOR_INFO1_LIVE",
    "PREF",
    "YSC",
}


class DATA_BLOB(ctypes.Structure):
    _fields_ = [
        ("cbData", ctypes.wintypes.DWORD),
        ("pbData", ctypes.POINTER(ctypes.c_byte)),
    ]


crypt32 = ctypes.windll.crypt32
kernel32 = ctypes.windll.kernel32


def dpapi_unprotect_bytes(encrypted_bytes: bytes) -> bytes:
    if not encrypted_bytes:
        return b""

    in_blob = DATA_BLOB(len(encrypted_bytes), ctypes.cast(ctypes.create_string_buffer(encrypted_bytes), ctypes.POINTER(ctypes.c_byte)))
    out_blob = DATA_BLOB()
    if not crypt32.CryptUnprotectData(
        ctypes.byref(in_blob),
        None,
        None,
        None,
        None,
        0,
        ctypes.byref(out_blob),
    ):
        raise ctypes.WinError()

    try:
        return ctypes.string_at(out_blob.pbData, out_blob.cbData)
    finally:
        kernel32.LocalFree(out_blob.pbData)


def load_master_key(browser_root: Path) -> bytes:
    local_state_path = browser_root / "Local State"
    local_state = json.loads(local_state_path.read_text("utf-8"))
    encrypted_key_b64 = local_state["os_crypt"]["encrypted_key"]
    encrypted_key = base64.b64decode(encrypted_key_b64)
    if encrypted_key.startswith(b"DPAPI"):
        encrypted_key = encrypted_key[5:]
    return dpapi_unprotect_bytes(encrypted_key)


def decrypt_cookie_value(encrypted_value: bytes, master_key: bytes) -> str:
    if not encrypted_value:
        return ""

    if encrypted_value.startswith((b"v10", b"v11", b"v20")):
        nonce = encrypted_value[3:15]
        ciphertext = encrypted_value[15:]
        aesgcm = AESGCM(master_key)
        return aesgcm.decrypt(nonce, ciphertext, None).decode("utf-8", errors="ignore")

    return dpapi_unprotect_bytes(encrypted_value).decode("utf-8", errors="ignore")


def to_unix_expiry(expires_utc: int) -> int:
    if not expires_utc:
        return 0
    return max(0, int(expires_utc / 1_000_000) - CHROME_EPOCH_OFFSET)


def candidate_cookie_paths(profile_root: Path):
    return [
        profile_root / "Network/Cookies",
        profile_root / "Cookies",
    ]


def find_cookie_db(profile_root: Path):
    for candidate in candidate_cookie_paths(profile_root):
        if candidate.exists():
            return candidate
    return None


@dataclass
class ProfileResult:
    browser: str
    profile: str
    cookie_path: Path
    rows: list
    auth_hits: int


def export_profile(browser: str, browser_root: Path, profile_name: str, domains: list[str]) -> ProfileResult | None:
    profile_root = browser_root / profile_name
    cookie_path = find_cookie_db(profile_root)
    if not cookie_path:
        return None

    master_key = load_master_key(browser_root)
    temp_copy = Path(tempfile.gettempdir()) / f"codex-cookie-export-{browser}-{profile_name.replace(' ', '_')}.sqlite"
    db_target = str(temp_copy)
    db_target_is_uri = False
    try:
        shutil.copy2(cookie_path, temp_copy)
    except Exception:
        db_target = f"{cookie_path.resolve().as_uri()}?mode=ro&immutable=1"
        db_target_is_uri = True

    rows = []
    auth_hits = 0
    connection = None
    try:
        connection = sqlite3.connect(db_target, uri=db_target_is_uri)
        connection.row_factory = sqlite3.Row
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT host_key, path, is_secure, expires_utc, name, encrypted_value, value
            FROM cookies
            """
        )
        for row in cursor.fetchall():
            host_key = row["host_key"] or ""
            if not any(domain in host_key for domain in domains):
                continue
            encrypted_value = row["encrypted_value"] or b""
            plaintext = row["value"] or ""
            if not plaintext:
                try:
                    plaintext = decrypt_cookie_value(encrypted_value, master_key)
                except Exception:
                    plaintext = ""
            if not plaintext:
                continue

            name = row["name"] or ""
            entry = {
                "domain": host_key,
                "include_subdomains": "TRUE" if host_key.startswith(".") else "FALSE",
                "path": row["path"] or "/",
                "secure": "TRUE" if row["is_secure"] else "FALSE",
                "expires": to_unix_expiry(int(row["expires_utc"] or 0)),
                "name": name,
                "value": plaintext,
            }
            rows.append(entry)
            if name in DEFAULT_AUTH_NAMES:
                auth_hits += 1
    finally:
        try:
            connection.close()
        except Exception:
            pass
        if temp_copy.exists():
            try:
                temp_copy.unlink()
            except Exception:
                pass

    if not rows:
        return None

    return ProfileResult(
        browser=browser,
        profile=profile_name,
        cookie_path=cookie_path,
        rows=rows,
        auth_hits=auth_hits,
    )


def write_netscape_cookie_file(output_path: Path, rows: list[dict]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    lines = ["# Netscape HTTP Cookie File"]
    seen = set()

    for row in rows:
        key = (row["domain"], row["path"], row["name"])
        if key in seen:
            continue
        seen.add(key)
        lines.append(
            "\t".join(
                [
                    row["domain"],
                    row["include_subdomains"],
                    row["path"],
                    row["secure"],
                    str(row["expires"]),
                    row["name"],
                    row["value"],
                ]
            )
        )

    output_path.write_text("\n".join(lines) + "\n", "utf-8")


def profile_names(browser_root: Path):
    names = []
    for candidate in ["Default", "Profile 1", "Profile 2", "Profile 3"]:
        if (browser_root / candidate).exists():
            names.append(candidate)
    return names


def main():
    parser = argparse.ArgumentParser(description="Export Chromium YouTube/Google cookies into Netscape format.")
    parser.add_argument("--browser", choices=sorted(SUPPORTED_BROWSERS), default="chrome")
    parser.add_argument("--output", required=True)
    parser.add_argument("--profile")
    parser.add_argument("--domain", action="append", dest="domains")
    args = parser.parse_args()

    browser_root = SUPPORTED_BROWSERS[args.browser]
    domains = args.domains or DEFAULT_DOMAINS
    profiles = [args.profile] if args.profile else profile_names(browser_root)

    results = []
    for profile_name in profiles:
        try:
            result = export_profile(args.browser, browser_root, profile_name, domains)
            if result:
                results.append(result)
        except Exception as error:
            print(f"skip {profile_name}: {error}", file=sys.stderr)

    if not results:
        raise SystemExit("No readable Chromium cookies were exported from the selected browser profiles.")

    best = sorted(results, key=lambda item: (item.auth_hits, len(item.rows)), reverse=True)[0]
    write_netscape_cookie_file(Path(args.output), best.rows)

    print(
        json.dumps(
            {
                "browser": best.browser,
                "profile": best.profile,
                "cookie_path": str(best.cookie_path),
                "row_count": len(best.rows),
                "auth_hits": best.auth_hits,
                "output": str(Path(args.output)),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
