# Contract compatibility baselines

`v1.manifest.json` is the immutable first-release wire baseline. It fingerprints every HTTP
operation together with its recursive request/response schema closure, the complete event
catalogue, and the version-one command, event, sync, device, voice and privacy schemas.

This baseline was established from the corrected Document 06/07 Milestone 1 envelopes before the
Milestone 1 merge. It is now an exact wire freeze: changing any fingerprint fails the contracts
test. Do not rewrite the v1 baseline to make that test pass. A later wire change must introduce a
new versioned schema and a separately reviewed compatibility baseline while v1 remains available
for its supported compatibility horizon.
