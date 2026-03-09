---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: false
---
# Accessibility Route Crawl Report

Generated at: 2026-03-08T12:23:58.033Z

## Summary

- Status: FAILED
- Routes: 17
- Passed: 0
- Failed: 17
- Unexpected Playwright failures: 1
- Flaky results: 0
- Skipped: 16
- Error messages captured: 1

## Route Status

| Route | Audience | Status | Duration | Errors |
| --- | --- | --- | ---: | ---: |
| / | public | FAIL | 1ms | 1 |
| /auth/signin | public | FAIL | 0ms | 0 |
| /auth/register | public | FAIL | 0ms | 0 |
| /admin | admin | FAIL | 0ms | 0 |
| /admin/products | admin | FAIL | 0ms | 0 |
| /admin/notes | admin | FAIL | 0ms | 0 |
| /admin/integrations | admin | FAIL | 0ms | 0 |
| /admin/case-resolver | admin | FAIL | 0ms | 0 |
| /admin/cms | admin | FAIL | 0ms | 0 |
| /admin/ai-paths | admin | FAIL | 0ms | 0 |
| /admin/image-studio | admin | FAIL | 0ms | 0 |
| /admin/chatbot | admin | FAIL | 0ms | 0 |
| /admin/agentcreator | admin | FAIL | 0ms | 0 |
| /admin/prompt-engine/validation | admin | FAIL | 0ms | 0 |
| /admin/kangur | admin | FAIL | 0ms | 0 |
| /admin/databases/engine | admin | FAIL | 0ms | 0 |
| /admin/brain?tab=routing | admin | FAIL | 0ms | 0 |

## Errors

### Public Home

- Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /Users/michalmatynia/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell --disable-field-trial-config --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-back-forward-cache --disable-breakpad --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-component-update --no-default-browser-check --disable-default-apps --disable-dev-shm-usage --disable-extensions --disable-features=AvoidUnnecessaryBeforeUnloadCheckSync,BoundaryEventDispatchTracksNodeRemoval,DestroyProfileOnBrowserClose,DialMediaRouteProvider,GlobalMediaControls,HttpsUpgrades,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,Translate,AutoDeElevate,RenderDocument,OptimizationHints --enable-features=CDPScreenshotNewSurface --allow-pre-commit-input --disable-hang-monitor --disable-ipc-flooding-protection --disable-popup-blocking --disable-prompt-on-repost --disable-renderer-backgrounding --force-color-profile=srgb --metrics-recording-only --no-first-run --password-store=basic --use-mock-keychain --no-service-autorun --export-tagged-pdf --disable-search-engine-choice-screen --unsafely-disable-devtools-self-xss-warnings --edge-skip-compat-layer-relaunch --enable-automation --disable-infobars --disable-search-engine-choice-screen --disable-sync --headless --hide-scrollbars --mute-audio --blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4 --no-sandbox --user-data-dir=/var/folders/g5/jgnr886174jbng29l_g_6fhw0000gn/T/playwright_chromiumdev_profile-W4nWCi --remote-debugging-pipe --no-startup-window
<launched> pid=49312
[pid=49312][err] [0308/132357.977572:ERROR:base/power_monitor/thermal_state_observer_mac.mm:140] ThermalStateObserverMac unable to register to power notifications. Result: 9
[pid=49312][err] [0308/132357.988043:ERROR:net/dns/dns_config_service_posix.cc:138] DNS config watch failed to start.
[pid=49312][err] [0308/132357.990076:WARNING:net/dns/dns_config_service_posix.cc:197] Failed to read DnsConfig.
[pid=49312][err] [0308/132357.994026:FATAL:base/apple/mach_port_rendezvous_mac.cc:155] Check failed: kr == KERN_SUCCESS. bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer.49312: Permission denied (1100)
Call log:
[2m  - <launching> /Users/michalmatynia/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell --disable-field-trial-config --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-back-forward-cache --disable-breakpad --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-component-update --no-default-browser-check --disable-default-apps --disable-dev-shm-usage --disable-extensions --disable-features=AvoidUnnecessaryBeforeUnloadCheckSync,BoundaryEventDispatchTracksNodeRemoval,DestroyProfileOnBrowserClose,DialMediaRouteProvider,GlobalMediaControls,HttpsUpgrades,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,Translate,AutoDeElevate,RenderDocument,OptimizationHints --enable-features=CDPScreenshotNewSurface --allow-pre-commit-input --disable-hang-monitor --disable-ipc-flooding-protection --disable-popup-blocking --disable-prompt-on-repost --disable-renderer-backgrounding --force-color-profile=srgb --metrics-recording-only --no-first-run --password-store=basic --use-mock-keychain --no-service-autorun --export-tagged-pdf --disable-search-engine-choice-screen --unsafely-disable-devtools-self-xss-warnings --edge-skip-compat-layer-relaunch --enable-automation --disable-infobars --disable-search-engine-choice-screen --disable-sync --headless --hide-scrollbars --mute-audio --blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4 --no-sandbox --user-data-dir=/var/folders/g5/jgnr886174jbng29l_g_6fhw0000gn/T/playwright_chromiumdev_profile-W4nWCi --remote-debugging-pipe --no-startup-window[22m
[2m  - <launched> pid=49312[22m
[2m  - [pid=49312][err] [0308/132357.977572:ERROR:base/power_monitor/thermal_state_observer_mac.mm:140] ThermalStateObserverMac unable to register to power notifications. Result: 9[22m
[2m  - [pid=49312][err] [0308/132357.988043:ERROR:net/dns/dns_config_service_posix.cc:138] DNS config watch failed to start.[22m
[2m  - [pid=49312][err] [0308/132357.990076:WARNING:net/dns/dns_config_service_posix.cc:197] Failed to read DnsConfig.[22m
[2m  - [pid=49312][err] [0308/132357.994026:FATAL:base/apple/mach_port_rendezvous_mac.cc:155] Check failed: kr == KERN_SUCCESS. bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer.49312: Permission denied (1100)[22m
[2m  - [pid=49312] <gracefully close start>[22m
[2m  - [pid=49312] <kill>[22m
[2m  - [pid=49312] <will force kill>[22m
[2m  - [pid=49312] exception while trying to kill process: Error: kill EPERM[22m
[2m  - [pid=49312] <process did exit: exitCode=null, signal=SIGTRAP>[22m
[2m  - [pid=49312] starting temporary directories cleanup[22m
[2m  - [pid=49312] finished temporary directories cleanup[22m
[2m  - [pid=49312] <gracefully close end>[22m

## Notes

- This crawl scans representative public and admin routes with the same axe helper used by the browser accessibility smoke suites.
- Admin routes establish a signed-in session through the shared Playwright admin auth helper before scanning.
- Run `npm run test:accessibility:gate` to execute component policies, smoke suites, and this route crawl together.
- Strict mode fails when any route scan fails.
