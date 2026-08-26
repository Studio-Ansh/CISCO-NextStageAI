import { ResponsibleAILogItem } from "../types";

export const RESPONSIBLE_AI_CASES: ResponsibleAILogItem[] = [
  {
    caseId: "NET-003",
    layer: "Layer 2",
    aiProposed: "switchport trunk allowed vlan 40",
    humanCorrection: "switchport trunk allowed vlan add 40",
    rationale: "Using 'allowed vlan 40' without the 'add' keyword immediately overwrites the entire existing allowed VLAN list (10, 20, 30), causing a catastrophic campus-wide network outage. Human review prevented service disruption."
  },
  {
    caseId: "NET-008",
    layer: "Layer 2",
    aiProposed: "no switchport port-security (globally disable port security)",
    humanCorrection: "Interface bounce (shutdown -> no shutdown) after rogue device disconnect",
    rationale: "Disabling port security globally violates the enterprise security compliance baseline. The proper remediation is isolating the violation cause and clearing the err-disabled state."
  },
  {
    caseId: "NET-011",
    layer: "Layer 3",
    aiProposed: "no ip address (delete IP on primary router interface)",
    humanCorrection: "Identify offending host MAC from ARP cache, clear ARP, reassign host IP",
    rationale: "Deleting the router's interface IP drops all legitimate subnet traffic. The duplicate IP was caused by a static rogue client configuration, not the router gateway."
  },
  {
    caseId: "NET-017",
    layer: "Layer 4",
    aiProposed: "no ip access-list extended 101 (delete entire ACL)",
    humanCorrection: "Selectively edit ACE line 10 and 20 to permit web traffic",
    rationale: "Deleting the entire extended ACL removes all firewall perimeter controls and allows unrestricted lateral network traffic. Precision line editing maintains defense-in-depth."
  },
  {
    caseId: "NET-020",
    layer: "Layer 7",
    aiProposed: "ip name-server 8.8.8.8 (point router to public Google DNS)",
    humanCorrection: "ip name-server 10.50.1.10 (point to corporate internal Active Directory DNS)",
    rationale: "Enterprise lab routers must resolve internal corporate hostnames and Active Directory domains via internal DNS servers rather than public resolvers."
  },
  {
    caseId: "NET-028",
    layer: "Layer 2",
    aiProposed: "no spanning-tree bpduguard enable (turn off BPDU guard)",
    humanCorrection: "Physically disconnect unauthorized mini-switch, then cycle interface",
    rationale: "Turning off BPDU Guard leaves access layer ports exposed to switching loops and broadcast storms whenever unmanaged switches are attached."
  }
];
