# Enterprise CMDB Engine - Technical Specification

## Executive Summary

The Enterprise CMDB (Configuration Management Database) Engine transforms the AWS App Visualizer into a comprehensive IT asset and configuration management platform. By leveraging existing infrastructure discovery, dependency mapping, and telemetry capabilities, the CMDB provides real-time visibility and control across hybrid cloud environments.

## Problem Analysis

### Current State Challenges

1. **Asset Visibility Gap**: 60-80% of organizations lack comprehensive asset inventory across hybrid environments
2. **Configuration Drift**: Untracked changes lead to 40% of production incidents
3. **Compliance Overhead**: Manual compliance reporting consumes 200+ hours per audit cycle
4. **Change Risk**: 70% of outages result from changes with inadequate impact analysis
5. **Tool Fragmentation**: Average enterprise uses 15+ tools for asset management without integration
6. **Data Staleness**: Traditional CMDBs become 30-50% inaccurate within 6 months

### Hybrid Cloud Complexity

- **Multi-Cloud Management**: Assets across AWS, Azure, GCP with different APIs and data models
- **On-Premises Integration**: Physical servers, VMware, network devices with varying discovery protocols
- **Connectivity Mapping**: VPNs, ExpressRoute, Direct Connect creating complex hybrid topologies
- **Security Boundaries**: Different authentication, authorization, and access patterns per environment
- **Data Sovereignty**: Compliance requirements affecting data storage and processing locations

## System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             CMDB ENGINE ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │   Discovery     │  │   Relationship  │  │   Change        │                │
│  │   Engine        │  │   Engine        │  │   Engine        │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│           │                     │                     │                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                     GRAPH DATABASE (Neo4j)                             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │   │
│  │  │ Config Items │  │ Relationships│  │ Change Events│                │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│           │                     │                     │                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │   API Gateway   │  │   Event Bus     │  │   ML Engine     │                │
│  │   (FastAPI)     │  │   (Apache Kafka)│  │   (TensorFlow)  │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Discovery Engine Architecture

#### Multi-Cloud Discovery
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           MULTI-CLOUD DISCOVERY                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │   AWS Discovery │  │  Azure Discovery│  │  GCP Discovery  │                │
│  │   • EC2/Lambda  │  │  • VM/Functions │  │  • Compute/CF   │                │
│  │   • RDS/DynamoDB│  │  • SQL/CosmosDB │  │  • SQL/Firestore│                │
│  │   • S3/CloudFront│  │  • Storage/CDN  │  │  • Storage/CDN  │                │
│  │   • VPC/Route53 │  │  • VNet/DNS     │  │  • VPC/DNS      │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│           │                     │                     │                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    UNIFIED ASSET MODEL                                 │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │   │
│  │  │   Compute    │  │   Storage    │  │   Network    │                │   │
│  │  │   Resources  │  │   Resources  │  │   Resources  │                │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### On-Premises Discovery
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        ON-PREMISES DISCOVERY                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │ VMware vSphere  │  │ Hyper-V/SCVMM   │  │ Physical Servers│                │
│  │ • vCenter API   │  │ • PowerShell    │  │ • IPMI/BMC      │                │
│  │ • ESXi Hosts    │  │ • WMI/WinRM     │  │ • SNMP          │                │
│  │ • VM Inventory  │  │ • VM Templates  │  │ • SSH/Ansible   │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│           │                     │                     │                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │ Network Devices │  │ Storage Arrays  │  │ Database Servers│                │
│  │ • SNMP v2/v3    │  │ • SAN/NAS APIs  │  │ • Oracle/MSSQL  │                │
│  │ • SSH/NETCONF   │  │ • FC/iSCSI      │  │ • MySQL/PostSQL │                │
│  │ • REST APIs     │  │ • Block/File    │  │ • MongoDB/Redis │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Configuration Item (CI) Data Model

