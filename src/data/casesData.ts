import { TestCase } from "../types";

export const INITIAL_CASES: TestCase[] = [
  {
    case_id: "NET-001",
    symptom: "PC1 cannot reach Server1 in VLAN 30",
    topology_note: "Router-on-a-Stick (R1 Gi0/0 connected to SW1 Trunk Gi0/1)",
    show_outputs: `R1# show ip interface brief
Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0     unassigned      YES manual up                    up
GigabitEthernet0/0.10  192.168.10.1    YES manual up                    up
GigabitEthernet0/0.20  192.168.20.1    YES manual up                    up
GigabitEthernet0/0.30  192.168.30.1    YES manual administratively down line protocol is down
GigabitEthernet0/1     10.0.0.1        YES manual up                    up`,
    expected_fault: "Sub-interface administratively down",
    osi_layer: "Layer 3",
    concept_tag: "Inter-VLAN Routing",
    severity: "High"
  },
  {
    case_id: "NET-002",
    symptom: "VLAN 20 hosts cannot route out to WAN gateway",
    topology_note: "R1 sub-interfaces configured for VLAN 10 and VLAN 20 on Trunk",
    show_outputs: `R1# show running-config interface GigabitEthernet0/0.20
Building configuration...

Current configuration : 98 bytes
!
interface GigabitEthernet0/0.20
 ip address 192.168.20.1 255.255.255.0
!
end
% Warning: 802.1Q encapsulation is missing on sub-interface Gi0/0.20`,
    expected_fault: "Missing 802.1Q encapsulation on sub-interface",
    osi_layer: "Layer 3",
    concept_tag: "Inter-VLAN Routing",
    severity: "High"
  },
  {
    case_id: "NET-003",
    symptom: "Engineering PC on VLAN 40 cannot reach default gateway",
    topology_note: "SW1 (Trunk Fa0/24) connected to Core Switch SW2 (Trunk Fa0/24)",
    show_outputs: `SW1# show interfaces trunk
Port        Mode         Encapsulation  Status        Native vlan
Fa0/24      on           802.1q         trunking      1

Port        Vlans allowed on trunk
Fa0/24      10,20,30

Port        Vlans allowed and active in management domain
Fa0/24      10,20,30

Port        Vlans in spanning tree forwarding state and not pruned
Fa0/24      10,20,30`,
    expected_fault: "VLAN not in trunk allowed list",
    osi_layer: "Layer 2",
    concept_tag: "VLAN Trunking",
    severity: "High"
  },
  {
    case_id: "NET-004",
    symptom: "Finance host PC4 in port Fa0/5 receives wrong subnet IP from rogue pool",
    topology_note: "SW1 Access Switch with Sales VLAN 10 and Finance VLAN 20",
    show_outputs: `SW1# show interfaces FastEthernet0/5 switchport
Name: Fa0/5
Switchport: Enabled
Administrative Mode: static access
Operational Mode: static access
Administrative Trunking Encapsulation: dot1q
Negotiation of Trunking: Off
Access Mode VLAN: 10 (Sales)
Trunking Native Mode VLAN: 1 (default)
Voice VLAN: none`,
    expected_fault: "Access port assigned to wrong VLAN",
    osi_layer: "Layer 2",
    concept_tag: "VLAN",
    severity: "Medium"
  },
  {
    case_id: "NET-005",
    symptom: "Trunk link between SW1 and SW2 shows line down/down",
    topology_note: "SW1 Fa0/1 connected directly to SW2 Fa0/1",
    show_outputs: `SW1# show interfaces FastEthernet0/1 switchport
Administrative Mode: dynamic desirable
Operational Mode: trunk
Administrative Trunking Encapsulation: dot1q
!
SW2# show interfaces FastEthernet0/1 switchport
Administrative Mode: static access
Operational Mode: static access
Negotiation of Trunking: Off
Switchport mode mismatch between interconnecting switchports`,
    expected_fault: "Switchport mode mismatch (access vs trunk)",
    osi_layer: "Layer 2",
    concept_tag: "Switching",
    severity: "High"
  },
  {
    case_id: "NET-006",
    symptom: "CDP reports Native VLAN Mismatch between Core-SW1 and Dist-SW2",
    topology_note: "Core-SW1 Gi0/1 connected to Dist-SW2 Gi0/1",
    show_outputs: `Core-SW1# show logging | include Native
%CDP-4-NATIVE_VLAN_MISMATCH: Native VLAN mismatch discovered on GigabitEthernet0/1 (99), with Dist-SW2 GigabitEthernet0/1 (1).
Core-SW1# show interfaces GigabitEthernet0/1 trunk
Port        Mode         Encapsulation  Status        Native vlan
Gi0/1       on           802.1q         trunking      99`,
    expected_fault: "Native VLAN mismatch on trunk link",
    osi_layer: "Layer 2",
    concept_tag: "VLAN Trunking",
    severity: "Medium"
  },
  {
    case_id: "NET-007",
    symptom: "Newly created VLAN 50 does not propagate to client switches SW2 and SW3",
    topology_note: "SW1 (VTP Server) connected to SW2 (VTP Client)",
    show_outputs: `SW1# show vtp status
VTP Version capable             : 1 to 3
VTP Operating Mode                : Server
VTP Domain Name                   : CISCO_LAB
!
SW2# show vtp status
VTP Version capable             : 1 to 3
VTP Operating Mode                : Client
VTP Domain Name                   : LAB_PRODUCTION
VTP MD5 digest                    : 0x9A 0x82 0x11 0x04`,
    expected_fault: "VTP domain name mismatch",
    osi_layer: "Layer 2",
    concept_tag: "VTP",
    severity: "High"
  },
  {
    case_id: "NET-008",
    symptom: "Reception PC port Fa0/2 suddenly turned amber and lost all link traffic",
    topology_note: "SW1 Port-Security enabled on edge ports",
    show_outputs: `SW1# show interfaces FastEthernet0/2 status
Port      Name               Status       Vlan       Duplex  Speed Type
Fa0/2     Reception-PC       err-disabled 10         auto    auto  10/100BaseTX
SW1# show port-security interface FastEthernet0/2
Port Security              : Enabled
Port Status                : Secure-shutdown
Violation Mode             : Shutdown
Security Violation Count   : 1`,
    expected_fault: "Port-Security violation caused err-disabled state",
    osi_layer: "Layer 2",
    concept_tag: "Port Security",
    severity: "High"
  },
  {
    case_id: "NET-009",
    symptom: "Dynamic ARP Inspection drops DHCP clients attempting to resolve gateway",
    topology_note: "SW1 DAI enabled for VLAN 10 with uplink to Router on Gi0/1",
    show_outputs: `SW1# show ip arp inspection vlan 10
Source Mac Validation      : Disabled
Destination Mac Validation : Disabled
IP Transition Validation   : Disabled
Vlan 10 : Total 42, Dropped 42 (DHCP/ARP drop)
SW1# show ip arp inspection interfaces GigabitEthernet0/1
Interface        Trust State     Rate (pps)
---------------  -----------     ----------
Gi0/1            Untrusted       15`,
    expected_fault: "DAI untrusted uplink interface",
    osi_layer: "Layer 2",
    concept_tag: "Security/DAI",
    severity: "High"
  },
  {
    case_id: "NET-010",
    symptom: "Accounting workstation PC2 cannot browse external web server at 8.8.8.8",
    topology_note: "Branch Office LAN (192.168.1.0/24) with Default Gateway R1 at 192.168.1.1",
    show_outputs: `PC2> ipconfig /all
Physical Address................: 000C.2984.AB11
IP Address......................: 192.168.1.55
Subnet Mask.....................: 255.255.255.0
Default Gateway.................: 192.168.1.254
DNS Server......................: 8.8.8.8
PC2> ping 192.168.1.254
Request timed out.`,
    expected_fault: "Missing or incorrect default gateway",
    osi_layer: "Layer 3",
    concept_tag: "Addressing",
    severity: "High"
  },
  {
    case_id: "NET-011",
    symptom: "Console alert: IP-4-DUPADDR detected on GigabitEthernet0/0",
    topology_note: "R1 (10.1.1.1/24) connected to Branch Switch SW1",
    show_outputs: `R1# show logging | include DUPADDR
%IP-4-DUPADDR: Duplicate address 10.1.1.1 on GigabitEthernet0/0, sourced by 0014.a821.5b99
R1# show ip interface GigabitEthernet0/0
GigabitEthernet0/0 is up, line protocol is up
  Internet address is 10.1.1.1/24
  Broadcast address is 255.255.255.255`,
    expected_fault: "Duplicate IP address on subnet",
    osi_layer: "Layer 3",
    concept_tag: "Addressing",
    severity: "High"
  },
  {
    case_id: "NET-012",
    symptom: "Branch router R2 cannot reach headquarters network 172.16.0.0/16",
    topology_note: "R2 (Serial 0/0/0: 10.0.0.2/30) connected to HQ R1 (Serial 0/0/0: 10.0.0.1/30)",
    show_outputs: `R2# show ip route static
S    172.16.0.0/16 [1/0] via 10.0.0.5
R2# show ip interface brief | include Serial
Serial0/0/0               10.0.0.2        YES manual up                    up
Serial0/0/1               unassigned      YES manual administratively down down
R2# ping 10.0.0.5
Type escape sequence to abort.
..... (0/5 packets received)`,
    expected_fault: "Invalid static route next-hop IP",
    osi_layer: "Layer 3",
    concept_tag: "Static Routing",
    severity: "High"
  },
  {
    case_id: "NET-013",
    symptom: "OSPF neighbor relationship between R1 and R2 stuck in INIT/DOWN state",
    topology_note: "R1 Gi0/0 (10.1.12.1/30) to R2 Gi0/0 (10.1.12.2/30) Area 0",
    show_outputs: `R1# show ip ospf interface GigabitEthernet0/0
GigabitEthernet0/0 is up, line protocol is up
  Internet Address 10.1.12.1/30, Area 0
  Timer intervals configured, Hello 10, Dead 40, Wait 40, Retransmit 5
!
R2# show ip ospf interface GigabitEthernet0/0
GigabitEthernet0/0 is up, line protocol is up
  Internet Address 10.1.12.2/30, Area 0
  Timer intervals configured, Hello 30, Dead 120, Wait 120, Retransmit 5`,
    expected_fault: "OSPF hello/dead timer mismatch",
    osi_layer: "Layer 3",
    concept_tag: "OSPF",
    severity: "High"
  },
  {
    case_id: "NET-014",
    symptom: "R1 does not receive OSPF routes from R2 across internal LAN",
    topology_note: "R1 (Gi0/1: 192.168.1.1/24) to R2 (Gi0/1: 192.168.1.2/24)",
    show_outputs: `R1# show ip ospf neighbor
(no neighbors listed)
R1# show ip protocols
Routing Protocol is "ospf 1"
  Outgoing update filter list for all interfaces is not set
  Passive Interfaces:
    GigabitEthernet0/1
  Routing for Networks:
    192.168.1.0 0.0.0.255 area 0`,
    expected_fault: "OSPF passive-interface misconfiguration on link",
    osi_layer: "Layer 3",
    concept_tag: "OSPF",
    severity: "High"
  },
  {
    case_id: "NET-015",
    symptom: "Multiple LAN users fail to access Internet through Cisco edge router NAT",
    topology_note: "R1 Edge Router doing NAT for 192.168.0.0/24 through Gi0/1 (Public IP 203.0.113.2)",
    show_outputs: `R1# show running-config | include ip nat
ip nat inside source list 1 interface GigabitEthernet0/1
ip access-list standard 1
 permit 192.168.0.0 0.0.255.255
R1# show ip nat translations
(no active translations)`,
    expected_fault: "Missing NAT overload/PAT keyword",
    osi_layer: "Layer 3/4",
    concept_tag: "NAT",
    severity: "High"
  },
  {
    case_id: "NET-016",
    symptom: "Internal hosts cannot translate IP addresses across edge router",
    topology_note: "R1 Router connecting LAN (Gi0/0) to WAN ISP (Gi0/1)",
    show_outputs: `R1# show running-config interface GigabitEthernet0/0
interface GigabitEthernet0/0
 ip address 192.168.10.1 255.255.255.0
!
R1# show running-config interface GigabitEthernet0/1
interface GigabitEthernet0/1
 ip address 209.165.200.225 255.255.255.252
 ip nat outside
!
% Notice: GigabitEthernet0/0 is missing 'ip nat inside' configuration`,
    expected_fault: "Missing 'ip nat inside' interface direction configuration",
    osi_layer: "Layer 3",
    concept_tag: "NAT",
    severity: "High"
  },
  {
    case_id: "NET-017",
    symptom: "Staff cannot browse company intranet portal on TCP port 80/443",
    topology_note: "Client PC (10.1.1.50) through Core Router R1 to Web Server (10.2.2.100)",
    show_outputs: `R1# show access-lists 101
Extended IP access list 101
    10 deny tcp 10.1.1.0 0.0.0.255 any eq www (matches: 142 packets)
    20 deny tcp 10.1.1.0 0.0.0.255 any eq 443 (matches: 89 packets)
    30 permit ip any any
R1# show interfaces GigabitEthernet0/0 | include access-group
  Inbound access list is 101`,
    expected_fault: "ACL blocking specific destination port (80/443)",
    osi_layer: "Layer 4",
    concept_tag: "ACL",
    severity: "High"
  },
  {
    case_id: "NET-018",
    symptom: "New laptops connecting to Office Wi-Fi fail to obtain IP addresses",
    topology_note: "DHCP Server Pool configured on Cisco Router R1 for 192.168.50.0/24",
    show_outputs: `R1# show ip dhcp pool OFFICE_POOL
Pool OFFICE_POOL :
 Utilization mark (high/low)    : 100 / 0
 Subnet size (total/used/free) : 254 / 254 / 0
 Total addresses                : 254
 Leased addresses               : 254
 Excluded addresses             : 0
 Pending addresses              : 0
R1# show ip dhcp binding
(254 active leases logged)`,
    expected_fault: "DHCP pool exhaustion",
    osi_layer: "Layer 7",
    concept_tag: "DHCP",
    severity: "High"
  },
  {
    case_id: "NET-019",
    symptom: "VLAN 10 clients fail to get IP from centralized DHCP Server at 172.16.1.10",
    topology_note: "Router R1 connecting VLAN 10 (Gi0/0.10: 192.168.10.1) to Server Farm (Gi0/1)",
    show_outputs: `R1# show running-config interface GigabitEthernet0/0.10
interface GigabitEthernet0/0.10
 encapsulation dot1Q 10
 ip address 192.168.10.1 255.255.255.0
!
(Note: DHCP Discover broadcasts on Gi0/0.10 are dropped without helper-address)`,
    expected_fault: "Missing ip helper-address on gateway interface",
    osi_layer: "Layer 3/4",
    concept_tag: "DHCP",
    severity: "High"
  },
  {
    case_id: "NET-020",
    symptom: "Network devices unable to ping hostname 'cisco.com' but can ping 8.8.8.8",
    topology_note: "Router R1 connected to Internet gateway",
    show_outputs: `R1# show running-config | include ip domain
no ip domain-lookup
R1# ping cisco.com
Translating "cisco.com"...domain server (255.255.255.255)
% Unrecognized host or address, or protocol not running.`,
    expected_fault: "DNS lookup disabled on router",
    osi_layer: "Layer 7",
    concept_tag: "DNS",
    severity: "Medium"
  },
  {
    case_id: "NET-021",
    symptom: "Admin authentication via AAA RADIUS server fails with invalid credentials",
    topology_note: "Cisco Switch SW1 configured for AAA RADIUS authentication to Server 192.168.1.100",
    show_outputs: `SW1# show logging | include RADIUS
%RADIUS-4-RADIUS_AUTH_FAIL: RADIUS server 192.168.1.100:1812 authentication failed due to key mismatch
SW1# show running-config | include radius-server
radius-server host 192.168.1.100 auth-port 1812 key Cisc0Key123
Server secret expected: CiscoKey123`,
    expected_fault: "RADIUS shared-secret mismatch",
    osi_layer: "Layer 7",
    concept_tag: "Security/DAI",
    severity: "High"
  },
  {
    case_id: "NET-022",
    symptom: "HSRP Flapping between Primary Router R1 and Backup Router R2",
    topology_note: "R1 Gi0/0 (192.168.1.2) and R2 Gi0/0 (192.168.1.3) sharing VIP 192.168.1.1",
    show_outputs: `R1# show standby GigabitEthernet0/0
GigabitEthernet0/0 - Group 1
  State is Active
  Virtual IP address is 192.168.1.1
  Hello time 1 sec, hold time 3 sec
!
R2# show standby GigabitEthernet0/0
GigabitEthernet0/0 - Group 1
  State is Active
  Virtual IP address is 192.168.1.1
  Hello time 5 sec, hold time 15 sec
% Both routers reporting Active state simultaneously`,
    expected_fault: "HSRP timer mismatch causing split-brain active state",
    osi_layer: "Layer 3",
    concept_tag: "HSRP",
    severity: "Medium"
  },
  {
    case_id: "NET-023",
    symptom: "IPv6 host PC1 fails SLAAC auto-configuration on GigabitEthernet0/0",
    topology_note: "R1 (2001:db8:acad:1::1/64) connected to LAN",
    show_outputs: `R1# show running-config interface GigabitEthernet0/0
interface GigabitEthernet0/0
 ipv6 address 2001:DB8:ACAD:1::1/64
 ipv6 nd ra suppress
!
PC1> ipconfig
IPv6 Address...................: :: (Autoconfiguration disabled)`,
    expected_fault: "IPv6 Router Advertisements suppressed on gateway",
    osi_layer: "Layer 3",
    concept_tag: "IPv6",
    severity: "High"
  },
  {
    case_id: "NET-024",
    symptom: "Network Engineer running 'show cdp neighbors' gets empty table on Switch",
    topology_note: "SW1 connected to SW2, SW3, and Router R1",
    show_outputs: `SW1# show cdp
% CDP is not enabled
SW1# show cdp neighbors
% CDP is not running
SW1# show running-config | include cdp
no cdp run`,
    expected_fault: "CDP globally disabled",
    osi_layer: "Layer 2",
    concept_tag: "CDP",
    severity: "Low"
  },
  {
    case_id: "NET-025",
    symptom: "OSPF Point-to-Point link between R1 and R2 cannot ping or establish neighbor",
    topology_note: "R1 (Gi0/0: 10.0.0.1/24) connected to R2 (Gi0/0: 10.0.0.2/30)",
    show_outputs: `R1# show interfaces GigabitEthernet0/0 | include Internet address
  Internet address is 10.0.0.1/24
!
R2# show interfaces GigabitEthernet0/0 | include Internet address
  Internet address is 10.0.0.2/30
(Subnet mask length mismatch: /24 vs /30 on link)`,
    expected_fault: "Subnet mask mismatch on point-to-point link",
    osi_layer: "Layer 3",
    concept_tag: "Subnetting",
    severity: "High"
  },
  {
    case_id: "NET-026",
    symptom: "Wireless clients on SSID 'CORP_WIFI' unable to communicate with VLAN 100",
    topology_note: "Cisco 2504 WLC connected to Distribution Switch SW1 trunk port Gi0/1",
    show_outputs: `WLC# show wlan summary
Number of WLANs................................ 1
WLAN ID  WLAN Profile Name / SSID          Status    Interface Name
1        CORP_WIFI / CORP_WIFI              Enabled   management (VLAN 1)
(WLAN mapped to management interface VLAN 1 instead of corp-vlan-100)`,
    expected_fault: "Wireless SSID VLAN mapping misconfiguration",
    osi_layer: "Layer 2",
    concept_tag: "Wireless",
    severity: "High"
  },
  {
    case_id: "NET-027",
    symptom: "Guests on Wi-Fi portal cannot resolve domain names via public DNS",
    topology_note: "Cisco WLC / Guest Anchor Router with Guest-ACL applied to interface",
    show_outputs: `R1# show access-lists GUEST_FILTER
Extended IP access list GUEST_FILTER
 10 deny udp any any eq domain (matches: 512 packets)
 20 permit tcp any any eq www
 30 permit tcp any any eq 443
 40 deny ip any any`,
    expected_fault: "Wireless guest ACL blocking client DNS queries (UDP 53)",
    osi_layer: "Layer 4",
    concept_tag: "Wireless/ACL",
    severity: "High"
  },
  {
    case_id: "NET-028",
    symptom: "Access switch port Gi0/10 in err-disabled state after connecting mini-switch",
    topology_note: "SW1 Access Port Gi0/10 with BPDU Guard enabled",
    show_outputs: `SW1# show interfaces GigabitEthernet0/10 status
Port      Name               Status       Vlan       Duplex  Speed Type
Gi0/10    Desk-Drop-10       err-disabled 20         auto    auto  10/100/1000BaseTX
SW1# show logging | include BPDUGUARD
%SPANTREE-2-BLOCK_BPDUGUARD: Received BPDU on port Gi0/10 with BPDU Guard enabled. Disabling port.`,
    expected_fault: "Spanning Tree BPDU Guard triggered err-disable",
    osi_layer: "Layer 2",
    concept_tag: "Switching",
    severity: "High"
  },
  {
    case_id: "NET-029",
    symptom: "Inter-department ping tests between VLAN 10 and VLAN 20 are dropped",
    topology_note: "Core Router R1 with access-list 105 applied inbound on Gi0/0.10",
    show_outputs: `R1# show access-lists 105
Extended IP access list 105
 10 permit tcp 192.168.10.0 0.0.0.255 192.168.20.0 0.0.0.255 eq 443
 (No permit rule for ICMP or TCP port 80 - hitting implicit deny any any)
R1# show ip access-lists 105 | include matches
 20 deny ip any any (matches: 64 packets)`,
    expected_fault: "ACL implicit deny blocking ICMP and web traffic",
    osi_layer: "Layer 3/4",
    concept_tag: "ACL",
    severity: "Medium"
  },
  {
    case_id: "NET-030",
    symptom: "OSPF neighbor relationship between Core-R1 and Edge-R2 remains down",
    topology_note: "Core-R1 Gi0/0 (10.200.1.1/30) to Edge-R2 Gi0/0 (10.200.1.2/30)",
    show_outputs: `Core-R1# show ip ospf interface GigabitEthernet0/0
GigabitEthernet0/0 is up, line protocol is up
  Internet Address 10.200.1.1/30, Area 0
!
Edge-R2# show ip ospf interface GigabitEthernet0/0
GigabitEthernet0/0 is up, line protocol is up
  Internet Address 10.200.1.2/30, Area 1
% OSPF-4-ERRRCV: Received packet with invalid Area ID 0 from 10.200.1.1 on GigabitEthernet0/0`,
    expected_fault: "OSPF Area ID mismatch on link",
    osi_layer: "Layer 3",
    concept_tag: "OSPF",
    severity: "High"
  }
];
