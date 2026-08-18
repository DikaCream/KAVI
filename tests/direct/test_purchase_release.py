"""Escrow purchase and release tests."""

from tests.direct.conftest import (
    GOOD_URL,
    set_time,
    submit_approved_skill,
    purchase,
    to_hex,
)


def test_purchase_locks_escrow(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)

    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    p = contract.get_purchase(pid)
    assert p["status"] == "ESCROWED"
    assert p["skill_id"] == sid
    assert p["buyer"].lower() == to_hex(direct_bob).lower()
    assert p["price"] == 100
    assert contract.get_config()["escrow_locked"] == 100


def test_purchase_wrong_value_reverts(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)

    direct_vm.sender = direct_bob
    direct_vm.value = 50
    with direct_vm.expect_revert("exact skill price must be sent"):
        contract.purchase_skill(sid)

    direct_vm.value = 200
    with direct_vm.expect_revert("exact skill price must be sent"):
        contract.purchase_skill(sid)
    direct_vm.value = 0


def test_purchase_not_active_reverts(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/ai_marketplace.py")
    # Rejected skill cannot be purchased.
    direct_vm.sender = direct_alice
    from tests.direct.conftest import mock_moderation

    mock_moderation(direct_vm, verdict="REJECT", score=10, reason="bad")
    sid = int(contract.submit_skill("Bad Skill", "A skill that is clearly spam and should be rejected by validators.", "tools", 10, GOOD_URL))
    direct_vm.clear_mocks()

    direct_vm.sender = direct_bob
    direct_vm.value = 10
    with direct_vm.expect_revert("skill is not active"):
        contract.purchase_skill(sid)
    direct_vm.value = 0


def test_self_purchase_reverts(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)

    direct_vm.sender = direct_alice
    direct_vm.value = 100
    with direct_vm.expect_revert("a creator cannot buy their own skill"):
        contract.purchase_skill(sid)
    direct_vm.value = 0


def test_buyer_early_release(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    direct_vm.sender = direct_bob
    contract.release_purchase(pid)

    assert contract.get_purchase(pid)["status"] == "RELEASED"
    assert contract.get_config()["escrow_locked"] == 0
    # Creator's revenue and purchase count increment.
    s = contract.get_skill(sid)
    assert s["revenue"] == 100
    assert s["purchases"] == 1


def test_release_before_window_requires_buyer(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    # Creator cannot release before the escrow window closes.
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("escrow window still open"):
        contract.release_purchase(pid)


def test_release_after_window_by_anyone(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    set_time("2030-01-10T00:00:00Z")  # 9 days later
    direct_vm.sender = direct_charlie  # unrelated party may release
    contract.release_purchase(pid)
    assert contract.get_purchase(pid)["status"] == "RELEASED"
    assert contract.get_config()["escrow_locked"] == 0


def test_double_release_reverts(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    pid = purchase(contract, direct_vm, direct_bob, sid, price=100)

    direct_vm.sender = direct_bob
    contract.release_purchase(pid)
    with direct_vm.expect_revert("purchase is not in escrow"):
        contract.release_purchase(pid)


def test_escrow_accounting_multiple_purchases(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=100)
    p1 = purchase(contract, direct_vm, direct_bob, sid, price=100)
    p2 = purchase(contract, direct_vm, direct_charlie, sid, price=100)
    assert contract.get_config()["escrow_locked"] == 200

    # Buyer releases one; the other stays locked.
    direct_vm.sender = direct_bob
    contract.release_purchase(p1)
    assert contract.get_config()["escrow_locked"] == 100

    direct_vm.sender = direct_charlie
    contract.release_purchase(p2)
    assert contract.get_config()["escrow_locked"] == 0
