import asyncio
import json
import os
import re
import sys
import time
from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone
from dateutil import tz
from typing import Any, Dict, List, Optional, Set, Tuple

from playwright.async_api import async_playwright, Page, BrowserContext

# =============================================================================

# CONFIG (from your MASTER v0.9.3.3)

# =============================================================================

TIMEZONE = "Europe/Warsaw"
LOCAL_TZ = tz.gettz(TIMEZONE)

DRY_RUN = False
INTERACTION_MODE = "login_only"

MAX_PRODUCTS_PER_RUN = 300
BASE_PRODUCTS_MAX_PAGES = 20
TRADERA_MAX_NEW_LISTINGS = 300
UI_RETRY_MAX = 3

ENABLE_IMAGE_DOWNLOADS = True
MAX_IMAGES_TO_DOWNLOAD_PER_PRODUCT = 12
IMAGE_DOWNLOAD_RETRY_MAX = 2

LOGIN_CHECK_INTERVAL_SEC = 3
LOGIN_MAX_WAIT_SEC = 3600
LOGIN_MIN_WAIT_SEC = 15
LOGIN_MAX_CHECKS = 1200

BASE_LOGIN_URL = "https://login.baselinker.com/?lang=pl"
BASE_PANEL_URL = "https://panel.base.com/"
BASE_LIST_PRODUCTS_URL = "https://panel.base.com/inventory_products.php"

TRADERA_LOGIN_URL = "https://www.tradera.com/en/login"
TRADERA_ACTIVE_LISTINGS_URL = "https://www.tradera.com/en/my/listings?tab=active"
TRADERA_NEW_LISTING_ENTRY_URL = "https://www.tradera.com/en/sell"

BASE_FILTER_BUTTON_LABEL = "Filtrowanie produktów"
BASE_FILTER_SAVED_LABEL = "Zapisane filtry"
BASE_FILTER_CLEAR_LABEL = "Wyczyść filtry"
BASE_FILTER_APPLY_LABEL = "Ustaw filtry"
BASE_FILTER_SUMMARY_HEADER = "PODSUMOWANIE WYBRANYCH FILTRÓW"
BASE_FILTER_TRADERA_WYSTAWKA = "TRADERA - Wystawka"

BASE_FILTER_EXPECTED_SUMMARY_TOKENS = [
"Tradera",
"różne",
"Yes",
"Stan",
"0",
"Market Exclusion",
"nie zawiera",
"Tradera",
]

BASE_ROW_EDIT_ACTION_LABEL = "Edytuj"

BASE_LANGUAGE_SELECTOR_LABEL = "Język"
BASE_LANGUAGE_PREFERRED = "EN"
BASE_LANGUAGE_FALLBACK = "PL"

BASE_TAB_SALES_AND_STOCK_LABEL = "Sprzedaż i magazyn"
BASE_PRICE_FIELD_LABEL = "Cena Euro Automat 1.2"
BASE_TAB_INFORMATION_LABEL = "Informacje"
BASE_TAB_MEDIA_LABEL = "Media"

BASE_MARK_FIELD_GROUP_NAME = "Tradera"
BASE_MARK_FIELD_OPTION_LABEL = "Yes"
BASE_MARK_EXCLUSION_SECTION_LABEL = "Market Exclusion"

SMALL_ITEM_MAX_LENGTH_CM = 30.0
SMALL_ITEM_SHIPPING_EUR = 5.0
LARGE_ITEM_SHIPPING_EUR = 20.0

PRICE_MULTIPLIER = 1.0
FORCE_CONDITION_IF_MISSING = "Unused"
FALLBACK_CATEGORY_PATH = "Other / Övrigt / Övrigt"

LOG_PRICE_AND_SHIPPING_DIFFS = True
TRADERA_DUPCHECK_GUARD_STRICT = True

ACTIVITY_LOG_LEVEL = "full"
MAX_ACTIVITY_EVENTS = 200000
ACTIVITY_LOG_TEXT_PREVIEW_CHARS = 120
ACTIVITY_LOG_INCLUDE_SELECTORS = True
ACTIVITY_LOG_INCLUDE_URLS = True
ACTIVITY_LOG_SANITIZE_URL_QUERY = True

# =============================================================================

# SCHEMAS (mirroring your JSON contract) - we don't enforce via jsonschema here,

# but we produce objects that match required fields.

# =============================================================================

def now_iso() -> str:
return datetime.now(tz=LOCAL_TZ).isoformat()

def sanitize_url(url: Optional[str]) -> Optional[str]:
if url is None:
return None
if not ACTIVITY_LOG_SANITIZE_URL_QUERY:
return url
return url.split("?", 1)[0]

def safe_text_preview(text: Optional[str]) -> Optional[str]:
if text is None:
return None
return text[:ACTIVITY_LOG_TEXT_PREVIEW_CHARS]

def eprint(*args):
print(*args, file=sys.stderr)

@dataclass
class ActivityEvent:
seq: int
ts: str
platform: str
tab_id: str
module: str
base_product_id: Optional[str]
event_type: str
action: str
target: Optional[str]
url_before: Optional[str]
url_after: Optional[str]
attempt: int
max_attempts: int
outcome: str
redacted: bool
value_preview: Optional[str]
value_len: Optional[int]
duration_ms: Optional[int]
context: Dict[str, Any]

@dataclass
class PerProductLogEntry:
base_product_id: str
sku: Optional[str]
title: str
base_language_used: str # EN|PL|unknown
downloaded_images_count: int
action: str # created_on_tradera|already_listed_marked|skipped_filter|would_set_stargater|error
tradera_status: str # created|already_active|not_found|would_create|error_search|error_publish|error_auth|error_missing_images
tradera_listing_id: Optional[str]
tradera_listing_url: Optional[str]
base_tradera_stargater_set: bool
base_price_eur: Optional[float]
tradera_price_eur: Optional[float]
shipping_eur: Optional[float]
size_class: str # small|large|unknown
activity_seq_start: Optional[int] = None
activity_seq_end: Optional[int] = None
errors: List[str] = field(default_factory=list)

@dataclass
class RunReport:
meta: Dict[str, Any]
counters: Dict[str, Any]
products: List[Dict[str, Any]]
activity_meta: Dict[str, Any]
activity: List[Dict[str, Any]]

# =============================================================================

# LOGGING

# =============================================================================

