"""Immutable content versioning.

An approved listing pins the exact content validators read (snapshot + hash),
a purchase verifies the URL still serves that version, disputes are
adjudicated against the committed snapshot, and each party can attach
authenticated on-chain evidence.
"""

import json

from tests.direct.conftest import (
    GOOD_DESCRIPTION,
    GOOD_URL,
    mock_moderation,
    purchase,
    set_time,
    submit_approved_skill,
)

REASON = (
    "The skill does not do what the listing promised — it errors out and "
    "produces no useful output."
)
EVIDENCE = (
    "Executed the skill three times: it always returns an empty result and "
    "logs a traceback ending in RuntimeError: no data, even with valid input."
)
CREATOR_EVIDENCE = (
    "Our test suite runs the exact same skill successfully with the same "
    "inputs; logs attached show a complete run with the expected JSON output."
)
BUYER_EVIDENCE_HASH = "a" * 64
CREATOR_EVIDENCE_HASH = "b" * 64



def test_content_version_committed_at_moderation(
    direct_vm, direct_deploy, direct_alice
):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice)

    s = contract.get_skill(sid)
    assert s["status"] == "ACTIVE"
    # The exact text validators read is pinned, and its keccak-256 hex digest
    # is committed — this is the immutable content version.
    assert s["content_snapshot"] == "Skill content: does the job."
    assert len(s["content_hash"]) == 64


def test_rejected_skill_has_no_content_version(
    direct_vm, direct_deploy, direct_alice
):
    contract = direct_deploy("contracts/ai_marketplace.py")
    direct_vm.sender = direct_alice
    mock_moderation(direct_vm, verdict="REJECT", score=10, reason="spam")
    sid = int(
        contract.submit_skill("Bad Skill", GOOD_DESCRIPTION, "tools", 10, GOOD_URL)
    )
    s = contract.get_skill(sid)
    assert s["status"] == "REJECTED"
    assert s["content_snapshot"] == ""
    assert s["content_hash"] == ""


