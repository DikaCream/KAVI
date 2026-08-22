"""Dispute adjudication and settlement tests (web + LLM mocked)."""

import json

from tests.direct.conftest import (
    GOOD_URL,
    mock_adjudication,
    set_time,
    submit_approved_skill,
    purchase,
    to_hex,
)

REASON = "The skill does not do what the listing promised — it errors out and produces no useful output."


def file_dispute(contract, vm, buyer, purchase_id, refund_pct=0, reason=REASON):
    """File, wait through the evidence window, then finalize for legacy tests."""
    vm.sender = buyer
    did = int(contract.file_dispute(purchase_id, reason))
    set_time("2030-01-02T00:00:00Z")
    mock_adjudication(vm, refund_pct=refund_pct)
    contract.finalize_dispute(did)
    vm.clear_mocks()
    return did


def test_dispute_no_refund(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    did = file_dispute(contract, direct_vm, direct_bob, pid, refund_pct=0)

    d = contract.get_dispute(did)
    assert d["status"] == "RESOLVED"
    assert d["outcome"] == "NO_REFUND"
    assert d["refund_pct"] == 0
    assert contract.get_purchase(pid)["status"] == "DISPUTED"

    # Settle pays the creator the full price.
    direct_vm.sender = direct_alice
    contract.settle_dispute(did)
    assert contract.get_purchase(pid)["status"] == "RELEASED"
    assert contract.get_config()["escrow_locked"] == 0
    s = contract.get_skill(sid)
    assert s["revenue"] == 100
    assert s["purchases"] == 1
    assert s["refunds"] == 0


def test_dispute_full_refund(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    did = file_dispute(contract, direct_vm, direct_bob, pid, refund_pct=100)

    assert contract.get_dispute(did)["outcome"] == "FULL_REFUND"

    direct_vm.sender = direct_bob
    contract.settle_dispute(did)
    assert contract.get_purchase(pid)["status"] == "REFUNDED"
    assert contract.get_config()["escrow_locked"] == 0
    s = contract.get_skill(sid)
    assert s["revenue"] == 0
    assert s["purchases"] == 0
    assert s["refunds"] == 1


def test_dispute_partial_refund(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    did = file_dispute(contract, direct_vm, direct_bob, pid, refund_pct=50)
    assert contract.get_dispute(did)["outcome"] == "PARTIAL_REFUND"
    assert contract.get_dispute(did)["refund_pct"] == 50

    contract.settle_dispute(did)
    assert contract.get_purchase(pid)["status"] == "REFUNDED"
    assert contract.get_config()["escrow_locked"] == 0
    s = contract.get_skill(sid)
    assert s["revenue"] == 50  # creator keeps the non-refunded half
    assert s["purchases"] == 1
    assert s["refunds"] == 1


def test_file_dispute_only_buyer(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("only the buyer can dispute"):
        contract.file_dispute(pid, REASON)


def test_file_dispute_after_window_reverts(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    set_time("2030-01-10T00:00:00Z")
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("dispute window has closed"):
        contract.file_dispute(pid, REASON)


def test_filing_opens_evidence_window_before_adjudication(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    direct_vm.sender = direct_bob
    did = int(contract.file_dispute(pid, REASON))
    d = contract.get_dispute(did)
    assert d["status"] == "OPEN"
    assert d["attempts"] == 0
    assert d["evidence_deadline"] > d["filed_at"]

    # A validator call cannot be triggered while the parties still have time
    # to submit evidence.
    direct_vm.mock_llm(
        r".*arbitrator.*", json.dumps({"refund_pct": 0, "reason": "works"})
    )
    with direct_vm.expect_revert("evidence window is still open"):
        contract.finalize_dispute(did)
    direct_vm.clear_mocks()
    assert contract.get_dispute(did)["attempts"] == 0


def test_one_dispute_per_purchase(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    # File a dispute and withdraw it before the evidence window is finalized.
    direct_vm.sender = direct_bob
    did = int(contract.file_dispute(pid, REASON))
    contract.withdraw_dispute(did)
    assert contract.get_purchase(pid)["status"] == "ESCROWED"

    # Re-filing is blocked: one dispute per purchase, ever.
    with direct_vm.expect_revert("already been disputed"):
        contract.file_dispute(pid, REASON)


def test_dispute_unparseable_fails_closed_and_withdraw(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    direct_vm.sender = direct_bob
    did = int(contract.file_dispute(pid, REASON))
    assert contract.get_dispute(did)["status"] == "OPEN"
    assert contract.get_purchase(pid)["status"] == "DISPUTED"

    # Buyer withdraws: purchase returns to escrow, one dispute only.
    direct_vm.sender = direct_bob
    contract.withdraw_dispute(did)
    assert contract.get_dispute(did)["status"] == "WITHDRAWN"
    assert contract.get_purchase(pid)["status"] == "ESCROWED"

    # Escrow is intact and can be released by the buyer.
    direct_vm.sender = direct_bob
    contract.release_purchase(pid)
    assert contract.get_purchase(pid)["status"] == "RELEASED"


def test_retry_dispute_after_failure(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    direct_vm.sender = direct_bob
    direct_vm.mock_web(r".*example\.com.*", {"status": 200, "body": "content"})
    direct_vm.mock_llm(r".*arbitrator.*", "not json")
    did = int(contract.file_dispute(pid, REASON))
    direct_vm.clear_mocks()
    assert contract.get_dispute(did)["status"] == "OPEN"

    # Finalization is required before retry can be used. The initial attempt
    # fails closed, after the evidence window has elapsed.
    set_time("2030-01-02T00:00:00Z")
    direct_vm.sender = direct_bob
    direct_vm.mock_llm(r".*arbitrator.*", "not json")
    contract.finalize_dispute(did)
    direct_vm.clear_mocks()
    assert contract.get_dispute(did)["status"] == "OPEN"

    # Immediate retry is throttled.
    with direct_vm.expect_revert("adjudication was just attempted"):
        contract.retry_dispute(did)

    set_time("2030-01-02T00:10:00Z")
    direct_vm.sender = direct_bob
    direct_vm.mock_llm(
        r".*arbitrator.*", json.dumps({"refund_pct": 100, "reason": "broken"})
    )
    contract.retry_dispute(did)
    assert contract.get_dispute(did)["status"] == "RESOLVED"
    assert contract.get_dispute(did)["outcome"] == "FULL_REFUND"


def test_close_stale_dispute_refunds_buyer(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    direct_vm.sender = direct_bob
    direct_vm.mock_web(r".*example\.com.*", {"status": 200, "body": "content"})
    direct_vm.mock_llm(r".*arbitrator.*", "not json")
    did = int(contract.file_dispute(pid, REASON))
    direct_vm.clear_mocks()
    assert contract.get_dispute(did)["status"] == "OPEN"

    # Not stale yet.
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("dispute is not stale yet"):
        contract.close_stale_dispute(did)

    # 8 days later anyone may close it — money fails closed to the buyer.
    set_time("2030-01-09T00:00:00Z")
    direct_vm.sender = direct_charlie
    contract.close_stale_dispute(did)
    assert contract.get_dispute(did)["status"] == "RESOLVED"
    assert contract.get_dispute(did)["outcome"] == "FULL_REFUND"
    assert contract.get_purchase(pid)["status"] == "REFUNDED"
    assert contract.get_config()["escrow_locked"] == 0


def test_settle_requires_resolved(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    direct_vm.sender = direct_bob
    direct_vm.mock_web(r".*example\.com.*", {"status": 200, "body": "content"})
    direct_vm.mock_llm(r".*arbitrator.*", "not json")
    did = int(contract.file_dispute(pid, REASON))
    direct_vm.clear_mocks()

    with direct_vm.expect_revert("dispute is not resolved"):
        contract.settle_dispute(did)
