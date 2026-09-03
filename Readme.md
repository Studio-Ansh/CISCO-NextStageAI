You are an expert Python/AI engineer. Build a complete, runnable software project called **NetSage AI** — an AI-assisted network troubleshooting dashboard for Cisco Packet Tracer lab scenarios, with a mandatory Human-in-the-Loop (HITL) approval gate. Generate every file listed below, fully coded (not pseudocode), well-commented, and ready to run.

## 1. What the project does

NetSage AI helps a network engineer/student diagnose why a lab network is broken, without letting an AI apply fixes automatically:

1. The operator opens a Streamlit dashboard and picks one troubleshooting case from a dataset of 30 pre-built Packet Tracer scenarios.
2. The dashboard shows the symptom, a topology note, and raw `show`-command output for that case.
3. A deterministic rule-checker (regex-based, no AI) scans the output first, looking for well-known, obvious misconfigurations.
4. If the rule-checker finds nothing, the case is handed to an LLM (via a structured prompt) to reason about the likely root cause.
5. Either path produces the same structured JSON result: `root_cause`, `osi_layer`, `confidence`, `evidence`, `next_command`, `fix_steps`.
6. The operator reviews the diagnosis and clicks **Approve & Deploy**, **Edit Commands**, or **Reject** — nothing is ever auto-applied.
7. Every decision is written to an audit log, including a running AI-vs-human agreement rate and a "Responsible AI" section logging at least 5 cases where a human corrected the AI.

The core design principle: rule-based checks give deterministic reliability, the AI gives flexible reasoning for cases rules can't catch, and the human gives final safety control.

## 2. Folder structure to generate

```
netsage-ai/
├── data/
│   ├── cases.csv              # already provided by me — see schema below, do not invent new rows
│   └── system_config.json     # you create this
├── prompts/
│   └── diagnose_prompt.md     # you create this
├── src/
│   ├── checker.py             # you create this
│   ├── engine.py               # you create this
│   └── app.py                  # you create this
└── docs/
    └── model_audit_log.md     # you create this (template + running log)
```

## 3. Existing dataset schema (data/cases.csv)

I already have a 30-row `cases.csv` with these exact 8 columns — build all code against this schema, don't rename or reorder columns:

`case_id, symptom, topology_note, show_outputs, expected_fault, osi_layer, concept_tag, severity`

- `osi_layer` values in the data: Layer 2, Layer 3, Layer 4, Layer 7, Layer 3/4, Layer 2/3
- `severity` values: High, Medium, Low
- `concept_tag` values span: Inter-VLAN Routing, DHCP, DNS, OSPF, ACL, NAT, Wireless/ACL, VLAN Trunking, Addressing, Switching, VLAN, Static Routing, Wireless, Subnetting, VTP, Security/DAI, Port Security, HSRP, IPv6, CDP

Example row (NET-001): symptom "PC1 cannot reach Server1 in VLAN 30"; show output contains `GigabitEthernet0/0.10 is administratively down line protocol is down`; expected_fault "Sub-interface administratively down"; osi_layer "Layer 3".

## 4. File-by-file requirements

### data/system_config.json
A small settings file holding: which AI model/provider to call, a confidence threshold below which a human must double-check even an "Approve"-ready result, max retries for the AI call, and the paths to `cases.csv` and the audit log. Keep it flat and simple.

### prompts/diagnose_prompt.md
A structured system prompt for the AI reasoning layer. It must instruct the model to:
- Always identify the likely OSI layer.
- Always cite specific evidence from the show-command output (not invent evidence).
- Include 2–3 worked few-shot examples covering different concept tags (e.g. VLAN trunking, OSPF, NAT).
- Reply **only** in this fixed JSON schema, nothing else:
```json
{
  "root_cause": "string",
  "osi_layer": "string",
  "confidence": "High | Medium | Low",
  "evidence": "string — quotes/paraphrases the relevant show output line(s)",
  "next_command": "string — the single most useful diagnostic command to confirm",
  "fix_steps": ["ordered", "list", "of", "exact", "CLI", "commands"]
}
```