class Logger:
def **init**(self):
self.seq = 0
self.events: List[ActivityEvent] = []
self.dropped = 0

    def log(self, *, platform: str, tab_id: str, module: str, base_product_id: Optional[str],
            event_type: str, action: str, target: Optional[str] = None,
            url_before: Optional[str] = None, url_after: Optional[str] = None,
            attempt: int = 0, max_attempts: int = 1, outcome: str = "ok",
            redacted: bool = False, value_preview: Optional[str] = None,
            value_len: Optional[int] = None, duration_ms: Optional[int] = None,
            context: Optional[Dict[str, Any]] = None):
        if context is None:
            context = {}

        evt = ActivityEvent(
            seq=self.seq,
            ts=now_iso(),
            platform=platform,
            tab_id=tab_id,
            module=module,
            base_product_id=base_product_id,
            event_type=event_type,
            action=action,
            target=target,
            url_before=sanitize_url(url_before),
            url_after=sanitize_url(url_after),
            attempt=attempt,
            max_attempts=max_attempts,
            outcome=outcome,
            redacted=redacted,
            value_preview=safe_text_preview(value_preview) if not redacted else None,
            value_len=value_len if not redacted else None,
            duration_ms=duration_ms,
            context=context,
        )
        self.seq += 1

        if len(self.events) >= MAX_ACTIVITY_EVENTS:
            self.dropped += 1
            return
        self.events.append(evt)

    def meta(self) -> Dict[str, Any]:
        total = self.seq
        kept = len(self.events)
        dropped = self.dropped + max(0, total - kept - self.dropped)
        truncated = (kept >= MAX_ACTIVITY_EVENTS) or (dropped > 0)
        return {
            "total_events": total,
            "kept_events": kept,
            "dropped_events": dropped,
            "truncated": truncated,
            "max_events": MAX_ACTIVITY_EVENTS,
        }

# =============================================================================

# UTILITIES: identity guards, retries, modal/popup closing

# =============================================================================

async def close_common_popups(page: Page, logger: Logger, platform: str, tab_id: str, base_product_id: Optional[str], module: str): # Non-destructive best-effort: cookie banners, discounts, newsletters # Adjust selectors per real UI.
candidates = [
("button:has-text('No thanks')", "close_no_thanks"),
("button:has-text('Maybe later')", "close_maybe_later"),
("button:has-text('Nie, dziękuję')", "close_nie_dziekuje"),
("button:has-text('Zamknij')", "close_zamknij"),
("button[aria-label='Close']", "close_aria"),
("[role='dialog'] button:has-text('Close')", "close_dialog_close"),
]
for sel, action in candidates:
try:
el = page.locator(sel).first
if await el.count():
if await el.is_visible():
await el.click(timeout=1000)
logger.log(platform=platform, tab_id=tab_id, module=module, base_product_id=base_product_id,
event_type="modal", action=action, target=sel, outcome="ok")
except Exception:
pass

async def assert_identity_base(page: Page, logger: Logger, tab_id: str, module: str, base_product_id: Optional[str]) -> bool:
url = page.url
ok = "panel.base.com" in url
if not ok: # Sometimes Base uses different subpaths but same domain; we keep strict domain check.
pass
logger.log(platform="Base.com", tab_id=tab_id, module=module, base_product_id=base_product_id,
event_type="assert", action="identity_guard_base",
url_before=url, url_after=url, outcome="ok" if ok else "fail",
context={"url": sanitize_url(url)})
return ok

async def assert_identity_tradera(page: Page, logger: Logger, tab_id: str, module: str, base_product_id: Optional[str]) -> bool:
url = page.url
ok = "tradera.com" in url
logger.log(platform="Tradera", tab_id=tab_id, module=module, base_product_id=base_product_id,
event_type="assert", action="identity_guard_tradera",
url_before=url, url_after=url, outcome="ok" if ok else "fail",
context={"url": sanitize_url(url)})
return ok

def is_login_page_base(url: str) -> bool:
return "login.baselinker.com" in url or "login" in url and "baselinker" in url

def is_login_page_tradera(url: str) -> bool:
return "/login" in url or "login" in url

async def manual_login_handoff(page: Page, logger: Logger, platform: str, tab_id: str, module: str,
login_url: str, success_url: str,
base_product_id: Optional[str],
hint_once_flag: Dict[str, bool], hint_key: str) -> bool: # Return True if logged in successfully, else False on timeout.
start = time.time()
checks = 0

    if not hint_once_flag.get(hint_key, False):
        eprint(f"[LOGIN REQUIRED] Please log in manually in the opened browser tab ({platform}).")
        hint_once_flag[hint_key] = True

    logger.log(platform=platform, tab_id=tab_id, module=module, base_product_id=base_product_id,
               event_type="auth", action="manual_login_handoff_started",
               url_before=page.url, url_after=page.url, outcome="ok",
               redacted=True, context={"mode": "login_only"})

    # Ensure we are on login page (but do NOT click login buttons or type credentials)
    try:
        await page.goto(login_url, wait_until="domcontentloaded")
    except Exception:
        pass

    # Bounded wait loop
    while True:
        await asyncio.sleep(LOGIN_CHECK_INTERVAL_SEC)
        checks += 1
        url = page.url

        # Try navigating to success URL to test auth (without clicking login)
        if checks % 3 == 0:
            try:
                await page.goto(success_url, wait_until="domcontentloaded")
            except Exception:
                pass
            url = page.url

        logged_in = True
        if platform == "Base.com":
            logged_in = ("panel.base.com" in url) and (not is_login_page_base(url))
        else:
            logged_in = ("tradera.com" in url) and (not is_login_page_tradera(url))

        logger.log(platform=platform, tab_id=tab_id, module=module, base_product_id=base_product_id,
                   event_type="wait", action="poll_login_state",
                   url_before=url, url_after=url, attempt=checks, max_attempts=LOGIN_MAX_CHECKS,
                   outcome="ok" if logged_in else "retry",
                   redacted=True, context={"elapsed_sec": int(time.time() - start)})

        if logged_in and (time.time() - start) >= LOGIN_MIN_WAIT_SEC:
            logger.log(platform=platform, tab_id=tab_id, module=module, base_product_id=base_product_id,
                       event_type="auth", action="manual_login_success",
                       url_before=url, url_after=url, outcome="ok",
                       redacted=True, context={})
            return True

        if (time.time() - start) >= LOGIN_MAX_WAIT_SEC or checks >= LOGIN_MAX_CHECKS:
            logger.log(platform=platform, tab_id=tab_id, module=module, base_product_id=base_product_id,
                       event_type="auth", action="manual_login_timeout",
                       url_before=url, url_after=url, outcome="fail",
                       redacted=True, context={"elapsed_sec": int(time.time() - start)})
            return False

# =============================================================================

# DOMAIN-SPECIFIC HELPERS

# =============================================================================

def parse_stock(text: str) -> Optional[int]: # Examples: "4 szt.", "0", "0 szt."
m = re.search(r"(\d+)", text or "")
if not m:
return None
try:
return int(m.group(1))
except Exception:
return None