### Core CI Schema
```json
{
  "ci_id": "aws-ec2-i-1234567890abcdef0",
  "ci_type": "compute_instance",
  "ci_class": "aws_ec2_instance",
  "name": "web-server-prod-01",
  "display_name": "Production Web Server 01",
  "environment": "production",
  "location": {
    "cloud_provider": "aws",
    "region": "us-east-1",
    "availability_zone": "us-east-1a",
    "account_id": "123456789012"
  },
  "configuration": {
    "instance_type": "t3.medium",
    "ami_id": "ami-0abcdef1234567890",
    "vpc_id": "vpc-12345678",
    "subnet_id": "subnet-12345678",
    "security_groups": ["sg-12345678", "sg-87654321"],
    "public_ip": "54.123.45.67",
    "private_ip": "10.0.1.100",
    "storage": {
      "root_volume": {
        "device": "/dev/sda1",
        "size": "20GB",
        "type": "gp3",
        "encrypted": true
      }
    },
    "tags": {
      "Name": "web-server-prod-01",
      "Environment": "production",
      "Application": "web-frontend",
      "Owner": "platform-team",
      "CostCenter": "engineering"
    }
  },
  "relationships": {
    "runs_on": ["aws-subnet-subnet-12345678"],
    "protected_by": ["aws-sg-sg-12345678", "aws-sg-sg-87654321"],
    "connects_to": ["aws-rds-prod-database-01"],
    "load_balanced_by": ["aws-alb-web-prod-alb"],
    "monitored_by": ["cloudwatch-alarm-cpu-high", "datadog-monitor-disk-space"]
  },
  "lifecycle": {
    "created_at": "2023-11-15T10:30:00Z",
    "created_by": "terraform-automation",
    "last_updated": "2024-01-10T14:22:33Z",
    "updated_by": "aws-config-service",
    "status": "active",
    "state": "running"
  },
  "compliance": {
    "frameworks": ["SOC2", "PCI-DSS"],
    "policies": ["encryption-at-rest", "network-isolation"],
    "violations": [],
    "last_assessed": "2024-01-10T09:00:00Z"
  },
  "telemetry": {
    "health_status": "healthy",
    "performance_metrics": {
      "cpu_utilization": 45.2,
      "memory_utilization": 62.8,
      "disk_utilization": 34.1,
      "network_in": "125MB/s",
      "network_out": "89MB/s"
    },
    "alerts": [],
    "last_heartbeat": "2024-01-10T14:25:00Z"
  },
  "change_history": [
    {
      "change_id": "CHG-2024-001234",
      "timestamp": "2024-01-10T14:22:33Z",
      "change_type": "configuration_update",
      "changed_by": "aws-config-service",
      "changes": [
        {
          "field": "configuration.security_groups",
          "old_value": ["sg-12345678"],
          "new_value": ["sg-12345678", "sg-87654321"],
          "change_reason": "Added additional security group for monitoring access"
        }
      ],
      "impact_assessment": "low",
      "approval_status": "auto-approved"
    }
  ]
}
```

### Relationship Model
```json
{
  "relationship_id": "rel-compute-storage-001",
  "relationship_type": "uses",
  "source_ci": "aws-ec2-i-1234567890abcdef0",
  "target_ci": "aws-ebs-vol-0123456789abcdef0",
  "properties": {
    "mount_point": "/data",
    "access_mode": "read-write",
    "dependency_level": "critical",
    "network_path": ["eth0", "aws-vpc-endpoint"],
    "latency_ms": 2.3,
    "bandwidth_mbps": 1000
  },
  "discovered_by": "aws-api-discovery",
  "confidence_score": 0.95,
  "last_validated": "2024-01-10T14:20:00Z",
  "change_history": [
    {
      "timestamp": "2024-01-10T14:20:00Z",
      "change_type": "relationship_created",
      "reason": "Storage volume attached to instance"
    }
  ]
}
```

## Hybrid Cloud Discovery Implementation

