"""Content URL validation — the SSRF gate validators fetch through."""

from tests.direct.conftest import GOOD_DESCRIPTION, set_time, submit_approved_skill


def _submit_url(contract, vm, sender, url):
    vm.sender = sender
    return contract.submit_skill("Valid Title", GOOD_DESCRIPTION, "automation", 100, url)


def test_valid_urls(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/ai_marketplace.py")
    for i, url in enumerate(
        [
            "https://example.com/skill",
            "https://sub.example.com/skill",
            "https://example.com/a/b?x=1",
        ]
    ):
        set_time(f"2030-01-01T00:{i * 5:02d}:00Z")
        sid = submit_approved_skill(
            contract, direct_vm, direct_alice, title=f"Skill {i}", url=url
        )
        assert contract.get_skill(sid)["status"] == "ACTIVE"


INVALID_URLS = [
    "http://example.com/skill",  # not https
    "ftp://example.com/skill",
    "javascript:alert(1)",
    "",  # empty
    "https://localhost/x",
    "https://127.0.0.1/x",
    "https://10.0.0.1/x",
    "https://172.16.0.1/x",
    "https://192.168.1.1/x",
    "https://169.254.169.254/x",  # cloud metadata
    "https://metadata.google.internal/x",
    "https://home.arpa/x",
    "https://user@example.com/x",  # userinfo
    "https://example.com:8080/x",  # non-standard port
    "https://[::1]/x",  # IPv6
    "https://example.com../x",  # double trailing dot
]


def test_invalid_urls_revert(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/ai_marketplace.py")
    for url in INVALID_URLS:
        with direct_vm.expect_revert("content_url must be a public https"):
            _submit_url(contract, direct_vm, direct_alice, url)