def test_purchase_binds_committed_version(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    s = contract.get_skill(sid)
    p = contract.get_purchase(pid)
    # The purchase is bound to the same immutable version that was approved.
    assert p["content_hash"] == s["content_hash"]
    assert p["status"] == "ESCROWED"


def test_purchase_blocked_when_content_drifted(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)

    # The creator swaps the URL content after approval. The purchase must fail
    # closed instead of selling an unverified artifact.
    direct_vm.sender = direct_bob
    direct_vm.value = 100
    direct_vm.mock_web(
        r".*example\.com.*", {"status": 200, "body": "MALICIOUS SWAPPED CONTENT"}
    )
    with direct_vm.expect_revert("content has changed since approval"):
        contract.purchase_skill(sid)
    direct_vm.clear_mocks()
    direct_vm.value = 0
    assert contract.get_config()["escrow_locked"] == 0


def test_dispute_adjudicates_committed_version(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """A dispute resolves even if the live URL no longer matches — adjudication
    reads the pinned snapshot, never the mutable URL."""
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    direct_vm.sender = direct_bob
    # Filing only opens the evidence window; no LLM is called yet.
    did = int(contract.file_dispute(pid, REASON))
    assert contract.get_dispute(did)["status"] == "OPEN"
    set_time("2030-01-02T00:00:00Z")
    # No web mock: adjudication must NOT fetch the URL. Only the LLM is mocked.
    direct_vm.mock_llm(
        r".*arbitrator.*", json.dumps({"refund_pct": 0, "reason": "works"})
    )
    contract.finalize_dispute(did)
    d = contract.get_dispute(did)
    assert d["status"] == "RESOLVED"
    assert d["outcome"] == "NO_REFUND"


def test_buyer_and_creator_submit_evidence(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    # Filing leaves the dispute OPEN so both parties can submit evidence.
    direct_vm.sender = direct_bob
    did = int(contract.file_dispute(pid, REASON))
    assert contract.get_dispute(did)["status"] == "OPEN"

    # Buyer submits a structured record first.
    direct_vm.sender = direct_bob
    contract.submit_dispute_evidence(
        did, "EXECUTION_LOG", BUYER_EVIDENCE_HASH,
        "onchain://purchase/1/run/1", EVIDENCE
    )
    d = contract.get_dispute(did)
    assert d["buyer_evidence"] == EVIDENCE
    assert d["buyer_evidence_kind"] == "EXECUTION_LOG"
    assert d["buyer_evidence_hash"] == BUYER_EVIDENCE_HASH
    assert d["creator_evidence_hash"] == ""

    # Creator submits their structured side. Both submissions are authenticated
    # by their distinct wallet senders.
    direct_vm.sender = direct_alice
    contract.submit_dispute_evidence(
        did, "TRANSACTION_RECEIPT", CREATOR_EVIDENCE_HASH,
        "onchain://purchase/1/receipt", CREATOR_EVIDENCE
    )
    d = contract.get_dispute(did)
    assert d["creator_evidence"] == CREATOR_EVIDENCE
    assert d["creator_evidence_kind"] == "TRANSACTION_RECEIPT"

    # Each party submits exactly once.
    with direct_vm.expect_revert("already submitted"):
        contract.submit_dispute_evidence(
            did, "EXECUTION_LOG", BUYER_EVIDENCE_HASH,
            "onchain://purchase/1/run/1", EVIDENCE
        )

    # Both sides have submitted, so finalization is now available immediately.
    direct_vm.sender = direct_bob
    direct_vm.mock_llm(
        r".*arbitrator.*",
        json.dumps({"refund_pct": 100, "reason": "broken as buyer claims"}),
    )
    contract.finalize_dispute(did)
    d = contract.get_dispute(did)
    assert d["status"] == "RESOLVED"
    assert d["outcome"] == "FULL_REFUND"
    assert d["buyer_evidence"] == EVIDENCE
    assert d["creator_evidence"] == CREATOR_EVIDENCE


def test_evidence_only_buyer_or_creator(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    direct_vm.sender = direct_bob
    did = int(contract.file_dispute(pid, REASON))

    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("only the buyer or the skill's creator"):
        contract.submit_dispute_evidence(
            did, "EXECUTION_LOG", BUYER_EVIDENCE_HASH,
            "onchain://purchase/1/run/1", EVIDENCE
        )


def test_evidence_validation(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    direct_vm.sender = direct_bob
    did = int(contract.file_dispute(pid, REASON))

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("evidence kind must be"):
        contract.submit_dispute_evidence(
            did, "NOT_A_KIND", "a" * 64, "onchain://bad", "Valid details that are long enough."
        )
    with direct_vm.expect_revert("evidence hash must be"):
        contract.submit_dispute_evidence(
            did, "ERROR_REPORT", "too-short", "onchain://bad", EVIDENCE
        )
    with direct_vm.expect_revert("evidence details must be 20-3000 characters"):
        contract.submit_dispute_evidence(
            did, "ERROR_REPORT", "a" * 64, "onchain://bad", "too short"
        )


def test_evidence_rejected_after_resolution(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    direct_vm.sender = direct_bob
    did = int(contract.file_dispute(pid, REASON))
    set_time("2030-01-02T00:00:00Z")
    direct_vm.mock_llm(
        r".*arbitrator.*", json.dumps({"refund_pct": 0, "reason": "works"})
    )
    contract.finalize_dispute(did)
    assert contract.get_dispute(did)["status"] == "RESOLVED"

    with direct_vm.expect_revert("only an open dispute accepts evidence"):
        contract.submit_dispute_evidence(
            did, "EXECUTION_LOG", BUYER_EVIDENCE_HASH,
            "onchain://purchase/1/run/1", EVIDENCE
        )
