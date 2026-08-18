"""Smoke test — validates direct-mode environment and the full happy path."""

import json

from tests.direct.conftest import to_hex


def _mock_moderation_approve(vm):
    vm.mock_web(
        r".*example\.com/skill.*",
        {"status": 200, "body": "A skill that scrapes web pages into structured data."},
    )
    vm.mock_llm(
        r".*moderator.*",
        json.dumps({"verdict": "APPROVE", "score": 85, "reason": "Matches description."}),
    )


def test_smoke_full_path(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/ai_marketplace.py")

    # Creator submits a skill; moderation approves it.
    direct_vm.sender = direct_alice
    _mock_moderation_approve(direct_vm)
    sid = contract.submit_skill(
        "Web Scraper",
        "Scrapes web pages and extracts structured data reliably and quickly.",
        "automation",
        100,
        "https://example.com/skill",
    )

    skill = contract.get_skill(sid)
    assert skill["status"] == "ACTIVE"
    assert skill["score"] == 85

    # Buyer purchases; escrow is locked.
    direct_vm.value = 0
    direct_vm.sender = direct_bob
    direct_vm.value = 100
    pid = contract.purchase_skill(sid)
    p = contract.get_purchase(pid)
    assert p["status"] == "ESCROWED"
    assert p["buyer"].lower() == to_hex(direct_bob).lower()
    assert contract.get_config()["escrow_locked"] == 100

    # The buyer accepts early, releasing escrow to the creator.
    direct_vm.value = 0
    direct_vm.sender = direct_bob
    contract.release_purchase(pid)
    p2 = contract.get_purchase(pid)
    assert p2["status"] == "RELEASED"
    assert contract.get_config()["escrow_locked"] == 0
