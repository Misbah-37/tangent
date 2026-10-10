# Private tester rollout — 1.0.0-beta.2

## First round

Invite two or three trusted Windows x64 testers, ideally with different hardware. The owner chooses recipients and shares the existing package; no invitations or files have been sent by the agent.

Provide Tangent-Testing-1.0.0-beta.2.zip and its adjacent .sha256 file. Start with the bundled small synthetic fixtures and SMOKE-TEST.md. Offer the separate stress archive after basic checks pass. The installer is unsigned and uses a separate testing identity.

Ask each tester to record Windows/WebView2 versions, CPU/RAM, display scaling, theme and PASS/FAIL/UNTESTED for the checklist. Prioritize installation and first launch on another PC, imports/exports, workspace independence, handoff integrity, exit warnings and local workflows with the network disconnected after setup.

## Feedback and triage

Use the package's FEEDBACK.md. For each issue, capture build, steps, synthetic input, expected/actual result, visible error and repeat frequency. Track each report with an ID, status, severity and verified fix version.

- Wrong values, data loss or crashes: stop expanding the test group until the problem is reproduced, fixed and retested.
- Installation failures or blocked workflows: reproduce on the affected Windows/runtime combination before widening access.
- Visual/usability issues: collect and prioritize after correctness issues.

An untested case is not a pass. Do not claim all advanced workflows or unrestricted file sizes are supported. Supported scope and exclusions are in the package README.

## Exit criteria for expanding the group

At least one additional Windows PC completes installation, launch and the core smoke checks. No unresolved incorrect-result, data-loss or crash blockers in the exercised scope. Fixes have targeted regression checks and tester confirmation. Archive the feedback and release notes before preparing the next version.

Public distribution, signing, updates and broader beta gates remain separate decisions. The current archives remain unchanged so their published local checksums stay valid.

## Invitation text for the owner to use

I'd like your help testing a private Windows build of Tangent, a local data toolkit. Please start with the synthetic sample files and included smoke checklist, then send the completed feedback template with any problems. This build installs as Tangent Testing alongside the regular app, is unsigned, and has documented limitations. Large stress files are optional. Please record your Windows version and hardware so we can check compatibility across machines.
