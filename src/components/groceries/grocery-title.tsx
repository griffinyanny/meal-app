"use client";

// The Groceries tab's heading — BUG-054 (1F/D).
//
// ⚠️ It used to live inside `grocery-list-header.tsx`, which renders on the
// READY path only. So the generating, error and no-list states were a floating
// card on an unlabelled page with **no `<h1>` in the document at all** —
// BUG-028's exact defect on a different tab (S44 fixed it on Plan, and nobody
// asked whether Groceries had the same hole).
//
// ⚠️ It was invisible because those two states had never once been captured
// successfully: BUG-053 had blinded the Groceries gate since the service worker
// landed, and the first successful frames in the project's history are the ones
// that found this.
//
// ONE definition with two call sites, not two copies. Five definitions of one
// domain is how BUG-044 happened, and a heading duplicated across a ready and
// a non-ready branch is the same shape at smaller scale.
//
// ⚠️ The TITLE BLOCK ONLY travels. The progress bar, the count, the organize
// toggle and Copy stay behind: they are meaningless with no list, and law 05
// would then have the screen showing controls that do nothing.

export type GroceryTitleProps = {
  /**
   * Baseline-aligned with the `<h1>`. The ready path passes the count +
   * offline clause + Copy cluster; every other state passes nothing, which is
   * what keeps this from rendering dead controls.
   */
  trailing?: React.ReactNode;
};

export function GroceryTitle({ trailing }: GroceryTitleProps) {
  return (
    <>
      <p className="spec-eyebrow">Groceries · This week</p>
      <div className="flex items-baseline justify-between gap-3">
        {/* §05's H1 — see the note on the Recipes title. Not the chef's rung. */}
        <h1 className="spec-screen-title">Your list</h1>
        {trailing}
      </div>
    </>
  );
}
