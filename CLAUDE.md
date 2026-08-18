# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Commands

```bash
# Linting
genvm-lint check contracts/ai_marketplace.py    # Lint the contract

# Testing
pytest tests/direct/ -v                         # Direct mode tests (fast, no Studio)
gltest tests/integration/ -v -s                 # Integration tests (requires Studio)

# Deployment
genlayer network set studionet                  # StudioNet is gasless
genlayer deploy --contract contracts/ai_marketplace.py

# Frontend
cd frontend && npm run dev                      # Start frontend dev server (Vite)
cd frontend && npm run build                    # Production build
cd frontend && npx tsc --noEmit                 # Typecheck
```

## Architecture

```
contracts/
  ai_marketplace.py        # The Intelligent Contract (AIMarketplace)
tests/
  direct/                  # Fast in-memory tests with web/LLM mocks
  integration/             # Full consensus tests against GenLayer Studio
frontend/                  # Vite + React + TypeScript app (genlayer-js)
deploy/
  deployScript.ts          # TypeScript deployment script
design-system/             # Persisted ui-ux-pro-max design tokens (MASTER.md)
```

**Frontend stack**: Vite 5, React 19, TypeScript, React Router, genlayer-js (`createClient`, `readContract`, `writeContract`, `waitForTransactionReceipt`), MetaMask wallet injection. Styling is plain CSS with design tokens in `frontend/src/index.css`.

## Development Workflow

1. Write/modify the contract in `contracts/ai_marketplace.py`
2. Lint: `genvm-lint check contracts/ai_marketplace.py`
3. Test direct: `pytest tests/direct/ -v`
4. Deploy: `genlayer deploy --contract contracts/ai_marketplace.py` (set network first)
5. Test integration: `gltest tests/integration/ -v -s`
6. Run frontend: `cd frontend && npm run dev`

## Frontend Patterns

- Contract interactions: `frontend/src/lib/contract.ts` (typed `Marketplace` wrapper)
- GenLayer client: `frontend/src/lib/client.ts` (`createMarketplaceClient`, `parseGen`, `formatGen`)
- Wallet state: `frontend/src/hooks/useWallet.ts` + `frontend/src/context/MarketplaceContext.tsx`
- Contract address / network: `frontend/src/config.ts` (env overrides with hardcoded StudioNet fallback)

The deployed StudioNet contract address is `0x2A7f8995EAe909575787C14629ec924AE6D1ad7D`. Reads work without a wallet; writes require connecting MetaMask and switching to the GenLayer Studio network (chain id 61999).

## Contract Development

Contracts are Python files in `/contracts/` using the GenLayer SDK:

```python
from genlayer import *

class MyContract(gl.Contract):
    data: TreeMap[Address, str]

    def __init__(self):
        self.data = TreeMap()

    @gl.public.view
    def get_data(self, addr: Address) -> str:
        return self.data.get(addr, "")

    @gl.public.write
    def set_data(self, value: str):
        self.data[gl.message.sender_address] = value
```

**Decorators**:
- `@gl.public.view` — Read-only methods
- `@gl.public.write` — State-modifying methods
- `@gl.public.write.payable` — Methods accepting value

**Storage types**: `TreeMap`, `DynArray`, `Array`, `u256`, `i256`, `@allow_storage` for custom classes

## Writing Direct Mode Tests

Direct mode runs contracts in-memory without Studio. Key APIs (fixtures live in `tests/direct/conftest.py`):

```python
def test_example(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/ai_marketplace.py")

    # Set sender
    direct_vm.sender = direct_alice

    # Mock web requests (regex on URL)
    direct_vm.mock_web(r".*example\.com.*", {"status": 200, "body": "response"})

    # Mock LLM responses (regex on prompt)
    direct_vm.mock_llm(r".*analyze.*", '{"result": "positive"}')

    # Call contract methods directly
    contract.some_write_method("arg1")
    result = contract.some_view_method()

    # Assert expected failures
    with direct_vm.expect_revert("Error message"):
        contract.invalid_method()

    # Reset mocks between different scenarios
    direct_vm.clear_mocks()
```