def parse_price_eur(text: str) -> Optional[float]:
if not text:
return None # tolerate "12,34" or "12.34"
cleaned = text.strip().replace(" ", "")
cleaned = cleaned.replace("\u00a0", "")
m = re.search(r"(\d+(?:[.,]\d+)?)", cleaned)
if not m:
return None
num = m.group(1).replace(",", ".")
try:
return float(num)
except Exception:
return None

def compute_shipping_and_size(dim_cm: Optional[float]) -> Tuple[str, Optional[float]]:
if dim_cm is None:
return ("unknown", None)
if dim_cm <= SMALL_ITEM_MAX_LENGTH_CM:
return ("small", SMALL_ITEM_SHIPPING_EUR)
return ("large", LARGE_ITEM_SHIPPING_EUR)

def translate_pl_to_en_best_effort(pl_text: str) -> Optional[str]: # Stub: you can wire this to your internal translator / OpenAI API if desired. # Contract says "best-effort, no guessing"; if you don't have a translator, return None.
pl_text = (pl_text or "").strip()
if not pl_text:
return None
return None # intentionally disabled by default

# =============================================================================

# MAIN AGENT (M0..M18)

# =============================================================================

class CrossLister:
def **init**(self):
self.logger = Logger()
self.timestamp_start = now_iso()
self.timestamp_end = None

        self.processed_base_product_ids: Set[str] = set()
        self.skipped_base_product_ids: Set[str] = set()
        self.seen_base_product_ids: Set[str] = set()

        self.products_seen = 0
        self.products_after_filter = 0
        self.tradera_created = 0
        self.tradera_already_active = 0
        self.base_marked_stargater = 0
        self.skipped_filter = 0
        self.errors_total = 0
        self.auth_failed_base = False
        self.auth_failed_tradera = False

        self.auth_attempted_base = False
        self.auth_attempted_tradera = False
        self.hint_once = {"base": False, "tradera": False}

        self.effective_new_listing_cap = min(MAX_PRODUCTS_PER_RUN, TRADERA_MAX_NEW_LISTINGS)

    # ---------------- M0 ----------------
    async def M0_init(self):
        self.logger.log(platform="unknown", tab_id="-", module="M0", base_product_id=None,
                        event_type="info", action="init", outcome="ok",
                        context={"dry_run": DRY_RUN, "timezone": TIMEZONE})

    # ---------------- M2 ----------------
    async def M2_login(self, page: Page, platform: str, tab_id: str, login_url: str, success_url: str) -> bool:
        return await manual_login_handoff(
            page=page,
            logger=self.logger,
            platform=platform,
            tab_id=tab_id,
            module="M2",
            login_url=login_url,
            success_url=success_url,
            base_product_id=None,
            hint_once_flag=self.hint_once,
            hint_key="base" if platform == "Base.com" else "tradera",
        )

    # ---------------- M3 ----------------
    async def M3_base_auth(self, pageA: Page):
        self.auth_attempted_base = True
        self.logger.log(platform="Base.com", tab_id="A", module="M3", base_product_id=None,
                        event_type="nav", action="open_base_list", url_before=pageA.url, url_after=BASE_LIST_PRODUCTS_URL,
                        outcome="ok")
        await pageA.goto(BASE_LIST_PRODUCTS_URL, wait_until="domcontentloaded")

        if is_login_page_base(pageA.url) or "login" in pageA.url:
            ok = await self.M2_login(pageA, "Base.com", "A", BASE_LOGIN_URL, BASE_LIST_PRODUCTS_URL)
            if not ok:
                self.auth_failed_base = True
                self.errors_total += 1
                return

        await assert_identity_base(pageA, self.logger, "A", "M3", None)

    # ---------------- M4 ----------------
    async def M4_tradera_auth(self, pageC: Page):
        self.auth_attempted_tradera = True
        self.logger.log(platform="Tradera", tab_id="C", module="M4", base_product_id=None,
                        event_type="nav", action="open_tradera_active", url_before=pageC.url, url_after=TRADERA_ACTIVE_LISTINGS_URL,
                        outcome="ok")
        await pageC.goto(TRADERA_ACTIVE_LISTINGS_URL, wait_until="domcontentloaded")

        if is_login_page_tradera(pageC.url):
            ok = await self.M2_login(pageC, "Tradera", "C", TRADERA_LOGIN_URL, TRADERA_ACTIVE_LISTINGS_URL)
            if not ok:
                self.auth_failed_tradera = True
                self.errors_total += 1
                return

        await assert_identity_tradera(pageC, self.logger, "C", "M4", None)

    # ---------------- M5 ----------------
    async def M5_apply_base_saved_filter(self, pageA: Page) -> bool:
        # HARDLOCK patch: open list, open filter panel, clear, open saved filters dropdown IN PANEL, select, apply, verify
        for attempt in range(1, UI_RETRY_MAX + 1):
            try:
                await pageA.goto(BASE_LIST_PRODUCTS_URL, wait_until="domcontentloaded")
                await close_common_popups(pageA, self.logger, "Base.com", "A", None, "M5")

                # Open filter panel
                btn = pageA.get_by_text(BASE_FILTER_BUTTON_LABEL, exact=False).first
                await btn.click(timeout=5000)

                # Clear filters
                clr = pageA.get_by_text(BASE_FILTER_CLEAR_LABEL, exact=False).first
                if await clr.is_visible():
                    await clr.click(timeout=5000)

                # Open saved filters dropdown INSIDE panel
                # NOTE: you may need to adjust to a real "select" control.
                saved_label = pageA.get_by_text(BASE_FILTER_SAVED_LABEL, exact=False).first
                await saved_label.click(timeout=5000)

                # WRONG DROPDOWN detector: if menu has "Stwórz nowy widok" or "Zarządzanie widokami"
                view_tokens = ["Stwórz nowy widok", "Zarządzanie widokami"]
                menu_text = ""
                try:
                    # best-effort: read visible popup content
                    menu_text = await pageA.locator("body").inner_text(timeout=1000)
                except Exception:
                    pass
                if any(t in menu_text for t in view_tokens):
                    await pageA.keyboard.press("Escape")
                    self.logger.log(platform="Base.com", tab_id="A", module="M5", base_product_id=None,
                                    event_type="assert", action="wrong_dropdown_detected_view_menu",
                                    outcome="ok", attempt=attempt, max_attempts=UI_RETRY_MAX,
                                    context={"tokens_found": [t for t in view_tokens if t in menu_text]})
                    continue

                # Choose saved filter name
                opt = pageA.get_by_text(BASE_FILTER_TRADERA_WYSTAWKA, exact=False).first
                await opt.click(timeout=5000)

                # Apply
                apply_btn = pageA.get_by_text(BASE_FILTER_APPLY_LABEL, exact=False).first
                await apply_btn.click(timeout=5000)

                # Verify summary header + tokens
                hdr = pageA.get_by_text(BASE_FILTER_SUMMARY_HEADER, exact=False).first
                await hdr.wait_for(timeout=8000)

                summary_text = ""
                try:
                    summary_text = await pageA.locator("body").inner_text(timeout=2000)
                except Exception:
                    summary_text = ""

                missing = [t for t in BASE_FILTER_EXPECTED_SUMMARY_TOKENS if t not in summary_text]
                if missing:
                    self.logger.log(platform="Base.com", tab_id="A", module="M5", base_product_id=None,
                                    event_type="assert", action="filter_verify_failed",
                                    outcome="retry", attempt=attempt, max_attempts=UI_RETRY_MAX,
                                    context={"missing_tokens": missing})
                    continue

                self.logger.log(platform="Base.com", tab_id="A", module="M5", base_product_id=None,
                                event_type="assert", action="filter_verify_ok",
                                outcome="ok", attempt=attempt, max_attempts=UI_RETRY_MAX,
                                context={})
                return True

            except Exception as ex:
                self.logger.log(platform="Base.com", tab_id="A", module="M5", base_product_id=None,
                                event_type="error", action="apply_filter_exception",
                                outcome="retry" if attempt < UI_RETRY_MAX else "fail",
                                attempt=attempt, max_attempts=UI_RETRY_MAX,
                                context={"error": str(ex)[:300]})
                await asyncio.sleep(1)

        # RUN-LEVEL SAFETY STOP
        self.errors_total += 1
        return False

    # ---------------- M7 ----------------
    async def M7_select_next_product(self, pageA: Page) -> Optional[str]:
        # Normalize list state each time, ALWAYS run M5 before scanning.
        await pageA.goto(BASE_LIST_PRODUCTS_URL, wait_until="domcontentloaded")
        await close_common_popups(pageA, self.logger, "Base.com", "A", None, "M7")

        ok = await self.M5_apply_base_saved_filter(pageA)
        if not ok:
            return None  # stop run safely

        # Force scroll top and page 1: depends on UI. We do PageUp/Home as generic.
        try:
            await pageA.keyboard.press("Home")
        except Exception:
            pass

        # Scan pages up to BASE_PRODUCTS_MAX_PAGES
        for page_idx in range(1, BASE_PRODUCTS_MAX_PAGES + 1):
            self.logger.log(platform="Base.com", tab_id="A", module="M7", base_product_id=None,
                            event_type="scan", action="scan_page", outcome="ok",
                            context={"page_idx": page_idx})

            # NOTE: You must adjust row locator to actual table rows.
            rows = pageA.locator("tr").filter(has_not=pageA.locator("thead tr"))
            n = await rows.count()
            if n == 0:
                # fallback: div-based list
                rows = pageA.locator("[data-testid='product-row'], .product-row, .inventory-row")
                n = await rows.count()

            for i in range(n):
                row = rows.nth(i)
                try:
                    txt = await row.inner_text(timeout=1000)
                except Exception:
                    continue

                # Extract base_product_id
                m = re.search(r"\bID[:\s]*([0-9]+)\b", txt)
                if not m:
                    continue
                base_id = m.group(1)

                if base_id not in self.seen_base_product_ids:
                    self.seen_base_product_ids.add(base_id)
                    self.products_seen += 1

                if base_id in self.processed_base_product_ids or base_id in self.skipped_base_product_ids:
                    continue

                # OOS guard: read stock from row text (best-effort). Prefer "Stan" column - needs selector tuning.
                stock = None
                # naive parse: look for "szt" near digits
                m2 = re.search(r"(\d+)\s*(?:szt\.|szt|pcs)?", txt)
                if m2:
                    stock = parse_stock(m2.group(0))
                if stock is None or stock <= 0:
                    self.logger.log(platform="Base.com", tab_id="A", module="M7", base_product_id=base_id,
                                    event_type="scan", action="skip_row_stock_zero_or_unknown",
                                    outcome="skip", context={"stock": stock})
                    self.skipped_base_product_ids.add(base_id)
                    continue

                # Open edit via per-row kebab -> Edytuj (no bulk operations)
                opened = await self._open_row_edit_modal(pageA, row, base_id)
                if not opened:
                    self.skipped_base_product_ids.add(base_id)
                    continue

                self.processed_base_product_ids.add(base_id)
                self.products_after_filter += 1
                return base_id

            # Next page click (selector needs tuning). If not found -> break.
            next_btn = pageA.get_by_role("button", name=re.compile(r"(Next|Następna|>)", re.I)).first
            try:
                if await next_btn.is_visible():
                    await next_btn.click(timeout=3000)
                    await pageA.wait_for_timeout(800)
                    continue
            except Exception:
                pass
            break

        return "no_more_products"

    async def _open_row_edit_modal(self, pageA: Page, row, base_id: str) -> bool:
        for attempt in range(1, UI_RETRY_MAX + 1):
            try:
                # Kebab: try common patterns
                kebab = row.locator("button:has-text('⋮'), button[aria-label*='menu'], .kebab, .menu").first
                await kebab.click(timeout=2000)

                edit = pageA.get_by_text(BASE_ROW_EDIT_ACTION_LABEL, exact=False).first
                await edit.click(timeout=3000)

                # Wait for modal anchors: "Zapisz" + tabs
                await pageA.get_by_text("Zapisz", exact=False).first.wait_for(timeout=8000)

                self.logger.log(platform="Base.com", tab_id="B", module="M7", base_product_id=base_id,
                                event_type="modal", action="open_edit_modal",
                                outcome="ok", attempt=attempt, max_attempts=UI_RETRY_MAX)
                return True
            except Exception as ex:
                # Wrong modal guard: try ESC and retry
                try:
                    await pageA.keyboard.press("Escape")
                except Exception:
                    pass
                self.logger.log(platform="Base.com", tab_id="A", module="M7", base_product_id=base_id,
                                event_type="error", action="open_edit_modal_failed",
                                outcome="retry" if attempt < UI_RETRY_MAX else "fail",
                                attempt=attempt, max_attempts=UI_RETRY_MAX,
                                context={"error": str(ex)[:250]})
                await asyncio.sleep(0.5)
        return False

    # ---------------- M8 ----------------
    async def M8_read_base_fields(self, pageA: Page, base_id: str) -> Dict[str, Any]:
        # We're still on Base tab A with modal open.
        await assert_identity_base(pageA, self.logger, "B", "M8", base_id)

        # sku/title/category/dimensions are UI-dependent; best-effort extraction
        data: Dict[str, Any] = {
            "base_product_id": base_id,
            "sku": None,
            "category_text": None,
            "dim_length_cm": None,
            "base_price_eur": None,
        }

        # Read title from modal header (adjust selector)
        title = None
        try:
            title = await pageA.locator("[role='dialog'] h1, [role='dialog'] .title, .modal h1").first.inner_text(timeout=1500)
        except Exception:
            # fallback: look for first input labeled "Nazwa" or similar
            try:
                title = await pageA.get_by_label(re.compile(r"(Nazwa|Title)", re.I)).input_value(timeout=1500)
            except Exception:
                title = f"ID {base_id}"
        data["title"] = title.strip() if title else f"ID {base_id}"

        # Go to Sales and stock to read price
        try:
            await pageA.get_by_text(BASE_TAB_SALES_AND_STOCK_LABEL, exact=False).first.click(timeout=3000)
            await pageA.wait_for_timeout(600)
        except Exception:
            pass

        try:
            price_input = pageA.get_by_label(re.compile(re.escape(BASE_PRICE_FIELD_LABEL), re.I)).first
            val = await price_input.input_value(timeout=2000)
            data["base_price_eur"] = parse_price_eur(val)
        except Exception:
            # fallback: locate by text then adjacent input
            try:
                label = pageA.get_by_text(BASE_PRICE_FIELD_LABEL, exact=False).first
                val = await label.locator("xpath=following::input[1]").input_value(timeout=2000)
                data["base_price_eur"] = parse_price_eur(val)
            except Exception:
                data["base_price_eur"] = None

        self.logger.log(platform="Base.com", tab_id="B", module="M8", base_product_id=base_id,
                        event_type="read", action="read_base_fields",
                        outcome="ok", context={"title_preview": safe_text_preview(data["title"])})
        return data

    # ---------------- M8.2 PREMARK-SKIP ----------------
    async def M8_2_premark_skip(self, pageA: Page, base_id: str) -> bool:
        # Return True if should skip (already marked), else False
        try:
            # Scroll to Market Exclusion area; UI-dependent
            await pageA.keyboard.press("PageDown")
            await pageA.wait_for_timeout(500)

            # IMPORTANT: Must locate Tradera block OUTSIDE Market Exclusion and check if "Yes" is checked.
            # This is selector-sensitive; below is a conservative heuristic.
            # Try: find "Tradera" heading and then a checkbox labeled "Yes".
            tradera_block = pageA.locator("text=Tradera").first
            if await tradera_block.count() == 0:
                return False

            # Find checkbox near "Yes" under that block
            yes_checkbox = pageA.get_by_role("checkbox", name=re.compile(r"\bYes\b", re.I)).first
            if await yes_checkbox.count() == 0:
                return False

            checked = await yes_checkbox.is_checked()
            self.logger.log(platform="Base.com", tab_id="B", module="M8.2", base_product_id=base_id,
                            event_type="assert", action="premark_skip_check",
                            outcome="ok", context={"checked": checked})
            if checked:
                # Close modal
                try:
                    await pageA.keyboard.press("Escape")
                except Exception:
                    pass
                self.skipped_base_product_ids.add(base_id)
                self.tradera_already_active += 1
                return True
        except Exception:
            # If uncertain, do NOT skip.
            return False
        return False

    # ---------------- M9 / M9.1 ----------------
    async def M9_language_and_content(self, pageA: Page, base_id: str) -> Tuple[str, str, str, List[str]]:
        # Return (base_language_used, title_en, desc_en, errors[])
        errors: List[str] = []
        base_language_used = "unknown"

        # In a real Base modal you likely have a language switcher; selector tuning needed.
        title = ""
        desc = ""

        # Try EN first
        try:
            lang = pageA.get_by_text(BASE_LANGUAGE_SELECTOR_LABEL, exact=False).first
            if await lang.count():
                await lang.click(timeout=1500)
                await pageA.get_by_text(BASE_LANGUAGE_PREFERRED, exact=False).first.click(timeout=2000)
                base_language_used = "EN"
        except Exception:
            errors.append("warning_base_language_selector_missing")

        # Read title/description (UI-dependent)
        title = await self._read_title_field(pageA)
        desc = await self._read_description_field(pageA)

        if not title.strip() or not desc.strip():
            # fallback to PL, but still attempt to translate PL->EN best-effort
            errors.append("warning_base_en_missing_or_empty_used_pl")
            try:
                lang = pageA.get_by_text(BASE_LANGUAGE_SELECTOR_LABEL, exact=False).first
                if await lang.count():
                    await lang.click(timeout=1500)
                    await pageA.get_by_text(BASE_LANGUAGE_FALLBACK, exact=False).first.click(timeout=2000)
                    base_language_used = "PL"
            except Exception:
                pass

            pl_title = (await self._read_title_field(pageA)).strip()
            pl_desc = (await self._read_description_field(pageA)).strip()

            # Translate if possible
            tr_title = translate_pl_to_en_best_effort(pl_title) or pl_title
            tr_desc = translate_pl_to_en_best_effort(pl_desc) or pl_desc

            title = tr_title
            desc = tr_desc

        self.logger.log(platform="Base.com", tab_id="B", module="M9", base_product_id=base_id,
                        event_type="read", action="read_language_content",
                        outcome="ok", context={"lang_used": base_language_used})
        return base_language_used, title.strip() or f"ID {base_id}", desc.strip(), errors

    async def _read_title_field(self, pageA: Page) -> str:
        # adjust selector to Base's title input
        for sel in [
            "input[name*='name']",
            "input[placeholder*='Nazwa']",
            "input[placeholder*='Title']",
            "[role='dialog'] input[type='text']",
        ]:
            try:
                loc = pageA.locator(sel).first
                if await loc.count() and await loc.is_visible():
                    return await loc.input_value(timeout=1200)
            except Exception:
                continue
        # fallback: modal header
        try:
            return await pageA.locator("[role='dialog'] h1").first.inner_text(timeout=1200)
        except Exception:
            return ""

    async def _read_description_field(self, pageA: Page) -> str:
        # adjust selector to Base's description textarea/editor
        for sel in [
            "textarea[name*='description']",
            "textarea[placeholder*='Opis']",
            "[contenteditable='true']",
            "textarea",
        ]:
            try:
                loc = pageA.locator(sel).first
                if await loc.count() and await loc.is_visible():
                    if "contenteditable" in sel:
                        return await loc.inner_text(timeout=1200)
                    return await loc.input_value(timeout=1200)
            except Exception:
                continue
        return ""

    # ---------------- M11 ----------------
    async def M11_download_images(self, pageA: Page, base_id: str) -> Tuple[int, List[str], List[str]]:
        # Returns (count, paths, warnings)
        warnings: List[str] = []
        paths: List[str] = []
        count = 0

        if not ENABLE_IMAGE_DOWNLOADS:
            return 0, [], warnings

        try:
            await pageA.get_by_text(BASE_TAB_MEDIA_LABEL, exact=False).first.click(timeout=3000)
            await pageA.wait_for_timeout(800)
        except Exception:
            # If can't reach media, treat as no images.
            warnings.append("warning_base_image_download_failed")
            return 0, [], warnings

        # NOTE: Implementing the exact "no-scissors" download depends on Base UI.
        # Here we do a safe method: collect image src URLs from thumbnails (no edit tools),
        # then download via Playwright request (real images only).
        thumb_sel = "img"
        thumbs = pageA.locator(thumb_sel)
        n = min(await thumbs.count(), MAX_IMAGES_TO_DOWNLOAD_PER_PRODUCT)

        if n == 0:
            return 0, [], warnings

        os.makedirs("/home/oai/share", exist_ok=True)

        for idx in range(n):
            img = thumbs.nth(idx)
            src = None
            for attempt in range(1, IMAGE_DOWNLOAD_RETRY_MAX + 1):
                try:
                    src = await img.get_attribute("src")
                    if not src:
                        # sometimes lazy-loaded via data-src
                        src = await img.get_attribute("data-src")
                    if not src:
                        raise RuntimeError("missing_src")
                    # download binary
                    t0 = time.time()
                    resp = await pageA.request.get(src, timeout=15000)
                    if not resp.ok:
                        raise RuntimeError(f"http_{resp.status}")
                    data = await resp.body()
                    out_path = f"/home/oai/share/{base_id}_{idx+1:02d}.png"
                    with open(out_path, "wb") as f:
                        f.write(data)
                    paths.append(out_path)
                    count += 1
                    self.logger.log(platform="Base.com", tab_id="B", module="M11", base_product_id=base_id,
                                    event_type="download", action="download_image",
                                    outcome="ok", attempt=attempt, max_attempts=IMAGE_DOWNLOAD_RETRY_MAX,
                                    duration_ms=int((time.time() - t0) * 1000),
                                    context={"index": idx + 1, "src_sanitized": sanitize_url(src)})
                    break
                except Exception as ex:
                    self.logger.log(platform="Base.com", tab_id="B", module="M11", base_product_id=base_id,
                                    event_type="download", action="download_image_failed",
                                    outcome="retry" if attempt < IMAGE_DOWNLOAD_RETRY_MAX else "fail",
                                    attempt=attempt, max_attempts=IMAGE_DOWNLOAD_RETRY_MAX,
                                    context={"index": idx + 1, "error": str(ex)[:200]})
                    if attempt == IMAGE_DOWNLOAD_RETRY_MAX:
                        warnings.append("warning_base_image_download_failed")

        return count, paths, warnings

    # ---------------- M12 ----------------
    async def M12_tradera_dupcheck_active(self, pageC: Page, base_id: str, title: str) -> Dict[str, Any]:
        # STRICT: only My listings → Active. No global search.
        await assert_identity_tradera(pageC, self.logger, "C", "M12", base_id)
        await pageC.goto(TRADERA_ACTIVE_LISTINGS_URL, wait_until="domcontentloaded")
        await close_common_popups(pageC, self.logger, "Tradera", "C", base_id, "M12")

        # Heuristic: use built-in filter box if exists, else scan page text.
        found = False
        listing_id = None
        listing_url = None
        found_title = None
        found_price = None

        try:
            # If there's a search input on active listings, use it.
            inp = pageC.locator("input[type='search'], input[placeholder*='Search'], input[aria-label*='Search']").first
            if await inp.count() and await inp.is_visible():
                await inp.fill(base_id)
                await pageC.wait_for_timeout(700)

            body = await pageC.locator("body").inner_text(timeout=3000)
            # Very conservative: check base_id appears
            if base_id in body:
                found = True
                # Try to extract first matching link
                link = pageC.locator(f"a:has-text('{base_id}')").first
                if await link.count():
                    href = await link.get_attribute("href")
                    if href:
                        listing_url = href if href.startswith("http") else f"https://www.tradera.com{href}"
                        listing_id = re.sub(r"\D", "", href) or None
                found_title = title
        except Exception as ex:
            self.logger.log(platform="Tradera", tab_id="C", module="M12", base_product_id=base_id,
                            event_type="error", action="dupcheck_exception",
                            outcome="fail", context={"error": str(ex)[:200]})
            return {"found": False, "listing_id": None, "listing_url": None, "title": None, "price_eur": None, "error": "error_search"}

        self.logger.log(platform="Tradera", tab_id="C", module="M12", base_product_id=base_id,
                        event_type="search", action="dupcheck_active",
                        outcome="ok", context={"found": found})
        return {"found": found, "listing_id": listing_id, "listing_url": listing_url, "title": found_title, "price_eur": found_price}

    # ---------------- M16 ----------------
    async def M16_create_tradera_listing(self, pageC: Page, base_id: str, title: str, desc: str,
                                        price_eur: float, shipping_eur: Optional[float],
                                        image_paths: List[str]) -> Tuple[str, Optional[str], Optional[str], List[str]]:
        # Returns (status, listing_id, listing_url, errors[])
        errors: List[str] = []

        if not image_paths:
            errors.append("error_missing_images")
            return ("error_missing_images", None, None, errors)

        await pageC.goto(TRADERA_NEW_LISTING_ENTRY_URL, wait_until="domcontentloaded")
        await close_common_popups(pageC, self.logger, "Tradera", "C", base_id, "M16")

        # NOTE: Tradera sell flow is very UI-dependent. Below is a template:
        # - set type buy-now only
        # - quantity 1
        # - title, description (English)
        # - upload images in order
        # - category/condition best-effort
        # - shipping
        # - publish and handle confirmations

        try:
            # Title
            title_inp = pageC.locator("input[name*='title'], input[placeholder*='Title']").first
            if await title_inp.count():
                await title_inp.fill(title[:80])

            # Description (plain text)
            desc_area = pageC.locator("textarea[name*='description'], textarea[placeholder*='Description']").first
            if await desc_area.count():
                await desc_area.fill(desc)

            # Price (fixed)
            price_inp = pageC.locator("input[name*='price'], input[placeholder*='Price']").first
            if await price_inp.count():
                await price_inp.fill(f"{price_eur:.2f}")

            # Quantity
            qty_inp = pageC.locator("input[name*='quantity'], input[placeholder*='Quantity']").first
            if await qty_inp.count():
                await qty_inp.fill("1")

            # Upload images sequentially (order-locked)
            file_input = pageC.locator("input[type='file']").first
            if await file_input.count():
                await file_input.set_input_files(image_paths)

            # Shipping
            if shipping_eur is not None:
                ship_inp = pageC.locator("input[name*='shipping'], input[placeholder*='Shipping']").first
                if await ship_inp.count():
                    await ship_inp.fill(f"{shipping_eur:.2f}")

            # Publish: click safest publish/continue
            publish_btn = pageC.get_by_role("button", name=re.compile(r"(Publish|List item|Continue|Next)", re.I)).first
            if await publish_btn.count():
                await publish_btn.click(timeout=8000)

            # Handle post-publish modals: confirm publish, skip boosts
            await close_common_popups(pageC, self.logger, "Tradera", "C", base_id, "M16")
            # If confirm dialog exists, click confirm
            confirm_btn = pageC.get_by_role("button", name=re.compile(r"(Confirm|Yes|Publish)", re.I)).first
            try:
                if await confirm_btn.is_visible():
                    await confirm_btn.click(timeout=5000)
            except Exception:
                pass

            # After publish, try to capture listing URL
            await pageC.wait_for_timeout(1500)
            url = pageC.url
            listing_url = url if "tradera.com" in url else None
            listing_id = None
            if listing_url:
                m = re.search(r"/(\d+)", listing_url)
                if m:
                    listing_id = m.group(1)

            self.logger.log(platform="Tradera", tab_id="C", module="M16", base_product_id=base_id,
                            event_type="click", action="publish_listing",
                            outcome="ok", context={"listing_url": sanitize_url(listing_url)})
            return ("created", listing_id, listing_url, errors)

        except Exception as ex:
            self.logger.log(platform="Tradera", tab_id="C", module="M16", base_product_id=base_id,
                            event_type="error", action="publish_failed",
                            outcome="fail", context={"error": str(ex)[:250]})
            errors.append("error_publish")
            return ("error_publish", None, None, errors)

    # ---------------- M17 ----------------
    async def M17_mark_base_listed(self, pageA: Page, base_id: str) -> bool:
        # Tick Tradera=Yes in Tradera block OUTSIDE Market Exclusion, then Save.
        try:
            await assert_identity_base(pageA, self.logger, "B", "M17", base_id)
            # Navigate to area and tick checkbox
            tradera_block = pageA.locator("text=Tradera").first
            await tradera_block.scroll_into_view_if_needed(timeout=3000)

            yes_checkbox = pageA.get_by_role("checkbox", name=re.compile(r"\bYes\b", re.I)).first
            if await yes_checkbox.count():
                if not await yes_checkbox.is_checked():
                    await yes_checkbox.check(timeout=2000)

            save_btn = pageA.get_by_text("Zapisz", exact=False).first
            await save_btn.click(timeout=8000)
            self.base_marked_stargater += 1

            # Close modal
            try:
                await pageA.keyboard.press("Escape")
            except Exception:
                pass

            self.logger.log(platform="Base.com", tab_id="B", module="M17", base_product_id=base_id,
                            event_type="click", action="mark_tradera_yes_and_save",
                            outcome="ok")
            return True
        except Exception as ex:
            self.logger.log(platform="Base.com", tab_id="B", module="M17", base_product_id=base_id,
                            event_type="error", action="mark_failed",
                            outcome="fail", context={"error": str(ex)[:200]})
            self.errors_total += 1
            return False

    # ---------------- RUN LOOP ----------------
    async def run(self):
        await self.M0_init()

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            context: BrowserContext = await browser.new_context(accept_downloads=True)

            pageA = await context.new_page()  # Tab A (Base list + modal)
            pageC = await context.new_page()  # Tab C (Tradera)

            # Auth
            await self.M3_base_auth(pageA)
            if self.auth_failed_base:
                await browser.close()
                return self.finalize([])

            await self.M4_tradera_auth(pageC)
            if self.auth_failed_tradera:
                await browser.close()
                return self.finalize([])

            # Prepare Base list filter once
            ok_filter = await self.M5_apply_base_saved_filter(pageA)
            if not ok_filter:
                await browser.close()
                return self.finalize([])

            products_log: List[PerProductLogEntry] = []

            # Main loop
            while True:
                if self.products_after_filter >= MAX_PRODUCTS_PER_RUN:
                    break
                if self.tradera_created >= self.effective_new_listing_cap:
                    break

                sel = await self.M7_select_next_product(pageA)
                if sel is None:
                    # run-level safety stop
                    break
                if sel == "no_more_products":
                    break

                base_id = sel
                per_errors: List[str] = []
                product_activity_start = self.logger.seq

                # Per product: M8
                base_data = await self.M8_read_base_fields(pageA, base_id)
                title_fallback = base_data.get("title") or f"ID {base_id}"

                # M8.2 premark-skip
                if await self.M8_2_premark_skip(pageA, base_id):
                    product_activity_end = self.logger.seq - 1
                    products_log.append(PerProductLogEntry(
                        base_product_id=base_id,
                        sku=base_data.get("sku"),
                        title=title_fallback,
                        base_language_used="unknown",
                        downloaded_images_count=0,
                        action="already_listed_marked",
                        tradera_status="already_active",
                        tradera_listing_id=None,
                        tradera_listing_url=None,
                        base_tradera_stargater_set=True,
                        base_price_eur=base_data.get("base_price_eur"),
                        tradera_price_eur=None,
                        shipping_eur=None,
                        size_class="unknown",
                        activity_seq_start=product_activity_start,
                        activity_seq_end=product_activity_end,
                        errors=[],
                    ))
                    continue

                # M9 content
                base_language_used, title_en, desc_en, lang_errors = await self.M9_language_and_content(pageA, base_id)
                per_errors.extend(lang_errors)

                # M11 images
                img_count, img_paths, img_warnings = await self.M11_download_images(pageA, base_id)
                per_errors.extend(img_warnings)

                base_price = base_data.get("base_price_eur")
                if base_price is None:
                    per_errors.append("error_no_price")

                # Dupcheck (M12)
                match = await self.M12_tradera_dupcheck_active(pageC, base_id, title_en)
                if match.get("error") == "error_search":
                    self.errors_total += 1
                    product_activity_end = self.logger.seq - 1
                    products_log.append(PerProductLogEntry(
                        base_product_id=base_id,
                        sku=base_data.get("sku"),
                        title=title_en,
                        base_language_used=base_language_used,
                        downloaded_images_count=img_count,
                        action="error",
                        tradera_status="error_search",
                        tradera_listing_id=None,
                        tradera_listing_url=None,
                        base_tradera_stargater_set=False,
                        base_price_eur=base_price,
                        tradera_price_eur=None,
                        shipping_eur=None,
                        size_class="unknown",
                        activity_seq_start=product_activity_start,
                        activity_seq_end=product_activity_end,
                        errors=per_errors,
                    ))
                    # close modal to continue
                    try:
                        await pageA.keyboard.press("Escape")
                    except Exception:
                        pass
                    continue

                if match["found"]:
                    # Already active -> mark Base if needed
                    await self.M17_mark_base_listed(pageA, base_id)
                    product_activity_end = self.logger.seq - 1
                    products_log.append(PerProductLogEntry(
                        base_product_id=base_id,
                        sku=base_data.get("sku"),
                        title=title_en,
                        base_language_used=base_language_used,
                        downloaded_images_count=img_count,
                        action="already_listed_marked",
                        tradera_status="already_active",
                        tradera_listing_id=match.get("listing_id"),
                        tradera_listing_url=match.get("listing_url"),
                        base_tradera_stargater_set=True,
                        base_price_eur=base_price,
                        tradera_price_eur=match.get("price_eur"),
                        shipping_eur=None,
                        size_class="unknown",
                        activity_seq_start=product_activity_start,
                        activity_seq_end=product_activity_end,
                        errors=per_errors,
                    ))
                    continue

                # Not found -> create
                # Shipping & size (M13) based on dim_length_cm (if you read it)
                size_class, shipping_eur = compute_shipping_and_size(base_data.get("dim_length_cm"))

                # Price compute
                tradera_price = None
                if base_price is not None:
                    tradera_price = round(base_price * PRICE_MULTIPLIER, 2)

                if DRY_RUN:
                    product_activity_end = self.logger.seq - 1
                    products_log.append(PerProductLogEntry(
                        base_product_id=base_id,
                        sku=base_data.get("sku"),
                        title=title_en,
                        base_language_used=base_language_used,
                        downloaded_images_count=img_count,
                        action="would_set_stargater",
                        tradera_status="would_create",
                        tradera_listing_id=None,
                        tradera_listing_url=None,
                        base_tradera_stargater_set=False,
                        base_price_eur=base_price,
                        tradera_price_eur=tradera_price,
                        shipping_eur=shipping_eur,
                        size_class=size_class,
                        activity_seq_start=product_activity_start,
                        activity_seq_end=product_activity_end,
                        errors=per_errors,
                    ))
                    # close modal
                    try:
                        await pageA.keyboard.press("Escape")
                    except Exception:
                        pass
                    continue

                # Must have price and images
                if tradera_price is None:
                    per_errors.append("error_no_price")
                if img_count == 0:
                    per_errors.append("error_missing_images")

                if "error_no_price" in per_errors or "error_missing_images" in per_errors:
                    self.errors_total += 1
                    product_activity_end = self.logger.seq - 1
                    products_log.append(PerProductLogEntry(
                        base_product_id=base_id,
                        sku=base_data.get("sku"),
                        title=title_en,
                        base_language_used=base_language_used,
                        downloaded_images_count=img_count,
                        action="error",
                        tradera_status="error_missing_images" if img_count == 0 else "error_publish",
                        tradera_listing_id=None,
                        tradera_listing_url=None,
                        base_tradera_stargater_set=False,
                        base_price_eur=base_price,
                        tradera_price_eur=tradera_price,
                        shipping_eur=shipping_eur,
                        size_class=size_class,
                        activity_seq_start=product_activity_start,
                        activity_seq_end=product_activity_end,
                        errors=per_errors,
                    ))
                    # close modal
                    try:
                        await pageA.keyboard.press("Escape")
                    except Exception:
                        pass
                    continue

                status, listing_id, listing_url, create_errors = await self.M16_create_tradera_listing(
                    pageC, base_id, title_en, desc_en, tradera_price, shipping_eur, img_paths
                )
                per_errors.extend(create_errors)

                if status == "created":
                    self.tradera_created += 1
                    # Mark Base
                    marked = await self.M17_mark_base_listed(pageA, base_id)
                    base_marked = True if marked else False
                    product_activity_end = self.logger.seq - 1
                    products_log.append(PerProductLogEntry(
                        base_product_id=base_id,
                        sku=base_data.get("sku"),
                        title=title_en,
                        base_language_used=base_language_used,
                        downloaded_images_count=img_count,
                        action="created_on_tradera",
                        tradera_status="created",
                        tradera_listing_id=listing_id,
                        tradera_listing_url=listing_url,
                        base_tradera_stargater_set=base_marked,
                        base_price_eur=base_price,
                        tradera_price_eur=tradera_price,
                        shipping_eur=shipping_eur,
                        size_class=size_class,
                        activity_seq_start=product_activity_start,
                        activity_seq_end=product_activity_end,
                        errors=per_errors,
                    ))
                else:
                    self.errors_total += 1
                    product_activity_end = self.logger.seq - 1
                    products_log.append(PerProductLogEntry(
                        base_product_id=base_id,
                        sku=base_data.get("sku"),
                        title=title_en,
                        base_language_used=base_language_used,
                        downloaded_images_count=img_count,
                        action="error",
                        tradera_status=status,
                        tradera_listing_id=None,
                        tradera_listing_url=None,
                        base_tradera_stargater_set=False,
                        base_price_eur=base_price,
                        tradera_price_eur=tradera_price,
                        shipping_eur=shipping_eur,
                        size_class=size_class,
                        activity_seq_start=product_activity_start,
                        activity_seq_end=product_activity_end,
                        errors=per_errors,
                    ))

                # continue loop

            await browser.close()
            return self.finalize(products_log)

    # ---------------- M18 ----------------
    def finalize(self, products_log: List[PerProductLogEntry]) -> str:
        self.timestamp_end = now_iso()
        activity_meta = self.logger.meta()

        report = RunReport(
            meta={
                "platforms": ["Base.com", "Tradera"],
                "run_mode": "BASE_TRADERA_SYNC",
                "dry_run": DRY_RUN,
                "timezone": TIMEZONE,
                "timestamp_start": self.timestamp_start,
                "timestamp_end": self.timestamp_end,
            },
            counters={
                "products_seen": self.products_seen,
                "products_after_filter": self.products_after_filter,
                "tradera_created": self.tradera_created,
                "tradera_already_active": self.tradera_already_active,
                "base_marked_stargater": self.base_marked_stargater,
                "skipped_filter": self.skipped_filter,
                "errors_total": self.errors_total,
                "auth_failed_base": self.auth_failed_base,
                "auth_failed_tradera": self.auth_failed_tradera,
            },
            products=[asdict(p) for p in products_log],
            activity_meta=activity_meta,
            activity=[asdict(e) for e in self.logger.events],
        )

        # IMPORTANT: stdout must be JSON only.
        return json.dumps(asdict(report), ensure_ascii=False)

# =============================================================================

# ENTRYPOINT

# =============================================================================

async def main():
agent = CrossLister()
out_json = await agent.run()
sys.stdout.write(out_json)

if **name** == "**main**":
asyncio.run(main())
