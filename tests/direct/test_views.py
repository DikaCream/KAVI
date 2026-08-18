"""Read-only view method tests."""

from tests.direct.conftest import addr, set_time, submit_approved_skill, purchase, to_hex


def test_get_config_empty(direct_deploy):
    contract = direct_deploy("contracts/ai_marketplace.py")
    cfg = contract.get_config()
    assert cfg["skill_count"] == 0
    assert cfg["purchase_count"] == 0
    assert cfg["dispute_count"] == 0
    assert cfg["escrow_locked"] == 0


def test_get_skill_missing_returns_none(direct_deploy):
    contract = direct_deploy("contracts/ai_marketplace.py")
    assert contract.get_skill(999) is None
    assert contract.get_purchase(999) is None
    assert contract.get_dispute(999) is None


def test_list_skills_paginates(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/ai_marketplace.py")
    submit_approved_skill(contract, direct_vm, direct_alice, title="Alpha Skill")
    set_time("2030-01-01T00:05:00Z")
    submit_approved_skill(contract, direct_vm, direct_alice, title="Beta Skill")
    set_time("2030-01-01T00:10:00Z")
    submit_approved_skill(contract, direct_vm, direct_alice, title="Gamma Skill")

    assert contract.get_skill_count() == 3
    page = contract.list_skills(0, 2)
    assert [s["title"] for s in page] == ["Alpha Skill", "Beta Skill"]
    page2 = contract.list_skills(2, 10)
    assert [s["title"] for s in page2] == ["Gamma Skill"]


def test_list_creator_skills(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/ai_marketplace.py")
    submit_approved_skill(contract, direct_vm, direct_alice, title="Alice's")
    submit_approved_skill(contract, direct_vm, direct_bob, title="Bob's")

    alice_skills = contract.list_creator_skills(addr(direct_alice), 0, 10)
    assert [s["title"] for s in alice_skills] == ["Alice's"]

    bob_skills = contract.list_creator_skills(addr(direct_bob), 0, 10)
    assert [s["title"] for s in bob_skills] == ["Bob's"]


def test_list_buyer_and_skill_purchases(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = direct_deploy("contracts/ai_marketplace.py")
    sid = submit_approved_skill(contract, direct_vm, direct_alice, price=10)
    p1 = purchase(contract, direct_vm, direct_bob, sid, price=10)
    p2 = purchase(contract, direct_vm, direct_charlie, sid, price=10)

    bob_purchases = contract.list_buyer_purchases(addr(direct_bob), 0, 10)
    assert [p["id"] for p in bob_purchases] == [p1]

    skill_purchases = contract.list_skill_purchases(sid, 0, 10)
    assert [p["id"] for p in skill_purchases] == [p1, p2]