Available fixtures: `direct_vm`, `direct_deploy`, `direct_alice`, `direct_bob`, `direct_charlie`, `direct_owner`, `direct_accounts`

## Linting

The GenVM linter catches contract issues before deployment:
- Forbidden imports (`os`, `sys`, `subprocess`, etc.)
- Non-deterministic calls outside equivalence principle blocks
- Invalid storage types (must use `TreeMap`/`DynArray`, not `dict`/`list`)
- Missing decorators and return type annotations
- Bare Python exceptions (must use `gl.vm.UserError` or `Exception`)

## AI Agent Skills

Install the GenLayer development skills for enhanced agent-assisted workflows:

```bash
# In Claude Code:
/plugin marketplace add genlayerlabs/skills
/plugin install genlayer-dev@genlayerlabs
```

Skills available: `genvm-lint` (linting), `direct-tests` (direct mode testing), `integration-tests` (integration testing). The project also pins `ui-ux-pro-max` (see `skills-lock.json`) for frontend design work.

---

## GenLayer Technical Reference

> **Can't solve an issue?** Always check the complete SDK API reference:
> **https://sdk.genlayer.com/main/_static/ai/api.txt**
>
> Contains: all classes, methods, parameters, return types, changelogs, breaking changes.

### Documentation URLs

| Resource | URL |
|----------|-----|
| **SDK API (Complete)** | https://sdk.genlayer.com/main/_static/ai/api.txt |
| Full Documentation | https://docs.genlayer.com/full-documentation.txt |
| Main Docs | https://docs.genlayer.com/ |
| GenLayerJS SDK | https://docs.genlayer.com/api-references/genlayer-js |

### What is GenLayer?

GenLayer is an AI-native blockchain where smart contracts can natively access the internet and make decisions using AI (LLMs). Contracts are Python-based and executed in the GenVM.

### Web Access (`gl.nondet.web`)

```python
gl.nondet.web.get(url: str, *, headers: dict = {}) -> Response
gl.nondet.web.post(url: str, *, body: str | bytes | None = None, headers: dict = {}) -> Response
gl.nondet.web.render(url: str, *, mode: Literal['text', 'html']) -> str
gl.nondet.web.render(url: str, *, mode: Literal['screenshot']) -> Image
```

### LLM Access (`gl.nondet`)

```python
gl.nondet.exec_prompt(prompt: str, *, images: Sequence[bytes | Image] | None = None) -> str
gl.nondet.exec_prompt(prompt: str, *, response_format: Literal['json'], image: bytes | Image | None = None) -> dict
```

### Equivalence Principle

Validation for non-deterministic outputs. Two approaches:

**Custom leader/validator functions** (recommended for most cases):
```python
result = gl.vm.run_nondet(leader_fn, validator_fn)
result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)  # no type matching
```

**Convenience functions** (for common patterns):
| Type | Use Case | Function |
|------|----------|----------|
| Strict | Exact outputs | `gl.eq_principle.strict_eq()` |
| Comparative | Similar outputs | `gl.eq_principle.prompt_comparative()` |
| Non-Comparative | Subjective assessments | `gl.eq_principle.prompt_non_comparative()` |

### Key Documentation Links

- [Introduction to Intelligent Contracts](https://docs.genlayer.com/developers/intelligent-contracts/introduction)
- [Storage](https://docs.genlayer.com/developers/intelligent-contracts/storage)
- [Deploying Contracts](https://docs.genlayer.com/developers/intelligent-contracts/deploying)
- [Crafting Prompts](https://docs.genlayer.com/developers/intelligent-contracts/crafting-prompts)
- [Contract Examples](https://docs.genlayer.com/developers/intelligent-contracts/examples/storage)
- [Testing Contracts](https://docs.genlayer.com/developers/decentralized-applications/testing)