### AWS Discovery Engine
```python
# AWS Discovery Implementation
class AWSDiscoveryEngine:
    def __init__(self, session_manager):
        self.session_manager = session_manager
        self.services = {
            'ec2': self.discover_ec2,
            'rds': self.discover_rds,
            'lambda': self.discover_lambda,
            's3': self.discover_s3,
            'iam': self.discover_iam,
            'vpc': self.discover_vpc
        }
    
    async def discover_all_regions(self):
        """Discover resources across all AWS regions"""
        regions = await self.get_available_regions()
        discovery_tasks = []
        
        for region in regions:
            session = await self.session_manager.get_session(region)
            task = self.discover_region(session, region)
            discovery_tasks.append(task)
            
        results = await asyncio.gather(*discovery_tasks)
        return self.merge_discovery_results(results)
    
    async def discover_ec2(self, session, region):
        """Discover EC2 instances with detailed configuration"""
        ec2 = session.client('ec2')
        
        # Get all instances
        paginator = ec2.get_paginator('describe_instances')
        instances = []
        
        async for page in paginator.paginate():
            for reservation in page['Reservations']:
                for instance in reservation['Instances']:
                    ci = self.create_ec2_ci(instance, region)
                    
                    # Enrich with additional data
                    ci = await self.enrich_ec2_networking(ci, ec2)
                    ci = await self.enrich_ec2_storage(ci, ec2)
                    ci = await self.enrich_ec2_monitoring(ci)
                    
                    instances.append(ci)
        
        return instances
    
    def create_ec2_ci(self, instance_data, region):
        """Create CI object from EC2 instance data"""
        return {
            'ci_id': f"aws-ec2-{instance_data['InstanceId']}",
            'ci_type': 'compute_instance',
            'ci_class': 'aws_ec2_instance',
            'name': self.get_instance_name(instance_data),
            'location': {
                'cloud_provider': 'aws',
                'region': region,
                'availability_zone': instance_data.get('Placement', {}).get('AvailabilityZone'),
                'account_id': self.get_account_id()
            },
            'configuration': self.extract_ec2_config(instance_data),
            'lifecycle': {
                'created_at': instance_data.get('LaunchTime'),
                'status': 'active',
                'state': instance_data.get('State', {}).get('Name')
            }
        }
```

### VMware vSphere Discovery Engine
```python
# VMware Discovery Implementation
class VMwareDiscoveryEngine:
    def __init__(self, vcenter_config):
        self.vcenter_config = vcenter_config
        self.si = None
    
    async def connect_vcenter(self):
        """Establish connection to vCenter"""
        context = ssl.SSLContext(ssl.PROTOCOL_SSLv23)
        context.verify_mode = ssl.CERT_NONE
        
        self.si = SmartConnect(
            host=self.vcenter_config['host'],
            user=self.vcenter_config['username'],
            pwd=self.vcenter_config['password'],
            port=self.vcenter_config.get('port', 443),
            sslContext=context
        )
        
        atexit.register(Disconnect, self.si)
    
    async def discover_virtual_machines(self):
        """Discover all VMs in vSphere environment"""
        content = self.si.RetrieveContent()
        container = content.rootFolder
        viewType = [vim.VirtualMachine]
        recursive = True
        
        containerView = content.viewManager.CreateContainerView(
            container, viewType, recursive
        )
        
        vms = []
        for vm in containerView.view:
            ci = await self.create_vm_ci(vm)
            ci = await self.enrich_vm_networking(ci, vm)
            ci = await self.enrich_vm_storage(ci, vm)
            vms.append(ci)
        
        containerView.Destroy()
        return vms
    
    async def create_vm_ci(self, vm):
        """Create CI object from VMware VM"""
        return {
            'ci_id': f"vmware-vm-{vm.config.uuid}",
            'ci_type': 'compute_instance',
            'ci_class': 'vmware_virtual_machine',
            'name': vm.name,
            'location': {
                'cloud_provider': 'vmware',
                'datacenter': self.get_datacenter_name(vm),
                'cluster': self.get_cluster_name(vm),
                'host': vm.runtime.host.name if vm.runtime.host else None
            },
            'configuration': {
                'cpu_count': vm.config.hardware.numCPU,
                'memory_mb': vm.config.hardware.memoryMB,
                'guest_os': vm.config.guestFullName,
                'vm_version': vm.config.version,
                'tools_status': vm.guest.toolsStatus if vm.guest else None,
                'power_state': vm.runtime.powerState
            }
        }
```

