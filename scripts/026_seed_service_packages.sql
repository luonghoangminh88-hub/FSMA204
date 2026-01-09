-- =============================================
-- SEED SERVICE PACKAGES DATA
-- Based on SUBSCRIPTION_MODEL_PROPOSAL.md
-- =============================================

-- Insert Service Packages
INSERT INTO public.service_packages (
  package_name, package_code, package_tier, description, 
  price_monthly, price_yearly,
  max_users, max_locations, max_lots_per_month, max_organizations, storage_gb,
  has_basic_cte, has_fda_compliance, has_traceability,
  has_batch_operations, has_us_agent_service, has_quantity_reconciliation,
  has_loss_analytics, has_automated_alerts,
  has_tlc_auto_generation, has_approval_workflows, has_shelf_life_monitoring,
  has_advanced_analytics, has_api_access, has_custom_integrations,
  has_blockchain_verification, has_white_label_branding, has_dedicated_support,
  has_priority_support,
  support_level, sla_uptime_percentage,
  extra_user_price, extra_location_price, extra_lot_price,
  is_featured, is_popular, display_order, tagline
) VALUES 
-- STARTER TIER
(
  'Starter', 'starter', 1, 
  'Perfect for small manufacturers and importers getting started with FSMA compliance',
  199.00, 2149.00, -- $2,149/year (10% discount)
  5, 2, 500, 1, 100,
  true, true, true, -- Basic CTE, FDA Compliance, Basic Traceability
  false, false, false, false, false, -- No advanced features
  false, false, false, false, false, false, false, false, false, false,
  'email_48h', 99.5,
  25.00, 50.00, 0.20,
  false, false, 1,
  'Get compliant fast with essential traceability tools'
),
-- PROFESSIONAL TIER
(
  'Professional', 'professional', 2,
  'Ideal for mid-size manufacturers and processors scaling their operations',
  599.00, 6469.00, -- $6,469/year (10% discount)
  25, 10, 2500, 1, 500,
  true, true, true, -- All basic features
  true, true, true, true, true, -- Batch ops, US Agent, Reconciliation, Analytics, Alerts
  false, false, false, false, false, false, false, false, false, true,
  'email_chat_24h', 99.7,
  25.00, 50.00, 0.20,
  false, true, 2, -- Most popular
  'Complete compliance solution with powerful automation'
),
-- ENTERPRISE TIER
(
  'Enterprise', 'enterprise', 3,
  'Comprehensive solution for large corporations and multi-site operations',
  1999.00, 21589.00, -- $21,589/year (10% discount)
  NULL, NULL, NULL, NULL, 5120, -- Unlimited users, locations, lots, orgs
  true, true, true, true, true, true, true, true, -- All features
  true, true, true, true, true, true, true, false, true, true,
  'priority_4h', 99.9,
  0, 0, 0, -- No extra charges
  true, false, 3, -- Featured
  'Enterprise-grade platform with dedicated support'
),
-- WHITE LABEL TIER
(
  'White Label', 'white_label', 4,
  'Fully customizable platform for consultants and resellers',
  NULL, NULL, -- Custom pricing
  NULL, NULL, NULL, NULL, 10240, -- Unlimited everything
  true, true, true, true, true, true, true, true,
  true, true, true, true, true, true, true, true, true, true,
  'dedicated_24_7', 99.95,
  0, 0, 0,
  false, false, 4,
  'Your brand, our technology - complete white label solution'
)
ON CONFLICT (package_code) DO NOTHING;

