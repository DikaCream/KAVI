"""Integration tests — require GenLayer Studio running.

Run with: gltest tests/integration/ -v -s

These exercise the full consensus pipeline: a real outbound fetch of the
listing's content URL, a real LLM moderation call, and equivalence-principle
agreement across validators. Because the moderation verdict is a genuine
consensus result (not a byte-for-byte reproduction), the tests assert the
*mechanism* — that a submission reaches a terminal ACTIVE/REJECTED state with a
populated review — rather than hard-coding which verdict the validators reach.

The escrow/dispute state machine is covered exhaustively by the fast direct-mode
tests (tests/direct/), which mock web + LLM and don't need Studio.
"""

import time

import pytest
from gltest import get_contract_factory, get_default_account
from gltest.assertions import tx_execution_succeeded

from tests.integration.fixtures import (
    SKILL_URL,
    SKILL_TITLE,
    SKILL_CATEGORY,
    SKILL_DESCRIPTION,
)

TERMINAL_STATUSES = {"ACTIVE", "REJECTED"}
MAX_WAIT_SECONDS = 120
POLL_SECONDS = 5


def _deploy():
    factory = get_contract_factory("AIMarketplace")
    contract = factory.deploy()

    # Freshly deployed: no skills, no purchases, no disputes, no locked escrow.
    assert contract.get_skill_count(args=[]).call() == 0
    config = contract.get_config(args=[]).call()
    assert config["skill_count"] == 0
    assert config["purchase_count"] == 0
    assert config["dispute_count"] == 0
    assert config["escrow_locked"] == 0
    return contract


def _get_skill(contract, skill_id):
    return contract.get_skill(args=[skill_id]).call()


def _wait_for_moderation(contract, skill_id):
    """Poll get_skill until moderation reaches a terminal state or time out."""
    deadline = time.time() + MAX_WAIT_SECONDS
    while time.time() < deadline:
        skill = _get_skill(contract, skill_id)
        if skill is not None and skill["status"] in TERMINAL_STATUSES:
            return skill
        time.sleep(POLL_SECONDS)
    return _get_skill(contract, skill_id)


@pytest.mark.integration
def test_submit_and_moderate_reaches_consensus():
    contract = _deploy()

    receipt = contract.submit_skill(
        args=[SKILL_TITLE, SKILL_DESCRIPTION, SKILL_CATEGORY, 100, SKILL_URL],
    ).transact(wait_interval=10000, wait_retries=15)
    assert tx_execution_succeeded(receipt)

    # The submission itself is synchronous on-chain state: one skill now exists.
    assert contract.get_skill_count(args=[]).call() == 1

    skill = _wait_for_moderation(contract, 1)
    assert skill is not None
    # Moderation must have reached a terminal verdict (never stuck PENDING_REVIEW
    # when validators can read the content and parse the JSON verdict).
    assert skill["status"] in TERMINAL_STATUSES
    assert skill["title"] == SKILL_TITLE
    assert skill["content_url"] == SKILL_URL
    assert skill["moderation_attempts"] >= 1
    # A terminal verdict carries a review summary and a sane 0-100 score.
    assert isinstance(skill["review_summary"], str) and skill["review_summary"]
    assert 0 <= skill["score"] <= 100


@pytest.mark.integration
def test_views_reflect_submitted_state():
    contract = _deploy()

    receipt = contract.submit_skill(
        args=[SKILL_TITLE, SKILL_DESCRIPTION, SKILL_CATEGORY, 250, SKILL_URL],
    ).transact(wait_interval=10000, wait_retries=15)
    assert tx_execution_succeeded(receipt)

    skill = _wait_for_moderation(contract, 1)
    assert skill is not None and skill["status"] in TERMINAL_STATUSES

    # list_skills and list_creator_skills expose the same record.
    creator = get_default_account().address

    listed = contract.list_skills(args=[0, 50]).call()
    assert len(listed) == 1
    assert listed[0]["id"] == 1
    assert listed[0]["price"] == 250

    mine = contract.list_creator_skills(args=[creator, 0, 50]).call()
    assert len(mine) == 1
    assert mine[0]["id"] == 1