### Network Discovery Engine
```python
# Network Discovery Implementation
class NetworkDiscoveryEngine:
    def __init__(self, credentials_manager):
        self.credentials = credentials_manager
        self.protocols = ['snmp', 'ssh', 'netconf', 'rest']
    
    async def discover_network_devices(self, network_ranges):
        """Discover network devices across specified IP ranges"""
        discovery_tasks = []
        
        for network_range in network_ranges:
            devices = await self.scan_network_range(network_range)
            for device in devices:
                task = self.discover_device(device)
                discovery_tasks.append(task)
        
        results = await asyncio.gather(*discovery_tasks, return_exceptions=True)
        return [r for r in results if not isinstance(r, Exception)]
    
    async def discover_device(self, device_ip):
        """Discover individual network device"""
        device_info = {}
        
        # Try SNMP first (most common)
        try:
            device_info = await self.snmp_discovery(device_ip)
            device_info['discovery_method'] = 'snmp'
        except Exception as e:
            logger.debug(f"SNMP discovery failed for {device_ip}: {e}")
        
        # Try SSH if SNMP fails
        if not device_info:
            try:
                device_info = await self.ssh_discovery(device_ip)
                device_info['discovery_method'] = 'ssh'
            except Exception as e:
                logger.debug(f"SSH discovery failed for {device_ip}: {e}")
        
        # Try REST API if others fail
        if not device_info:
            try:
                device_info = await self.rest_discovery(device_ip)
                device_info['discovery_method'] = 'rest'
            except Exception as e:
                logger.debug(f"REST discovery failed for {device_ip}: {e}")
        
        if device_info:
            return self.create_network_device_ci(device_info, device_ip)
        
        return None
    
    async def snmp_discovery(self, device_ip):
        """Discover device via SNMP"""
        from pysnmp.hlapi.asyncio import *
        
        # Standard OIDs for device information
        oids = {
            'sysDescr': '1.3.6.1.2.1.1.1.0',
            'sysName': '1.3.6.1.2.1.1.5.0',
            'sysLocation': '1.3.6.1.2.1.1.6.0',
            'sysContact': '1.3.6.1.2.1.1.4.0',
            'ifTable': '1.3.6.1.2.1.2.2.1'
        }
        
        device_info = {}
        
        for name, oid in oids.items():
            async for (errorIndication, errorStatus, errorIndex, varBinds) in nextCmd(
                SnmpEngine(),
                CommunityData('public'),  # Try public first
                UdpTransportTarget((device_ip, 161)),
                ContextData(),
                ObjectType(ObjectIdentity(oid)),
                lexicographicMode=False):
                
                if errorIndication:
                    break
                if errorStatus:
                    break
                
                for varBind in varBinds:
                    device_info[name] = str(varBind[1])
                break
        
        return device_info
```

## Change Management Integration

### Change Impact Analysis Engine
```python
# Change Impact Analysis Implementation
class ChangeImpactAnalyzer:
    def __init__(self, graph_db, ml_engine):
        self.graph_db = graph_db
        self.ml_engine = ml_engine
    
    async def analyze_change_impact(self, change_request):
        """Analyze the potential impact of a proposed change"""
        target_ci = await self.graph_db.get_ci(change_request['target_ci_id'])
        
        # Get all related CIs
        related_cis = await self.get_related_cis(target_ci, max_depth=3)
        
        # Analyze dependency chains
        critical_paths = await self.find_critical_paths(target_ci, related_cis)
        
        # Assess business impact
        business_impact = await self.assess_business_impact(
            target_ci, related_cis, critical_paths
        )
        
        # Generate risk score
        risk_score = await self.calculate_risk_score(
            change_request, target_ci, related_cis, business_impact
        )
        
        # Create impact report
        return {
            'change_id': change_request['change_id'],
            'target_ci': target_ci['ci_id'],
            'risk_score': risk_score,
            'business_impact': business_impact,
            'affected_services': await self.get_affected_services(related_cis),
            'rollback_plan': await self.generate_rollback_plan(change_request),
            'recommended_actions': await self.get_recommendations(risk_score),
            'approval_required': risk_score > 0.7,
            'testing_requirements': await self.get_testing_requirements(
                change_request, risk_score
            )
        }
    
    async def get_related_cis(self, target_ci, max_depth=3):
        """Get all CIs related to the target CI within specified depth"""
        query = """
        MATCH (target:CI {ci_id: $ci_id})
        CALL apoc.path.subgraphAll(target, {
            relationshipFilter: "DEPENDS_ON|CONNECTS_TO|RUNS_ON|PROTECTED_BY",
            minLevel: 1,
            maxLevel: $max_depth
        }) YIELD nodes, relationships
        RETURN nodes, relationships
        """
        
        result = await self.graph_db.execute_query(
            query, 
            ci_id=target_ci['ci_id'], 
            max_depth=max_depth
        )
        
        return result
```

## UI/UX Design Specifications

