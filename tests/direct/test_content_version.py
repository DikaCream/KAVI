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
# Keccak-256 of EVIDENCE and CREATOR_EVIDENCE respectively (pre-computed).
BUYER_EVIDENCE_HASH = "457857aefb0be7989c4135cea5c82adf6d862de05ae5876a6beb090d2e5926b8"
CREATOR_EVIDENCE_HASH = "c71aed2812b389f9c78443a50b2b31d793d180478874606d7e8d1ab6258e905c"



def test_content_version_committed_at_moderation(
    direct_vm, direct_deploy, direct_alice
):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice)

    # Public view: no content_snapshot, but content_hash is visible.
    s = contract.get_skill(sid)
    assert s["status"] == "ACTIVE"
    assert "content_snapshot" not in s
    assert len(s["content_hash"]) == 64

    # Gated: the creator can read the full immutable content version.
    direct_vm.sender = direct_alice
    full = contract.get_skill_content(sid)
    assert full["content_snapshot"] == "Skill content: does the job."
    assert len(full["content_hash"]) == 64


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
    assert "content_snapshot" not in s
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


def test_evidence_hash_must_match_details(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """A party cannot claim a hash that does not match the evidence bytes."""
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    direct_vm.sender = direct_bob
    did = int(contract.file_dispute(pid, REASON))

    # The hash is verified on-chain: Keccak256(details) must equal evidence_hash.
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("evidence hash does not match evidence details"):
        contract.submit_dispute_evidence(
            did, "EXECUTION_LOG", "a" * 64, "onchain://bad",
            "This text does not hash to aaaa..."
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
            did, "NOT_A_KIND", BUYER_EVIDENCE_HASH, "onchain://bad", EVIDENCE
        )
    with direct_vm.expect_revert("evidence hash must be"):
        contract.submit_dispute_evidence(
            did, "ERROR_REPORT", "too-short", "onchain://bad", EVIDENCE
        )
    with direct_vm.expect_revert("evidence details must be 20-3000 characters"):
        contract.submit_dispute_evidence(
            did, "ERROR_REPORT", BUYER_EVIDENCE_HASH, "onchain://bad", "too short"
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


def test_skill_content_gated(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    """content_snapshot is not public — only creator and verified purchasers."""
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)

    # Public view: no content_snapshot field.
    pub = contract.get_skill(sid)
    assert "content_snapshot" not in pub
    assert pub["content_hash"] != ""

    # Gated view, non-purchaser: denied.
    direct_vm.sender = direct_charlie
    denied = contract.get_skill_content(sid)
    assert denied["reason"] == "purchase required"
    assert denied["content_snapshot"] == ""

    # Creator can always read.
    direct_vm.sender = direct_alice
    creator_view = contract.get_skill_content(sid)
    assert creator_view["content_snapshot"] != ""
    assert len(creator_view["content_hash"]) == 64

    # Purchaser can read.
    direct_vm.sender = direct_bob
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)
    buyer_view = contract.get_skill_content(sid)
    assert buyer_view["content_snapshot"] != ""
    assert len(buyer_view["content_hash"]) == 64
