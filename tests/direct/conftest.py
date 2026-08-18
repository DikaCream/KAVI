"""Shared helpers for AI Marketplace direct mode tests."""

import json
import sys
from datetime import datetime, timedelta, timezone

import pytest

# A fixed "now" for deterministic time travel. Unix 1767225600.
BASE_ISO = "2030-01-01T00:00:00Z"


def to_hex(addr_bytes):
    """Convert address bytes to checksummed hex matching contract output."""
    if hasattr(addr_bytes, "as_hex"):
        return addr_bytes.as_hex
    from genlayer.py.types import Address

    return Address(addr_bytes).as_hex


def addr(addr_bytes):
    """Build an Address object for TreeMap[Address, ...] lookups."""
    from genlayer.py.types import Address

    if isinstance(addr_bytes, Address):
        return addr_bytes
    return Address(addr_bytes)


def set_time(iso_str: str) -> None:
    """Advance the contract's view of block time.

    The direct VM's ``warp()`` does not refresh ``message_raw['datetime']``,
    which is what the contract's ``_now()`` reads, so we mutate it directly.
    """
    import genlayer.gl as gl

    gl.message_raw["datetime"] = iso_str


@pytest.fixture(autouse=True)
def _reset_block_time():
    """Keep block time deterministic across tests.

    ``genlayer.gl`` is imported once per session, so ``message_raw['datetime']``
    leaks between tests. Reset it to a fixed base before and after each test.
    """
    _reset()
    yield
    _reset()


def _reset():
    if "genlayer.gl" in sys.modules:
        gl = sys.modules["genlayer.gl"]
        if getattr(gl, "message_raw", None) is not None:
            gl.message_raw["datetime"] = BASE_ISO


GOOD_URL = "https://example.com/skill"
GOOD_DESCRIPTION = "A well-described skill that fetches web pages and returns structured JSON data."


def mock_moderation(vm, verdict="APPROVE", score=85, reason="Matches the description.", body="Skill content: does the job."):
    vm.mock_web(r".*example\.com.*", {"status": 200, "body": body})
    vm.mock_llm(
        r".*moderator.*",
        json.dumps({"verdict": verdict, "score": score, "reason": reason}),
    )


def mock_adjudication(vm, refund_pct=0, reason="Skill works as described."):
    vm.mock_web(r".*example\.com.*", {"status": 200, "body": "Skill content: does the job."})
    vm.mock_llm(
        r".*arbitrator.*",
        json.dumps({"refund_pct": refund_pct, "reason": reason}),
    )


def submit_approved_skill(
    contract, vm, creator, title="Web Scraper", price=100, url=GOOD_URL,
    description=GOOD_DESCRIPTION, category="automation",
):
    """Submit a skill and have moderation approve it; returns its int id."""
    vm.sender = creator
    mock_moderation(vm)
    sid = int(contract.submit_skill(title, description, category, price, url))
    vm.clear_mocks()
    return sid


def purchase(contract, vm, buyer, skill_id, price=100):
    """Buyer pays exact price into escrow; returns the purchase id."""
    vm.sender = buyer
    vm.value = price
    pid = int(contract.purchase_skill(skill_id))
    vm.value = 0
    return pid
