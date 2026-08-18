"""Submission and AI moderation tests (web + LLM mocked)."""

import json

from tests.direct.conftest import (
    GOOD_DESCRIPTION,
    GOOD_URL,
    addr,
    mock_moderation,
    set_time,
    submit_approved_skill,
    to_hex,
)


def test_submit_approved(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice)

    s = contract.get_skill(sid)
    assert s["status"] == "ACTIVE"
    assert s["score"] == 85
    assert s["creator"].lower() == to_hex(direct_alice).lower()
    assert s["price"] == 100
    assert contract.get_skill_count() == 1


def test_submit_rejected(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/ai_marketplace.py")
    direct_vm.sender = direct_alice
    mock_moderation(direct_vm, verdict="REJECT", score=20, reason="Spam listing.")
    sid = int(
        contract.submit_skill("Scam", GOOD_DESCRIPTION, "automation", 100, GOOD_URL)
    )
    s = contract.get_skill(sid)
    assert s["status"] == "REJECTED"
    assert s["score"] == 20


def test_submit_verdict_case_insensitive(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/ai_marketplace.py")
    direct_vm.sender = direct_alice
    # Lowercase verdict must be normalized to APPROVE.
    direct_vm.mock_web(r".*example\.com.*", {"status": 200, "body": "content"})
    direct_vm.mock_llm(
        r".*moderator.*",
        json.dumps({"verdict": "approve", "score": 70, "reason": "ok"}),
    )
    sid = int(contract.submit_skill("Valid Skill", GOOD_DESCRIPTION, "automation", 100, GOOD_URL))
    assert contract.get_skill(sid)["status"] == "ACTIVE"


def test_submit_unparseable_fails_closed(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/ai_marketplace.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_web(r".*example\.com.*", {"status": 200, "body": "content"})
    # Not JSON at all -> leader cannot parse -> fail closed to PENDING_REVIEW.
    direct_vm.mock_llm(r".*moderator.*", "totally not json")
    sid = int(contract.submit_skill("Valid Skill", GOOD_DESCRIPTION, "automation", 100, GOOD_URL))
    assert contract.get_skill(sid)["status"] == "PENDING_REVIEW"


def test_submit_wrong_shape_fails_closed(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/ai_marketplace.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_web(r".*example\.com.*", {"status": 200, "body": "content"})
    # Missing verdict key -> deterministic half cannot act -> fail closed.
    direct_vm.mock_llm(r".*moderator.*", json.dumps({"score": 90}))
    sid = int(contract.submit_skill("Valid Skill", GOOD_DESCRIPTION, "automation", 100, GOOD_URL))
    assert contract.get_skill(sid)["status"] == "PENDING_REVIEW"


def test_retry_moderation_after_failure(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/ai_marketplace.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_web(r".*example\.com.*", {"status": 200, "body": "content"})
    direct_vm.mock_llm(r".*moderator.*", "not json")
    sid = int(contract.submit_skill("Valid Skill", GOOD_DESCRIPTION, "automation", 100, GOOD_URL))
    assert contract.get_skill(sid)["status"] == "PENDING_REVIEW"

    # Retry is throttled: an immediate retry reverts.
    with direct_vm.expect_revert("moderation was just attempted"):
        contract.retry_moderation(sid)

    # Advance past the cooldown and retry with a good mock.
    direct_vm.clear_mocks()
    from tests.direct.conftest import set_time

    set_time("2030-01-01T00:10:00Z")
    direct_vm.sender = direct_alice
    direct_vm.mock_web(r".*example\.com.*", {"status": 200, "body": "content"})
    direct_vm.mock_llm(
        r".*moderator.*",
        json.dumps({"verdict": "APPROVE", "score": 88, "reason": "fine"}),
    )
    contract.retry_moderation(sid)
    assert contract.get_skill(sid)["status"] == "ACTIVE"


def test_retry_moderation_creator_only(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/ai_marketplace.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_web(r".*example\.com.*", {"status": 200, "body": "content"})
    direct_vm.mock_llm(r".*moderator.*", "not json")
    sid = int(contract.submit_skill("Valid Skill", GOOD_DESCRIPTION, "automation", 100, GOOD_URL))

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("only the skill's creator can re-run moderation"):
        contract.retry_moderation(sid)


def test_submit_throttled(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/ai_marketplace.py")
    submit_approved_skill(contract, direct_vm, direct_alice)

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("submission throttled"):
        contract.submit_skill("Valid Skill Two", GOOD_DESCRIPTION, "automation", 100, GOOD_URL)


def test_submit_validates_title(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/ai_marketplace.py")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("title must be 3-120 characters"):
        contract.submit_skill("X", GOOD_DESCRIPTION, "automation", 100, GOOD_URL)


def test_submit_validates_description(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/ai_marketplace.py")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("description must be 50-4000 characters"):
        contract.submit_skill("Valid", "too short", "automation", 100, GOOD_URL)


def test_submit_validates_category(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/ai_marketplace.py")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("category must be 3-40 characters"):
        contract.submit_skill("Valid", GOOD_DESCRIPTION, "x", 100, GOOD_URL)


def test_submit_validates_price(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/ai_marketplace.py")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("price must be positive"):
        contract.submit_skill("Valid", GOOD_DESCRIPTION, "automation", 0, GOOD_URL)


def test_creator_index(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/ai_marketplace.py")
    submit_approved_skill(contract, direct_vm, direct_alice, title="First Skill")
    set_time("2030-01-01T00:05:00Z")
    submit_approved_skill(contract, direct_vm, direct_alice, title="Second Skill")

    skills = contract.list_creator_skills(addr(direct_alice), 0, 10)
    assert [s["title"] for s in skills] == ["First Skill", "Second Skill"]
