# Security Specification - Herbal Client Manager

## Data Invariants
1. A client record must belong to a valid authenticated user (consultant).
2. A visit or appointment must reference a valid client and belong to the same consultant.
3. Timestamps (`createdAt`) must be server-generated and immutable.
4. Phone numbers must follow the Kenyan format (+254...).
5. Financial data (`payment`) must be non-negative.

## The Dirty Dozen Payloads

1. **Identity Spoofing**: Attempt to create a client with a `userId` that is not the current user's UID.
2. **Resource Poisoning**: Attempt to use an extremely long string (1MB) as a `clientId` or `visitId`.
3. **Ghost Field Injection**: Attempt to add an `isAdmin: true` field to a client document.
4. **Timestamp Manipulation**: Attempt to set a custom `createdAt` date instead of using the server timestamp.
5. **State Shortcut**: Attempt to update an appointment status to a value not in the enum.
6. **Relational Breakage**: Attempt to create a visit for a client that does not belong to the current user.
7. **Negative Payment**: Attempt to record a visit with a payment of -1000 KES.
8. **Phone Format Bypass**: Attempt to save a phone number that doesn't follow the Kenyan format.
9. **Unauthorized List Query**: Attempt to query all clients without filtering by `userId`.
10. **Immutable Field Modification**: Attempt to change the `userId` or `createdAt` of an existing client.
11. **Shadow Update**: Attempt to update a visit's `clientId` to point to a different client.
12. **PII Blanket Leak**: Attempt to list all clients as a logged-in user who doesn't own any records.

## Test Strategy
All "Dirty Dozen" payloads must return `PERMISSION_DENIED`.
Rules will enforce strict key checks using `affectedKeys().hasOnly()` and size limits on all strings.