-- Insert Package Features for STARTER
WITH starter_package AS (
  SELECT id FROM public.service_packages WHERE package_code = 'starter'
)
INSERT INTO public.package_features (package_id, feature_category, feature_name, feature_description, is_included, display_order)
SELECT id, 'core', 'Up to 5 Users', 'Add team members to manage traceability', true, 1 FROM starter_package
UNION ALL
SELECT id, 'core', '2 Locations/Facilities', 'Manage multiple facilities or warehouses', true, 2 FROM starter_package
UNION ALL
SELECT id, 'core', '500 Lots/month', 'Track up to 500 traceability lots per month', true, 3 FROM starter_package
UNION ALL
SELECT id, 'compliance', 'Basic CTE Management', 'All 7 types of Critical Tracking Events', true, 4 FROM starter_package
UNION ALL
SELECT id, 'compliance', 'FDA Compliance Dashboard', 'Monitor compliance status and deadlines', true, 5 FROM starter_package
UNION ALL
SELECT id, 'compliance', 'Forward/Backward Traceability', 'One-level traceability queries', true, 6 FROM starter_package
UNION ALL
SELECT id, 'core', 'Basic Analytics & Reports', 'Standard reports and export to Excel/PDF', true, 7 FROM starter_package
UNION ALL
SELECT id, 'support', 'Email Support', '48-hour response time', true, 8 FROM starter_package
UNION ALL
SELECT id, 'support', '100 GB Storage', 'Document and data storage', true, 9 FROM starter_package
UNION ALL
SELECT id, 'advanced', 'Batch Operations', 'Bulk lot creation and transformations', false, 10 FROM starter_package
UNION ALL
SELECT id, 'advanced', 'API Access', 'REST API for integrations', false, 11 FROM starter_package
UNION ALL
SELECT id, 'advanced', 'Approval Workflows', 'Manager approval for critical events', false, 12 FROM starter_package;

-- Insert Package Features for PROFESSIONAL
WITH pro_package AS (
  SELECT id FROM public.service_packages WHERE package_code = 'professional'
)
INSERT INTO public.package_features (package_id, feature_category, feature_name, feature_description, is_included, display_order)
SELECT id, 'core', 'Up to 25 Users', 'Larger teams with role-based access', true, 1 FROM pro_package
UNION ALL
SELECT id, 'core', '10 Locations/Facilities', 'Multi-facility operations', true, 2 FROM pro_package
UNION ALL
SELECT id, 'core', '2,500 Lots/month', 'Higher volume traceability tracking', true, 3 FROM pro_package
UNION ALL
SELECT id, 'compliance', 'Full Supply Chain Traceability', 'Unlimited levels of traceability', true, 4 FROM pro_package
UNION ALL
SELECT id, 'compliance', 'FDA Registration Management', 'Track and manage FDA registrations', true, 5 FROM pro_package
UNION ALL
SELECT id, 'compliance', 'US Agent Service (FREE)', '$200/month value included at no cost', true, 6 FROM pro_package
UNION ALL
SELECT id, 'advanced', 'Quantity Reconciliation', 'Automated input/output validation', true, 7 FROM pro_package
UNION ALL
SELECT id, 'advanced', 'Loss Rate Analytics', 'Track and analyze loss patterns', true, 8 FROM pro_package
UNION ALL
SELECT id, 'advanced', 'Batch Operations', 'Bulk creation and mass transformations', true, 9 FROM pro_package
UNION ALL
SELECT id, 'advanced', 'Automated Compliance Alerts', 'Proactive expiration and deadline alerts', true, 10 FROM pro_package
UNION ALL
SELECT id, 'support', 'Priority Email + Chat Support', '24-hour response time', true, 11 FROM pro_package
UNION ALL
SELECT id, 'support', '500 GB Storage', 'Expanded storage capacity', true, 12 FROM pro_package
UNION ALL
SELECT id, 'advanced', 'Custom Report Templates', 'Design your own report formats', true, 13 FROM pro_package
UNION ALL
SELECT id, 'advanced', 'TLC Auto-Generation', 'Smart lot code creation', false, 14 FROM pro_package
UNION ALL
SELECT id, 'advanced', 'API Access', 'REST API + Webhooks', false, 15 FROM pro_package;

