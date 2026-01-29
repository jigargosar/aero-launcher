# 2026-01-29: Remove history tiebreaker from query matching

Problem: When typing "gs", selecting Google then GitHub caused immediate flip-flop. History tiebreaker in matchUnified made recently selected item win among equal matches, causing unstable order on each selection.

Decision: Remove `byHistory` from matchUnified ordering. Sort by match quality only (start, charSpan, gaps, name).

Consequences:
- Stable order for same query
- No personalization until boost threshold (count >= 2)
- History still used for empty query (root sorting)
