# NetSage AI - Model Audit Log & Responsible AI Record

This document maintains the running verification metrics and human-in-the-loop (HITL) oversight records for NetSage AI across Cisco Packet Tracer lab troubleshooting sessions.

---

## 1. Human-in-the-Loop (HITL) Agreement Metrics

| Metric Key | Value | Notes |
| :--- | :--- | :--- |
| **Total Cases Evaluated** | 24 | Running total across lab simulation batches |
| **Operator Approved (As-Is)** | 18 | Fully aligned recommendations without human edits |
| **Operator Edited Commands** | 4 | Human network engineer modified CLI commands prior to deployment |
| **Operator Rejected (False Positive)** | 2 | Recommendation rejected due to context or safety boundaries |
| **Running Agreement Rate** | **76.6%** | Baseline accuracy metric (Approved / Total Reviewed) |
| **Deterministic Rule Hit Rate** | 87.5% | Scenarios resolved without invoking LLM tokens |
| **Mean Time to Diagnosis (MTTD)** | < 1.2s | Combined regex scan + LLM fallback latency |

---

## 2. Responsible AI Human Override Log (Safety & Hallucination Mitigations)

The table below documents specific lab cases where human network engineers identified flaws, over-reaching commands, or subtle contextual errors in the AI recommendation, overriding or editing the remediation prior to switch/router deployment.

| Case ID | Layer | AI Proposed Diagnosis / Fix | Human Correction & Action | Rationale for Override |
| :--- | :--- | :--- | :--- | :--- |
| **NET-003** | Layer 2 | AI suggested `switchport trunk allowed vlan 40` | Human edited to `switchport trunk allowed vlan add 40` | Using `allowed vlan 40` without the `add` keyword overwrites the entire existing allowed VLAN list (10, 20, 30), causing a catastrophic enterprise outage. Human catch prevented service disruption. |
| **NET-008** | Layer 2 | AI proposed disabling port-security globally (`no switchport port-security`) | Human rejected and applied interface bounce (`shutdown` -> `no shutdown`) after rogue device removal | Disabling port security globally violates the organizational security baseline. The correct procedure is addressing the violation cause and clearing the err-disabled state. |
| **NET-011** | Layer 3 | AI proposed deleting the primary interface IP address (`no ip address`) | Human modified to verify the offending host MAC via ARP cache clearing and reassigning the rogue client | Deleting the router's IP drops all legitimate client traffic on that gateway subnet. The duplicate was caused by a static client misconfiguration, not the router. |
| **NET-017** | Layer 4 | AI suggested deleting the entire extended ACL (`no ip access-list extended 101`) | Human edited to selectively replace ACE line numbers `10` and `20` with permit rules | Deleting the complete ACL removes all firewall inspection and opens the network to unrestricted lateral movement. Selective line editing preserves security posture. |
| **NET-020** | Layer 7 | AI suggested configuring public Google DNS (`8.8.8.8`) as primary forwarder | Human edited to use internal corporate DNS resolver (`10.50.1.10`) | Edge lab routers must point to internal DNS servers for intranet name resolution and active directory integration, rather than external public resolvers. |
| **NET-028** | Layer 2 | AI suggested disabling Spanning Tree BPDU Guard on the switchport | Human rejected and verified unmanaged switch disconnect before issuing `shutdown`/`no shutdown` | Disabling BPDU Guard leaves the access layer vulnerable to switching loops and broadcast storms when rogue switches are connected. |

---

## 3. Continuous Event Execution Log

| Timestamp | Case ID | Source | Decision | Agreed | Edits Applied | Reviewer Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2026-08-25 14:10:02 UTC | NET-001 | RULE | APPROVED | Yes | None | Sub-interface Gi0/0.30 brought up via `no shutdown` |
| 2026-08-25 14:14:22 UTC | NET-002 | RULE | APPROVED | Yes | None | 802.1Q encapsulation added to sub-interface |
| 2026-08-25 14:22:15 UTC | NET-003 | RULE | EDITED | No | `switchport trunk allowed vlan add 40` | Prevented destructive list overwrite |
| 2026-08-25 14:35:50 UTC | NET-008 | RULE | EDITED | No | Port recovery without disabling port security | Maintained edge port security posture |
| 2026-08-25 14:48:10 UTC | NET-013 | RULE | APPROVED | Yes | None | OSPF timer sync applied (Hello 10, Dead 40) |
| 2026-08-25 15:02:44 UTC | NET-015 | RULE | APPROVED | Yes | None | Added `overload` keyword to PAT NAT statement |
| 2026-08-25 15:19:30 UTC | NET-017 | RULE | EDITED | No | Specific ACE line replacement | Kept ACL attached while fixing web access |
| 2026-08-25 15:30:12 UTC | NET-020 | RULE | EDITED | No | Replaced 8.8.8.8 with internal corporate DNS | Pointed to corporate resolution server |
| 2026-08-25 15:45:00 UTC | NET-024 | RULE | APPROVED | Yes | None | Enabled CDP globally via `cdp run` |
| 2026-08-25 16:00:15 UTC | NET-030 | RULE | APPROVED | Yes | None | Harmonized OSPF Area ID to Area 0 |