### CMDB Dashboard Layout
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CMDB DASHBOARD                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │ Total Assets    │  │ Health Status   │  │ Compliance      │                │
│  │   12,847        │  │ 🟢 94% Healthy  │  │ 🟡 SOC2: 87%   │                │
│  │ ↗️ +234 (24h)   │  │ 🟡 4% Warning   │  │ 🟢 PCI: 98%    │                │
│  │                 │  │ 🔴 2% Critical  │  │ 🔴 GDPR: 78%   │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐                    ┌─────────────────┐                   │
│  │ Quick Search    │                    │ Recent Changes  │                   │
│  │ 🔍 [Search Box] │                    │ • CHG-2024-001  │                   │
│  │                 │                    │ • CHG-2024-002  │                   │
│  │ Filters:        │                    │ • CHG-2024-003  │                   │
│  │ ☑️ Production   │                    │ View All →      │                   │
│  │ ☑️ Critical     │                    │                 │                   │
│  │ ☑️ AWS          │                    │                 │                   │
│  └─────────────────┘                    └─────────────────┘                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                           ASSET VISUALIZATION                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                         │   │
│  │     [Interactive Network Topology with CI Relationships]               │   │
│  │                                                                         │   │
│  │  🔵 AWS         🟡 Azure       🟢 VMware      🔴 Physical              │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### CI Detail View
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        CI DETAIL VIEW: web-server-prod-01                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │ Overview        │  │ Configuration   │  │ Relationships   │                │
│  │                 │  │                 │  │                 │                │
│  │ Status: 🟢 Healthy│  │ Instance Type:  │  │ Dependencies:   │                │
│  │ Environment: Prod│  │ t3.medium       │  │ • Database      │                │
│  │ Location: us-east-1│ │ OS: Ubuntu 20.04│  │ • Load Balancer │                │
│  │ Owner: Platform │  │ CPU: 2 vCPU     │  │ • Security Groups│                │
│  │ Cost: $45.60/mo │  │ Memory: 4GB     │  │                 │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │ Change History  │  │ Compliance      │  │ Monitoring      │                │
│  │                 │  │                 │  │                 │                │
│  │ CHG-2024-001    │  │ SOC2: ✅ Pass   │  │ CPU: 45%        │                │
│  │ Security Update │  │ PCI: ✅ Pass    │  │ Memory: 62%     │                │
│  │ 2024-01-10      │  │ Encryption: ✅  │  │ Disk: 34%       │                │
│  │                 │  │ Patching: ⚠️ Due│  │ Status: 🟢 OK   │                │
│  │ View All →      │  │                 │  │                 │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Change Impact Analysis View
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      CHANGE IMPACT ANALYSIS: CHG-2024-005                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Risk Score: 🟡 MEDIUM (0.65)              Approval Required: YES              │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        IMPACT VISUALIZATION                             │   │
│  │                                                                         │   │
│  │      🔴 [Target CI] ──── 🟡 [Dependent Service A]                     │   │
│  │           │                      │                                     │   │
│  │           └─────── 🟡 [Dependent Service B] ──── 🟢 [User Service]    │   │
│  │                           │                                             │   │
│  │                           └─── 🟢 [Monitoring System]                  │   │
│  │                                                                         │   │
│  │  Legend: 🔴 Critical Impact  🟡 Medium Impact  🟢 Low Impact          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Affected Services (12):                    Testing Requirements:              │
│  • Production Web Application (Critical)    • Load testing on staging         │
│  • User Authentication Service (High)       • Database connection validation  │
│  • Payment Processing (High)                • Security scan post-deployment   │
│  • Reporting Dashboard (Medium)             • Rollback procedure validation   │
│  • ... 8 more services                                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Rollback Plan:                             Recommended Actions:               │
│  1. Stop application traffic               • Schedule during maintenance window │
│  2. Restore previous AMI                   • Notify stakeholders 24h advance  │
│  3. Update load balancer targets           • Prepare rollback communication   │
│  4. Validate service health                • Monitor for 2 hours post-change  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Integration Specifications

