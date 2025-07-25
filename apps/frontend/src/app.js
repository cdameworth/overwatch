class OverwatchVisualizer {
  constructor() {
    this.data = null;
    this.filteredData = null;
    this.svg = null;
    this.simulation = null;
    this.zoom = null;
    this.currentTransform = d3.zoomIdentity;
    this.enterpriseMode = false;
    this.currentAnalysis = null;
    
    // Configuration
    this.config = {
      nodeRadius: 25,
      linkDistance: 150,
      chargeStrength: -400,
      width: 2000,
      height: 1500,
      colors: d3.scaleOrdinal(d3.schemeCategory10)
    };

    // Map AWS resource types to icon filenames
    this.awsIconMap = {
      // Compute
      'aws_lambda_function': 'assets/icons/lambda.svg',
      'aws_lambda_permission': 'assets/icons/lambda.svg',
      'aws_lambda_alias': 'assets/icons/lambda.svg',
      'aws_lambda_event_source_mapping': 'assets/icons/lambda.svg',
      'aws_lambda_layer_version': 'assets/icons/lambda.svg',
      'aws_instance': 'assets/icons/ec2.svg',
      'aws_ec2_instance': 'assets/icons/ec2.svg',
      'aws_launch_template': 'assets/icons/ec2.svg',
      'aws_launch_configuration': 'assets/icons/ec2.svg',
      'aws_autoscaling_group': 'assets/icons/autoscaling.svg',
      'aws_autoscaling_policy': 'assets/icons/autoscaling.svg',
      'aws_batch_job_definition': 'assets/icons/batch.svg',
      'aws_batch_job_queue': 'assets/icons/batch.svg',
      'aws_batch_compute_environment': 'assets/icons/batch.svg',
      
      // Containers & Orchestration
      'aws_eks_cluster': 'assets/icons/eks.svg',
      'aws_eks_node_group': 'assets/icons/eks.svg',
      'aws_eks_fargate_profile': 'assets/icons/eks.svg',
      'aws_ecs_cluster': 'assets/icons/ecs.svg',
      'aws_ecs_service': 'assets/icons/ecs.svg',
      'aws_ecs_task_definition': 'assets/icons/ecs.svg',
      'aws_ecs_capacity_provider': 'assets/icons/ecs.svg',
      'aws_ecr_repository': 'assets/icons/ecr.svg',
      'aws_ecr_lifecycle_policy': 'assets/icons/ecr.svg',
      'aws_app_runner_service': 'assets/icons/apprunner.svg',
      
      // Storage
      'aws_s3_bucket': 'assets/icons/s3.svg',
      'aws_s3_bucket_policy': 'assets/icons/s3.svg',
      'aws_s3_bucket_public_access_block': 'assets/icons/s3.svg',
      'aws_s3_bucket_notification': 'assets/icons/s3.svg',
      'aws_s3_object': 'assets/icons/s3.svg',
      'aws_ebs_volume': 'assets/icons/ebs.svg',
      'aws_ebs_snapshot': 'assets/icons/ebs.svg',
      'aws_efs_file_system': 'assets/icons/efs.svg',
      'aws_efs_mount_target': 'assets/icons/efs.svg',
      'aws_efs_access_point': 'assets/icons/efs.svg',
      'aws_fsx_lustre_file_system': 'assets/icons/fsx.svg',
      'aws_fsx_windows_file_system': 'assets/icons/fsx.svg',
      'aws_backup_vault': 'assets/icons/backup.svg',
      'aws_backup_plan': 'assets/icons/backup.svg',
      'aws_storagegateway_gateway': 'assets/icons/storagegateway.svg',
      
      // Database
      'aws_dynamodb_table': 'assets/icons/dynamodb.svg',
      'aws_dynamodb_global_table': 'assets/icons/dynamodb.svg',
      'aws_rds_instance': 'assets/icons/rds.svg',
      'aws_rds_cluster': 'assets/icons/rds.svg',
      'aws_db_instance': 'assets/icons/rds.svg',
      'aws_db_cluster': 'assets/icons/rds.svg',
      'aws_db_subnet_group': 'assets/icons/rds.svg',
      'aws_db_parameter_group': 'assets/icons/rds.svg',
      'aws_rds_proxy': 'assets/icons/rdsproxy.svg',
      'aws_elasticache_replication_group': 'assets/icons/elasticache.svg',
      'aws_elasticache_cluster': 'assets/icons/elasticache.svg',
      'aws_elasticache_subnet_group': 'assets/icons/elasticache.svg',
      'aws_opensearch_domain': 'assets/icons/opensearch.svg',
      'aws_elasticsearch_domain': 'assets/icons/opensearch.svg',
      'aws_redshift_cluster': 'assets/icons/redshift.svg',
      'aws_redshift_subnet_group': 'assets/icons/redshift.svg',
      'aws_neptune_cluster': 'assets/icons/neptune.svg',
      'aws_neptune_cluster_instance': 'assets/icons/neptune.svg',
      'aws_documentdb_cluster': 'assets/icons/documentdb.svg',
      'aws_documentdb_cluster_instance': 'assets/icons/documentdb.svg',
      'aws_timestream_database': 'assets/icons/timestream.svg',
      'aws_timestream_table': 'assets/icons/timestream.svg',
      
      // Networking & Content Delivery
      'aws_vpc': 'assets/icons/vpc.svg',
      'aws_subnet': 'assets/icons/subnet.svg',
      'aws_internet_gateway': 'assets/icons/internetgateway.svg',
      'aws_nat_gateway': 'assets/icons/natgateway.svg',
      'aws_nat_instance': 'assets/icons/natgateway.svg',
      'aws_route_table': 'assets/icons/routetable.svg',
      'aws_route': 'assets/icons/routetable.svg',
      'aws_security_group': 'assets/icons/securitygroup.svg',
      'aws_network_acl': 'assets/icons/nacl.svg',
      'aws_vpc_endpoint': 'assets/icons/vpcendpoint.svg',
      'aws_vpc_peering_connection': 'assets/icons/vpcpeering.svg',
      'aws_transit_gateway': 'assets/icons/transitgateway.svg',
      'aws_transit_gateway_attachment': 'assets/icons/transitgateway.svg',
      'aws_customer_gateway': 'assets/icons/customergateway.svg',
      'aws_vpn_gateway': 'assets/icons/vpngateway.svg',
      'aws_vpn_connection': 'assets/icons/vpnconnection.svg',
      'aws_dx_gateway': 'assets/icons/directconnect.svg',
      'aws_dx_connection': 'assets/icons/directconnect.svg',
      'aws_lb': 'assets/icons/alb.svg',
      'aws_alb': 'assets/icons/alb.svg',
      'aws_elb': 'assets/icons/elb.svg',
      'aws_lb_listener': 'assets/icons/alb.svg',
      'aws_lb_target_group': 'assets/icons/alb.svg',
      'aws_route53_zone': 'assets/icons/route53-zone.svg',
      'aws_route53_record': 'assets/icons/route53.svg',
      'aws_route53_health_check': 'assets/icons/route53.svg',
      'aws_cloudfront_distribution': 'assets/icons/cloudfront.svg',
      'aws_cloudfront_origin_access_identity': 'assets/icons/cloudfront.svg',
      'aws_cloudfront_cache_policy': 'assets/icons/cloudfront.svg',
      'aws_api_gateway_domain_name': 'assets/icons/apigateway.svg',
      'aws_api_gateway_base_path_mapping': 'assets/icons/apigateway.svg',
      
      // Application Integration
      'aws_api_gateway_rest_api': 'assets/icons/apigateway.svg',
      'aws_api_gateway_resource': 'assets/icons/apigateway.svg',
      'aws_api_gateway_method': 'assets/icons/apigateway.svg',
      'aws_api_gateway_integration': 'assets/icons/apigateway.svg',
      'aws_api_gateway_deployment': 'assets/icons/apigateway.svg',
      'aws_api_gateway_stage': 'assets/icons/apigateway.svg',
      'aws_api_gateway_v2_api': 'assets/icons/apigatewayv2.svg',
      'aws_api_gateway_v2_stage': 'assets/icons/apigatewayv2.svg',
      'aws_api_gateway_v2_route': 'assets/icons/apigatewayv2.svg',
      'aws_sns_topic': 'assets/icons/sns.svg',
      'aws_sns_topic_subscription': 'assets/icons/sns.svg',
      'aws_sqs_queue': 'assets/icons/sqs.svg',
      'aws_sqs_queue_policy': 'assets/icons/sqs.svg',
      'aws_eventbridge_rule': 'assets/icons/eventbridge.svg',
      'aws_eventbridge_target': 'assets/icons/eventbridge.svg',
      'aws_cloudwatch_event_rule': 'assets/icons/eventbridge.svg',
      'aws_cloudwatch_event_target': 'assets/icons/eventbridge.svg',
      'aws_step_functions_state_machine': 'assets/icons/stepfunctions.svg',
      'aws_mq_broker': 'assets/icons/mq.svg',
      'aws_mq_configuration': 'assets/icons/mq.svg',
      'aws_kinesis_stream': 'assets/icons/kinesis.svg',
      'aws_kinesis_firehose_delivery_stream': 'assets/icons/kinesisfirehose.svg',
      'aws_kinesis_analytics_application': 'assets/icons/kinesisanalytics.svg',
      'aws_appflow_flow': 'assets/icons/appflow.svg',
      
      // Machine Learning & Analytics
      'aws_sagemaker_endpoint': 'assets/icons/sagemaker.svg',
      'aws_sagemaker_model': 'assets/icons/sagemaker.svg',
      'aws_sagemaker_endpoint_configuration': 'assets/icons/sagemaker.svg',
      'aws_sagemaker_notebook_instance': 'assets/icons/sagemaker.svg',
      'aws_glue_job': 'assets/icons/glue.svg',
      'aws_glue_crawler': 'assets/icons/glue.svg',
      'aws_glue_catalog_database': 'assets/icons/glue.svg',
      'aws_glue_catalog_table': 'assets/icons/glue.svg',
      'aws_athena_workgroup': 'assets/icons/athena.svg',
      'aws_athena_database': 'assets/icons/athena.svg',
      'aws_emr_cluster': 'assets/icons/emr.svg',
      'aws_emr_instance_group': 'assets/icons/emr.svg',
      'aws_quicksight_data_set': 'assets/icons/quicksight.svg',
      'aws_quicksight_analysis': 'assets/icons/quicksight.svg',
      'aws_elasticsearch_domain': 'assets/icons/opensearch.svg',
      'aws_cloudtrail': 'assets/icons/cloudtrail.svg',
      'aws_config_configuration_recorder': 'assets/icons/config.svg',
      'aws_config_delivery_channel': 'assets/icons/config.svg',
      
      // Security, Identity & Compliance
      'aws_iam_role': 'assets/icons/iamrole.svg',
      'aws_iam_policy': 'assets/icons/iampolicy.svg',
      'aws_iam_user': 'assets/icons/iamuser.svg',
      'aws_iam_group': 'assets/icons/iamgroup.svg',
      'aws_iam_instance_profile': 'assets/icons/iamrole.svg',
      'aws_iam_role_policy_attachment': 'assets/icons/iamrole.svg',
      'aws_iam_user_policy_attachment': 'assets/icons/iamuser.svg',
      'aws_iam_group_policy_attachment': 'assets/icons/iamgroup.svg',
      'aws_acm_certificate': 'assets/icons/acm.svg',
      'aws_acm_certificate_validation': 'assets/icons/acm.svg',
      'aws_cognito_user_pool': 'assets/icons/cognito.svg',
      'aws_cognito_user_pool_client': 'assets/icons/cognito.svg',
      'aws_cognito_identity_pool': 'assets/icons/cognito.svg',
      'aws_kms_key': 'assets/icons/kms.svg',
      'aws_kms_alias': 'assets/icons/kms.svg',
      'aws_secretsmanager_secret': 'assets/icons/secretsmanager.svg',
      'aws_secretsmanager_secret_version': 'assets/icons/secretsmanager.svg',
      'aws_ssm_parameter': 'assets/icons/ssm.svg',
      'aws_ssm_document': 'assets/icons/ssm.svg',
      'aws_ssm_maintenance_window': 'assets/icons/ssm.svg',
      'aws_waf_web_acl': 'assets/icons/waf.svg',
      'aws_waf_rule': 'assets/icons/waf.svg',
      'aws_wafv2_web_acl': 'assets/icons/wafv2.svg',
      'aws_wafv2_rule_group': 'assets/icons/wafv2.svg',
      'aws_shield_protection': 'assets/icons/shield.svg',
      'aws_guardduty_detector': 'assets/icons/guardduty.svg',
      'aws_inspector_assessment_template': 'assets/icons/inspector.svg',
      'aws_macie2_classification_job': 'assets/icons/macie.svg',
      'aws_security_hub_account': 'assets/icons/securityhub.svg',
      
      // Management & Governance
      'aws_cloudwatch_metric_alarm': 'assets/icons/cloudwatch.svg',
      'aws_cloudwatch_log_group': 'assets/icons/cloudwatch.svg',
      'aws_cloudwatch_log_stream': 'assets/icons/cloudwatch.svg',
      'aws_cloudwatch_dashboard': 'assets/icons/cloudwatch.svg',
      'aws_cloudwatch_composite_alarm': 'assets/icons/cloudwatch.svg',
      'aws_cloudformation_stack': 'assets/icons/cloudformation.svg',
      'aws_cloudformation_stack_set': 'assets/icons/cloudformation.svg',
      'aws_organizations_account': 'assets/icons/organizations.svg',
      'aws_organizations_organizational_unit': 'assets/icons/organizations.svg',
      'aws_service_catalog_portfolio': 'assets/icons/servicecatalog.svg',
      'aws_service_catalog_product': 'assets/icons/servicecatalog.svg',
      'aws_budgets_budget': 'assets/icons/budgets.svg',
      'aws_cost_anomaly_detector': 'assets/icons/costexplorer.svg',
      'aws_config_rule': 'assets/icons/config.svg',
      'aws_config_remediation_configuration': 'assets/icons/config.svg',
      'aws_systems_manager_patch_baseline': 'assets/icons/ssm.svg',
      'aws_ssm_patch_group': 'assets/icons/ssm.svg',
      'aws_backup_selection': 'assets/icons/backup.svg',
      
      // Developer Tools
      'aws_codecommit_repository': 'assets/icons/codecommit.svg',
      'aws_codebuild_project': 'assets/icons/codebuild.svg',
      'aws_codepipeline': 'assets/icons/codepipeline.svg',
      'aws_codedeploy_app': 'assets/icons/codedeploy.svg',
      'aws_codedeploy_deployment_group': 'assets/icons/codedeploy.svg',
      'aws_codeartifact_repository': 'assets/icons/codeartifact.svg',
      'aws_codeartifact_domain': 'assets/icons/codeartifact.svg',
      'aws_cloud9_environment_ec2': 'assets/icons/cloud9.svg',
      'aws_xray_sampling_rule': 'assets/icons/xray.svg',
      
      // Migration & Transfer
      'aws_dms_replication_instance': 'assets/icons/dms.svg',
      'aws_dms_replication_task': 'assets/icons/dms.svg',
      'aws_dms_endpoint': 'assets/icons/dms.svg',
      'aws_datasync_task': 'assets/icons/datasync.svg',
      'aws_datasync_location_s3': 'assets/icons/datasync.svg',
      'aws_transfer_server': 'assets/icons/transfer.svg',
      'aws_transfer_user': 'assets/icons/transfer.svg',
      
      // Business Applications
      'aws_ses_domain_identity': 'assets/icons/ses.svg',
      'aws_ses_email_identity': 'assets/icons/ses.svg',
      'aws_ses_configuration_set': 'assets/icons/ses.svg',
      'aws_workspaces_workspace': 'assets/icons/workspaces.svg',
      'aws_workspaces_directory': 'assets/icons/workspaces.svg',
      'aws_connect_instance': 'assets/icons/connect.svg',
      'aws_chime_voice_connector': 'assets/icons/chime.svg',
      
      // Internet of Things (IoT)
      'aws_iot_thing': 'assets/icons/iot.svg',
      'aws_iot_thing_type': 'assets/icons/iot.svg',
      'aws_iot_policy': 'assets/icons/iot.svg',
      'aws_iot_certificate': 'assets/icons/iot.svg',
      'aws_iot_topic_rule': 'assets/icons/iot.svg',
      'aws_iot_analytics_channel': 'assets/icons/iotanalytics.svg',
      'aws_iot_analytics_pipeline': 'assets/icons/iotanalytics.svg',
      'aws_iot_analytics_datastore': 'assets/icons/iotanalytics.svg',
      
      // Game Development
      'aws_gamelift_fleet': 'assets/icons/gamelift.svg',
      'aws_gamelift_alias': 'assets/icons/gamelift.svg',
      'aws_gamelift_build': 'assets/icons/gamelift.svg',
      
      // Media Services
      'aws_media_store_container': 'assets/icons/mediastore.svg',
      'aws_media_convert_job_template': 'assets/icons/mediaconvert.svg',
      'aws_media_live_channel': 'assets/icons/medialive.svg',
      'aws_media_package_channel': 'assets/icons/mediapackage.svg',
      
      // Additional TLS/PKI Resources
      'tls_private_key': 'assets/icons/tls.svg',
      'tls_self_signed_cert': 'assets/icons/tls.svg',
      'tls_locally_signed_cert': 'assets/icons/tls.svg',
      'tls_cert_request': 'assets/icons/tls.svg',
      
      // Additional Resources
      'random_pet': 'assets/icons/terraform.svg',
      'random_string': 'assets/icons/terraform.svg',
      'random_id': 'assets/icons/terraform.svg',
      'null_resource': 'assets/icons/terraform.svg',
      'local_file': 'assets/icons/terraform.svg',
      'data': 'assets/icons/terraform.svg'
    };

    // UI state
    this.uiState = {
      showLabels: true,
      showDependencies: true,
      groupByApp: true,
      selectedApp: null,
      selectedNode: null,
      filter: '',
      viewMode: 'resources', // 'resources' | 'modules' | 'hybrid'
      enterpriseMode: false,
      selectedEnvironment: 'prod',
      dataSource: 'local' // 'local' | 'github'
    };

    this.initTheme();
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupGraph();
    this.loadData();
    this.setupGlobalEventListeners();
    
  }

  initTheme() {
    // Get saved theme preference or default to light
    const savedTheme = localStorage.getItem('overwatch-theme') || 'light';
    this.currentTheme = savedTheme;
    
    // Apply the theme
    this.applyTheme(savedTheme);
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);
    
    // Save preference
    localStorage.setItem('overwatch-theme', newTheme);
    this.currentTheme = newTheme;
  }

  applyTheme(theme) {
    const body = document.body;
    const themeIcon = document.getElementById('theme-toggle-icon');
    
    // Set theme data attribute
    body.setAttribute('data-theme', theme);
    
    // Update theme toggle icon
    if (themeIcon) {
      if (theme === 'dark') {
        themeIcon.className = 'fas fa-sun';
        document.getElementById('theme-toggle-btn').setAttribute('title', 'Switch to Light Theme');
      } else {
        themeIcon.className = 'fas fa-moon';
        document.getElementById('theme-toggle-btn').setAttribute('title', 'Switch to Dark Theme');
      }
    }
  }

  setupEventListeners() {
    // Theme toggle
    document.getElementById('theme-toggle-btn').addEventListener('click', () => {
      this.toggleTheme();
    });

    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', () => {
      this.loadData();
    });

    // View controls
    document.getElementById('show-labels').addEventListener('change', (e) => {
      this.uiState.showLabels = e.target.checked;
      this.updateGraphVisibility();
    });

    document.getElementById('show-dependencies').addEventListener('change', (e) => {
      this.uiState.showDependencies = e.target.checked;
      this.updateGraphVisibility();
    });

    document.getElementById('group-by-app').addEventListener('change', (e) => {
      this.uiState.groupByApp = e.target.checked;
      this.renderGraph();
    });

    // Filter
    document.getElementById('resource-filter').addEventListener('input', (e) => {
      this.uiState.filter = e.target.value.toLowerCase();
      this.applyFilters();
    });

    // Graph controls
    document.getElementById('zoom-in-btn').addEventListener('click', () => {
      this.svg.transition().call(this.zoom.scaleBy, 1.5);
    });

    document.getElementById('zoom-out-btn').addEventListener('click', () => {
      this.svg.transition().call(this.zoom.scaleBy, 1 / 1.5);
    });

    document.getElementById('reset-zoom-btn').addEventListener('click', () => {
      this.svg.transition().call(this.zoom.transform, d3.zoomIdentity);
    });

    document.getElementById('fullscreen-btn').addEventListener('click', () => {
      this.toggleFullscreen();
    });

    // Detail panel
    document.getElementById('detail-close').addEventListener('click', () => {
      this.closeDetailPanel();
    });

    // Export
    document.getElementById('export-btn').addEventListener('click', () => {
      this.exportGraph();
    });

    // View mode toggle
    document.getElementById('view-mode-toggle')?.addEventListener('change', (e) => {
      this.uiState.viewMode = e.target.value;
      this.renderGraph();
    });

    // Enterprise mode toggle  
    document.getElementById('enterprise-mode-toggle')?.addEventListener('change', (e) => {
      this.uiState.enterpriseMode = e.target.checked;
      this.loadData();
    });

    // Environment selector
    document.getElementById('environment-selector')?.addEventListener('change', (e) => {
      this.uiState.selectedEnvironment = e.target.value;
      if (this.uiState.enterpriseMode) {
        this.loadData();
      }
    });

    // GitHub integration controls
    document.getElementById('data-source-selector')?.addEventListener('change', (e) => {
      this.uiState.dataSource = e.target.value;
      const githubConfig = document.getElementById('github-config');
      if (e.target.value === 'github') {
        githubConfig.style.display = 'block';
        // Load GitHub connections when GitHub is selected
        this.loadGitHubConnections();
      } else {
        githubConfig.style.display = 'none';
        // Reload local data if switching back to local
        this.loadData();
      }
    });

    // GitHub connection-based loading
    document.getElementById('load-github-repo')?.addEventListener('click', () => {
      this.loadGitHubRepositoryFromConnection();
    });
    
    // Manual GitHub loading (legacy)
    document.getElementById('load-github-repo-manual')?.addEventListener('click', () => {
      this.loadGitHubRepository();
    });
    
    // Toggle manual GitHub entry
    document.getElementById('toggle-manual-github')?.addEventListener('click', () => {
      const manualConfig = document.getElementById('manual-github-config');
      const isVisible = manualConfig.style.display !== 'none';
      manualConfig.style.display = isVisible ? 'none' : 'block';
    });
    
    // GitHub connection dropdown change
    document.getElementById('github-connection')?.addEventListener('change', (e) => {
      this.onGitHubConnectionChange(e.target.value);
    });
    
    // Repository selection change
    document.getElementById('github-repo-select')?.addEventListener('change', (e) => {
      this.onGitHubRepositoryChange(e.target.value);
    });

    // Configuration History controls
    document.getElementById('view-all-history')?.addEventListener('click', () => {
      this.openHistoryModal();
    });

    document.getElementById('history-modal-close')?.addEventListener('click', () => {
      this.closeHistoryModal();
    });

    // Close modal when clicking outside
    document.getElementById('history-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'history-modal') {
        this.closeHistoryModal();
      }
    });
  }

  setupGlobalEventListeners() {
    // Temporarily disable to debug
    console.log('Setting up global event listeners');
    
    // Hide hover card when clicking anywhere outside the graph
    document.addEventListener('click', (event) => {
      // Don't hide if clicking on the hover card itself or within the graph area
      if (!event.target.closest('#hover-card') && !event.target.closest('#graph')) {
        this.hideHoverCard();
        // Reset hover state
        this.currentHoveredNode = null;
      }
    });

    // Hide hover card when scrolling
    document.addEventListener('scroll', () => {
      this.hideHoverCard();
    });

    // Hide hover card when pressing escape
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.hideHoverCard();
        this.closeDetailPanel();
      }
    });
  }

  setupGraph() {
    const container = document.getElementById('graph');
    const containerRect = container.getBoundingClientRect();

    this.svg = d3.select('#graph')
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${this.config.width} ${this.config.height}`);

    // Setup zoom
    this.zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        this.currentTransform = event.transform;
        this.svg.select('.background-group').attr('transform', event.transform);
        this.svg.select('.graph-group').attr('transform', event.transform);
        this.updateMinimap();
      });

    // Create separate layers to ensure proper z-ordering
    this.backgroundGroup = this.svg.append('g').attr('class', 'background-group');
    this.graphGroup = this.svg.append('g').attr('class', 'graph-group');
    
    // Add SVG-level mouse event listeners for node hover detection
    this.svg.on('mousemove', (event) => {
      // Get pointer coordinates relative to the transformed graph group
      const [x, y] = d3.pointer(event, this.graphGroup.node());
      
      // Temporary debug
      if (window.debugHover) {
        console.log('Mouse at graph coords:', { x, y });
        console.log('Available nodes:', this.filteredData?.nodes?.length || 0);
        if (this.filteredData?.nodes?.length > 0) {
          console.log('First node position:', this.filteredData.nodes[0]);
        }
        
        // Debug current transform
        const currentTransform = d3.zoomTransform(this.graphGroup.node());
        console.log('Current transform:', currentTransform);
      }
      
      const nodeElement = this.findNodeAtPosition(x, y);
      
      if (nodeElement) {
        const nodeData = d3.select(nodeElement).datum();
        if (nodeData && this.currentHoveredNode !== nodeData.id) {
          console.log('🎯 Hover detected on:', nodeData.name);
          this.currentHoveredNode = nodeData.id;
          this.onNodeMouseover(event, nodeData);
        }
      } else {
        if (this.currentHoveredNode) {
          this.currentHoveredNode = null;
          this.hideHoverCard();
          // Reset node opacity when mouse leaves
          if (this.nodeGroups) {
            this.nodeGroups.style('opacity', 1);
          }
        }
      }
    });
    
    this.svg.on('mouseleave', () => {
      if (this.currentHoveredNode) {
        this.currentHoveredNode = null;
        this.hideHoverCard();
        // Reset node opacity when leaving SVG area
        if (this.nodeGroups) {
          this.nodeGroups.style('opacity', 1);
        }
      }
    });
    
    // Add SVG click handler to prevent interference with hover state
    this.svg.on('click', (event) => {
      // Prevent the click from bubbling up to document and interfering with hover
      event.stopPropagation();
      
      // Check if we clicked on a node area using graph group coordinates
      const [x, y] = d3.pointer(event, this.graphGroup.node());
      const nodeElement = this.findNodeAtPosition(x, y);
      
      if (nodeElement) {
        const nodeData = d3.select(nodeElement).datum();
        if (nodeData) {
          console.log('Node clicked:', nodeData.name);
          this.onNodeClick(event, nodeData);
        }
      }
      // If no node clicked, just prevent document click handler but don't reset hover state
    });
    
    // Initialize hover tracking
    this.currentHoveredNode = null;
    
    // Add debug function
    window.debugHover = false;
    window.enableHoverDebug = () => {
      window.debugHover = true;
      console.log('🔍 Hover debugging enabled. Move mouse over graph.');
    };
    
    // Add zoom behavior to the main container, but with filter to avoid node interference
    this.svg.call(this.zoom.filter(event => {
      // Allow zoom on background areas, but not on nodes
      return !event.target.closest('.node-group');
    }));

    // Setup simulation
    this.simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id(d => d.id).distance(this.config.linkDistance))
      .force('charge', d3.forceManyBody().strength(this.config.chargeStrength))
      .force('center', d3.forceCenter(this.config.width / 2, this.config.height / 2))
      .force('collision', d3.forceCollide().radius(this.config.nodeRadius + 10));

    this.setupMinimap();
  }

  setupMinimap() {
    const minimap = d3.select('#minimap');
    const minimapSvg = minimap.append('svg')
      .attr('width', '100%')
      .attr('height', '100%');

    this.minimapGroup = minimapSvg.append('g');
    this.minimapViewport = d3.select('#minimap-viewport');
  }

  async loadGitHubRepository() {
    const owner = document.getElementById('github-owner').value.trim();
    const repo = document.getElementById('github-repo').value.trim();
    const branch = document.getElementById('github-branch-manual').value.trim() || 'main';
    
    if (!owner || !repo) {
      this.showToast('Please enter both owner and repository name', 'error');
      return;
    }
    
    this.showLoading();
    
    try {
      console.log(`Loading GitHub repository: ${owner}/${repo} (branch: ${branch})`);
      
      // Detect if running in Docker (port 5000) vs local development  
      const isDocker = window.location.port === '5000';
      // In Docker, use port 4001 which is the mapped port that works
      const backendUrl = isDocker ? 'http://localhost:4001' : 'http://localhost:4000';
      
      const response = await fetch(`${backendUrl}/api/parse-github`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ owner, repo, branch })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load repository');
      }
      
      const data = await response.json();
      
      if (data.message && data.apps.length === 0) {
        this.showToast(data.message, 'warning');
      } else {
        this.showToast(`Successfully loaded ${data.apps.length} applications from ${owner}/${repo}`, 'success');
      }
      
      // Process and visualize the data
      this.data = data;
      this.processData();
      this.renderGraph();
      this.updateViewInfo();
      this.populateAppList();
      this.populateResourceTypes();
      
      // Update telemetry with mock data if needed
      this.updateTelemetryDashboard();
      
    } catch (error) {
      console.error('Error loading GitHub repository:', error);
      this.showToast(`Failed to load repository: ${error.message}`, 'error');
    } finally {
      this.hideLoading();
    }
  }

  async loadGitHubConnections() {
    try {
      // Detect if running in Docker (port 5000) vs local development  
      const isDocker = window.location.port === '5000';
      // In Docker, use port 4001 which is the mapped port that works
      const backendUrl = isDocker ? 'http://localhost:4001' : 'http://localhost:4000';
      
      const response = await fetch(`${backendUrl}/api/github/connections`);
      if (!response.ok) {
        throw new Error('Failed to load GitHub connections');
      }
      
      const data = await response.json();
      const connectionSelect = document.getElementById('github-connection');
      
      // Clear existing options
      connectionSelect.innerHTML = '<option value="">Select a connection...</option>';
      
      // Add connections
      data.connections.forEach(connection => {
        const option = document.createElement('option');
        option.value = connection.id;
        option.textContent = `${connection.name} (${connection.owner})`;
        option.setAttribute('data-owner', connection.owner);
        option.setAttribute('data-type', connection.type);
        connectionSelect.appendChild(option);
      });
      
      console.log(`Loaded ${data.connections.length} GitHub connections`);
      
    } catch (error) {
      console.error('Error loading GitHub connections:', error);
      const connectionSelect = document.getElementById('github-connection');
      connectionSelect.innerHTML = '<option value="">Error loading connections</option>';
      this.showToast('Failed to load GitHub connections', 'error');
    }
  }

  async onGitHubConnectionChange(connectionId) {
    const repoRow = document.getElementById('github-repo-row');
    const repoSelect = document.getElementById('github-repo-select');
    const branchRow = document.getElementById('github-branch-row');
    const loadButton = document.getElementById('load-github-repo');
    
    if (!connectionId) {
      repoRow.style.display = 'none';
      branchRow.style.display = 'none';
      loadButton.style.display = 'none';
      return;
    }
    
    try {
      // Detect if running in Docker (port 5000) vs local development  
      const isDocker = window.location.port === '5000';
      // In Docker, use port 4001 which is the mapped port that works
      const backendUrl = isDocker ? 'http://localhost:4001' : 'http://localhost:4000';
      
      const response = await fetch(`${backendUrl}/api/github/connections/${connectionId}/repositories`);
      if (!response.ok) {
        throw new Error('Failed to load repositories');
      }
      
      const data = await response.json();
      
      // Clear and populate repository dropdown
      repoSelect.innerHTML = '<option value="">Select a repository...</option>';
      
      data.repositories.forEach(repo => {
        const option = document.createElement('option');
        option.value = repo.name;
        option.textContent = `${repo.name}${repo.description ? ' - ' + repo.description : ''}`;
        option.setAttribute('data-default-branch', repo.defaultBranch || 'main');
        repoSelect.appendChild(option);
      });
      
      // Show repository selection
      repoRow.style.display = 'block';
      
      console.log(`Loaded ${data.repositories.length} repositories for connection ${connectionId}`);
      
    } catch (error) {
      console.error('Error loading repositories:', error);
      this.showToast('Failed to load repositories for selected connection', 'error');
    }
  }

  onGitHubRepositoryChange(repositoryName) {
    const branchRow = document.getElementById('github-branch-row');
    const branchInput = document.getElementById('github-branch');
    const loadButton = document.getElementById('load-github-repo');
    
    if (!repositoryName) {
      branchRow.style.display = 'none';
      loadButton.style.display = 'none';
      return;
    }
    
    // Get default branch from selected option
    const repoSelect = document.getElementById('github-repo-select');
    const selectedOption = repoSelect.options[repoSelect.selectedIndex];
    const defaultBranch = selectedOption.getAttribute('data-default-branch') || 'main';
    
    // Set default branch
    branchInput.value = defaultBranch;
    
    // Show branch input and load button
    branchRow.style.display = 'block';
    loadButton.style.display = 'block';
  }

  async loadGitHubRepositoryFromConnection() {
    const connectionId = document.getElementById('github-connection').value;
    const repositoryName = document.getElementById('github-repo-select').value;
    const branch = document.getElementById('github-branch').value.trim() || 'main';
    
    if (!connectionId || !repositoryName) {
      this.showToast('Please select both connection and repository', 'error');
      return;
    }
    
    this.showLoading();
    
    try {
      console.log(`Loading GitHub repository via connection: ${connectionId}/${repositoryName} (branch: ${branch})`);
      
      // Detect if running in Docker (port 5000) vs local development  
      const isDocker = window.location.port === '5000';
      // In Docker, use port 4001 which is the mapped port that works
      const backendUrl = isDocker ? 'http://localhost:4001' : 'http://localhost:4000';
      
      const response = await fetch(`${backendUrl}/api/parse-github-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ connectionId, repositoryName, branch })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load repository');
      }
      
      const data = await response.json();
      
      if (data.message && data.apps.length === 0) {
        this.showToast(data.message, 'warning');
      } else {
        const connectionName = data.connection?.name || connectionId;
        this.showToast(`Successfully loaded ${data.apps.length} applications from ${connectionName}/${repositoryName}`, 'success');
      }
      
      // Process and visualize the data
      this.data = data;
      this.processData();
      this.renderGraph();
      this.updateViewInfo();
      this.populateAppList();
      this.populateResourceTypes();
      
      // Update telemetry with mock data if needed
      this.updateTelemetryDashboard();
      
    } catch (error) {
      console.error('Error loading GitHub repository from connection:', error);
      this.showToast(`Failed to load repository: ${error.message}`, 'error');
    } finally {
      this.hideLoading();
    }
  }

  async loadData() {
    this.showLoading();
    
    try {
      // Determine API endpoint based on enterprise mode
      const useEnterprise = this.uiState.enterpriseMode;
      const environment = this.uiState.selectedEnvironment;
      
      // Detect if running in Docker (port 5000) vs local development  
      const isDocker = window.location.port === '5000';
      // In Docker, use port 4001 which is the mapped port that works
      const backendUrl = isDocker ? 'http://localhost:4001' : 'http://localhost:4000';
      
      // For container environment (Docker), use file parsing to show all 20 resources
      // For local development, use database mode for telemetry features
      const useDatabase = !isDocker;
      
      const apiUrl = useEnterprise 
        ? `${backendUrl}/api/parse?useEnterprise=true&environment=${environment}&useDatabase=${useDatabase}`
        : `${backendUrl}/api/parse?useDatabase=${useDatabase}`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      this.data = await response.json();
      
      // Handle enterprise analysis response
      if (this.data.isEnterprise) {
        this.enterpriseMode = true;
        this.currentAnalysis = this.data.analysis;
        this.showToast(`Enterprise analysis complete - ${this.data.summary?.moduleCount || 0} modules analyzed`, 'success');
      } else {
        this.enterpriseMode = false;
        this.currentAnalysis = null;
        this.showToast('Infrastructure scan complete', 'success');
      }
      
      // Fetch telemetry data and enhance nodes with health information
      await this.fetchTelemetryData();
      
      this.processData();
      this.renderGraph();
      
      // Apply health status to rendered elements
      this.applyTelemetryToVisualization();
      
      this.populateAppList();
      this.populateResourceTypes();
      this.updateViewInfo();
      this.updateEnterpriseUI();
    } catch (error) {
      console.error('Error loading data:', error);
      this.showToast(`Infrastructure scan failed: ${error.message}`, 'error');
    } finally {
      this.hideLoading();
    }
  }

  processData() {
    if (!this.data || !this.data.resources) {
      this.filteredData = { nodes: [], links: [], apps: [], modules: [] };
      return;
    }

    if (this.enterpriseMode && this.currentAnalysis?.visualization) {
      // Process enterprise analysis data
      this.processEnterpriseData();
    } else {
      // Process legacy data
      this.processLegacyData();
    }
  }

  processLegacyData() {
    // Create nodes from resources
    const nodes = [];
    Object.entries(this.data.resources.resource || {}).forEach(([type, resources]) => {
      Object.entries(resources).forEach(([name, config]) => {
        const nodeId = `${type}.${name}`;
        const group = this.data.groups[nodeId];
        
        const appId = group?.appId || 'default';
        const appHealth = this.telemetryData?.[appId]?.health || 'unknown';
        
        nodes.push({
          id: nodeId,
          type: type,
          name: name,
          config: config,
          group: appId,
          appName: group?.appName || 'Default',
          repository: group?.repository,
          category: 'resource',
          appHealth: appHealth // Add health status to node
        });
      });
    });

    // Create links from dependencies
    const links = (this.data.dependencies || []).map(dep => ({
      source: dep.from,
      target: dep.to,
      id: `${dep.from}-${dep.to}`,
      type: dep.type || 'dependency',
      crossApplication: dep.crossApplication || false,
      metadata: dep.metadata || {}
    }));

    this.filteredData = {
      nodes,
      links,
      apps: this.data.apps || [],
      modules: []
    };
  }

  processEnterpriseData() {
    const visualization = this.currentAnalysis.visualization;
    const nodes = [];
    const links = [];
    const modules = [];

    // Process based on view mode
    if (this.uiState.viewMode === 'modules') {
      // Module-level view
      modules.push(...visualization.modules);
      nodes.push(...visualization.modules);
      
      // Add module-to-module links
      links.push(...visualization.links.map(link => ({
        source: link.source,
        target: link.target,
        id: link.id || `${link.source}-${link.target}`,
        type: link.type,
        metadata: link.metadata
      })));
    } else if (this.uiState.viewMode === 'resources') {
      // Resource-level view
      const resourceNodes = visualization.nodes.filter(n => n.category !== 'module');
      nodes.push(...resourceNodes);
      
      // Create resource-level dependencies (simplified)
      const resourceLinks = [];
      for (const link of visualization.links) {
        // Find resources in source and target modules
        const sourceResources = resourceNodes.filter(n => n.group === link.source.replace('module_', ''));
        const targetResources = resourceNodes.filter(n => n.group === link.target.replace('module_', ''));
        
        // Create cross-module resource links (simplified - connect first resource of each)
        if (sourceResources.length > 0 && targetResources.length > 0) {
          resourceLinks.push({
            source: sourceResources[0].id,
            target: targetResources[0].id,
            id: `${sourceResources[0].id}-${targetResources[0].id}`,
            type: link.type,
            metadata: link.metadata
          });
        }
      }
      links.push(...resourceLinks);
    } else {
      // Hybrid view - show both modules and resources
      nodes.push(...visualization.nodes);
      links.push(...visualization.links.map(link => ({
        source: link.source,
        target: link.target,
        id: link.id || `${link.source}-${link.target}`,
        type: link.type,
        metadata: link.metadata
      })));
    }

    this.filteredData = {
      nodes,
      links,
      apps: this.data.apps || [],
      modules: visualization.modules || [],
      analysis: this.currentAnalysis
    };
  }

  renderGraph() {
    if (!this.filteredData) return;
    
    console.log('Rendering graph with data:', {
      nodes: this.filteredData.nodes.length,
      links: this.filteredData.links.length,
      apps: this.filteredData.apps.length
    });

    this.backgroundGroup.selectAll('*').remove();
    this.graphGroup.selectAll('*').remove();

    // Apply grouping forces if enabled
    if (this.uiState.groupByApp) {
      this.setupAppGrouping();
    }

    // Render app groups in background layer (guaranteed to be behind nodes)
    if (this.uiState.groupByApp) {
      this.renderAppGroups();
    }

    // Render links
    this.renderLinks();

    // Render nodes LAST (so they're on top and can receive events)
    this.renderNodes();

    // Update simulation
    // Filter links to only include those with valid source and target nodes
    const validLinks = this.filteredData.links.filter(link => {
      const sourceExists = this.filteredData.nodes.some(node => node.id === link.source || (typeof link.source === 'object' && node.id === link.source.id));
      const targetExists = this.filteredData.nodes.some(node => node.id === link.target || (typeof link.target === 'object' && node.id === link.target.id));
      
      if (!sourceExists || !targetExists) {
        console.warn(`Filtered out invalid link: ${link.from || link.source} -> ${link.to || link.target} (source: ${sourceExists}, target: ${targetExists})`);
        return false;
      }
      return true;
    });

    this.simulation
      .nodes(this.filteredData.nodes)
      .on('tick', () => this.updatePositions());

    this.simulation.force('link')
      .links(validLinks);

    this.simulation.alpha(1).restart();

    // Stop simulation after elements settle to make them stable for testing
    setTimeout(() => {
      this.simulation.stop();
      console.log('Simulation stopped - elements are now stable for interaction');
    }, 3000);

    this.updateMinimap();
  }

  setupAppGrouping() {
    const apps = [...new Set(this.filteredData.nodes.map(n => n.group))];
    const appCenters = {};
    
    // Count nodes per app to determine appropriate spacing
    const appNodeCounts = {};
    apps.forEach(appId => {
      appNodeCounts[appId] = this.filteredData.nodes.filter(n => n.group === appId).length;
    });
    
    // Calculate dynamic radius based on app size
    const baseRadius = 200;
    const maxNodes = Math.max(...Object.values(appNodeCounts));
    const radiusScale = d3.scaleLinear()
      .domain([1, maxNodes])
      .range([baseRadius, baseRadius * 2]);
    
    // Position apps with varying separation based on their size
    apps.forEach((appId, i) => {
      const angle = (i * 2 * Math.PI) / apps.length;
      const appRadius = radiusScale(appNodeCounts[appId]);
      const separation = Math.max(400, appRadius + 100); // Dynamic separation
      
      appCenters[appId] = {
        x: this.config.width / 2 + Math.cos(angle) * separation,
        y: this.config.height / 2 + Math.sin(angle) * separation,
        radius: appRadius,
        nodeCount: appNodeCounts[appId]
      };
    });

    // Store app centers for use in other methods
    this.appCenters = appCenters;

    this.simulation
      .force('x', d3.forceX(d => appCenters[d.group]?.x || this.config.width / 2).strength(0.4))
      .force('y', d3.forceY(d => appCenters[d.group]?.y || this.config.height / 2).strength(0.4))
      .force('collision', d3.forceCollide().radius(d => {
        const appCenter = appCenters[d.group];
        return appCenter ? Math.max(this.config.nodeRadius + 5, appCenter.radius / appCenter.nodeCount * 2) : this.config.nodeRadius + 10;
      }));
  }

  renderAppGroups() {
    const apps = d3.group(this.filteredData.nodes, d => d.group);
    console.log('Rendering app groups in background layer:', apps.size);
    
    // Create gradient definitions for softer container styling
    this.createAppGroupGradients(apps);
    
    // Render app groups in the background layer (guaranteed to be behind nodes)
    this.appGroups = this.backgroundGroup.selectAll('.app-group')
      .data(Array.from(apps.entries()), d => d[0])
      .join('g')
      .attr('class', 'app-group');

    // Add rectangles for app groups with softer styling
    this.appRects = this.appGroups.append('rect')
      .attr('class', 'app-group-rect')
      .attr('fill', (d, i) => `url(#app-gradient-${i})`) // Gradient fill instead of none
      .attr('fill-opacity', 0.08) // Very subtle background fill
      .attr('rx', 20) // More rounded corners for softer look
      .attr('stroke', (d, i) => this.getAppColor(i))
      .attr('stroke-width', 2) // Softer stroke width
      .attr('stroke-opacity', 0.7) // Softer stroke opacity
      .attr('stroke-dasharray', 'none') // Solid stroke for cleaner look
      .style('pointer-events', 'none'); // Keep non-interactive

    // Add labels for app groups
    this.appLabels = this.appGroups.append('text')
      .attr('class', 'app-group-label')
      .attr('fill', '#333')
      .attr('font-weight', 'bold')
      .attr('font-size', '14px')
      .attr('text-anchor', 'middle')
      .text(d => d[1][0]?.appName || d[0]);
      
    console.log('App groups rendered in background layer - should not interfere with node events');
  }

  createAppGroupGradients(apps) {
    // Create or update gradient definitions
    let defs = this.svg.select('defs');
    if (defs.empty()) {
      defs = this.svg.append('defs');
    }

    // Create gradient for each app group
    Array.from(apps.entries()).forEach((_, i) => {
      const gradientId = `app-gradient-${i}`;
      const color = this.getAppColor(i);
      
      // Remove existing gradient if it exists
      defs.select(`#${gradientId}`).remove();
      
      // Create radial gradient for softer appearance
      const gradient = defs.append('radialGradient')
        .attr('id', gradientId)
        .attr('cx', '50%')
        .attr('cy', '30%')
        .attr('r', '70%');
      
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', color)
        .attr('stop-opacity', 0.15);
        
      gradient.append('stop')
        .attr('offset', '60%')
        .attr('stop-color', color)
        .attr('stop-opacity', 0.05);
        
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', color)
        .attr('stop-opacity', 0.02);
    });
  }

  getAppColor(index) {
    // Enhanced color palette with softer, more distinguishable colors
    const softColors = [
      '#4A90E2', // Soft blue
      '#7ED321', // Fresh green  
      '#F5A623', // Warm orange
      '#BD10E0', // Rich purple
      '#B8E986', // Light green
      '#50E3C2', // Aqua
      '#E94B3C', // Coral red
      '#9013FE', // Violet
      '#FF6B6B', // Pink red
      '#4ECDC4'  // Teal
    ];
    return softColors[index % softColors.length];
  }

  createArrowMarkers() {
    // Create or get defs element
    let defs = this.svg.select('defs');
    if (defs.empty()) {
      defs = this.svg.append('defs');
    }

    // Create arrow marker for standard links
    if (defs.select('#arrow-standard').empty()) {
      const standardArrow = defs.append('marker')
        .attr('id', 'arrow-standard')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 8) // Position arrow closer to target node
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .attr('markerUnits', 'strokeWidth');

      standardArrow.append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#666')
        .attr('fill-opacity', 0.8);
    }

    // Create arrow marker for cross-application links  
    if (defs.select('#arrow-cross-app').empty()) {
      const crossAppArrow = defs.append('marker')
        .attr('id', 'arrow-cross-app')
        .attr('viewBox', '0 -6 12 12')
        .attr('refX', 10) // Position arrow closer to target node
        .attr('refY', 0)
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('orient', 'auto')
        .attr('markerUnits', 'strokeWidth');

      crossAppArrow.append('path')
        .attr('d', 'M0,-6L12,0L0,6L3,0Z') // Larger, more prominent arrow
        .attr('fill', '#E94B3C')
        .attr('fill-opacity', 0.9)
        .attr('stroke', '#E94B3C')
        .attr('stroke-width', 0.5);
    }
  }

  renderLinks() {
    // Filter to only valid links (with existing source and target nodes)
    const validLinks = this.filteredData.links.filter(link => {
      const sourceExists = this.filteredData.nodes.some(node => 
        node.id === link.source || 
        (typeof link.source === 'object' && node.id === link.source.id) ||
        node.id === link.from
      );
      const targetExists = this.filteredData.nodes.some(node => 
        node.id === link.target || 
        (typeof link.target === 'object' && node.id === link.target.id) ||
        node.id === link.to
      );
      return sourceExists && targetExists;
    });

    // Create arrow markers for directional indicators
    this.createArrowMarkers();

    this.links = this.graphGroup.selectAll('.link')
      .data(validLinks, d => d.id)
      .join('line')
      .attr('class', d => `link ${d.crossApplication ? 'cross-app-link' : 'standard-link'}`)
      .attr('stroke', d => this.getLinkColor(d))
      .attr('stroke-width', d => d.crossApplication ? 6 : 4) // Increased for better visibility and hover interaction
      .attr('stroke-opacity', d => d.crossApplication ? 0.9 : 0.8) // Increased from 0.8:0.6 for better visibility
      .attr('stroke-dasharray', d => d.crossApplication ? '10,5' : 'none') // Longer dashes for cross-app links
      .attr('marker-end', d => d.crossApplication ? 'url(#arrow-cross-app)' : 'url(#arrow-standard)') // Add directional arrows
      .on('mouseover', (event, d) => this.onLinkMouseover(event, d))
      .on('mouseout', (event, d) => this.onLinkMouseout(event, d));

    // Add link labels for cross-application dependencies
    this.linkLabels = this.graphGroup.selectAll('.link-label')
      .data(validLinks.filter(d => d.crossApplication), d => d.id)
      .join('text')
      .attr('class', 'link-label')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .attr('text-anchor', 'middle')
      .style('pointer-events', 'none') // Prevent labels from blocking link hover
      .text(d => this.getLinkLabel(d));
  }

  renderNodes() {
    console.log('Rendering nodes:', this.filteredData.nodes.length);
    
    this.nodeGroups = this.graphGroup.selectAll('.node-group')
      .data(this.filteredData.nodes, d => d.id)
      .join('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .call(this.drag())
      .on('click', (event, d) => {
        console.log('Node clicked:', d);
        this.onNodeClick(event, d);
      })
      .on('mouseover', (event, d) => {
        console.log('Node mouseover:', d);
        this.onNodeMouseover(event, d);
      })
      .on('mouseout', (event, d) => {
        console.log('Node mouseout:', d);
        this.onNodeMouseout(event, d);
      });

    // Add circles for nodes without icons
    this.nodeGroups
      .filter(d => !this.awsIconMap[d.type])
      .append('circle')
      .attr('class', 'node-circle')
      .attr('r', this.config.nodeRadius)
      .attr('fill', d => this.config.colors(d.group));

    // Add images for nodes with icons
    this.nodeGroups
      .filter(d => this.awsIconMap[d.type])
      .append('image')
      .attr('class', 'node-image')
      .attr('href', d => this.awsIconMap[d.type])
      .attr('width', this.config.nodeRadius * 2)
      .attr('height', this.config.nodeRadius * 2)
      .attr('x', -this.config.nodeRadius)
      .attr('y', -this.config.nodeRadius)
      .on('error', function(event, d) {
        // Fallback to circle if image fails to load
        d3.select(this.parentNode)
          .append('circle')
          .attr('class', 'node-circle fallback')
          .attr('r', 20)
          .attr('fill', '#6c757d');
        d3.select(this).remove();
      });

    // Add health status indicators (rings around nodes)
    this.addHealthStatusIndicators();

    // Add labels
    this.nodeLabels = this.nodeGroups.append('text')
      .attr('class', 'node-label')
      .attr('x', this.config.nodeRadius + 8)
      .attr('y', 4)
      .text(d => d.name)
      .style('display', this.uiState.showLabels ? 'block' : 'none');

    // Add tooltips
    this.nodeGroups.append('title')
      .text(d => this.getNodeTooltip(d));
  }

  getNodeTooltip(node) {
    if (node.category === 'module' || node.type === 'module') {
      const resourceCount = node.metadata?.resourceCount || 0;
      const outputCount = node.metadata?.outputCount || 0;
      return `Module: ${node.name}\nType: ${node.moduleType}\nResources: ${resourceCount}\nOutputs: ${outputCount}`;
    } else {
      return `${node.type || node.resourceType}\n${node.name}`;
    }
  }

  // Add health status indicators around nodes
  addHealthStatusIndicators() {
    // Add health status rings for nodes that have app-level health data
    this.nodeGroups
      .filter(d => d.appHealth) // Only nodes with health data
      .append('circle')
      .attr('class', 'health-status-ring')
      .attr('r', this.config.nodeRadius + 4)
      .attr('fill', 'none')
      .attr('stroke', d => this.getHealthColor(d.appHealth))
      .attr('stroke-width', 3)
      .attr('stroke-opacity', 0.8);

    // Add pulsing animation for critical health status
    this.nodeGroups
      .filter(d => d.appHealth === 'critical')
      .select('.health-status-ring')
      .style('animation', 'pulse-critical 2s infinite');
  }

  // Get color based on health status
  getHealthColor(healthStatus) {
    const healthColors = {
      'healthy': '#28a745',    // Green
      'warning': '#ffc107',    // Yellow/Orange  
      'critical': '#dc3545',   // Red
      'unknown': '#6c757d'     // Gray
    };
    return healthColors[healthStatus] || healthColors['unknown'];
  }

  // Fetch telemetry data for applications
  async fetchTelemetryData() {
    try {
      console.log('Fetching telemetry data...');
      
      // Detect if we're using database mode or file parsing mode
      const isDocker = window.location.port === '5000';
      const useDatabase = !isDocker;
      
      if (useDatabase) {
        // DATABASE MODE: Fetch real telemetry data
        console.log('Using database mode for telemetry');
        const response = await fetch('/api/parse?useDatabase=true');
        const data = await response.json();
        
        if (data.apps && data.apps.length > 0) {
          const appPromises = data.apps.map(async (app) => {
            try {
              const telemetryResponse = await fetch(`http://localhost:5001/external/api/applications`, {
                headers: { 'x-api-key': 'internal-automation-789' }
              });
              const telemetryData = await telemetryResponse.json();
              const appData = telemetryData.applications?.find(a => a.applicationId === app.id);
              return {
                appId: app.id,
                appName: app.name,
                health: appData?.telemetry?.healthStatus?.overall || 'unknown',
                environmentHealth: appData?.telemetry?.healthStatus?.environments || {}
              };
            } catch (error) {
              console.error(`Error fetching telemetry for ${app.id}:`, error);
              return { appId: app.id, appName: app.name, health: 'unknown', environmentHealth: {} };
            }
          });

          const telemetryResults = await Promise.all(appPromises);
          this.telemetryData = {};
          telemetryResults.forEach(result => {
            this.telemetryData[result.appId] = result;
          });
        }
      } else {
        // FILE PARSING MODE: Generate mock telemetry data based on current visualization data
        console.log('Using file parsing mode - generating mock telemetry data');
        this.telemetryData = this.generateMockTelemetryData();
      }

      console.log('Telemetry data loaded:', this.telemetryData);
      return this.telemetryData;
    } catch (error) {
      console.error('Error fetching telemetry data:', error);
      this.telemetryData = {};
      return {};
    }
  }

  // Generate realistic mock telemetry data for file parsing mode
  generateMockTelemetryData() {
    if (!this.data || !this.data.apps) {
      return {};
    }

    const healthStates = ['healthy', 'healthy', 'healthy', 'warning', 'critical']; // Weighted towards healthy
    const mockData = {};

    this.data.apps.forEach(app => {
      // Generate random but consistent health status
      const appHealthIndex = this.hashString(app.id) % healthStates.length;
      const appHealth = healthStates[appHealthIndex];
      
      mockData[app.id] = {
        appId: app.id,
        appName: app.name,
        health: appHealth,
        environmentHealth: {
          production: appHealth,
          staging: this.getRandomHealth(),
          development: 'healthy'
        },
        // Add mock performance metrics
        metrics: {
          responseTime: this.generateMockLatency(appHealth),
          throughput: this.generateMockThroughput(appHealth),
          errorRate: this.generateMockErrorRate(appHealth)
        },
        // Add mock connection health for cross-app dependencies
        connectionHealth: this.generateMockConnectionHealth(app.id),
        mockData: true // Flag to indicate this is mock data
      };
    });

    return mockData;
  }

  // Generate mock latency based on health status
  generateMockLatency(health) {
    const baseLatency = {
      'healthy': 45,    // 45ms base
      'warning': 120,   // 120ms base  
      'critical': 300,  // 300ms base
      'unknown': 100    // 100ms base
    };
    
    const base = baseLatency[health] || 100;
    const variance = base * 0.3; // 30% variance
    return Math.round(base + (Math.random() - 0.5) * variance);
  }

  // Generate mock throughput based on health status
  generateMockThroughput(health) {
    const baseThroughput = {
      'healthy': 850,   // req/min
      'warning': 400,   // req/min
      'critical': 120,  // req/min
      'unknown': 500    // req/min
    };
    
    const base = baseThroughput[health] || 500;
    const variance = base * 0.2; // 20% variance
    return Math.round(base + (Math.random() - 0.5) * variance);
  }

  // Generate mock error rate based on health status
  generateMockErrorRate(health) {
    const baseErrorRate = {
      'healthy': 0.1,   // 0.1%
      'warning': 2.5,   // 2.5%
      'critical': 8.2,  // 8.2%
      'unknown': 1.0    // 1.0%
    };
    
    const base = baseErrorRate[health] || 1.0;
    const variance = base * 0.4; // 40% variance
    return Math.round((base + (Math.random() - 0.5) * variance) * 10) / 10;
  }

  // Generate mock connection health for dependencies
  generateMockConnectionHealth(appId) {
    // Generate consistent but varied connection health
    const hash = this.hashString(appId + 'connections');
    const connectionStates = ['healthy', 'healthy', 'warning', 'critical'];
    const healthIndex = hash % connectionStates.length;
    
    return {
      overall: connectionStates[healthIndex],
      latency: this.generateMockLatency(connectionStates[healthIndex]),
      packetLoss: Math.round((Math.random() * 2) * 10) / 10, // 0-2%
      jitter: Math.round((Math.random() * 15) * 10) / 10 // 0-15ms
    };
  }

  // Simple hash function for consistent random values
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Get random health status
  getRandomHealth() {
    const states = ['healthy', 'healthy', 'warning', 'critical'];
    return states[Math.floor(Math.random() * states.length)];
  }

  // Add connection health indicators to dependency lines
  enhanceLinksWithHealth() {
    if (!this.links || !this.telemetryData) return;

    // Update link styles based on connection health
    this.links
      .attr('stroke', d => this.getConnectionHealthColor(d))
      .attr('stroke-width', d => this.getConnectionStrokeWidth(d))
      .attr('stroke-opacity', d => this.getConnectionOpacity(d))
      .attr('stroke-dasharray', d => this.getConnectionDashPattern(d));
  }

  // Get connection health color based on source and target app health
  getConnectionHealthColor(link) {
    // Get app IDs for source and target
    const sourceAppId = this.getNodeAppId(link.source);
    const targetAppId = this.getNodeAppId(link.target);
    
    if (link.crossApplication) {
      // Cross-application connections - show based on worst health
      const sourceHealth = this.telemetryData[sourceAppId]?.health || 'unknown';
      const targetHealth = this.telemetryData[targetAppId]?.health || 'unknown';
      const worstHealth = this.getWorstHealth(sourceHealth, targetHealth);
      
      // Cross-app connections get special styling
      const baseColor = this.getHealthColor(worstHealth);
      return baseColor;
    } else {
      // Intra-application connections
      const appHealth = this.telemetryData[sourceAppId]?.health || 'unknown';
      return this.getHealthColor(appHealth);
    }
  }

  // Get connection stroke width based on importance and health
  getConnectionStrokeWidth(link) {
    if (link.crossApplication) {
      return 6; // Thicker for cross-app connections
    }
    return 4; // Standard width for intra-app connections
  }

  // Get connection opacity based on health status
  getConnectionOpacity(link) {
    const sourceAppId = this.getNodeAppId(link.source);
    const targetAppId = this.getNodeAppId(link.target);
    
    if (link.crossApplication) {
      const sourceHealth = this.telemetryData[sourceAppId]?.health || 'unknown';
      const targetHealth = this.telemetryData[targetAppId]?.health || 'unknown';
      
      // Lower opacity for unhealthy connections
      if (sourceHealth === 'critical' || targetHealth === 'critical') {
        return 0.9;
      } else if (sourceHealth === 'warning' || targetHealth === 'warning') {
        return 0.8;
      }
      return 0.7;
    }
    
    const appHealth = this.telemetryData[sourceAppId]?.health || 'unknown';
    return appHealth === 'critical' ? 0.9 : 0.6;
  }

  // Get dash pattern for unhealthy connections
  getConnectionDashPattern(link) {
    const sourceAppId = this.getNodeAppId(link.source);
    const targetAppId = this.getNodeAppId(link.target);
    
    if (link.crossApplication) {
      const sourceHealth = this.telemetryData[sourceAppId]?.health || 'unknown';
      const targetHealth = this.telemetryData[targetAppId]?.health || 'unknown';
      
      // Dashed lines for critical connections
      if (sourceHealth === 'critical' || targetHealth === 'critical') {
        return '8,4';
      }
    }
    
    return 'none'; // Solid lines by default
  }

  // Helper: Get app ID from node
  getNodeAppId(node) {
    if (typeof node === 'object') {
      return node.group || node.appId;
    }
    // If node is still a string ID, find the actual node
    const actualNode = this.filteredData.nodes.find(n => n.id === node);
    return actualNode?.group || actualNode?.appId;
  }

  // Helper: Determine worst health status between two
  getWorstHealth(health1, health2) {
    const healthPriority = { 'critical': 0, 'warning': 1, 'healthy': 2, 'unknown': 3 };
    const priority1 = healthPriority[health1] || 3;
    const priority2 = healthPriority[health2] || 3;
    
    const priorities = Object.entries(healthPriority);
    const worstPriority = Math.min(priority1, priority2);
    return priorities.find(([health, priority]) => priority === worstPriority)[0];
  }

  // Apply telemetry data to the rendered visualization
  applyTelemetryToVisualization() {
    // Update link colors with health information
    if (this.links) {
      this.links.attr('stroke', d => this.getLinkColor(d));
    }
    
    // Update node tooltips to include health information
    this.updateNodeTooltipsWithHealth();
    
    // Add telemetry dashboard if it doesn't exist
    this.createTelemetryDashboard();
  }

  // Update node tooltips to include health and telemetry information
  updateNodeTooltipsWithHealth() {
    if (!this.nodeGroups) return;

    this.nodeGroups.select('title')
      .text(d => {
        const baseTooltip = this.getNodeTooltip(d);
        const appHealth = this.telemetryData?.[d.group];
        
        if (appHealth) {
          const healthInfo = `\n\nHealth Status: ${appHealth.health.toUpperCase()}`;
          const environmentHealth = Object.entries(appHealth.environmentHealth)
            .map(([env, status]) => `${env}: ${status}`)
            .join(', ');
          
          return baseTooltip + healthInfo + 
            (environmentHealth ? `\nEnvironments: ${environmentHealth}` : '');
        }
        
        return baseTooltip;
      });
  }

  // Create a telemetry dashboard panel
  createTelemetryDashboard() {
    // Check if telemetry dashboard already exists
    if (document.getElementById('telemetry-dashboard')) return;

    const dashboard = document.createElement('div');
    dashboard.id = 'telemetry-dashboard';
    dashboard.className = 'telemetry-dashboard';
    // Check if using mock data
    const isUsingMockData = this.telemetryData && Object.values(this.telemetryData).some(app => app.mockData);
    const titleSuffix = isUsingMockData ? ' (Demo)' : '';
    
    dashboard.innerHTML = `
      <div class="telemetry-header">
        <h3>System Health${titleSuffix}</h3>
        <button id="telemetry-toggle" class="btn-toggle" title="Hide System Health">✕</button>
      </div>
      <div class="telemetry-content">
        <div id="telemetry-summary"></div>
        <div class="telemetry-legend">
          <div class="legend-item">
            <span class="health-indicator healthy"></span> Healthy
          </div>
          <div class="legend-item">
            <span class="health-indicator warning"></span> Warning
          </div>
          <div class="legend-item">
            <span class="health-indicator critical"></span> Critical
          </div>
          <div class="legend-item">
            <span class="health-indicator unknown"></span> Unknown
          </div>
        </div>
      </div>
    `;

    // Add dashboard to page
    document.body.appendChild(dashboard);

    // Add toggle functionality with improved UX
    const toggleBtn = document.getElementById('telemetry-toggle');
    toggleBtn.addEventListener('click', () => {
      const isCollapsed = dashboard.classList.contains('collapsed');
      dashboard.classList.toggle('collapsed');
      // Update button text for better UX
      toggleBtn.textContent = isCollapsed ? '📊' : '✕';
      toggleBtn.title = isCollapsed ? 'Show System Health' : 'Hide System Health';
    });

    // Populate dashboard with current health data
    this.updateTelemetryDashboard();
  }

  // Update the telemetry dashboard with current data
  updateTelemetryDashboard() {
    const summaryDiv = document.getElementById('telemetry-summary');
    if (!summaryDiv || !this.telemetryData) return;

    const apps = Object.values(this.telemetryData);
    const healthCounts = {
      healthy: apps.filter(app => app.health === 'healthy').length,
      warning: apps.filter(app => app.health === 'warning').length,
      critical: apps.filter(app => app.health === 'critical').length,
      unknown: apps.filter(app => app.health === 'unknown').length
    };

    summaryDiv.innerHTML = `
      <div class="health-summary">
        <div class="health-stat">
          <span class="health-count">${apps.length}</span>
          <span class="health-label">Total Apps</span>
        </div>
        <div class="health-stat critical">
          <span class="health-count">${healthCounts.critical}</span>
          <span class="health-label">Critical</span>
        </div>
        <div class="health-stat warning">
          <span class="health-count">${healthCounts.warning}</span>
          <span class="health-label">Warning</span>
        </div>
        <div class="health-stat healthy">
          <span class="health-count">${healthCounts.healthy}</span>
          <span class="health-label">Healthy</span>
        </div>
      </div>
      <div class="app-health-list">
        ${apps.map(app => `
          <div class="app-health-item">
            <span class="health-indicator ${app.health}"></span>
            <span class="app-name">${app.appName}</span>
            <span class="health-status">${app.health}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  updatePositions() {
    if (this.links) {
      this.links
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
    }

    if (this.linkLabels) {
      this.linkLabels
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);
    }

    if (this.nodeGroups) {
      this.nodeGroups
        .attr('transform', d => `translate(${d.x},${d.y})`);
    }

    if (this.uiState.groupByApp && this.appRects) {
      this.updateAppGroupBounds();
    }
  }

  updateAppGroupBounds() {
    const self = this;
    this.appGroups.each(function([appId, nodes]) {
      const nodeCount = nodes.length;
      
      // Dynamic padding based on app size
      const basePadding = 40;
      const dynamicPadding = Math.max(basePadding, basePadding + (nodeCount * 3));
      
      // Calculate bounds with dynamic padding
      const bounds = {
        minX: d3.min(nodes, d => d.x) - dynamicPadding,
        maxX: d3.max(nodes, d => d.x) + dynamicPadding,
        minY: d3.min(nodes, d => d.y) - (dynamicPadding + 20), // Extra space for label
        maxY: d3.max(nodes, d => d.y) + dynamicPadding
      };

      // Ensure minimum size for readability
      const minWidth = 200;
      const minHeight = 150;
      const currentWidth = bounds.maxX - bounds.minX;
      const currentHeight = bounds.maxY - bounds.minY;
      
      if (currentWidth < minWidth) {
        const expand = (minWidth - currentWidth) / 2;
        bounds.minX -= expand;
        bounds.maxX += expand;
      }
      
      if (currentHeight < minHeight) {
        const expand = (minHeight - currentHeight) / 2;
        bounds.minY -= expand;
        bounds.maxY += expand;
      }

      const rect = d3.select(this).select('.app-group-rect')
        .attr('x', bounds.minX)
        .attr('y', bounds.minY)
        .attr('width', bounds.maxX - bounds.minX)
        .attr('height', bounds.maxY - bounds.minY);

      const label = d3.select(this).select('.app-group-label')
        .attr('x', (bounds.minX + bounds.maxX) / 2)
        .attr('y', bounds.minY + 18)
        .style('font-size', nodeCount > 10 ? '14px' : '12px')
        .style('font-weight', 'bold');
        
      // Add node count indicator
      let countLabel = d3.select(this).select('.app-node-count');
      if (countLabel.empty()) {
        countLabel = d3.select(this).append('text')
          .attr('class', 'app-node-count')
          .style('font-size', '10px')
          .style('fill', '#666')
          .style('text-anchor', 'middle')
          .style('pointer-events', 'none');
      }
      
      countLabel
        .attr('x', (bounds.minX + bounds.maxX) / 2)
        .attr('y', bounds.minY + 35)
        .text(`${nodeCount} resource${nodeCount !== 1 ? 's' : ''}`);
    });
  }

  updateGraphVisibility() {
    if (this.nodeLabels) {
      this.nodeLabels.style('display', this.uiState.showLabels ? 'block' : 'none');
    }
    
    if (this.links) {
      this.links.style('display', this.uiState.showDependencies ? 'block' : 'none');
    }

    if (this.linkLabels) {
      this.linkLabels.style('display', this.uiState.showDependencies && this.uiState.showLabels ? 'block' : 'none');
    }
  }

  applyFilters() {
    // Filter implementation
    this.processData();
    
    if (this.uiState.filter) {
      this.filteredData.nodes = this.filteredData.nodes.filter(node =>
        node.name.toLowerCase().includes(this.uiState.filter) ||
        node.type.toLowerCase().includes(this.uiState.filter)
      );
    }

    this.renderGraph();
    this.updateViewInfo();
  }

  populateAppList() {
    const appList = document.getElementById('app-list');
    
    if (!this.filteredData.apps.length) {
      appList.innerHTML = `
        <div class="app-item">
          <div class="app-icon">
            <i class="fas fa-cube"></i>
          </div>
          <div class="app-info">
            <div class="app-name">Local Demo</div>
            <div class="app-meta">2 resources</div>
          </div>
        </div>
      `;
      return;
    }

    const appHtml = this.filteredData.apps.map(app => `
      <div class="app-item" data-app-id="${app.id}">
        <div class="app-icon">
          <i class="fab fa-aws"></i>
        </div>
        <div class="app-info">
          <div class="app-name">${app.name}</div>
          <div class="app-meta">${app.repository ? `${app.repository.repo}` : 'Local'}</div>
        </div>
      </div>
    `).join('');

    appList.innerHTML = appHtml;

    // Add click handlers
    appList.querySelectorAll('.app-item').forEach(item => {
      item.addEventListener('click', () => {
        const appId = item.dataset.appId;
        this.selectApp(appId);
      });
    });
  }

  populateResourceTypes() {
    const resourceTypes = {};
    
    this.filteredData.nodes.forEach(node => {
      const type = node.type.replace('aws_', '').replace(/_/g, ' ');
      resourceTypes[type] = (resourceTypes[type] || 0) + 1;
    });

    const container = document.getElementById('resource-types');
    const typesHtml = Object.entries(resourceTypes).map(([type, count]) => `
      <div class="resource-type-filter" data-type="${type}">
        <span>${type}</span>
        <span class="resource-type-count">${count}</span>
      </div>
    `).join('');

    container.innerHTML = typesHtml;
  }

  updateViewInfo() {
    document.getElementById('resource-count').textContent = 
      `${this.filteredData.nodes.length} resource${this.filteredData.nodes.length !== 1 ? 's' : ''}`;
    
    document.getElementById('app-count').textContent = 
      `${this.filteredData.apps.length} application${this.filteredData.apps.length !== 1 ? 's' : ''}`;

    // Update cross-application statistics
    const crossAppLinks = this.filteredData.links.filter(link => link.crossApplication);
    if (crossAppLinks.length > 0) {
      const statsElement = document.getElementById('cross-app-stats');
      if (statsElement) {
        const apiIntegrations = crossAppLinks.filter(link => link.type === 'api_integration').length;
        const messagingIntegrations = crossAppLinks.filter(link => link.type === 'messaging_integration').length;
        const dataIntegrations = crossAppLinks.filter(link => link.type === 'data_integration').length;
        
        statsElement.innerHTML = `
          <div class="cross-app-summary">
            <strong>Cross-Application Integrations: ${crossAppLinks.length}</strong>
            ${apiIntegrations > 0 ? `<div>📡 API Integrations: ${apiIntegrations}</div>` : ''}
            ${messagingIntegrations > 0 ? `<div>💬 Messaging: ${messagingIntegrations}</div>` : ''}
            ${dataIntegrations > 0 ? `<div>📊 Data Sharing: ${dataIntegrations}</div>` : ''}
          </div>
        `;
      } else {
        // Create the element if it doesn't exist
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
          const statsDiv = document.createElement('div');
          statsDiv.id = 'cross-app-stats';
          statsDiv.className = 'sidebar-section';
          sidebar.appendChild(statsDiv);
          this.updateViewInfo(); // Recursively call to populate
        }
      }
    }
  }

  updateMinimap() {
    // Minimap implementation
    const scale = 0.1;
    const minimapData = this.filteredData.nodes.map(node => ({
      x: node.x * scale,
      y: node.y * scale
    }));

    this.minimapGroup.selectAll('circle')
      .data(minimapData)
      .join('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', 2)
      .attr('fill', '#007bff');
  }

  onNodeClick(event, d) {
    // Don't handle clicks if we're dragging
    if (this.isDragging) {
      console.log('Ignoring click during drag');
      return;
    }
    
    console.log('Processing node click:', d);
    this.uiState.selectedNode = d;
    this.showResourceDetails(d);
    
    // Hide hover card when clicking
    this.hideHoverCard();
    
    // Prevent event bubbling
    event.stopPropagation();
  }

  onNodeMouseover(event, d) {
    // Don't show hover effects during dragging
    if (this.isDragging) {
      return;
    }
    
    // Highlight connected nodes
    if (this.nodeGroups) {
      this.nodeGroups.style('opacity', 0.3);
      // Find the specific node element to highlight
      this.nodeGroups.filter(nodeData => nodeData.id === d.id).style('opacity', 1);
    }
    
    // Show hover card with configuration details
    this.showHoverCard(event, d);
  }

  onNodeMouseout(event, d) {
    if (this.nodeGroups) {
      this.nodeGroups.style('opacity', 1);
    }
    
    // Hide hover card immediately - no delay
    this.hideHoverCard();
  }

  // Cross-application link methods
  getLinkColor(link) {
    // If telemetry data is available, use health-based coloring
    if (this.telemetryData && Object.keys(this.telemetryData).length > 0) {
      return this.getConnectionHealthColor(link);
    }
    
    // Fallback to type-based coloring
    if (link.crossApplication) {
      switch (link.type) {
        case 'api_integration':
          return '#ff6b35'; // Orange for API calls
        case 'messaging_integration':
          return '#4ecdc4'; // Teal for messaging
        case 'data_integration':
          return '#95a5a6'; // Gray for data sharing
        default:
          return '#e74c3c'; // Red for other cross-app
      }
    }
    return '#999'; // Default gray for standard links
  }

  getLinkLabel(link) {
    if (link.metadata) {
      switch (link.type) {
        case 'api_integration':
          return `API (${link.metadata.protocol})`;
        case 'messaging_integration':
          return `MSG (${link.metadata.protocol})`;
        case 'data_integration':
          return `DATA (${link.metadata.protocol})`;
        default:
          return link.type.toUpperCase();
      }
    }
    return link.type?.toUpperCase() || 'CROSS-APP';
  }

  onLinkMouseover(event, link) {
    if (link.crossApplication) {
      // Highlight the link with increased width on hover
      d3.select(event.currentTarget)
        .attr('stroke-width', 8) // Increased from base 6px for hover effect
        .attr('stroke-opacity', 1);
      
      // Show integration details
      this.showLinkTooltip(event, link);
    } else {
      // Also provide hover effect for standard links
      d3.select(event.currentTarget)
        .attr('stroke-width', 6) // Increased from base 4px for hover effect
        .attr('stroke-opacity', 1);
      
      // Show basic link info for standard links too
      this.showLinkTooltip(event, link);
    }
  }

  onLinkMouseout(event, link) {
    if (link.crossApplication) {
      // Reset cross-app link styling
      d3.select(event.currentTarget)
        .attr('stroke-width', 6) // Match the new base cross-app width
        .attr('stroke-opacity', 0.9); // Match the new base cross-app opacity
      
      // Hide tooltip
      this.hideLinkTooltip();
    } else {
      // Reset standard link styling
      d3.select(event.currentTarget)
        .attr('stroke-width', 4) // Match the new base standard width
        .attr('stroke-opacity', 0.8); // Match the new base standard opacity
      
      // Hide tooltip
      this.hideLinkTooltip();
    }
  }

  showLinkTooltip(event, link) {
    // Create or update tooltip
    let tooltip = document.getElementById('link-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'link-tooltip';
      tooltip.style.cssText = `
        position: absolute;
        background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 12px;
        pointer-events: none;
        z-index: 1000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
      `;
      document.body.appendChild(tooltip);
    }

    // Get telemetry data for source and target applications
    const sourceAppId = this.getNodeAppId(link.source);
    const targetAppId = this.getNodeAppId(link.target);
    const sourceTelemetry = this.telemetryData?.[sourceAppId];
    const targetTelemetry = this.telemetryData?.[targetAppId];
    
    // Build telemetry section for the link
    const linkTelemetrySection = this.buildLinkTelemetrySection(link, sourceTelemetry, targetTelemetry);
    
    const metadata = link.metadata || {};
    tooltip.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px; color: #ecf0f1;">Cross-Application Integration</div>
      <div style="margin-bottom: 6px;"><strong>Type:</strong> ${link.type.replace('_', ' ').toUpperCase()}</div>
      ${metadata.protocol ? `<div style="margin-bottom: 4px;"><strong>Protocol:</strong> ${metadata.protocol}</div>` : ''}
      ${metadata.integration_type ? `<div style="margin-bottom: 4px;"><strong>Integration:</strong> ${metadata.integration_type}</div>` : ''}
      ${metadata.endpoint ? `<div style="margin-bottom: 4px; word-break: break-all;"><strong>Endpoint:</strong> ${metadata.endpoint}</div>` : ''}
      ${metadata.environment_variable ? `<div style="margin-bottom: 4px;"><strong>Env Var:</strong> ${metadata.environment_variable}</div>` : ''}
      ${linkTelemetrySection}
    `;

    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY - 10) + 'px';
    tooltip.style.display = 'block';
  }

  hideLinkTooltip() {
    const tooltip = document.getElementById('link-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  showHoverCard(event, node) {
    // Create or update hover card
    let hoverCard = document.getElementById('hover-card');
    if (!hoverCard) {
      hoverCard = document.createElement('div');
      hoverCard.id = 'hover-card';
      hoverCard.style.cssText = `
        position: fixed;
        background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 12px;
        pointer-events: none;
        z-index: 10000;
        max-width: 320px;
        min-width: 200px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        display: none;
        opacity: 0;
        transform: scale(0.9);
        white-space: normal;
      `;
      document.body.appendChild(hoverCard);
    }

    // Get resource type and configuration details
    const resourceType = this.getResourceTypeDisplay(node.type);
    const config = node.config || {};
    const iconHtml = this.awsIconMap[node.type] 
      ? `<img src="${this.awsIconMap[node.type]}" alt="${node.type}" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 8px;">`
      : `<div style="width: 20px; height: 20px; background: #666; border-radius: 3px; display: inline-block; vertical-align: middle; margin-right: 8px;"></div>`;

    // Build configuration summary
    const configSummary = this.buildConfigurationSummary(node.type, config);
    
    // Get telemetry data for this node's application
    const appId = node.group || node.appId;
    const telemetryInfo = this.telemetryData?.[appId];
    const telemetrySection = this.buildTelemetrySection(telemetryInfo);
    
    hoverCard.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 8px;">
        ${iconHtml}
        <div>
          <div style="font-weight: bold; font-size: 13px; color: #fff;">${node.name}</div>
          <div style="font-size: 10px; color: #ccc; opacity: 0.9;">${resourceType}</div>
        </div>
      </div>
      
      <div style="margin-bottom: 8px;">
        <div style="font-size: 10px; color: #ddd; margin-bottom: 4px;">
          <strong>Application:</strong> ${node.appName || node.group}
        </div>
        ${node.repository ? `
        <div style="font-size: 10px; color: #ddd; margin-bottom: 4px;">
          <strong>Repository:</strong> ${node.repository.repo || 'Unknown'}
        </div>
        ` : ''}
      </div>
      
      ${telemetrySection}
      
      ${configSummary ? `
      <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 8px;">
        <div style="font-size: 10px; color: #ddd; margin-bottom: 4px;">
          <strong>Configuration:</strong>
        </div>
        <div style="font-size: 10px; color: #eee; line-height: 1.4;">
          ${configSummary}
        </div>
      </div>
      ` : ''}
    `;

    // Position the hover card using fixed positioning
    const cardWidth = 320;
    const cardHeight = hoverCard.offsetHeight || 100; // fallback height
    
    let left = event.clientX + 15;
    let top = event.clientY - 10;
    
    // Adjust position if card would go off screen
    if (left + cardWidth > window.innerWidth) {
      left = event.clientX - cardWidth - 15;
    }
    
    if (top + cardHeight > window.innerHeight) {
      top = event.clientY - cardHeight + 10;
    }
    
    hoverCard.style.left = left + 'px';
    hoverCard.style.top = top + 'px';
    
    // Show immediately - no delays or animations
    hoverCard.style.opacity = '1';
    hoverCard.style.transform = 'scale(1)';
    hoverCard.style.display = 'block';
  }

  hideHoverCard() {
    const hoverCard = document.getElementById('hover-card');
    if (hoverCard) {
      hoverCard.style.opacity = '0';
      hoverCard.style.transform = 'scale(0.9)';
      hoverCard.style.display = 'none';
    }
  }

  // Build telemetry section for hover cards
  buildTelemetrySection(telemetryInfo) {
    if (!telemetryInfo) return '';

    const health = telemetryInfo.health;
    const metrics = telemetryInfo.metrics;
    const isDemo = telemetryInfo.mockData;

    // Health status with color
    const healthColor = this.getHealthColor(health);
    const healthDisplay = health.charAt(0).toUpperCase() + health.slice(1);
    
    let telemetryHtml = `
      <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 8px; margin-bottom: 8px;">
        <div style="font-size: 10px; color: #ddd; margin-bottom: 4px;">
          <strong>Application Health${isDemo ? ' (Demo)' : ''}:</strong>
        </div>
        <div style="font-size: 11px; margin-bottom: 6px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${healthColor}; margin-right: 6px;"></span>
          <span style="color: ${healthColor}; font-weight: bold;">${healthDisplay}</span>
        </div>
    `;

    // Add metrics if available
    if (metrics) {
      telemetryHtml += `
        <div style="font-size: 9px; color: #bbb; line-height: 1.3;">
          <div style="margin-bottom: 2px;"><strong>Response Time:</strong> ${metrics.responseTime}ms</div>
          <div style="margin-bottom: 2px;"><strong>Throughput:</strong> ${metrics.throughput} req/min</div>
          <div style="margin-bottom: 2px;"><strong>Error Rate:</strong> ${metrics.errorRate}%</div>
        </div>
      `;
    }

    telemetryHtml += `
      </div>
    `;

    return telemetryHtml;
  }

  // Build telemetry section for link tooltips
  buildLinkTelemetrySection(link, sourceTelemetry, targetTelemetry) {
    if (!sourceTelemetry && !targetTelemetry) return '';

    const isDemo = sourceTelemetry?.mockData || targetTelemetry?.mockData;
    let telemetryHtml = `
      <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 8px; margin-top: 8px;">
        <div style="font-size: 10px; color: #ddd; margin-bottom: 6px;">
          <strong>Connection Health${isDemo ? ' (Demo)' : ''}:</strong>
        </div>
    `;

    // Overall connection health based on worst endpoint
    const sourceHealth = sourceTelemetry?.health || 'unknown';
    const targetHealth = targetTelemetry?.health || 'unknown';
    const connectionHealth = this.getWorstHealth(sourceHealth, targetHealth);
    const connectionColor = this.getHealthColor(connectionHealth);
    
    telemetryHtml += `
      <div style="font-size: 11px; margin-bottom: 8px;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${connectionColor}; margin-right: 6px;"></span>
        <span style="color: ${connectionColor}; font-weight: bold;">${connectionHealth.charAt(0).toUpperCase() + connectionHealth.slice(1)}</span>
      </div>
    `;

    // Connection metrics
    if (sourceTelemetry?.connectionHealth || targetTelemetry?.connectionHealth) {
      const connHealth = sourceTelemetry?.connectionHealth || targetTelemetry?.connectionHealth;
      telemetryHtml += `
        <div style="font-size: 9px; color: #bbb; line-height: 1.4;">
          <div style="margin-bottom: 2px;"><strong>Latency:</strong> ${connHealth.latency}ms</div>
          <div style="margin-bottom: 2px;"><strong>Packet Loss:</strong> ${connHealth.packetLoss}%</div>
          <div style="margin-bottom: 2px;"><strong>Jitter:</strong> ${connHealth.jitter}ms</div>
        </div>
      `;
    }

    // Endpoint health breakdown
    if (sourceTelemetry && targetTelemetry) {
      telemetryHtml += `
        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px; margin-top: 6px;">
          <div style="font-size: 9px; color: #bbb; line-height: 1.4;">
            <div style="margin-bottom: 3px;">
              <strong>Source:</strong> 
              <span style="color: ${this.getHealthColor(sourceHealth)};">${sourceTelemetry.appName} (${sourceHealth})</span>
            </div>
            <div style="margin-bottom: 3px;">
              <strong>Target:</strong> 
              <span style="color: ${this.getHealthColor(targetHealth)};">${targetTelemetry.appName} (${targetHealth})</span>
            </div>
          </div>
        </div>
      `;
    }

    telemetryHtml += `
      </div>
    `;

    return telemetryHtml;
  }

  findNodeAtPosition(x, y) {
    if (!this.filteredData || !this.filteredData.nodes) return null;
    
    // x, y are mouse coordinates from d3.pointer(event, this.graphGroup.node())
    // These coordinates are already in the untransformed simulation coordinate space
    // node.x, node.y are also in the same simulation coordinate space
    // So we can compare them directly without applying transforms
    
    for (const node of this.filteredData.nodes) {
      if (node.x && node.y) {
        const distance = Math.sqrt(
          Math.pow(x - node.x, 2) + 
          Math.pow(y - node.y, 2)
        );
        
        // Check if mouse is within node radius
        const nodeRadius = this.config.nodeRadius;
        if (distance <= nodeRadius) {
          const nodeElement = this.graphGroup.selectAll('.node-group')
            .filter(d => d.id === node.id)
            .node();
          return nodeElement;
        }
      }
    }
    
    return null;
  }


  getResourceTypeDisplay(type) {
    const typeMap = {
      'aws_lambda_function': 'Lambda Function',
      'aws_api_gateway_rest_api': 'API Gateway',
      'aws_dynamodb_table': 'DynamoDB Table',
      'aws_s3_bucket': 'S3 Bucket',
      'aws_rds_cluster': 'RDS Aurora Cluster',
      'aws_rds_instance': 'RDS Instance',
      'aws_ecs_service': 'ECS Service',
      'aws_ecs_task_definition': 'ECS Task Definition',
      'aws_ecs_cluster': 'ECS Cluster',
      'aws_elasticache_replication_group': 'ElastiCache Redis',
      'aws_opensearch_domain': 'OpenSearch Domain',
      'aws_cloudfront_distribution': 'CloudFront Distribution',
      'aws_sagemaker_endpoint': 'SageMaker Endpoint',
      'aws_sns_topic': 'SNS Topic',
      'aws_sns_topic_subscription': 'SNS Subscription',
      'aws_sqs_queue': 'SQS Queue',
      'aws_iam_role': 'IAM Role',
      'aws_cognito_user_pool': 'Cognito User Pool',
      'aws_cognito_user_pool_client': 'Cognito Client',
      'aws_cloudwatch_log_group': 'CloudWatch Logs'
    };
    
    return typeMap[type] || type.replace(/^aws_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  buildConfigurationSummary(type, config) {
    const summaries = {
      'aws_lambda_function': () => {
        const parts = [];
        if (config.runtime) parts.push(`Runtime: ${config.runtime}`);
        if (config.memory_size) parts.push(`Memory: ${config.memory_size}MB`);
        if (config.timeout) parts.push(`Timeout: ${config.timeout}s`);
        if (config.handler) parts.push(`Handler: ${config.handler}`);
        return parts.join('<br>');
      },
      'aws_dynamodb_table': () => {
        const parts = [];
        if (config.hash_key) parts.push(`Hash Key: ${config.hash_key}`);
        if (config.range_key) parts.push(`Range Key: ${config.range_key}`);
        if (config.billing_mode) parts.push(`Billing: ${config.billing_mode}`);
        return parts.join('<br>');
      },
      'aws_s3_bucket': () => {
        const parts = [];
        if (config.bucket) parts.push(`Bucket: ${config.bucket}`);
        if (config.versioning) parts.push(`Versioning: Enabled`);
        if (config.encryption) parts.push(`Encrypted: Yes`);
        return parts.join('<br>');
      },
      'aws_rds_cluster': () => {
        const parts = [];
        if (config.engine) parts.push(`Engine: ${config.engine}`);
        if (config.engine_version) parts.push(`Version: ${config.engine_version}`);
        if (config.database_name) parts.push(`Database: ${config.database_name}`);
        if (config.backup_retention_period) parts.push(`Backup Retention: ${config.backup_retention_period} days`);
        return parts.join('<br>');
      },
      'aws_ecs_service': () => {
        const parts = [];
        if (config.desired_count) parts.push(`Desired Count: ${config.desired_count}`);
        if (config.cluster) parts.push(`Cluster: ${config.cluster}`);
        if (config.launch_type) parts.push(`Launch Type: ${config.launch_type}`);
        return parts.join('<br>');
      },
      'aws_ecs_task_definition': () => {
        const parts = [];
        if (config.family) parts.push(`Family: ${config.family}`);
        if (config.cpu) parts.push(`CPU: ${config.cpu}`);
        if (config.memory) parts.push(`Memory: ${config.memory}`);
        if (config.network_mode) parts.push(`Network: ${config.network_mode}`);
        return parts.join('<br>');
      },
      'aws_elasticache_replication_group': () => {
        const parts = [];
        if (config.node_type) parts.push(`Node Type: ${config.node_type}`);
        if (config.num_cache_clusters) parts.push(`Nodes: ${config.num_cache_clusters}`);
        if (config.engine) parts.push(`Engine: ${config.engine || 'Redis'}`);
        return parts.join('<br>');
      },
      'aws_opensearch_domain': () => {
        const parts = [];
        if (config.engine_version) parts.push(`Version: ${config.engine_version}`);
        if (config.instance_type) parts.push(`Instance: ${config.instance_type}`);
        if (config.instance_count) parts.push(`Count: ${config.instance_count}`);
        return parts.join('<br>');
      },
      'aws_sagemaker_endpoint': () => {
        const parts = [];
        if (config.name) parts.push(`Endpoint: ${config.name}`);
        if (config.endpoint_config_name) parts.push(`Config: ${config.endpoint_config_name}`);
        return parts.join('<br>');
      },
      'aws_api_gateway_rest_api': () => {
        const parts = [];
        if (config.name) parts.push(`API Name: ${config.name}`);
        if (config.description) parts.push(`Description: ${config.description}`);
        return parts.join('<br>');
      }
    };

    const summaryFn = summaries[type];
    if (summaryFn) {
      const summary = summaryFn();
      return summary || 'No configuration details available';
    }

    // Generic configuration summary
    const importantKeys = ['name', 'description', 'type', 'size', 'instance_type', 'engine', 'version'];
    const parts = [];
    
    importantKeys.forEach(key => {
      if (config[key] && typeof config[key] === 'string') {
        const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        parts.push(`${displayKey}: ${config[key]}`);
      }
    });
    
    return parts.length > 0 ? parts.join('<br>') : 'Configuration available in detail panel';
  }

  showResourceDetails(node) {
    const panel = document.getElementById('detail-panel');
    const content = document.getElementById('detail-content');
    
    const iconHtml = this.awsIconMap[node.type] 
      ? `<img src="${this.awsIconMap[node.type]}" alt="${node.type}">`
      : `<i class="fas fa-cube"></i>`;

    content.innerHTML = `
      <div class="resource-detail">
        <div class="resource-header">
          <div class="resource-icon">${iconHtml}</div>
          <div class="resource-header-info">
            <div class="resource-name">${node.name}</div>
            <div class="resource-type">${node.type}</div>
          </div>
        </div>
        
        <div class="detail-section">
          <div class="detail-section-title">Basic Information</div>
          <div class="detail-property">
            <span class="property-label">Resource ID</span>
            <span class="property-value">${node.id}</span>
          </div>
          <div class="detail-property">
            <span class="property-label">Type</span>
            <span class="property-value">${node.type}</span>
          </div>
          <div class="detail-property">
            <span class="property-label">Application</span>
            <span class="property-value">${node.appName}</span>
          </div>
          ${node.repository ? `
          <div class="detail-property">
            <span class="property-label">Repository</span>
            <span class="property-value">${node.repository.repo}</span>
          </div>
          ` : ''}
        </div>

        <div class="detail-section">
          <div class="detail-section-title">Configuration</div>
          ${Object.entries(node.config || {}).map(([key, value]) => `
            <div class="detail-property">
              <span class="property-label">${key}</span>
              <span class="property-value">${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    panel.classList.add('open');
  }

  closeDetailPanel() {
    document.getElementById('detail-panel').classList.remove('open');
    this.uiState.selectedNode = null;
  }

  selectApp(appId) {
    this.uiState.selectedApp = appId;
    
    // Update UI
    document.querySelectorAll('.app-item').forEach(item => {
      item.classList.toggle('active', item.dataset.appId === appId);
    });

    // Filter graph to show only selected app
    if (appId) {
      this.filteredData.nodes = this.filteredData.nodes.filter(node => node.group === appId);
    } else {
      this.processData();
    }

    this.renderGraph();
  }

  drag() {
    return d3.drag()
      .on('start', (event, d) => {
        console.log('Drag start:', d);
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        this.isDragging = true;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
        this.isDragging = true;
      })
      .on('end', (event, d) => {
        console.log('Drag end:', d);
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        // Add a small delay before allowing clicks again
        setTimeout(() => {
          this.isDragging = false;
        }, 100);
      });
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  exportGraph() {
    const svgElement = this.svg.node();
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'overwatch-infrastructure-diagram.svg';
    link.click();
    
    URL.revokeObjectURL(url);
  }

  showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
  }

  hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <strong>${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
        <p>${message}</p>
      </div>
    `;

    container.appendChild(toast);

    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);

    // Remove toast
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => container.removeChild(toast), 300);
    }, 3000);
  }

  updateEnterpriseUI() {
    if (this.enterpriseMode && this.currentAnalysis) {
      this.showEnterpriseInfo();
    } else {
      this.hideEnterpriseInfo();
    }
  }

  showEnterpriseInfo() {
    // Update breadcrumb
    const currentView = document.getElementById('current-view');
    if (currentView) {
      currentView.textContent = `Enterprise Analysis - ${this.uiState.selectedEnvironment.toUpperCase()}`;
    }

    // Show analysis summary
    if (this.currentAnalysis?.summary) {
      this.showAnalysisSummary(this.currentAnalysis.summary);
    }

    // Show recommendations if any
    if (this.currentAnalysis?.recommendations?.length > 0) {
      this.showRecommendations(this.currentAnalysis.recommendations);
    }
  }

  hideEnterpriseInfo() {
    const currentView = document.getElementById('current-view');
    if (currentView) {
      currentView.textContent = 'Infrastructure Overview';
    }
  }

  showAnalysisSummary(summary) {
    const summaryHtml = `
      <div class="analysis-summary">
        <h4>Analysis Summary</h4>
        <div class="summary-stats">
          <div class="stat">
            <span class="stat-label">Modules</span>
            <span class="stat-value">${summary.moduleCount || 0}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Resources</span>
            <span class="stat-value">${summary.resourceCount || 0}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Dependencies</span>
            <span class="stat-value">${summary.dependencyCount || 0}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Issues</span>
            <span class="stat-value ${summary.criticalIssues > 0 ? 'critical' : ''}">${summary.criticalIssues || 0}</span>
          </div>
        </div>
      </div>
    `;

    // Add to sidebar if not already present
    let summaryContainer = document.getElementById('analysis-summary');
    if (!summaryContainer) {
      summaryContainer = document.createElement('div');
      summaryContainer.id = 'analysis-summary';
      summaryContainer.className = 'sidebar-section';
      document.querySelector('.sidebar').appendChild(summaryContainer);
    }
    summaryContainer.innerHTML = summaryHtml;
  }

  showRecommendations(recommendations) {
    const criticalRecommendations = recommendations.filter(r => r.priority === 'critical');
    
    if (criticalRecommendations.length > 0) {
      criticalRecommendations.forEach(rec => {
        this.showToast(`${rec.title}: ${rec.description}`, 'error');
      });
    }
  }

  // ================================
  // CONFIGURATION HISTORY METHODS
  // ================================

  updateConfigurationHistory(data) {
    // Update the current version indicator
    const currentVersionEl = document.getElementById('current-version');
    if (currentVersionEl && data.currentVersion) {
      currentVersionEl.textContent = `v${data.currentVersion}`;
    }

    // Update the timeline in the sidebar
    this.updateHistoryTimeline(data.configurationHistory || []);

    // Enable/disable the "View Full History" button
    const viewAllBtn = document.getElementById('view-all-history');
    if (viewAllBtn) {
      const hasHistory = data.configurationHistory && data.configurationHistory.length > 0;
      viewAllBtn.disabled = !hasHistory;
      if (hasHistory) {
        viewAllBtn.onclick = () => this.openHistoryModal(data);
      }
    }
  }

  updateHistoryTimeline(history) {
    const timelineEl = document.getElementById('history-timeline');
    if (!timelineEl) return;

    if (!history || history.length === 0) {
      timelineEl.innerHTML = `
        <div class="timeline-item">
          <div class="timeline-dot current"></div>
          <div class="timeline-content">
            <div class="timeline-version">v1</div>
            <div class="timeline-message">Initial configuration</div>
            <div class="timeline-date">Just now</div>
          </div>
        </div>
      `;
      return;
    }

    // Show the latest 3 versions in the sidebar timeline
    const recentHistory = history
      .sort((a, b) => b.version - a.version)
      .slice(0, 3);

    timelineEl.innerHTML = recentHistory.map((entry, index) => {
      const date = new Date(entry.timestamp);
      const timeAgo = this.getTimeAgo(date);
      const isLatest = index === 0;

      return `
        <div class="timeline-item">
          <div class="timeline-dot ${isLatest ? 'current' : ''}"></div>
          <div class="timeline-content">
            <div class="timeline-version">v${entry.version}</div>
            <div class="timeline-message">${entry.changeLog || 'Configuration updated'}</div>
            <div class="timeline-date">${timeAgo}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  openHistoryModal(appData = null) {
    const modal = document.getElementById('history-modal');
    const modalBody = document.getElementById('history-modal-body');
    
    if (!modal || !modalBody) return;

    // Use current app data if available, otherwise fetch it
    if (appData && appData.configurationHistory) {
      this.renderHistoryModal(appData.configurationHistory, appData.currentVersion);
    } else {
      // For now, show a placeholder - in a real app we'd fetch from API
      modalBody.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fas fa-history" style="font-size: 48px; margin-bottom: 16px;"></i>
          <p>Configuration history will be displayed here when MongoDB is connected.</p>
          <p style="font-size: 12px; margin-top: 8px;">Current data source: Legacy mode</p>
        </div>
      `;
    }

    modal.classList.add('open');
  }

  renderHistoryModal(history, currentVersion) {
    const modalBody = document.getElementById('history-modal-body');
    if (!modalBody) return;

    const sortedHistory = history
      .sort((a, b) => b.version - a.version);

    modalBody.innerHTML = sortedHistory.map((entry, index) => {
      const date = new Date(entry.timestamp);
      const isLatest = index === 0;
      const timeAgo = this.getTimeAgo(date);

      return `
        <div class="history-version-card ${isLatest ? 'current' : ''}" data-version="${entry.version}">
          <div class="version-card-header">
            <span class="version-card-title">Version ${entry.version}</span>
            <span class="version-card-date">${timeAgo}</span>
          </div>
          <div class="version-card-message">${entry.changeLog || 'Configuration updated'}</div>
          <div class="version-card-stats">
            <div class="version-stat added">
              <i class="fas fa-plus"></i>
              ${entry.resourcesAdded || 0} added
            </div>
            <div class="version-stat modified">
              <i class="fas fa-edit"></i>
              ${entry.resourcesModified || 0} modified
            </div>
            <div class="version-stat removed">
              <i class="fas fa-minus"></i>
              ${entry.resourcesRemoved || 0} removed
            </div>
          </div>
          <div class="version-card-actions">
            <button class="btn btn-secondary btn-xs" onclick="visualizer.viewVersion(${entry.version})" ${isLatest ? 'disabled' : ''}>
              <i class="fas fa-eye"></i>
              View
            </button>
            <button class="btn btn-secondary btn-xs" onclick="visualizer.compareVersions(${entry.version}, ${currentVersion - 1})" ${isLatest ? 'disabled' : ''}>
              <i class="fas fa-code-branch"></i>
              Compare
            </button>
            ${!isLatest ? `
              <button class="btn btn-warning btn-xs" onclick="visualizer.rollbackToVersion(${entry.version})">
                <i class="fas fa-undo"></i>
                Rollback
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  closeHistoryModal() {
    const modal = document.getElementById('history-modal');
    if (modal) {
      modal.classList.remove('open');
    }
  }

  viewVersion(version) {
    // Placeholder for viewing specific version
    this.showToast(`Would view configuration version ${version}`, 'info');
  }

  compareVersions(fromVersion, toVersion) {
    // Placeholder for version comparison
    this.showToast(`Would compare version ${fromVersion} with version ${toVersion}`, 'info');  
  }

  rollbackToVersion(version) {
    // Placeholder for rollback functionality
    const confirmed = confirm(`Are you sure you want to rollback to version ${version}? This will create a new version with the previous configuration.`);
    if (confirmed) {
      this.showToast(`Would rollback to version ${version}`, 'warning');
    }
  }

  getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="fas fa-${type === 'info' ? 'info-circle' : type === 'warning' ? 'exclamation-triangle' : 'check-circle'}"></i>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  const app = new OverwatchVisualizer();
  window.visualizer = app;
  window.overwatch = app; // Expose for tests
});