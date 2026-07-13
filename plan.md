# Repair PR #1 Milestone 0 Gates

## 1. Goal
Make every required Milestone 0 check on Draft PR #1 pass without weakening quality or security controls.

## 2. Problem
CI loses the database URL inside Turborepo, GitHub dependency review lacked repository support, Gitleaks flags documentation wording in the original branch commit, and SonarCloud reports authentication, security, duplication, lockfile, and code-quality failures.

## 3. Proposed solution
Repair environment propagation and dependency locking, centralize duplicated configuration, resolve every reported Sonar issue, rewrite the false-positive wording, amend the single PR commit, and monitor the unchanged gates.

## 4. Files to change
- CI, Turbo, Sonar, dependency, and shared configuration files.
- The specific application, contract-generator, test-kit, and documentation lines reported by SonarCloud or Gitleaks.
- `README.md` and this plan for the reproducible uv workflow and task checkpoint.

## 5. Step by step tasks
1. Keep PR #1 Draft and verify branch/ref guardrails.
2. Fix CI database environment handling and adopt canonical `uv.lock` installation.
3. Remove Sonar duplication and resolve all reported vulnerabilities and code smells.
4. Run database, quality, coverage, browser, accessibility, and Terraform checks locally.
5. Amend the sole branch commit and push with the approved exact force-with-lease.
6. Monitor GitHub and SonarCloud checks, reporting any external account blocker exactly.

## 6. Acceptance criteria
- Required GitHub checks pass without suppression, skipped jobs, or weakened thresholds.
- SonarCloud reports A ratings, at most 3% new duplication, at least 80% new-code coverage, and 100% hotspot review.
- `main` and `legacy-static-submission` remain unchanged and the PR remains unmerged and Draft.

## 7. Testing plan
Run frozen pnpm and locked uv setup, contract checks, migrations and seed, `pnpm quality`, coverage, browser and accessibility suites, and Terraform validation; then verify all PR checks remotely.

## 8. Open questions
The repository still needs a SonarCloud token with Execute Analysis permission and Automatic Analysis disabled before the CI scanner can complete.
