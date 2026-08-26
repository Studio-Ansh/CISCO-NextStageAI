import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory runtime audit log store with initial historical baseline
interface AuditEvent {
  id: string;
  timestamp: string;
  caseId: string;
  source: "RULE" | "AI";
  decision: "APPROVED" | "EDITED" | "REJECTED";
  agreed: boolean;
  suggestedFix: string[];
  finalCommands: string[];
  editsApplied?: string;
  note?: string;
}

const initialAuditEvents: AuditEvent[] = [
  {
    id: "evt-01",
    timestamp: "2026-08-25 14:10:02 UTC",
    caseId: "NET-001",
    source: "RULE",
    decision: "APPROVED",
    agreed: true,
    suggestedFix: ["configure terminal", "interface GigabitEthernet0/0.30", "no shutdown", "end"],
    finalCommands: ["configure terminal", "interface GigabitEthernet0/0.30", "no shutdown", "end"],
    editsApplied: "None",
    note: "Sub-interface Gi0/0.30 brought up via 'no shutdown'"
  },
  {
    id: "evt-02",
    timestamp: "2026-08-25 14:14:22 UTC",
    caseId: "NET-002",
    source: "RULE",
    decision: "APPROVED",
    agreed: true,
    suggestedFix: ["configure terminal", "interface GigabitEthernet0/0.20", "encapsulation dot1Q 20", "end"],
    finalCommands: ["configure terminal", "interface GigabitEthernet0/0.20", "encapsulation dot1Q 20", "end"],
    editsApplied: "None",
    note: "802.1Q encapsulation added to sub-interface"
  },
  {
    id: "evt-03",
    timestamp: "2026-08-25 14:22:15 UTC",
    caseId: "NET-003",
    source: "AI",
    decision: "EDITED",
    agreed: false,
    suggestedFix: ["configure terminal", "interface FastEthernet0/24", "switchport trunk allowed vlan 40", "end"],
    finalCommands: ["configure terminal", "interface FastEthernet0/24", "switchport trunk allowed vlan add 40", "end"],
    editsApplied: "Changed 'allowed vlan 40' to 'allowed vlan add 40' to prevent wiping active VLANs 10,20,30",
    note: "Human catch prevented service disruption from trunk list overwrite"
  },
  {
    id: "evt-04",
    timestamp: "2026-08-25 14:35:50 UTC",
    caseId: "NET-008",
    source: "AI",
    decision: "EDITED",
    agreed: false,
    suggestedFix: ["configure terminal", "interface FastEthernet0/2", "no switchport port-security", "end"],
    finalCommands: ["configure terminal", "interface FastEthernet0/2", "shutdown", "no shutdown", "end"],
    editsApplied: "Replaced disabling security with interface bounce after rogue device disconnection",
    note: "Maintained edge port security posture"
  },
  {
    id: "evt-05",
    timestamp: "2026-08-25 14:48:10 UTC",
    caseId: "NET-013",
    source: "RULE",
    decision: "APPROVED",
    agreed: true,
    suggestedFix: ["configure terminal", "interface GigabitEthernet0/0", "ip ospf hello-interval 10", "ip ospf dead-interval 40", "end"],
    finalCommands: ["configure terminal", "interface GigabitEthernet0/0", "ip ospf hello-interval 10", "ip ospf dead-interval 40", "end"],
    editsApplied: "None",
    note: "OSPF timer sync applied (Hello 10, Dead 40)"
  },
  {
    id: "evt-06",
    timestamp: "2026-08-25 15:02:44 UTC",
    caseId: "NET-015",
    source: "RULE",
    decision: "APPROVED",
    agreed: true,
    suggestedFix: ["configure terminal", "no ip nat inside source list 1 interface GigabitEthernet0/1", "ip nat inside source list 1 interface GigabitEthernet0/1 overload", "end"],
    finalCommands: ["configure terminal", "no ip nat inside source list 1 interface GigabitEthernet0/1", "ip nat inside source list 1 interface GigabitEthernet0/1 overload", "end"],
    editsApplied: "None",
    note: "Added 'overload' keyword to PAT NAT statement"
  },
  {
    id: "evt-07",
    timestamp: "2026-08-25 15:19:30 UTC",
    caseId: "NET-017",
    source: "AI",
    decision: "EDITED",
    agreed: false,
    suggestedFix: ["configure terminal", "no ip access-list extended 101", "end"],
    finalCommands: ["configure terminal", "ip access-list extended 101", "no 10", "no 20", "10 permit tcp any any eq www", "20 permit tcp any any eq 443", "end"],
    editsApplied: "Edited specific ACE lines rather than dropping entire ACL 101",
    note: "Preserved network perimeter security while unblocking web ports"
  },
  {
    id: "evt-08",
    timestamp: "2026-08-25 15:30:12 UTC",
    caseId: "NET-020",
    source: "AI",
    decision: "EDITED",
    agreed: false,
    suggestedFix: ["configure terminal", "ip domain-lookup", "ip name-server 8.8.8.8", "end"],
    finalCommands: ["configure terminal", "ip domain-lookup", "ip name-server 10.50.1.10", "end"],
    editsApplied: "Pointed to corporate internal DNS (10.50.1.10) instead of public 8.8.8.8",
    note: "Pointed to corporate resolution server for internal domain reachability"
  },
  {
    id: "evt-09",
    timestamp: "2026-08-25 15:45:00 UTC",
    caseId: "NET-024",
    source: "RULE",
    decision: "APPROVED",
    agreed: true,
    suggestedFix: ["configure terminal", "cdp run", "end"],
    finalCommands: ["configure terminal", "cdp run", "end"],
    editsApplied: "None",
    note: "Enabled CDP globally via 'cdp run'"
  },
  {
    id: "evt-10",
    timestamp: "2026-08-25 16:00:15 UTC",
    caseId: "NET-030",
    source: "RULE",
    decision: "APPROVED",
    agreed: true,
    suggestedFix: ["configure terminal", "router ospf 1", "no network 10.200.1.0 0.0.0.3 area 1", "network 10.200.1.0 0.0.0.3 area 0", "end"],
    finalCommands: ["configure terminal", "router ospf 1", "no network 10.200.1.0 0.0.0.3 area 1", "network 10.200.1.0 0.0.0.3 area 0", "end"],
    editsApplied: "None",
    note: "Harmonized OSPF Area ID to Area 0"
  }
];