### ServiceNow Integration
```python
# ServiceNow CMDB Integration
class ServiceNowIntegration:
    def __init__(self, servicenow_config):
        self.config = servicenow_config
        self.client = pysnow.Client(
            instance=servicenow_config['instance'],
            user=servicenow_config['username'],
            password=servicenow_config['password']
        )
    
    async def sync_cis_to_servicenow(self, cis):
        """Sync Configuration Items to ServiceNow CMDB"""
        table = self.client.resource(api_path='/table/cmdb_ci')
        
        for ci in cis:
            servicenow_ci = self.transform_to_servicenow_format(ci)
            
            # Check if CI exists
            existing = table.get(query={'name': ci['name']})
            
            if existing.all():
                # Update existing CI
                record = existing.first()
                record.update(servicenow_ci)
                logger.info(f"Updated CI {ci['ci_id']} in ServiceNow")
            else:
                # Create new CI
                table.create(payload=servicenow_ci)
                logger.info(f"Created CI {ci['ci_id']} in ServiceNow")
    
    def transform_to_servicenow_format(self, ci):
        """Transform internal CI format to ServiceNow format"""
        return {
            'name': ci['name'],
            'sys_class_name': self.map_ci_class(ci['ci_class']),
            'environment': ci.get('environment', 'unknown'),
            'location': ci['location'].get('region', ''),
            'operational_status': self.map_status(ci['lifecycle']['status']),
            'category': ci['ci_type'],
            'subcategory': ci['ci_class'],
            'u_cloud_provider': ci['location'].get('cloud_provider', ''),
            'u_discovery_source': 'aws-app-visualizer'
        }
```

### ITSM Change Management Integration
```python
# ITSM Integration for Change Management
class ITSMChangeIntegration:
    def __init__(self, itsm_config):
        self.config = itsm_config
        self.workflow_engine = WorkflowEngine()
    
    async def create_change_request(self, change_data, impact_analysis):
        """Create change request in ITSM system with impact analysis"""
        change_request = {
            'short_description': change_data['description'],
            'description': self.format_change_description(change_data, impact_analysis),
            'category': 'Infrastructure',
            'subcategory': self.determine_subcategory(change_data),
            'priority': self.calculate_priority(impact_analysis),
            'risk': impact_analysis['risk_score'],
            'impact': self.map_business_impact(impact_analysis['business_impact']),
            'urgency': self.determine_urgency(impact_analysis),
            'requested_by': change_data['requested_by'],
            'assignment_group': self.determine_assignment_group(change_data),
            'planned_start_date': change_data['planned_start'],
            'planned_end_date': change_data['planned_end'],
            'work_notes': self.generate_work_notes(impact_analysis),
            'u_affected_cis': self.format_affected_cis(impact_analysis['affected_services']),
            'u_rollback_plan': impact_analysis['rollback_plan'],
            'u_testing_plan': impact_analysis['testing_requirements']
        }
        
        # Create change request
        cr_id = await self.itsm_client.create_change_request(change_request)
        
        # Attach impact analysis report
        await self.attach_impact_report(cr_id, impact_analysis)
        
        return cr_id
    
    def format_change_description(self, change_data, impact_analysis):
        """Format detailed change description with impact analysis"""
        return f"""
        Change Description: {change_data['description']}
        
        Target Configuration Item: {change_data['target_ci']}
        
        Impact Analysis Summary:
        - Risk Score: {impact_analysis['risk_score']} ({self.risk_level(impact_analysis['risk_score'])})
        - Affected Services: {len(impact_analysis['affected_services'])}
        - Business Impact: {impact_analysis['business_impact']}
        
        Critical Dependencies:
        {self.format_critical_dependencies(impact_analysis)}
        
        Recommended Testing:
        {self.format_testing_requirements(impact_analysis['testing_requirements'])}
        
        Rollback Plan:
        {self.format_rollback_plan(impact_analysis['rollback_plan'])}
        """
```

## Performance & Scalability

### Graph Database Optimization
```cypher
-- Optimized queries for large-scale CMDB operations

-- Index creation for performance
CREATE INDEX ON :CI(ci_id);
CREATE INDEX ON :CI(ci_type);
CREATE INDEX ON :CI(environment);
CREATE INDEX ON :CI(location);
CREATE CONSTRAINT ON (ci:CI) ASSERT ci.ci_id IS UNIQUE;

-- Efficient relationship queries
MATCH (source:CI)-[r:DEPENDS_ON*1..3]-(target:CI)
WHERE source.ci_id = $source_id
RETURN target, r
ORDER BY length(r) ASC
LIMIT 100;

-- Change impact analysis query
MATCH (target:CI {ci_id: $target_ci})
CALL apoc.path.expandConfig(target, {
    relationshipFilter: "DEPENDS_ON>|<CONNECTS_TO",
    labelFilter: "CI",
    minLevel: 1,
    maxLevel: 3,
    limit: 1000
}) YIELD path
WITH nodes(path) as impacted_nodes
UNWIND impacted_nodes as node
WHERE node.environment = 'production'
RETURN DISTINCT node.ci_id, node.name, node.ci_type, node.business_criticality
ORDER BY node.business_criticality DESC;
```

