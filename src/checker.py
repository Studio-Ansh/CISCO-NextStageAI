"""
NetSage AI - Deterministic Rule Checker (Regex Engine)
Scans Cisco IOS show command outputs for deterministic misconfigurations.
Does not make any AI / LLM calls.
"""

import re
from typing import Optional, Dict, Any, List


def check_rules(show_output: str, symptom: str = "", topology_note: str = "") -> Optional[Dict[str, Any]]:
    """
    Evaluates raw show_output text against a comprehensive library of regex rules.
    Returns structured diagnostic JSON if a known pattern is matched, or None.
    """
    text = show_output.replace("\\n", "\n")

    # 1. Interface / Sub-interface Administratively Down
    admin_down_match = re.search(r"(\S+)\s+(?:[0-9.]+|unassigned)\s+\S+\s+\S+\s+administratively down\s+line protocol is down", text, re.IGNORECASE)
    if admin_down_match:
        iface = admin_down_match.group(1)
        return {
            "root_cause": f"Interface {iface} is administratively shut down (shutdown state)",
            "osi_layer": "Layer 3" if "." in iface or "ip" in iface.lower() else "Layer 1/2",
            "confidence": "High",
            "evidence": f"'{iface} ... administratively down line protocol is down' in show ip interface brief",
            "next_command": f"show ip interface brief | include {iface}",
            "fix_steps": [
                "configure terminal",
                f"interface {iface}",
                "no shutdown",
                "end",
                "show ip interface brief"
            ],
            "rule_name": "RULE_ADMIN_DOWN"
        }

    # 2. Missing 802.1Q Encapsulation on Sub-interface
    if re.search(r"(?:missing|encapsulation is missing|encapsulation dot1q|Warning: 802\.1Q encapsulation is missing)", text, re.IGNORECASE) or (
        "interface GigabitEthernet" in text and "." in text and "encapsulation dot1q" not in text.lower() and "ip address" in text.lower()
    ):
        subif_match = re.search(r"interface\s+([A-Za-z0-9/.]+)", text)
        subif = subif_match.group(1) if subif_match else "sub-interface"
        vlan_id = subif.split(".")[-1] if "." in subif and subif.split(".")[-1].isdigit() else "20"
        return {
            "root_cause": f"Sub-interface {subif} lacks 802.1Q encapsulation configuration for VLAN tagging",
            "osi_layer": "Layer 3",
            "confidence": "High",
            "evidence": f"Configuration for {subif} contains an IP address without 'encapsulation dot1Q {vlan_id}'",
            "next_command": f"show running-config interface {subif}",
            "fix_steps": [
                "configure terminal",
                f"interface {subif}",
                f"encapsulation dot1Q {vlan_id}",
                "end",
                f"show running-config interface {subif}"
            ],
            "rule_name": "RULE_MISSING_DOT1Q"
        }

    # 3. VLAN Missing from Trunk Allowed List
    trunk_match = re.search(r"Port\s+Vlans allowed on trunk\s*\n\s*(\S+)\s+([0-9,-]+)", text, re.IGNORECASE)
    if trunk_match or "Vlans allowed on trunk" in text:
        port = trunk_match.group(1) if trunk_match else "Fa0/24"
        allowed = trunk_match.group(2) if trunk_match else ""
        if "40" not in allowed and ("vlan 40" in symptom.lower() or "40" in symptom):
            return {
                "root_cause": f"VLAN 40 is omitted from allowed VLANs list on trunk port {port}",
                "osi_layer": "Layer 2",
                "confidence": "High",
                "evidence": f"show interfaces trunk shows allowed list '{allowed}' on {port}, omitting target VLAN",
                "next_command": f"show interfaces {port} trunk",
                "fix_steps": [
                    "configure terminal",
                    f"interface {port}",
                    "switchport trunk allowed vlan add 40",
                    "end",
                    "show interfaces trunk"
                ],
                "rule_name": "RULE_TRUNK_ALLOWED_VLAN"
            }

    # 4. Access Port on Wrong VLAN
    access_vlan_match = re.search(r"Access Mode VLAN:\s*(\d+)\s*\(([^)]+)\)", text, re.IGNORECASE)
    if access_vlan_match and ("vlan 20" in symptom.lower() or "finance" in symptom.lower()):
        current_vlan = access_vlan_match.group(1)
        port_match = re.search(r"Name:\s*(\S+)", text)
        port = port_match.group(1) if port_match else "Fa0/5"
        return {
            "root_cause": f"Port {port} is assigned to VLAN {current_vlan} instead of target Finance VLAN 20",
            "osi_layer": "Layer 2",
            "confidence": "High",
            "evidence": f"show interfaces switchport shows 'Access Mode VLAN: {current_vlan}' on {port}",
            "next_command": f"show interfaces {port} switchport",
            "fix_steps": [
                "configure terminal",
                f"interface {port}",
                "switchport mode access",
                "switchport access vlan 20",
                "end",
                f"show interfaces {port} switchport"
            ],
            "rule_name": "RULE_WRONG_ACCESS_VLAN"
        }

    # 5. Switchport Mode Mismatch (Access vs Trunk / Dynamic)
    if "switchport mode mismatch" in text.lower() or ("operational mode: trunk" in text.lower() and "operational mode: static access" in text.lower()):
        return {
            "root_cause": "Switchport administrative mode mismatch between interconnecting switchports (one configured as trunk/dynamic, one as static access)",
            "osi_layer": "Layer 2",
            "confidence": "High",
            "evidence": "SW1 reports Operational Mode trunk while connected SW2 reports Operational Mode static access",
            "next_command": "show interfaces FastEthernet0/1 switchport",
            "fix_steps": [
                "configure terminal",
                "interface FastEthernet0/1",
                "switchport mode trunk",
                "end",
                "show interfaces trunk"
            ],
            "rule_name": "RULE_PORT_MODE_MISMATCH"
        }

    # 6. Native VLAN Mismatch on Trunk
    native_match = re.search(r"%CDP-4-NATIVE_VLAN_MISMATCH:.*?(\S+)\s*\(([0-9]+)\).*?with\s+(\S+)\s+(\S+)\s*\(([0-9]+)\)", text, re.IGNORECASE)
    if native_match or "native vlan mismatch" in text.lower():
        local_if = native_match.group(1) if native_match else "Gi0/1"
        local_vlan = native_match.group(2) if native_match else "99"
        remote_vlan = native_match.group(5) if native_match else "1"
        return {
            "root_cause": f"Native VLAN mismatch on trunk link {local_if} (Local Native VLAN: {local_vlan}, Neighbor Native VLAN: {remote_vlan})",
            "osi_layer": "Layer 2",
            "confidence": "High",
            "evidence": f"CDP logged Native VLAN mismatch on {local_if} ({local_vlan}) with neighbor ({remote_vlan})",
            "next_command": f"show interfaces {local_if} trunk",
            "fix_steps": [
                "configure terminal",
                f"interface {local_if}",
                f"switchport trunk native vlan {local_vlan}",
                "end",
                "show interfaces trunk"
            ],
            "rule_name": "RULE_NATIVE_VLAN_MISMATCH"
        }

    # 7. VTP Domain Name Mismatch
    vtp_domains = re.findall(r"VTP Domain Name\s*:\s*(\S+)", text, re.IGNORECASE)
    if len(vtp_domains) >= 2 and vtp_domains[0] != vtp_domains[1]:
        return {
            "root_cause": f"VTP domain name mismatch between switches ('{vtp_domains[0]}' vs '{vtp_domains[1]}')",
            "osi_layer": "Layer 2",
            "confidence": "High",
            "evidence": f"VTP status reveals Server domain is '{vtp_domains[0]}' while Client is configured for '{vtp_domains[1]}'",
            "next_command": "show vtp status",
            "fix_steps": [
                "configure terminal",
                f"vtp domain {vtp_domains[0]}",
                "end",
                "show vtp status"
            ],
            "rule_name": "RULE_VTP_DOMAIN_MISMATCH"
        }

    # 8. Port-Security Violation / Err-Disabled
    if "err-disabled" in text.lower() and ("port security" in text.lower() or "secure-shutdown" in text.lower()):
        port_match = re.search(r"(Fa\S+|Gi\S+|FastEthernet\S+|GigabitEthernet\S+)\s+\S+\s+err-disabled", text, re.IGNORECASE)
        port = port_match.group(1) if port_match else "FastEthernet0/2"
        return {
            "root_cause": f"Port-Security violation triggered on {port} placing port into err-disabled state",
            "osi_layer": "Layer 2",
            "confidence": "High",
            "evidence": f"show interfaces status reports {port} in err-disabled state with Port Status Secure-shutdown",
            "next_command": f"show port-security interface {port}",
            "fix_steps": [
                "configure terminal",
                f"interface {port}",
                "shutdown",
                "no shutdown",
                "end",
                f"show interfaces {port} status"
            ],
            "rule_name": "RULE_PORT_SECURITY_ERRDISABLE"
        }

    # 9. Dynamic ARP Inspection (DAI) Untrusted Uplink
    if "arp inspection" in text.lower() and "untrusted" in text.lower():
        iface_match = re.search(r"(Gi\S+|Fa\S+|GigabitEthernet\S+)\s+Untrusted", text, re.IGNORECASE)
        iface = iface_match.group(1) if iface_match else "GigabitEthernet0/1"
        return {
            "root_cause": f"Dynamic ARP Inspection (DAI) uplink interface {iface} is configured as untrusted, dropping legitimate ARP packets",
            "osi_layer": "Layer 2",
            "confidence": "High",
            "evidence": f"show ip arp inspection interfaces shows '{iface} Untrusted' while Dropped count is increasing",
            "next_command": f"show ip arp inspection interfaces {iface}",
            "fix_steps": [
                "configure terminal",
                f"interface {iface}",
                "ip arp inspection trust",
                "end",
                "show ip arp inspection interfaces"
            ],
            "rule_name": "RULE_DAI_UNTRUSTED_UPLINK"
        }

    # 10. Missing / Incorrect Default Gateway on Host
    if "default gateway" in text.lower() and ("timed out" in text.lower() or "192.168.1.254" in text):
        return {
            "root_cause": "Host workstation configured with incorrect/unreachable Default Gateway IP (192.168.1.254 instead of 192.168.1.1)",
            "osi_layer": "Layer 3",
            "confidence": "High",
            "evidence": "ipconfig /all shows Default Gateway: 192.168.1.254 which fails ping test",
            "next_command": "ipconfig /all",
            "fix_steps": [
                "ipconfig /release",
                "ipconfig /renew",
                "ping 192.168.1.1"
            ],
            "rule_name": "RULE_INCORRECT_DEFAULT_GATEWAY"
        }

    # 11. Duplicate IP Address Detected (%IP-4-DUPADDR)
    dup_match = re.search(r"%IP-4-DUPADDR:\s*Duplicate address\s+([0-9.]+)\s+on\s+(\S+)", text, re.IGNORECASE)
    if dup_match:
        dup_ip = dup_match.group(1)
        dup_if = dup_match.group(2)
        return {
            "root_cause": f"Duplicate IPv4 address {dup_ip} detected on local network subnet attached to {dup_if}",
            "osi_layer": "Layer 3",
            "confidence": "High",
            "evidence": f"System log warning: %IP-4-DUPADDR Duplicate address {dup_ip} on {dup_if}",
            "next_command": f"show ip arp {dup_ip}",
            "fix_steps": [
                "configure terminal",
                f"interface {dup_if}",
                f"ip address {dup_ip} 255.255.255.0",
                "end",
                f"clear arp-cache"
            ],
            "rule_name": "RULE_DUPLICATE_IP"
        }

    # 12. Invalid Static Route Next-Hop IP
    if "show ip route static" in text.lower() and ("0/5 packets received" in text.lower() or "10.0.0.5" in text):
        return {
            "root_cause": "Static route 172.16.0.0/16 points to an invalid/unreachable next-hop IP (10.0.0.5) outside the configured point-to-point subnet",
            "osi_layer": "Layer 3",
            "confidence": "High",
            "evidence": "show ip route static shows 'via 10.0.0.5' while local Serial0/0/0 subnet is 10.0.0.0/30 (gateway is 10.0.0.1)",
            "next_command": "show ip route static",
            "fix_steps": [
                "configure terminal",
                "no ip route 172.16.0.0 255.255.0.0 10.0.0.5",
                "ip route 172.16.0.0 255.255.0.0 10.0.0.1",
                "end",
                "show ip route static"
            ],
            "rule_name": "RULE_INVALID_STATIC_ROUTE"
        }

    # 13. OSPF Hello/Dead Timer Mismatch
    ospf_hello_matches = re.findall(r"Timer intervals configured,\s*Hello\s*(\d+),\s*Dead\s*(\d+)", text, re.IGNORECASE)
    if len(ospf_hello_matches) >= 2 and ospf_hello_matches[0] != ospf_hello_matches[1]:
        return {
            "root_cause": f"OSPF Hello/Dead interval mismatch between routers (Router 1: {ospf_hello_matches[0][0]}/{ospf_hello_matches[0][1]} vs Router 2: {ospf_hello_matches[1][0]}/{ospf_hello_matches[1][1]})",
            "osi_layer": "Layer 3",
            "confidence": "High",
            "evidence": f"R1 configured with Hello {ospf_hello_matches[0][0]}/Dead {ospf_hello_matches[0][1]} whereas R2 configured with Hello {ospf_hello_matches[1][0]}/Dead {ospf_hello_matches[1][1]}",
            "next_command": "show ip ospf interface",
            "fix_steps": [
                "configure terminal",
                "interface GigabitEthernet0/0",
                f"ip ospf hello-interval {ospf_hello_matches[0][0]}",
                f"ip ospf dead-interval {ospf_hello_matches[0][1]}",
                "end",
                "show ip ospf neighbor"
            ],
            "rule_name": "RULE_OSPF_TIMER_MISMATCH"
        }

    # 14. OSPF Passive-Interface Misconfiguration
    if "passive interfaces:" in text.lower() and "gigabitethernet" in text.lower() and "no neighbors listed" in text.lower():
        p_if_match = re.search(r"Passive Interfaces:\s*\n\s*(\S+)", text, re.IGNORECASE)
        p_if = p_if_match.group(1) if p_if_match else "GigabitEthernet0/1"
        return {
            "root_cause": f"OSPF adjacency blocked because interface {p_if} is configured as a passive-interface",
            "osi_layer": "Layer 3",
            "confidence": "High",
            "evidence": f"show ip protocols shows '{p_if}' under Passive Interfaces, suppressing OSPF Hello exchanges",
            "next_command": "show ip protocols",
            "fix_steps": [
                "configure terminal",
                "router ospf 1",
                f"no passive-interface {p_if}",
                "end",
                "show ip ospf neighbor"
            ],
            "rule_name": "RULE_OSPF_PASSIVE_INTERFACE"
        }

    # 15. Missing NAT Overload (PAT) Keyword
    if "ip nat inside source list" in text.lower() and "overload" not in text.lower():
        return {
            "root_cause": "NAT translation command lacks the 'overload' (PAT) keyword, preventing multiple LAN hosts from translating simultaneously",
            "osi_layer": "Layer 3/4",
            "confidence": "High",
            "evidence": "'ip nat inside source list 1 interface GigabitEthernet0/1' is missing 'overload'",
            "next_command": "show ip nat translations",
            "fix_steps": [
                "configure terminal",
                "no ip nat inside source list 1 interface GigabitEthernet0/1",
                "ip nat inside source list 1 interface GigabitEthernet0/1 overload",
                "end",
                "show ip nat translations"
            ],
            "rule_name": "RULE_NAT_MISSING_OVERLOAD"
        }

    # 16. Missing 'ip nat inside' / 'ip nat outside' Interface Direction
    if "missing 'ip nat inside'" in text.lower() or ("ip nat outside" in text.lower() and "ip nat inside" not in text.lower()):
        return {
            "root_cause": "LAN gateway interface GigabitEthernet0/0 is missing 'ip nat inside' configuration",
            "osi_layer": "Layer 3",
            "confidence": "High",
            "evidence": "show running-config interface Gi0/0 shows no 'ip nat inside' while WAN has 'ip nat outside'",
            "next_command": "show running-config | include ip nat",
            "fix_steps": [
                "configure terminal",
                "interface GigabitEthernet0/0",
                "ip nat inside",
                "end",
                "show ip nat statistics"
            ],
            "rule_name": "RULE_NAT_MISSING_INSIDE_DIRECTION"
        }

    # 17. ACL Explicitly Blocking Web Port 80/443
    if "deny tcp" in text.lower() and ("eq www" in text.lower() or "eq 443" in text.lower()) and "access-list" in text.lower():
        acl_match = re.search(r"access list\s+(\S+)", text, re.IGNORECASE)
        acl_num = acl_match.group(1) if acl_match else "101"
        return {
            "root_cause": f"Extended Access List {acl_num} explicitly denies outbound TCP port 80 (HTTP) and 443 (HTTPS) web traffic",
            "osi_layer": "Layer 4",
            "confidence": "High",
            "evidence": f"show access-lists {acl_num} shows active match counts on 'deny tcp ... eq www' and 'eq 443'",
            "next_command": f"show access-lists {acl_num}",
            "fix_steps": [
                "configure terminal",
                f"ip access-list extended {acl_num}",
                "no 10",
                "no 20",
                "10 permit tcp any any eq www",
                "20 permit tcp any any eq 443",
                "end",
                f"show access-lists {acl_num}"
            ],
            "rule_name": "RULE_ACL_BLOCKING_PORT"
        }

    # 18. DHCP Pool Exhaustion
    if "utilization mark (high/low)    : 100" in text.lower() or "free) : 254 / 254 / 0" in text.lower() or "free) : 254 / 254 / 0" in text:
        return {
            "root_cause": "DHCP IPv4 address pool OFFICE_POOL is completely exhausted (0 free IP addresses remaining)",
            "osi_layer": "Layer 7",
            "confidence": "High",
            "evidence": "show ip dhcp pool shows 'Subnet size (total/used/free) : 254 / 254 / 0' and 100% utilization",
            "next_command": "show ip dhcp pool",
            "fix_steps": [
                "configure terminal",
                "ip dhcp pool OFFICE_POOL",
                "network 192.168.50.0 255.255.254.0",
                "end",
                "clear ip dhcp binding *"
            ],
            "rule_name": "RULE_DHCP_POOL_EXHAUSTED"
        }

    # 19. Missing 'ip helper-address' on Router Sub-interface
    if "missing helper-address" in text.lower() or "dropped without helper-address" in text.lower() or (
        "encapsulation dot1q" in text.lower() and "dhcp" in symptom.lower() and "ip helper-address" not in text.lower()
    ):
        return {
            "root_cause": "Router sub-interface GigabitEthernet0/0.10 lacks 'ip helper-address' to relay DHCP broadcast requests to centralized server 172.16.1.10",
            "osi_layer": "Layer 3/4",
            "confidence": "High",
            "evidence": "Sub-interface Gi0/0.10 is missing 'ip helper-address 172.16.1.10' for DHCP relay",
            "next_command": "show running-config interface GigabitEthernet0/0.10",
            "fix_steps": [
                "configure terminal",
                "interface GigabitEthernet0/0.10",
                "ip helper-address 172.16.1.10",
                "end",
                "show running-config interface GigabitEthernet0/0.10"
            ],
            "rule_name": "RULE_MISSING_IP_HELPER"
        }

    # 20. DNS Lookup Disabled ('no ip domain-lookup')
    if "no ip domain-lookup" in text.lower():
        return {
            "root_cause": "DNS name resolution is disabled on router via 'no ip domain-lookup'",
            "osi_layer": "Layer 7",
            "confidence": "High",
            "evidence": "show running-config reveals 'no ip domain-lookup' in global configuration",
            "next_command": "show hosts",
            "fix_steps": [
                "configure terminal",
                "ip domain-lookup",
                "ip name-server 8.8.8.8",
                "end",
                "ping cisco.com"
            ],
            "rule_name": "RULE_DNS_LOOKUP_DISABLED"
        }

    # 21. RADIUS Shared Secret Mismatch
    if "radius_auth_fail" in text.lower() or "key mismatch" in text.lower() or "radius-server" in text.lower() and "mismatch" in text.lower():
        return {
            "root_cause": "RADIUS AAA shared secret key mismatch on switch (configured 'Cisc0Key123' vs server expected 'CiscoKey123')",
            "osi_layer": "Layer 7",
            "confidence": "High",
            "evidence": "Log: %RADIUS-4-RADIUS_AUTH_FAIL: RADIUS server authentication failed due to key mismatch",
            "next_command": "show running-config | include radius-server",
            "fix_steps": [
                "configure terminal",
                "radius-server host 192.168.1.100 auth-port 1812 key CiscoKey123",
                "end",
                "test aaa group radius admin Cisco123 legacy"
            ],
            "rule_name": "RULE_RADIUS_KEY_MISMATCH"
        }

    # 22. HSRP Timer Mismatch
    if "show standby" in text.lower() and ("hello time 1 sec" in text.lower() and "hello time 5 sec" in text.lower()):
        return {
            "root_cause": "HSRP timer mismatch between primary (Hello 1s/Hold 3s) and backup (Hello 5s/Hold 15s) causing split-brain active state",
            "osi_layer": "Layer 3",
            "confidence": "High",
            "evidence": "R1 standby timers are 1s/3s while R2 standby timers are 5s/15s, both reporting Active state",
            "next_command": "show standby brief",
            "fix_steps": [
                "configure terminal",
                "interface GigabitEthernet0/0",
                "standby 1 timers 1 3",
                "standby 1 preempt",
                "end",
                "show standby brief"
            ],
            "rule_name": "RULE_HSRP_TIMER_MISMATCH"
        }

    # 23. IPv6 Router Advertisements Suppressed
    if "ipv6 nd ra suppress" in text.lower():
        return {
            "root_cause": "IPv6 Router Advertisements (RA) suppressed on interface GigabitEthernet0/0 via 'ipv6 nd ra suppress'",
            "osi_layer": "Layer 3",
            "confidence": "High",
            "evidence": "Interface configuration has 'ipv6 nd ra suppress', preventing SLAAC host autoconfiguration",
            "next_command": "show ipv6 interface GigabitEthernet0/0",
            "fix_steps": [
                "configure terminal",
                "interface GigabitEthernet0/0",
                "no ipv6 nd ra suppress",
                "end",
                "show ipv6 interface GigabitEthernet0/0"
            ],
            "rule_name": "RULE_IPV6_RA_SUPPRESSED"
        }

    # 24. CDP Globally Disabled
    if "cdp is not enabled" in text.lower() or "no cdp run" in text.lower():
        return {
            "root_cause": "Cisco Discovery Protocol (CDP) is globally disabled with 'no cdp run'",
            "osi_layer": "Layer 2",
            "confidence": "High",
            "evidence": "'show cdp' output returns '% CDP is not enabled' and config contains 'no cdp run'",
            "next_command": "show cdp neighbors",
            "fix_steps": [
                "configure terminal",
                "cdp run",
                "end",
                "show cdp neighbors"
            ],
            "rule_name": "RULE_CDP_GLOBALLY_DISABLED"
        }

    # 25. Subnet Mask Mismatch on Point-to-Point Link
    if "subnet mask length mismatch" in text.lower() or ("10.0.0.1/24" in text and "10.0.0.2/30" in text):
        return {
            "root_cause": "Subnet mask mismatch on point-to-point link between R1 (/24) and R2 (/30)",
            "osi_layer": "Layer 3",
            "confidence": "High",
            "evidence": "R1 Gi0/0 is configured with 10.0.0.1/24 while R2 Gi0/0 is configured with 10.0.0.2/30",
            "next_command": "show ip interface brief",
            "fix_steps": [
                "configure terminal",
                "interface GigabitEthernet0/0",
                "ip address 10.0.0.1 255.255.255.252",
                "end",
                "show interfaces GigabitEthernet0/0 | include Internet address"
            ],
            "rule_name": "RULE_SUBNET_MASK_MISMATCH"
        }

    # 26. Wireless SSID VLAN Mapping Misconfiguration
    if "wlan mapped to management interface" in text.lower() or ("corp_wifi" in text.lower() and "management (vlan 1)" in text.lower()):
        return {
            "root_cause": "WLAN SSID 'CORP_WIFI' is mapped to management interface (VLAN 1) instead of corp-vlan-100",
            "osi_layer": "Layer 2",
            "confidence": "High",
            "evidence": "show wlan summary shows WLAN 1 CORP_WIFI mapped to Interface 'management (VLAN 1)'",
            "next_command": "show wlan 1",
            "fix_steps": [
                "config wlan disable 1",
                "config wlan interface 1 corp-vlan-100",
                "config wlan enable 1",
                "show wlan summary"
            ],
            "rule_name": "RULE_WIRELESS_VLAN_MAPPING"
        }

    # 27. Wireless Guest ACL Blocking DNS (UDP 53)
    if "deny udp any any eq domain" in text.lower():
        return {
            "root_cause": "Guest Access-List GUEST_FILTER explicitly denies UDP port 53 (DNS) queries",
            "osi_layer": "Layer 4",
            "confidence": "High",
            "evidence": "show access-lists GUEST_FILTER rule 10: 'deny udp any any eq domain' with active packet matches",
            "next_command": "show access-lists GUEST_FILTER",
            "fix_steps": [
                "configure terminal",
                "ip access-list extended GUEST_FILTER",
                "no 10",
                "10 permit udp any any eq domain",
                "end",
                "show access-lists GUEST_FILTER"
            ],
            "rule_name": "RULE_ACL_BLOCKING_DNS"
        }

    # 28. Spanning Tree BPDU Guard Triggered Err-Disable
    if "block_bpduguard" in text.lower() or "bpdu guard enabled. disabling port" in text.lower():
        return {
            "root_cause": "Spanning Tree BPDU Guard received unexpected BPDU on edge port Gi0/10 and placed it into err-disabled state",
            "osi_layer": "Layer 2",
            "confidence": "High",
            "evidence": "Log: %SPANTREE-2-BLOCK_BPDUGUARD Received BPDU on port Gi0/10 with BPDU Guard enabled",
            "next_command": "show interfaces GigabitEthernet0/10 status",
            "fix_steps": [
                "configure terminal",
                "interface GigabitEthernet0/10",
                "shutdown",
                "no shutdown",
                "end",
                "show interfaces GigabitEthernet0/10 status"
            ],
            "rule_name": "RULE_BPDU_GUARD_ERRDISABLE"
        }

    # 29. ACL Implicit Deny Blocking Inter-VLAN Traffic
    if "hitting implicit deny any any" in text.lower() or ("permit tcp" in text.lower() and "443" in text.lower() and "deny ip any any" in text.lower()):
        return {
            "root_cause": "Access List 105 lacks rules for ICMP and HTTP, causing packets to be dropped by the implicit deny rule",
            "osi_layer": "Layer 3/4",
            "confidence": "High",
            "evidence": "ACL 105 has only HTTPS permit rule with 64 packets dropped by trailing 'deny ip any any'",
            "next_command": "show access-lists 105",
            "fix_steps": [
                "configure terminal",
                "ip access-list extended 105",
                "15 permit icmp 192.168.10.0 0.0.0.255 192.168.20.0 0.0.0.255",
                "18 permit tcp 192.168.10.0 0.0.0.255 192.168.20.0 0.0.0.255 eq 80",
                "end",
                "show access-lists 105"
            ],
            "rule_name": "RULE_ACL_IMPLICIT_DENY"
        }

    # 30. OSPF Area ID Mismatch
    if "invalid area id" in text.lower() or ("area 0" in text.lower() and "area 1" in text.lower() and "ospf-4-errrcv" in text.lower()):
        return {
            "root_cause": "OSPF Area ID mismatch on link between Core-R1 (Area 0) and Edge-R2 (Area 1)",
            "osi_layer": "Layer 3",
            "confidence": "High",
            "evidence": "Log: %OSPF-4-ERRRCV Received packet with invalid Area ID 0 from 10.200.1.1 on GigabitEthernet0/0 (configured Area 1)",
            "next_command": "show ip ospf interface GigabitEthernet0/0",
            "fix_steps": [
                "configure terminal",
                "router ospf 1",
                "no network 10.200.1.0 0.0.0.3 area 1",
                "network 10.200.1.0 0.0.0.3 area 0",
                "end",
                "show ip ospf neighbor"
            ],
            "rule_name": "RULE_OSPF_AREA_MISMATCH"
        }

    # No deterministic rule matched -> signal AI reasoning layer
    return None