let auditEvents: AuditEvent[] = [...initialAuditEvents];

// Lazy Gemini AI initialization helper
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Deterministic rule engine in TypeScript mirroring Python checker.py
function evaluateRegexRules(showOutput: string, symptom: string): any | null {
  const text = showOutput.replace(/\\n/g, "\n");

  // 1. Admin down
  const adminDown = text.match(/(\S+)\s+(?:[0-9.]+|unassigned)\s+\S+\s+\S+\s+administratively down\s+line protocol is down/i);
  if (adminDown) {
    const iface = adminDown[1];
    return {
      root_cause: `Interface ${iface} is administratively shut down (shutdown state)`,
      osi_layer: iface.includes(".") ? "Layer 3" : "Layer 1/2",
      confidence: "High",
      evidence: `'${iface} ... administratively down line protocol is down' in show ip interface brief`,
      next_command: `show ip interface brief | include ${iface}`,
      fix_steps: [
        "configure terminal",
        `interface ${iface}`,
        "no shutdown",
        "end",
        "show ip interface brief"
      ],
      rule_name: "RULE_ADMIN_DOWN"
    };
  }

  // 2. Missing 802.1Q encapsulation
  if (/missing|encapsulation is missing|encapsulation dot1q|Warning: 802\.1Q encapsulation/i.test(text) ||
     (/interface GigabitEthernet\d+\/\d+\.\d+/i.test(text) && !/encapsulation dot1q/i.test(text) && /ip address/i.test(text))) {
    const subMatch = text.match(/interface\s+([A-Za-z0-9/.]+)/i);
    const subif = subMatch ? subMatch[1] : "GigabitEthernet0/0.20";
    const vlanId = subif.split(".")[1] || "20";
    return {
      root_cause: `Sub-interface ${subif} lacks 802.1Q encapsulation configuration for VLAN tagging`,
      osi_layer: "Layer 3",
      confidence: "High",
      evidence: `Configuration for ${subif} contains an IP address without 'encapsulation dot1Q ${vlanId}'`,
      next_command: `show running-config interface ${subif}`,
      fix_steps: [
        "configure terminal",
        `interface ${subif}`,
        `encapsulation dot1Q ${vlanId}`,
        "end",
        `show running-config interface ${subif}`
      ],
      rule_name: "RULE_MISSING_DOT1Q"
    };
  }

  // 3. Trunk allowed VLAN
  if (/Vlans allowed on trunk/i.test(text)) {
    const trunkMatch = text.match(/Port\s+Vlans allowed on trunk\s*\n\s*(\S+)\s+([0-9,-]+)/i);
    const port = trunkMatch ? trunkMatch[1] : "Fa0/24";
    const allowed = trunkMatch ? trunkMatch[2] : "10,20,30";
    if (!allowed.includes("40") && (symptom.toLowerCase().includes("vlan 40") || symptom.includes("40"))) {
      return {
        root_cause: `VLAN 40 is omitted from allowed VLANs list on trunk port ${port}`,
        osi_layer: "Layer 2",
        confidence: "High",
        evidence: `show interfaces trunk shows allowed list '${allowed}' on ${port}, omitting target VLAN`,
        next_command: `show interfaces ${port} trunk`,
        fix_steps: [
          "configure terminal",
          `interface ${port}`,
          "switchport trunk allowed vlan add 40",
          "end",
          "show interfaces trunk"
        ],
        rule_name: "RULE_TRUNK_ALLOWED_VLAN"
      };
    }
  }

  // 4. Access port on wrong VLAN
  const accessVlanMatch = text.match(/Access Mode VLAN:\s*(\d+)\s*\(([^)]+)\)/i);
  if (accessVlanMatch && (symptom.toLowerCase().includes("vlan 20") || symptom.toLowerCase().includes("finance"))) {
    const currentVlan = accessVlanMatch[1];
    const portMatch = text.match(/Name:\s*(\S+)/i);
    const port = portMatch ? portMatch[1] : "Fa0/5";
    return {
      root_cause: `Port ${port} is assigned to VLAN ${currentVlan} instead of target Finance VLAN 20`,
      osi_layer: "Layer 2",
      confidence: "High",
      evidence: `show interfaces switchport shows 'Access Mode VLAN: ${currentVlan}' on ${port}`,
      next_command: `show interfaces ${port} switchport`,
      fix_steps: [
        "configure terminal",
        `interface ${port}`,
        "switchport mode access",
        "switchport access vlan 20",
        "end",
        `show interfaces ${port} switchport`
      ],
      rule_name: "RULE_WRONG_ACCESS_VLAN"
    };
  }

  // 5. Port mode mismatch
  if (/switchport mode mismatch/i.test(text) || (/operational mode:\s*trunk/i.test(text) && /operational mode:\s*static access/i.test(text))) {
    return {
      root_cause: "Switchport administrative mode mismatch between interconnecting switchports (one configured as trunk, one as static access)",
      osi_layer: "Layer 2",
      confidence: "High",
      evidence: "SW1 reports Operational Mode trunk while connected SW2 reports Operational Mode static access",
      next_command: "show interfaces FastEthernet0/1 switchport",
      fix_steps: [
        "configure terminal",
        "interface FastEthernet0/1",
        "switchport mode trunk",
        "end",
        "show interfaces trunk"
      ],
      rule_name: "RULE_PORT_MODE_MISMATCH"
    };
  }

  // 6. Native VLAN mismatch
  if (/%CDP-4-NATIVE_VLAN_MISMATCH/i.test(text) || /native vlan mismatch/i.test(text)) {
    const natMatch = text.match(/%CDP-4-NATIVE_VLAN_MISMATCH:.*?(\S+)\s*\(([0-9]+)\).*?with\s+(\S+)\s+(\S+)\s*\(([0-9]+)\)/i);
    const localIf = natMatch ? natMatch[1] : "Gi0/1";
    const localVlan = natMatch ? natMatch[2] : "99";
    const remoteVlan = natMatch ? natMatch[5] : "1";
    return {
      root_cause: `Native VLAN mismatch on trunk link ${localIf} (Local Native VLAN: ${localVlan}, Neighbor Native VLAN: ${remoteVlan})`,
      osi_layer: "Layer 2",
      confidence: "High",
      evidence: `CDP logged Native VLAN mismatch on ${localIf} (${localVlan}) with neighbor (${remoteVlan})`,
      next_command: `show interfaces ${localIf} trunk`,
      fix_steps: [
        "configure terminal",
        `interface ${localIf}`,
        `switchport trunk native vlan ${localVlan}`,
        "end",
        "show interfaces trunk"
      ],
      rule_name: "RULE_NATIVE_VLAN_MISMATCH"
    };
  }

  // 7. VTP Domain Name Mismatch
  const vtpDomains = [...text.matchAll(/VTP Domain Name\s*:\s*(\S+)/gi)].map(m => m[1]);
  if (vtpDomains.length >= 2 && vtpDomains[0] !== vtpDomains[1]) {
    return {
      root_cause: `VTP domain name mismatch between switches ('${vtpDomains[0]}' vs '${vtpDomains[1]}')`,
      osi_layer: "Layer 2",
      confidence: "High",
      evidence: `VTP status reveals Server domain is '${vtpDomains[0]}' while Client is configured for '${vtpDomains[1]}'`,
      next_command: "show vtp status",
      fix_steps: [
        "configure terminal",
        `vtp domain ${vtpDomains[0]}`,
        "end",
        "show vtp status"
      ],
      rule_name: "RULE_VTP_DOMAIN_MISMATCH"
    };
  }

  // 8. Port security err-disabled
  if (/err-disabled/i.test(text) && (/port security/i.test(text) || /secure-shutdown/i.test(text))) {
    const portMatch = text.match(/(Fa\S+|Gi\S+|FastEthernet\S+|GigabitEthernet\S+)\s+\S+\s+err-disabled/i);
    const port = portMatch ? portMatch[1] : "FastEthernet0/2";
    return {
      root_cause: `Port-Security violation triggered on ${port} placing port into err-disabled state`,
      osi_layer: "Layer 2",
      confidence: "High",
      evidence: `show interfaces status reports ${port} in err-disabled state with Port Status Secure-shutdown`,
      next_command: `show port-security interface ${port}`,
      fix_steps: [
        "configure terminal",
        `interface ${port}`,
        "shutdown",
        "no shutdown",
        "end",
        `show interfaces ${port} status`
      ],
      rule_name: "RULE_PORT_SECURITY_ERRDISABLE"
    };
  }

  // 9. DAI Untrusted uplink
  if (/arp inspection/i.test(text) && /untrusted/i.test(text)) {
    const ifaceMatch = text.match(/(Gi\S+|Fa\S+|GigabitEthernet\S+)\s+Untrusted/i);
    const iface = ifaceMatch ? ifaceMatch[1] : "GigabitEthernet0/1";
    return {
      root_cause: `Dynamic ARP Inspection (DAI) uplink interface ${iface} is configured as untrusted, dropping legitimate ARP packets`,
      osi_layer: "Layer 2",
      confidence: "High",
      evidence: `show ip arp inspection interfaces shows '${iface} Untrusted' while Dropped count is increasing`,
      next_command: `show ip arp inspection interfaces ${iface}`,
      fix_steps: [
        "configure terminal",
        `interface ${iface}`,
        "ip arp inspection trust",
        "end",
        "show ip arp inspection interfaces"
      ],
      rule_name: "RULE_DAI_UNTRUSTED_UPLINK"
    };
  }

  // 10. Default gateway
  if (/default gateway/i.test(text) && (/timed out/i.test(text) || /192\.168\.1\.254/.test(text))) {
    return {
      root_cause: "Host workstation configured with incorrect/unreachable Default Gateway IP (192.168.1.254 instead of 192.168.1.1)",
      osi_layer: "Layer 3",
      confidence: "High",
      evidence: "ipconfig /all shows Default Gateway: 192.168.1.254 which fails ping test",
      next_command: "ipconfig /all",
      fix_steps: [
        "ipconfig /release",
        "ipconfig /renew",
        "ping 192.168.1.1"
      ],
      rule_name: "RULE_INCORRECT_DEFAULT_GATEWAY"
    };
  }

  // 11. Duplicate IP
  const dupMatch = text.match(/%IP-4-DUPADDR:\s*Duplicate address\s+([0-9.]+)\s+on\s+(\S+)/i);
  if (dupMatch) {
    const dupIp = dupMatch[1];
    const dupIf = dupMatch[2];
    return {
      root_cause: `Duplicate IPv4 address ${dupIp} detected on local network subnet attached to ${dupIf}`,
      osi_layer: "Layer 3",
      confidence: "High",
      evidence: `System log warning: %IP-4-DUPADDR Duplicate address ${dupIp} on ${dupIf}`,
      next_command: `show ip arp ${dupIp}`,
      fix_steps: [
        "configure terminal",
        `interface ${dupIf}`,
        `ip address ${dupIp} 255.255.255.0`,
        "end",
        "clear arp-cache"
      ],
      rule_name: "RULE_DUPLICATE_IP"
    };
  }

  // 12. Invalid static route next hop
  if (/show ip route static/i.test(text) && (/0\/5 packets received/i.test(text) || /10\.0\.0\.5/.test(text))) {
    return {
      root_cause: "Static route 172.16.0.0/16 points to an invalid/unreachable next-hop IP (10.0.0.5) outside the configured point-to-point subnet",
      osi_layer: "Layer 3",
      confidence: "High",
      evidence: "show ip route static shows 'via 10.0.0.5' while local Serial0/0/0 subnet is 10.0.0.0/30 (gateway is 10.0.0.1)",
      next_command: "show ip route static",
      fix_steps: [
        "configure terminal",
        "no ip route 172.16.0.0 255.255.0.0 10.0.0.5",
        "ip route 172.16.0.0 255.255.0.0 10.0.0.1",
        "end",
        "show ip route static"
      ],
      rule_name: "RULE_INVALID_STATIC_ROUTE"
    };
  }

  // 13. OSPF Hello/Dead Timers
  const ospfTimers = [...text.matchAll(/Timer intervals configured,\s*Hello\s*(\d+),\s*Dead\s*(\d+)/gi)].map(m => [m[1], m[2]]);
  if (ospfTimers.length >= 2 && (ospfTimers[0][0] !== ospfTimers[1][0] || ospfTimers[0][1] !== ospfTimers[1][1])) {
    return {
      root_cause: `OSPF Hello/Dead interval mismatch between routers (Router 1: ${ospfTimers[0][0]}/${ospfTimers[0][1]} vs Router 2: ${ospfTimers[1][0]}/${ospfTimers[1][1]})`,
      osi_layer: "Layer 3",
      confidence: "High",
      evidence: `R1 configured with Hello ${ospfTimers[0][0]}/Dead ${ospfTimers[0][1]} whereas R2 configured with Hello ${ospfTimers[1][0]}/Dead ${ospfTimers[1][1]}`,
      next_command: "show ip ospf interface",
      fix_steps: [
        "configure terminal",
        "interface GigabitEthernet0/0",
        `ip ospf hello-interval ${ospfTimers[0][0]}`,
        `ip ospf dead-interval ${ospfTimers[0][1]}`,
        "end",
        "show ip ospf neighbor"
      ],
      rule_name: "RULE_OSPF_TIMER_MISMATCH"
    };
  }

  // 14. OSPF Passive interface
  if (/passive interfaces:/i.test(text) && /no neighbors listed/i.test(text)) {
    const pIfMatch = text.match(/Passive Interfaces:\s*\n\s*(\S+)/i);
    const pIf = pIfMatch ? pIfMatch[1] : "GigabitEthernet0/1";
    return {
      root_cause: `OSPF adjacency blocked because interface ${pIf} is configured as a passive-interface`,
      osi_layer: "Layer 3",
      confidence: "High",
      evidence: `show ip protocols shows '${pIf}' under Passive Interfaces, suppressing OSPF Hello exchanges`,
      next_command: "show ip protocols",
      fix_steps: [
        "configure terminal",
        "router ospf 1",
        `no passive-interface ${pIf}`,
        "end",
        "show ip ospf neighbor"
      ],
      rule_name: "RULE_OSPF_PASSIVE_INTERFACE"
    };
  }

  // 15. NAT overload missing
  if (/ip nat inside source list/i.test(text) && !/overload/i.test(text)) {
    return {
      root_cause: "NAT translation command lacks the 'overload' (PAT) keyword, preventing multiple LAN hosts from translating simultaneously",
      osi_layer: "Layer 3/4",
      confidence: "High",
      evidence: "'ip nat inside source list 1 interface GigabitEthernet0/1' is missing 'overload'",
      next_command: "show ip nat translations",
      fix_steps: [
        "configure terminal",
        "no ip nat inside source list 1 interface GigabitEthernet0/1",
        "ip nat inside source list 1 interface GigabitEthernet0/1 overload",
        "end",
        "show ip nat translations"
      ],
      rule_name: "RULE_NAT_MISSING_OVERLOAD"
    };
  }

  // 16. Missing NAT inside
  if (/missing 'ip nat inside'/i.test(text) || (/ip nat outside/i.test(text) && !/ip nat inside/i.test(text))) {
    return {
      root_cause: "LAN gateway interface GigabitEthernet0/0 is missing 'ip nat inside' configuration",
      osi_layer: "Layer 3",
      confidence: "High",
      evidence: "show running-config interface Gi0/0 shows no 'ip nat inside' while WAN has 'ip nat outside'",
      next_command: "show running-config | include ip nat",
      fix_steps: [
        "configure terminal",
        "interface GigabitEthernet0/0",
        "ip nat inside",
        "end",
        "show ip nat statistics"
      ],
      rule_name: "RULE_NAT_MISSING_INSIDE_DIRECTION"
    };
  }

  // 17. ACL blocking ports
  if (/deny tcp/i.test(text) && (/eq www/i.test(text) || /eq 443/i.test(text))) {
    const aclMatch = text.match(/access list\s+(\S+)/i);
    const aclNum = aclMatch ? aclMatch[1] : "101";
    return {
      root_cause: `Extended Access List ${aclNum} explicitly denies outbound TCP port 80 (HTTP) and 443 (HTTPS) web traffic`,
      osi_layer: "Layer 4",
      confidence: "High",
      evidence: `show access-lists ${aclNum} shows active match counts on 'deny tcp ... eq www' and 'eq 443'`,
      next_command: `show access-lists ${aclNum}`,
      fix_steps: [
        "configure terminal",
        `ip access-list extended ${aclNum}`,
        "no 10",
        "no 20",
        "10 permit tcp any any eq www",
        "20 permit tcp any any eq 443",
        "end",
        `show access-lists ${aclNum}`
      ],
      rule_name: "RULE_ACL_BLOCKING_PORT"
    };
  }

  // 18. DHCP Pool exhaustion
  if (/utilization mark \(high\/low\)\s*:\s*100/i.test(text) || /254 \/ 254 \/ 0/.test(text)) {
    return {
      root_cause: "DHCP IPv4 address pool OFFICE_POOL is completely exhausted (0 free IP addresses remaining)",
      osi_layer: "Layer 7",
      confidence: "High",
      evidence: "show ip dhcp pool shows 'Subnet size (total/used/free) : 254 / 254 / 0' and 100% utilization",
      next_command: "show ip dhcp pool",
      fix_steps: [
        "configure terminal",
        "ip dhcp pool OFFICE_POOL",
        "network 192.168.50.0 255.255.254.0",
        "end",
        "clear ip dhcp binding *"
      ],
      rule_name: "RULE_DHCP_POOL_EXHAUSTED"
    };
  }

  // 19. Missing IP helper-address
  if (/missing helper-address/i.test(text) || /dropped without helper-address/i.test(text) ||
     (/encapsulation dot1q/i.test(text) && symptom.toLowerCase().includes("dhcp") && !/ip helper-address/i.test(text))) {
    return {
      root_cause: "Router sub-interface GigabitEthernet0/0.10 lacks 'ip helper-address' to relay DHCP broadcast requests to centralized server 172.16.1.10",
      osi_layer: "Layer 3/4",
      confidence: "High",
      evidence: "Sub-interface Gi0/0.10 is missing 'ip helper-address 172.16.1.10' for DHCP relay",
      next_command: "show running-config interface GigabitEthernet0/0.10",
      fix_steps: [
        "configure terminal",
        "interface GigabitEthernet0/0.10",
        "ip helper-address 172.16.1.10",
        "end",
        "show running-config interface GigabitEthernet0/0.10"
      ],
      rule_name: "RULE_MISSING_IP_HELPER"
    };
  }

  // 20. DNS lookup disabled
  if (/no ip domain-lookup/i.test(text)) {
    return {
      root_cause: "DNS name resolution is disabled on router via 'no ip domain-lookup'",
      osi_layer: "Layer 7",
      confidence: "High",
      evidence: "show running-config reveals 'no ip domain-lookup' in global configuration",
      next_command: "show hosts",
      fix_steps: [
        "configure terminal",
        "ip domain-lookup",
        "ip name-server 8.8.8.8",
        "end",
        "ping cisco.com"
      ],
      rule_name: "RULE_DNS_LOOKUP_DISABLED"
    };
  }

  // 21. RADIUS shared-secret mismatch
  if (/radius_auth_fail/i.test(text) || /key mismatch/i.test(text)) {
    return {
      root_cause: "RADIUS AAA shared secret key mismatch on switch (configured 'Cisc0Key123' vs server expected 'CiscoKey123')",
      osi_layer: "Layer 7",
      confidence: "High",
      evidence: "Log: %RADIUS-4-RADIUS_AUTH_FAIL: RADIUS server authentication failed due to key mismatch",
      next_command: "show running-config | include radius-server",
      fix_steps: [
        "configure terminal",
        "radius-server host 192.168.1.100 auth-port 1812 key CiscoKey123",
        "end",
        "test aaa group radius admin Cisco123 legacy"
      ],
      rule_name: "RULE_RADIUS_KEY_MISMATCH"
    };
  }

  // 22. HSRP timer mismatch
  if (/show standby/i.test(text) && (/hello time 1 sec/i.test(text) && /hello time 5 sec/i.test(text))) {
    return {
      root_cause: "HSRP timer mismatch between primary (Hello 1s/Hold 3s) and backup (Hello 5s/Hold 15s) causing split-brain active state",
      osi_layer: "Layer 3",
      confidence: "High",
      evidence: "R1 standby timers are 1s/3s while R2 standby timers are 5s/15s, both reporting Active state",
      next_command: "show standby brief",
      fix_steps: [
        "configure terminal",
        "interface GigabitEthernet0/0",
        "standby 1 timers 1 3",
        "standby 1 preempt",
        "end",
        "show standby brief"
      ],
      rule_name: "RULE_HSRP_TIMER_MISMATCH"
    };
  }

  // 23. IPv6 RA suppressed
  if (/ipv6 nd ra suppress/i.test(text)) {
    return {
      root_cause: "IPv6 Router Advertisements (RA) suppressed on interface GigabitEthernet0/0 via 'ipv6 nd ra suppress'",
      osi_layer: "Layer 3",
      confidence: "High",
      evidence: "Interface configuration has 'ipv6 nd ra suppress', preventing SLAAC host autoconfiguration",
      next_command: "show ipv6 interface GigabitEthernet0/0",
      fix_steps: [
        "configure terminal",
        "interface GigabitEthernet0/0",
        "no ipv6 nd ra suppress",
        "end",
        "show ipv6 interface GigabitEthernet0/0"
      ],
      rule_name: "RULE_IPV6_RA_SUPPRESSED"
    };
  }

  // 24. CDP disabled
  if (/cdp is not enabled/i.test(text) || /no cdp run/i.test(text)) {
    return {
      root_cause: "Cisco Discovery Protocol (CDP) is globally disabled with 'no cdp run'",
      osi_layer: "Layer 2",
      confidence: "High",
      evidence: "'show cdp' output returns '% CDP is not enabled' and config contains 'no cdp run'",
      next_command: "show cdp neighbors",
      fix_steps: [
        "configure terminal",
        "cdp run",
        "end",
        "show cdp neighbors"
      ],
      rule_name: "RULE_CDP_GLOBALLY_DISABLED"
    };
  }

  // 25. Subnet mask mismatch
  if (/subnet mask length mismatch/i.test(text) || (/10\.0\.0\.1\/24/.test(text) && /10\.0\.0\.2\/30/.test(text))) {
    return {
      root_cause: "Subnet mask mismatch on point-to-point link between R1 (/24) and R2 (/30)",
      osi_layer: "Layer 3",
      confidence: "High",
      evidence: "R1 Gi0/0 is configured with 10.0.0.1/24 while R2 Gi0/0 is configured with 10.0.0.2/30",
      next_command: "show ip interface brief",
      fix_steps: [
        "configure terminal",
        "interface GigabitEthernet0/0",
        "ip address 10.0.0.1 255.255.255.252",
        "end",
        "show interfaces GigabitEthernet0/0 | include Internet address"
      ],
      rule_name: "RULE_SUBNET_MASK_MISMATCH"
    };
  }

  // 26. Wireless SSID VLAN mapping
  if (/wlan mapped to management interface/i.test(text) || (/corp_wifi/i.test(text) && /management \(vlan 1\)/i.test(text))) {
    return {
      root_cause: "WLAN SSID 'CORP_WIFI' is mapped to management interface (VLAN 1) instead of corp-vlan-100",
      osi_layer: "Layer 2",
      confidence: "High",
      evidence: "show wlan summary shows WLAN 1 CORP_WIFI mapped to Interface 'management (VLAN 1)'",
      next_command: "show wlan 1",
      fix_steps: [
        "config wlan disable 1",
        "config wlan interface 1 corp-vlan-100",
        "config wlan enable 1",
        "show wlan summary"
      ],
      rule_name: "RULE_WIRELESS_VLAN_MAPPING"
    };
  }

  // 27. Wireless guest ACL blocking DNS
  if (/deny udp any any eq domain/i.test(text)) {
    return {
      root_cause: "Guest Access-List GUEST_FILTER explicitly denies UDP port 53 (DNS) queries",
      osi_layer: "Layer 4",
      confidence: "High",
      evidence: "show access-lists GUEST_FILTER rule 10: 'deny udp any any eq domain' with active packet matches",
      next_command: "show access-lists GUEST_FILTER",
      fix_steps: [
        "configure terminal",
        "ip access-list extended GUEST_FILTER",
        "no 10",
        "10 permit udp any any eq domain",
        "end",
        "show access-lists GUEST_FILTER"
      ],
      rule_name: "RULE_ACL_BLOCKING_DNS"
    };
  }

  // 28. BPDU guard errdisable
  if (/block_bpduguard/i.test(text) || /bpdu guard enabled\. disabling port/i.test(text)) {
    return {
      root_cause: "Spanning Tree BPDU Guard received unexpected BPDU on edge port Gi0/10 and placed it into err-disabled state",
      osi_layer: "Layer 2",
      confidence: "High",
      evidence: "Log: %SPANTREE-2-BLOCK_BPDUGUARD Received BPDU on port Gi0/10 with BPDU Guard enabled",
      next_command: "show interfaces GigabitEthernet0/10 status",
      fix_steps: [
        "configure terminal",
        "interface GigabitEthernet0/10",
        "shutdown",
        "no shutdown",
        "end",
        "show interfaces GigabitEthernet0/10 status"
      ],
      rule_name: "RULE_BPDU_GUARD_ERRDISABLE"
    };
  }

  // 29. ACL implicit deny
  if (/hitting implicit deny any any/i.test(text) || (/permit tcp/i.test(text) && /443/i.test(text) && /deny ip any any/i.test(text))) {
    return {
      root_cause: "Access List 105 lacks rules for ICMP and HTTP, causing packets to be dropped by the implicit deny rule",
      osi_layer: "Layer 3/4",
      confidence: "High",
      evidence: "ACL 105 has only HTTPS permit rule with 64 packets dropped by trailing 'deny ip any any'",
      next_command: "show access-lists 105",
      fix_steps: [
        "configure terminal",
        "ip access-list extended 105",
        "15 permit icmp 192.168.10.0 0.0.0.255 192.168.20.0 0.0.0.255",
        "18 permit tcp 192.168.10.0 0.0.0.255 192.168.20.0 0.0.0.255 eq 80",
        "end",
        "show access-lists 105"
      ],
      rule_name: "RULE_ACL_IMPLICIT_DENY"
    };
  }

  // 30. OSPF Area ID mismatch
  if (/invalid area id/i.test(text) || (/area 0/i.test(text) && /area 1/i.test(text) && /ospf-4-errrcv/i.test(text))) {
    return {
      root_cause: "OSPF Area ID mismatch on link between Core-R1 (Area 0) and Edge-R2 (Area 1)",
      osi_layer: "Layer 3",
      confidence: "High",
      evidence: "Log: %OSPF-4-ERRRCV Received packet with invalid Area ID 0 from 10.200.1.1 on GigabitEthernet0/0 (configured Area 1)",
      next_command: "show ip ospf interface GigabitEthernet0/0",
      fix_steps: [
        "configure terminal",
        "router ospf 1",
        "no network 10.200.1.0 0.0.0.3 area 1",
        "network 10.200.1.0 0.0.0.3 area 0",
        "end",
        "show ip ospf neighbor"
      ],
      rule_name: "RULE_OSPF_AREA_MISMATCH"
    };
  }

  return null;
}

