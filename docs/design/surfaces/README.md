# Design surfaces

One folder per surface that goes through a Claude Design pass. Each `<surface>/` holds the
shared memory between Griffin's visual iteration (in Claude Design) and Claude Code's build.

Per the workflow (`../design-workflow.md`), each folder contains:
- **`brief.md`** — the design brief Claude Code writes before the pass: states to design, real
  data, and the **OPEN (iterate here) vs SETTLED (don't touch)** split.
- **`imported.dc.html`** *(optional)* — the as-built snapshot, saved via `DesignSync.get_file`
  when provenance matters. Illustrative markup, not production code — never pasted into the build.
- **build-notes** (in `brief.md` or a short `notes.md`) — the design **URL + projectId** (the
  durable re-fetchable pointer) and what was built / which OPEN questions resolved.

Surfaces are separated here on the Claude Code side; in Claude Design they all live in the ONE
meal-app project (the whole app accrues there).

First surface: `groceries/` (Phase 1D).
