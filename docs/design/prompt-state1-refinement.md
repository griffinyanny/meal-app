# State 1 Refinement Prompt (paste as follow-up in Make)

> This is a follow-up prompt for an existing State 1 generation. Paste into the same Make session — don't start fresh.

---

Make these changes to the current design. Keep everything else as-is — the card layout, typography, food images, rationale line treatment (blue with →), and contextual chips are all working well.

**1. Add a "Why this week?" link to the hero card.**
Below the stats row ("5 dinners · ~$87 estimated · ~12 ingredients to buy"), add a small text link: "Why this week? →" in muted/secondary text. This is a discoverable link that would open a sheet explaining the chef's full logic — don't design the sheet, just show the link. Keep it subtle — it's for curious users, not a primary action.

**2. Add a sticky bottom confirm bar.**
When the user scrolls down past the hero card, a sticky glass bar appears above the tab bar. It contains:
- A confirm button: "Looks good →" (same accent-colored style as the hero card's button, but slightly smaller)
- Small muted text to the left: "5 dinners ready"
This bar is glass/translucent with backdrop blur, sitting between the content and the tab bar. It should feel lightweight — not a heavy toolbar. It only appears when the hero card's "Looks good" has scrolled out of view.

Show the screen in a scrolled-down state where this bottom bar is visible — the hero card should be scrolled off the top, and we should see 2-3 meal cards with the sticky confirm bar at the bottom.

**3. Remove the swipe peek on the first card.**
If the first card is shifted or showing a sliver of a card behind it, remove that. All cards should be in their default, centered position. The contextual chips and tappable rationale lines already communicate that cards are interactive — we don't need the swipe peek.

**4. Make sure the tab bar Plan icon is a calendar icon, not a house/home icon.** The Plan tab should use a calendar-style icon since this is about weekly planning, not a home screen.