### Caching Strategy
```python
# Multi-level caching for CMDB performance
class CMDBCacheManager:
    def __init__(self):
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0)
        self.memory_cache = TTLCache(maxsize=10000, ttl=300)  # 5 minute TTL
        
    async def get_ci(self, ci_id):
        """Get CI with multi-level caching"""
        # Level 1: Memory cache
        if ci_id in self.memory_cache:
            return self.memory_cache[ci_id]
        
        # Level 2: Redis cache
        cached_ci = await self.redis_client.get(f"ci:{ci_id}")
        if cached_ci:
            ci_data = json.loads(cached_ci)
            self.memory_cache[ci_id] = ci_data
            return ci_data
        
        # Level 3: Database
        ci_data = await self.graph_db.get_ci(ci_id)
        if ci_data:
            # Cache for future requests
            await self.redis_client.setex(
                f"ci:{ci_id}", 
                3600,  # 1 hour TTL
                json.dumps(ci_data)
            )
            self.memory_cache[ci_id] = ci_data
        
        return ci_data
```

## Security & Compliance

### Role-Based Access Control (RBAC)
```python
# RBAC implementation for CMDB access
class CMDBSecurityManager:
    def __init__(self, auth_service):
        self.auth_service = auth_service
        self.permissions = {
            'cmdb_read': 'View CI information and relationships',
            'cmdb_write': 'Create and update CI information',
            'cmdb_delete': 'Delete CI records',
            'cmdb_admin': 'Full CMDB administration access',
            'change_approve': 'Approve change requests',
            'compliance_view': 'View compliance reports'
        }
    
    async def check_permission(self, user_id, permission, resource=None):
        """Check if user has permission for specific action"""
        user_roles = await self.auth_service.get_user_roles(user_id)
        
        for role in user_roles:
            role_permissions = await self.get_role_permissions(role)
            if permission in role_permissions:
                # Check resource-level permissions if specified
                if resource:
                    return await self.check_resource_permission(
                        user_id, permission, resource
                    )
                return True
        
        return False
    
    async def check_resource_permission(self, user_id, permission, resource):
        """Check resource-level permissions (e.g., environment, CI type)"""
        user_context = await self.auth_service.get_user_context(user_id)
        
        # Environment-based access control
        if 'environments' in user_context:
            allowed_envs = user_context['environments']
            if resource.get('environment') not in allowed_envs:
                return False
        
        # CI type-based access control
        if 'ci_types' in user_context:
            allowed_types = user_context['ci_types']
            if resource.get('ci_type') not in allowed_types:
                return False
        
        return True
```

This comprehensive CMDB Engine specification provides a complete technical foundation for implementing enterprise-grade configuration management capabilities within the AWS App Visualizer platform. The hybrid cloud focus ensures the solution can handle complex, real-world enterprise environments while maintaining the real-time accuracy and automation that makes it valuable to development and operations teams.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Add GitHub API integration to fetch repository contents", "status": "completed", "priority": "high", "id": "87"}, {"content": "Create GitHub repository configuration interface", "status": "completed", "priority": "high", "id": "88"}, {"content": "Implement Terraform file discovery in GitHub repos", "status": "completed", "priority": "high", "id": "89"}, {"content": "Add GitHub authentication (personal access token)", "status": "pending", "priority": "high", "id": "90"}, {"content": "Update backend to support GitHub mode vs local file mode", "status": "completed", "priority": "high", "id": "91"}, {"content": "Add UI controls to switch between local and GitHub modes", "status": "completed", "priority": "medium", "id": "92"}, {"content": "Test GitHub integration with a sample repository", "status": "completed", "priority": "medium", "id": "93"}, {"content": "Design CMDB architecture and technical specification", "status": "completed", "priority": "high", "id": "94"}]