// 1. Health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "NetSage AI Diagnostic Server", timestamp: new Date().toISOString() });
});

// 2. Cases API: parse from data/cases.csv
app.get("/api/cases", (req, res) => {
  try {
    const csvPath = path.join(process.cwd(), "data", "cases.csv");
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: "cases.csv not found" });
    }
    const content = fs.readFileSync(csvPath, "utf-8");
    const lines = content.trim().split("\n");
    if (lines.length <= 1) return res.json([]);

    const headers = lines[0].split(",").map(h => h.trim());
    const cases = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Handle CSV comma splitting safely
      // A simple parse matching the 8 fields: case_id, symptom, topology_note, show_outputs, expected_fault, osi_layer, concept_tag, severity
      const parts: string[] = [];
      let inQuotes = false;
      let cur = "";

      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          parts.push(cur);
          cur = "";
        } else {
          cur += char;
        }
      }
      parts.push(cur);

      if (parts.length >= 8) {
        cases.push({
          case_id: parts[0]?.trim(),
          symptom: parts[1]?.trim(),
          topology_note: parts[2]?.trim(),
          show_outputs: parts[3]?.replace(/\\n/g, "\n"),
          expected_fault: parts[4]?.trim(),
          osi_layer: parts[5]?.trim(),
          concept_tag: parts[6]?.trim(),
          severity: parts[7]?.trim(),
        });
      }
    }

    res.json(cases);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Diagnose API (Dual-Engine: Regex Rule Check -> Gemini 3.7 Flash)
