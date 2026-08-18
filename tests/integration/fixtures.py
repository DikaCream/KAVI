"""Expected contract state fixtures for AI Marketplace integration tests."""

# A maximally stable public https page. ``web.render`` fetches it during
# moderation; its content is short, static and always reachable, which makes it
# a reliable target for exercising the fetch -> LLM -> equivalence pipeline.
SKILL_URL = "https://example.com/"

SKILL_TITLE = "Example Domain landing page"
SKILL_CATEGORY = "documentation"
SKILL_DESCRIPTION = (
    "A minimal, always-available placeholder web page. It displays a short "
    "paragraph explaining that the domain is reserved for illustrative use in "
    "documents and examples. There is no interactivity, no account, and no "
    "dynamic content; the page is static and served over HTTPS."
)
