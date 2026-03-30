# Kangur Duels

This folder owns Kangur duel lobby presence, duel-session server logic, and
duel-specific persistence helpers.

## Layout

- `lobby-chat.ts`: duel lobby chat contracts and helpers
- `lobby-presence.ts`: duel lobby presence tracking and queries
- `server.db.ts`: duel persistence/document helpers
- `server.ts`: duel lobby, session, and reaction server entrypoint
- `__tests__/`: duel tests that are not owned by a narrower nested folder
