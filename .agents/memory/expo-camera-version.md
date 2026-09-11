---
name: Expo camera package version
description: A package-firewall release timing quirk encountered while adding barcode scanning to Expo SDK 57.
---

Expo SDK 57 barcode scanning currently needs the latest mature expo-camera version available to the project firewall rather than a just-published patch.

**Why:** The newest patch can exist in the public registry but still be rejected by the workspace minimum-release-age policy.

**How to apply:** If an Expo package install reports `NO_MATURE_MATCHING_VERSION`, choose the latest listed mature version compatible with the SDK instead of bypassing the firewall.