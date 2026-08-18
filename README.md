# KAVI

> *kavi (Sanskrit): poet, seer. One who reads and judges.*

**KAVI** is an on-chain marketplace for AI agent skills (the marketplace that reads what it sells), built on [GenLayer](https://genlayer.com). Creators list an AI skill: a title, description, category, price and a public URL hosting the skill content. GenLayer's AI validators read every submission before it goes live. Buyers pay GEN into per-purchase escrow, and if a buyer believes a skill does not do what the listing promised, AI validators adjudicate the dispute and rule on a full, partial or no refund.

Unlike a normal deterministic smart contract, this is an **Intelligent Contract**: moderation and dispute resolution run through GenVM with live web access and LLM judgment, then settle on-chain through AI-validator consensus.

## Live demo

- **App:** https://kaviai.vercel.app/ (Vite + React frontend, deployed on Vercel)
- **Contract (StudioNet):** `0x2A7f8995EAe909575787C14629ec924AE6D1ad7D` on the [GenLayer Studio explorer](https://explorer-studio.genlayer.com/address/0x2A7f8995EAe909575787C14629ec924AE6D1ad7D)
- The catalog is live: 7 approved agent skills (Frontend Design, DOCX generation, Vercel React Best Practices, PPT generation, and more) were submitted on-chain and approved by the AI validators.

## Features

| Feature | How it works |
|---|---|
| **Listing moderation** | Validators fetch the hosted content, compare it to the listing, reject spam/malware/prompt-injection, and attach a quality score from 0 to 100 before the skill goes live. |
| **Quality scoring** | Every approved listing carries a consensus score from 0 to 100, surfaced in the UI. |
| **Content fetch/verify** | `gl.nondet.web.render` fetches the listing's URL; SSRF is blocked by strict public-https URL validation. |
| **Escrow purchases** | Buyers pay the exact price; funds are held per-purchase until released or a dispute resolves. |
| **Dispute adjudication** | Validators compare the listing against the actual content and the buyer's complaint, then rule `NO_REFUND` / `PARTIAL_REFUND` / `FULL_REFUND`. |

Every non-deterministic step (moderation and adjudication) runs under an explicit [`prompt_comparative`](https://docs.genlayer.com) equivalence principle, so honest validators that read the same content but phrase their verdict differently still reach consensus.

## Project structure

```
contracts/
  ai_marketplace.py          # The Intelligent Contract
tests/
  direct/                    # Fast in-memory tests with web/LLM mocks
    conftest.py              # Shared helpers: time travel, mocks, fixtures
    test_submit_moderation.py
    test_purchase_release.py
    test_dispute.py
    test_views.py
    test_url_rules.py        # SSRF / URL validation
    test_smoke.py            # End-to-end happy path
  integration/
    test_ai_marketplace.py   # Real consensus against GenLayer Studio
    fixtures.py
frontend/                    # Vite + React + TypeScript app (genlayer-js)
deploy/
  deployScript.ts            # CLI deployment script
gltest.config.yaml           # Test-runner network config
pyproject.toml               # pytest config
.github/workflows/ci.yml     # Lint + direct-test CI
```

## Requirements

- Python >= 3.12
- Node >= 18 (for the frontend)
- [GenLayer CLI](https://github.com/genlayerlabs/genlayer-cli): `npm install -g genlayer` (for deployment)
- GenLayer Studio (for integration tests and deployment): local via the [tooling setup](https://docs.genlayer.com/developers/intelligent-contracts/tooling-setup), or the hosted [GenLayer Studio](https://studio.genlayer.com/)

## Quick start

### 1. Python environment

```shell
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Lint the contract

```shell
genvm-lint check contracts/ai_marketplace.py
```

### 3. Run direct tests (no Studio needed)

```shell
pytest tests/direct/ -v
```

Direct tests run the contract in memory with mocked web and LLM calls, giving millisecond feedback on state transitions, access control, escrow accounting and the moderation/adjudication state machines.

### 4. Deploy

```shell
genlayer network set studionet          # StudioNet is gasless (no faucet needed)
genlayer account create --name deployer # interactive: set a keystore password
genlayer deploy --contract contracts/ai_marketplace.py
```

Take note of the printed **Contract Address** and set it in the frontend (see below).

**Current dev deployment (StudioNet):** `0x2A7f8995EAe909575787C14629ec924AE6D1ad7D`

Verified live: `get_skill_count` returns `0`, and a real `submit_skill` ran full moderation. The validators fetched the content URL and rejected a placeholder page with a written review, proving the fetch → LLM → equivalence pipeline end to end.

### 5. Run integration tests (real consensus)

```shell
gltest tests/integration/ -v -s
```

These deploy to GenLayer Studio and exercise the real fetch → LLM → equivalence pipeline.

### 6. Frontend

```shell
cp frontend/.env.example frontend/.env
# set VITE_CONTRACT_ADDRESS to your deployed address
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Set `VITE_GENLAYER_NETWORK=studionet` (default) or `testnet-asimov`, and `VITE_GENLAYER_RPC_URL` if you use a different endpoint.

## How the contract works

1. **Submit.** A creator calls `submit_skill(title, description, category, price, content_url)`. The URL must be a public `https://` URL (SSRF-safe: no localhost/private/metadata hosts, default port only). The skill starts `PENDING_REVIEW`.
2. **Moderation.** `submit_skill` immediately runs moderation. Validators fetch the content, then an LLM returns `{verdict, score, reason}` JSON under an equivalence principle. `APPROVE` → `ACTIVE` with the score; `REJECT` → `REJECTED`; unparseable output fails closed and leaves it `PENDING_REVIEW` (creator can `retry_moderation`).
3. **Purchase.** `purchase_skill(skill_id)` is `payable` and requires the exact price. Funds move into per-purchase escrow and the contract tracks `escrow_locked` so it always equals the sum of open escrows.
4. **Release or dispute.** Before the 7-day window closes only the buyer may release early; after it anyone may release to the creator. The buyer may instead `file_dispute(purchase_id, reason)` within the window.
5. **Adjudication.** Validators compare the listing against the content and the complaint, returning `{refund_pct, reason}` under an equivalence principle. The dispute becomes `RESOLVED` with an outcome.
6. **Settle.** `settle_dispute` is permissionless and applies the outcome: `FULL_REFUND` / `PARTIAL_REFUND` back to the buyer, or `NO_REFUND` releasing to the creator. An unresolved dispute can be `close_stale_dispute`d after the stale window (fails closed back to the buyer).

### Equivalence principles

Because two validators will not word an LLM verdict identically, the contract compares moderation and adjudication results with custom rules rather than byte equality:

- **Moderation:** equivalent iff verdicts match exactly and scores fall in the same bucket of ten; reasons may differ in wording.
- **Adjudication:** equivalent iff both refund percentages are zero or both non-zero, and fall in the same bucket of ten.

### Defensive LLM handling

- Both leader functions request strict JSON and sanitize/validate types, clamp scores, and classify unparseable output with a deterministic error sentinel.
- Untrusted text (title, description, category, reason, fetched content) is neutralized against prompt-structure markers and fenced as data so a hostile listing cannot inject instructions into the moderator or arbitrator.

## Testing strategy

| Gate | Command | Speed | Needs Studio |
|------|---------|-------|--------------|
| Lint | `genvm-lint check contracts/ai_marketplace.py` | ~250 ms | No |
| Direct | `pytest tests/direct/ -v` | ~ms/test | No |
| Integration | `gltest tests/integration/ -v -s` | ~min/test | Yes |

**Workflow:** lint after every contract change, then run direct tests frequently, then run integration tests before deploying to verify consensus behavior.

## License

MIT. See [LICENSE](LICENSE).