### src/checker.py
Deterministic, regex-based rule engine — no AI calls. It should scan `show_outputs` text and flag known patterns, at minimum covering the fault families present in the dataset: interface/sub-interface administratively down, missing `802.1Q` encapsulation, VLAN not in trunk's allowed list, access port on wrong VLAN, access-vs-trunk mode mismatch, native VLAN mismatch, VTP domain mismatch, port-security violation/err-disabled, DAI untrusted uplink, missing/incorrect default gateway, duplicate IP address, invalid static route next-hop, OSPF hello-timer mismatch, OSPF passive-interface misconfig, missing NAT overload/PAT keyword, NAT interface direction (inside/outside) missing, ACL blocking a specific port (80/443/21/etc.), DHCP pool exhaustion, missing `ip helper-address`, DNS lookup disabled, RADIUS shared-secret mismatch, HSRP timer mismatch, IPv6 RA suppressed, CDP globally disabled. Each match should return a structured result matching the same JSON schema as the AI path, with `confidence: "High"` and a note that it was rule-detected (no AI needed). If nothing matches, return a clear "no rule match" signal so the orchestrator knows to call the AI.

### src/engine.py
The orchestrator. For a given case:
1. Run `checker.py` on the case's `show_outputs`.
2. If it finds a match, use that result directly.
3. If not, build the prompt from `diagnose_prompt.md` + the case's symptom/topology/show output, call the configured AI model, and parse/validate the JSON response (handle malformed JSON gracefully, e.g. strip markdown fences, retry on failure).
4. Return one normalized result dict/object regardless of source, plus a `source` field (`"rule"` or `"ai"`).

### src/app.py
A Streamlit dashboard with:
- A dropdown to pick a `case_id` from `cases.csv`.
- Panels showing the symptom, topology note, and raw show-command output for the selected case.
- A "Run Diagnosis" action that calls `engine.py` and displays the structured result (root cause, OSI layer, confidence, evidence, next command, fix steps) clearly.
- Three action buttons: **Approve & Deploy**, **Edit Commands** (lets the operator modify the fix_steps in a text area before confirming), **Reject** (flags as false positive).
- Every action appends a row to the audit log with: timestamp, case_id, source (rule/ai), AI's suggested fix, operator decision, any edits made, and whether AI and human agreed.
- A summary/analytics panel (can be a second tab or sidebar) showing: case counts by concept_tag/severity, and the running AI-vs-human agreement rate, computed from the audit log.

### docs/model_audit_log.md
A living Markdown log with two sections:
1. **Agreement metrics** — running totals of cases reviewed, agreement rate (e.g. target ~76.6%), counts of Approved/Edited/Rejected.
2. **Responsible AI log** — a table of at least 5 specific cases where the AI's suggested root cause or fix was corrected/overridden by the human reviewer, with a short note on why.

## 5. Reference end-to-end example (use this to sanity-check your generated code)

Case NET-001 — "PC1 cannot reach Server1 in VLAN 30." Show output contains `GigabitEthernet0/0.30 is administratively down, line protocol is down`. The rule-checker should flag this directly (no AI needed), returning fix_steps: `configure terminal` → `interface GigabitEthernet0/0.30` → `no shutdown`. The operator reviews and clicks Approve & Deploy; this gets logged.

## 6. Tech stack (use exactly this)

- Python 3.10+
- Streamlit for the dashboard
- Pandas for reading/querying `cases.csv`
- `pathlib` for all file paths (no hardcoded OS-specific paths)
- Standard `json` for structured data interchange
- Plain `re` (regex) for the rule checker — no external NLP/ML libraries needed there

## 7. Output format

Generate each file in full inside clearly labeled code blocks (one per file, with its path as a header), in this order: `data/system_config.json`, `prompts/diagnose_prompt.md`, `src/checker.py`, `src/engine.py`, `src/app.py`, `docs/model_audit_log.md`. Add a short setup/run section at the end (`pip install` requirements + `streamlit run src/app.py`). Do not omit code for brevity — write complete, working files.