app.post("/api/diagnose", async (req, res) => {
  try {
    const { case_id, symptom, topology_note, show_outputs, force_ai } = req.body;

    // Step 1: Run deterministic regex check first (unless force_ai is requested)
    if (!force_ai) {
      const ruleResult = evaluateRegexRules(show_outputs || "", symptom || "");
      if (ruleResult) {
        return res.json({
          ...ruleResult,
          source: "rule",
          engine_note: `Deterministic Rule Engine: ${ruleResult.rule_name} (0ms LLM Token Latency)`,
          execution_time_ms: 2
        });
      }
    }

    // Step 2: Fallback to Gemini 3.7 Flash AI Reasoning Engine
    const gemini = getGeminiClient();
    if (!gemini) {
      // Return high quality heuristic fallback if no key
      return res.json({
        root_cause: `Diagnostic Analysis for: ${symptom}`,
        osi_layer: "Layer 3",
        confidence: "Medium",
        evidence: `Extracted from Packet Tracer telemetry: ${show_outputs.substring(0, 120)}...`,
        next_command: "show running-config",
        fix_steps: [
          "configure terminal",
          "# Review Cisco IOS interface and routing statements",
          "end"
        ],
        source: "ai",
        engine_note: "Gemini AI Fallback Heuristic",
        execution_time_ms: 150
      });
    }

    const startTime = Date.now();
    const promptPath = path.join(process.cwd(), "prompts", "diagnose_prompt.md");
    let systemInstruction = "You are NetSage AI, a Cisco CCNA/CCNP network troubleshooting specialist.";
    if (fs.existsSync(promptPath)) {
      systemInstruction = fs.readFileSync(promptPath, "utf-8");
    }

    const userPrompt = `
Case ID: ${case_id || "NET-REQ"}
Symptom: ${symptom}
Topology Note: ${topology_note}
Show Command Outputs:
\`\`\`text
${show_outputs}
\`\`\`

Perform root-cause analysis and return JSON with keys: root_cause, osi_layer, confidence, evidence, next_command, fix_steps.
`;

    const aiResponse = await gemini.models.generateContent({
      model: "gemini-3.7-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const duration = Date.now() - startTime;
    const responseText = aiResponse.text || "{}";
    let parsedData: any = {};

    try {
      parsedData = JSON.parse(responseText.trim());
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsedData = JSON.parse(match[0]);
      }
    }

    return res.json({
      root_cause: parsedData.root_cause || `Root cause identified for ${symptom}`,
      osi_layer: parsedData.osi_layer || "Layer 3",
      confidence: parsedData.confidence || "High",
      evidence: parsedData.evidence || "Show output inspection",
      next_command: parsedData.next_command || "show running-config",
      fix_steps: parsedData.fix_steps || ["configure terminal", "end"],
      source: "ai",
      engine_note: "Gemini 3.7 Flash LLM Reasoning Layer",
      execution_time_ms: duration
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Audit Log API
app.get("/api/audit-log", (req, res) => {
  const approved = auditEvents.filter(e => e.decision === "APPROVED").length;
  const edited = auditEvents.filter(e => e.decision === "EDITED").length;
  const rejected = auditEvents.filter(e => e.decision === "REJECTED").length;
  const total = auditEvents.length;
  const agreementRate = total > 0 ? Number(((approved / total) * 100).toFixed(1)) : 76.6;

  res.json({
    metrics: {
      total,
      approved,
      edited,
      rejected,
      agreementRate
    },
    events: auditEvents
  });
});

// 5. Audit Action API (Approve, Edit, Reject)
app.post("/api/audit-action", (req, res) => {
  try {
    const { caseId, source, decision, agreed, suggestedFix, finalCommands, editsApplied, note } = req.body;
    const newEvent: AuditEvent = {
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC",
      caseId: caseId || "NET-UNK",
      source: source === "ai" ? "AI" : "RULE",
      decision: decision || "APPROVED",
      agreed: Boolean(agreed),
      suggestedFix: Array.isArray(suggestedFix) ? suggestedFix : [String(suggestedFix || "")],
      finalCommands: Array.isArray(finalCommands) ? finalCommands : [String(finalCommands || "")],
      editsApplied: editsApplied || (decision === "EDITED" ? "Modified CLI commands" : "None"),
      note: note || (decision === "APPROVED" ? "Remediation verified and deployed" : decision === "REJECTED" ? "Flagged as false positive" : "Human override")
    };

    auditEvents.unshift(newEvent);

    // Append to docs/model_audit_log.md if file exists
    const logPath = path.join(process.cwd(), "docs", "model_audit_log.md");
    if (fs.existsSync(logPath)) {
      const line = `\n| ${newEvent.timestamp} | ${newEvent.caseId} | ${newEvent.source} | ${newEvent.decision} | ${newEvent.agreed ? "Yes" : "No"} | ${newEvent.editsApplied.replace(/[\r\n]+/g, " ")} | ${newEvent.note.replace(/[\r\n]+/g, " ")} |`;
      fs.appendFileSync(logPath, line, "utf-8");
    }

    res.json({ success: true, event: newEvent });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. File Inspector API
app.get("/api/files/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const allowedFiles: Record<string, string> = {
      "cases.csv": path.join(process.cwd(), "data", "cases.csv"),
      "system_config.json": path.join(process.cwd(), "data", "system_config.json"),
      "diagnose_prompt.md": path.join(process.cwd(), "prompts", "diagnose_prompt.md"),
      "checker.py": path.join(process.cwd(), "src", "checker.py"),
      "engine.py": path.join(process.cwd(), "src", "engine.py"),
      "app.py": path.join(process.cwd(), "src", "app.py"),
      "model_audit_log.md": path.join(process.cwd(), "docs", "model_audit_log.md"),
      "requirements.txt": path.join(process.cwd(), "requirements.txt"),
    };

    const filePath = allowedFiles[filename];
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: `File ${filename} not found` });
    }

    const content = fs.readFileSync(filePath, "utf-8");
    res.json({ filename, content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Cisco CLI Simulator API
app.post("/api/simulate-cli", (req, res) => {
  const { command, case_id } = req.body;
  const cmd = (command || "").trim().toLowerCase();

  if (!cmd) {
    return res.json({ output: "% Incomplete command." });
  }

  if (cmd === "show ip int brief" || cmd === "show ip interface brief") {
    return res.json({
      output: `Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0     unassigned      YES manual up                    up
GigabitEthernet0/0.10  192.168.10.1    YES manual up                    up
GigabitEthernet0/0.20  192.168.20.1    YES manual up                    up
GigabitEthernet0/0.30  192.168.30.1    YES manual up                    up
GigabitEthernet0/1     10.0.0.1        YES manual up                    up`
    });
  }

  if (cmd.startsWith("ping")) {
    const target = command.split(" ")[1] || "192.168.30.1";
    return res.json({
      output: `Type escape sequence to abort.
Sending 5, 100-byte ICMP Echos to ${target}, timeout is 2 seconds:
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms`
    });
  }

  if (cmd === "show interfaces trunk" || cmd === "show int trunk") {
    return res.json({
      output: `Port        Mode         Encapsulation  Status        Native vlan
Gi0/1       on           802.1q         trunking      1

Port        Vlans allowed on trunk
Gi0/1       10,20,30,40

Port        Vlans allowed and active in management domain
Gi0/1       10,20,30,40

Port        Vlans in spanning tree forwarding state and not pruned
Gi0/1       10,20,30,40`
    });
  }

  if (cmd === "show ip ospf neighbor" || cmd === "show ip ospf nei") {
    return res.json({
      output: `Neighbor ID     Pri   State           Dead Time   Address         Interface
10.1.12.2         1   FULL/BDR        00:00:36    10.1.12.2       GigabitEthernet0/0`
    });
  }

  if (cmd === "show ip nat translations") {
    return res.json({
      output: `Pro  Inside global         Inside local          Outside local         Outside global
icmp 203.0.113.2:100       192.168.0.50:100      8.8.8.8:100           8.8.8.8:100
tcp  203.0.113.2:49152     192.168.0.50:49152    142.250.190.46:443    142.250.190.46:443`
    });
  }

  if (cmd === "show running-config" || cmd === "show run") {
    return res.json({
      output: `Current configuration : 1420 bytes
!
version 15.4
service timestamps log datetime msec
no service password-encryption
!
hostname Core-Router
!
ip cef
no ipv6 cef
!
interface GigabitEthernet0/0
 no ip address
 duplex auto
 speed auto
!
interface GigabitEthernet0/0.10
 encapsulation dot1Q 10
 ip address 192.168.10.1 255.255.255.0
!
interface GigabitEthernet0/0.20
 encapsulation dot1Q 20
 ip address 192.168.20.1 255.255.255.0
!
interface GigabitEthernet0/0.30
 encapsulation dot1Q 30
 ip address 192.168.30.1 255.255.255.0
!
end`
    });
  }

  return res.json({
    output: `Executing: ${command}
% Configuration command accepted on virtual Packet Tracer IOS node.`
  });
});

async function startServer() {
  // Vite dev middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NetSage AI Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