-- Insert Package Features for ENTERPRISE
WITH ent_package AS (
  SELECT id FROM public.service_packages WHERE package_code = 'enterprise'
)
INSERT INTO public.package_features (package_id, feature_category, feature_name, feature_description, is_included, display_order)
SELECT id, 'core', 'Unlimited Users', 'No limits on team size', true, 1 FROM ent_package
UNION ALL
SELECT id, 'core', 'Unlimited Locations', 'Manage any number of facilities', true, 2 FROM ent_package
UNION ALL
SELECT id, 'core', 'Unlimited Lots', 'Track unlimited traceability lots', true, 3 FROM ent_package
UNION ALL
SELECT id, 'core', 'Multi-Organization Support', 'Manage multiple brands/companies', true, 4 FROM ent_package
UNION ALL
SELECT id, 'compliance', 'Everything in Professional', 'All Professional features included', true, 5 FROM ent_package
UNION ALL
SELECT id, 'advanced', 'TLC Auto-Generation', 'Smart traceability lot code creation', true, 6 FROM ent_package
UNION ALL
SELECT id, 'advanced', 'Approval Workflows', 'Manager sign-off for transformations', true, 7 FROM ent_package
UNION ALL
SELECT id, 'advanced', 'Shelf Life Monitoring', 'Expiration tracking with recall management', true, 8 FROM ent_package
UNION ALL
SELECT id, 'advanced', 'Advanced Analytics', 'Predictive loss analysis and anomaly detection', true, 9 FROM ent_package
UNION ALL
SELECT id, 'advanced', 'Full API Access', 'REST API, webhooks, and custom integrations', true, 10 FROM ent_package
UNION ALL
SELECT id, 'advanced', 'Custom Integrations', 'ERP, WMS, IoT sensor integration', true, 11 FROM ent_package
UNION ALL
SELECT id, 'advanced', 'Blockchain Verification', 'Immutable traceability records (optional)', true, 12 FROM ent_package
UNION ALL
SELECT id, 'support', 'Dedicated Account Manager', 'Personal support contact', true, 13 FROM ent_package
UNION ALL
SELECT id, 'support', 'Phone + Priority Support', '4-hour response, 24/7 availability', true, 14 FROM ent_package
UNION ALL
SELECT id, 'support', 'Quarterly Business Reviews', 'Strategic planning sessions', true, 15 FROM ent_package
UNION ALL
SELECT id, 'support', 'Custom Training', 'On-site or virtual training programs', true, 16 FROM ent_package
UNION ALL
SELECT id, 'support', '5 TB Storage', 'Enterprise-grade storage', true, 17 FROM ent_package
UNION ALL
SELECT id, 'support', '99.9% Uptime SLA', 'Guaranteed availability', true, 18 FROM ent_package;

-- Insert Package Features for WHITE LABEL
WITH wl_package AS (
  SELECT id FROM public.service_packages WHERE package_code = 'white_label'
)
INSERT INTO public.package_features (package_id, feature_category, feature_name, feature_description, is_included, display_order)
SELECT id, 'core', 'Everything in Enterprise', 'All Enterprise features included', true, 1 FROM wl_package
UNION ALL
SELECT id, 'advanced', 'Full White Label Branding', 'Your logo, colors, and domain', true, 2 FROM wl_package
UNION ALL
SELECT id, 'advanced', 'Multi-Tenant Architecture', 'Manage all your clients from one dashboard', true, 3 FROM wl_package
UNION ALL
SELECT id, 'advanced', 'Reseller Dashboard', 'Centralized client management', true, 4 FROM wl_package
UNION ALL
SELECT id, 'advanced', 'Revenue Sharing Options', '20-40% commission structure', true, 5 FROM wl_package
UNION ALL
SELECT id, 'advanced', 'Co-Marketing Support', 'Joint marketing initiatives', true, 6 FROM wl_package
UNION ALL
SELECT id, 'support', 'Dedicated Technical Support', 'Priority technical assistance', true, 7 FROM wl_package
UNION ALL
SELECT id, 'support', 'Custom API Integration', 'Tailored API solutions', true, 8 FROM wl_package
UNION ALL
SELECT id, 'support', '10 TB Storage', 'Maximum storage capacity', true, 9 FROM wl_package
UNION ALL
SELECT id, 'support', '99.95% Uptime SLA', 'Premium availability guarantee', true, 10 FROM wl_package;
