-- Row Level Security Policies for FSMA 204 System
-- Implements role-based access control according to user permissions

-- =============================================
-- HELPER FUNCTION: Get user's organization
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_organization()
RETURNS UUID AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'system_admin');
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_modify_data()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('system_admin', 'org_admin', 'manager', 'operator')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =============================================
-- PROFILES TABLE POLICIES
-- =============================================

-- System admins can view all profiles
CREATE POLICY "profiles_select_system_admin" ON public.profiles
  FOR SELECT
  USING (public.is_system_admin());

-- Users can view profiles in their organization
CREATE POLICY "profiles_select_own_org" ON public.profiles
  FOR SELECT
  USING (organization_id = public.get_user_organization());

-- Users can view their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- System admins and org admins can insert profiles
CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT
  WITH CHECK (
    public.get_user_role() IN ('system_admin', 'org_admin')
  );

-- System admins and org admins can update profiles in their org
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE
  USING (
    public.get_user_role() IN ('system_admin', 'org_admin')
    AND (public.is_system_admin() OR organization_id = public.get_user_organization())
  );

-- Users can update their own profile (limited fields)
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid());

-- =============================================
-- ORGANIZATIONS TABLE POLICIES
-- =============================================

-- System admins can view all organizations
CREATE POLICY "organizations_select_system_admin" ON public.organizations
  FOR SELECT
  USING (public.is_system_admin());

-- Users can view their own organization
CREATE POLICY "organizations_select_own" ON public.organizations
  FOR SELECT
  USING (id = public.get_user_organization());

-- Only system admins can create organizations
CREATE POLICY "organizations_insert_system_admin" ON public.organizations
  FOR INSERT
  WITH CHECK (public.is_system_admin());

-- System admins and org admins can update their organization
CREATE POLICY "organizations_update_admin" ON public.organizations
  FOR UPDATE
  USING (
    public.is_system_admin() OR 
    (id = public.get_user_organization() AND public.get_user_role() = 'org_admin')
  );

-- =============================================
-- FOOD CATEGORIES & FTL FOODS (Public reference data)
-- =============================================

-- Everyone can view food categories and FTL foods
CREATE POLICY "food_categories_select_all" ON public.food_categories
  FOR SELECT
  USING (true);

CREATE POLICY "ftl_foods_select_all" ON public.ftl_foods
  FOR SELECT
  USING (true);

-- Only system admins can modify reference data
CREATE POLICY "food_categories_modify_system_admin" ON public.food_categories
  FOR ALL
  USING (public.is_system_admin());

CREATE POLICY "ftl_foods_modify_system_admin" ON public.ftl_foods
  FOR ALL
  USING (public.is_system_admin());

-- =============================================
-- LOCATIONS TABLE POLICIES
-- =============================================

-- Users can view locations in their organization
CREATE POLICY "locations_select" ON public.locations
  FOR SELECT
  USING (
    public.is_system_admin() OR
    organization_id = public.get_user_organization()
  );

-- Admins, managers, and operators can create locations
CREATE POLICY "locations_insert" ON public.locations
  FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization()
    AND public.can_modify_data()
  );

-- Admins and managers can update locations
CREATE POLICY "locations_update" ON public.locations
  FOR UPDATE
  USING (
    organization_id = public.get_user_organization()
    AND public.get_user_role() IN ('system_admin', 'org_admin', 'manager')
  );

-- Only admins can delete locations
CREATE POLICY "locations_delete" ON public.locations
  FOR DELETE
  USING (
    organization_id = public.get_user_organization()
    AND public.get_user_role() IN ('system_admin', 'org_admin')
  );

-- =============================================
-- TRACEABILITY LOTS POLICIES
-- =============================================

CREATE POLICY "lots_select" ON public.traceability_lots
  FOR SELECT
  USING (
    public.is_system_admin() OR
    organization_id = public.get_user_organization()
  );

CREATE POLICY "lots_insert" ON public.traceability_lots
  FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization()
    AND public.can_modify_data()
  );

CREATE POLICY "lots_update" ON public.traceability_lots
  FOR UPDATE
  USING (
    organization_id = public.get_user_organization()
    AND public.can_modify_data()
  );

CREATE POLICY "lots_delete" ON public.traceability_lots
  FOR DELETE
  USING (
    organization_id = public.get_user_organization()
    AND public.get_user_role() IN ('system_admin', 'org_admin', 'manager')
  );

-- =============================================
-- CTE EVENTS POLICIES (applies to all CTE tables)
-- =============================================

CREATE POLICY "cte_events_select" ON public.cte_events
  FOR SELECT
  USING (
    public.is_system_admin() OR
    organization_id = public.get_user_organization()
  );

CREATE POLICY "cte_events_insert" ON public.cte_events
  FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization()
    AND public.can_modify_data()
  );

CREATE POLICY "cte_events_update" ON public.cte_events
  FOR UPDATE
  USING (
    organization_id = public.get_user_organization()
    AND public.can_modify_data()
  );

CREATE POLICY "cte_events_delete" ON public.cte_events
  FOR DELETE
  USING (
    organization_id = public.get_user_organization()
    AND public.get_user_role() IN ('system_admin', 'org_admin', 'manager')
  );

-- Apply same policies to all CTE-specific tables
CREATE POLICY "cte_lot_links_all" ON public.cte_lot_links FOR ALL USING (true);
CREATE POLICY "cte_harvesting_all" ON public.cte_harvesting FOR ALL USING (true);
CREATE POLICY "cte_cooling_all" ON public.cte_cooling FOR ALL USING (true);
CREATE POLICY "cte_initial_packing_all" ON public.cte_initial_packing FOR ALL USING (true);
CREATE POLICY "cte_first_receiver_all" ON public.cte_first_receiver FOR ALL USING (true);
CREATE POLICY "cte_shipping_all" ON public.cte_shipping FOR ALL USING (true);
CREATE POLICY "cte_receiving_all" ON public.cte_receiving FOR ALL USING (true);
CREATE POLICY "cte_transformation_all" ON public.cte_transformation FOR ALL USING (true);
CREATE POLICY "transformation_inputs_all" ON public.transformation_inputs FOR ALL USING (true);

-- =============================================
-- SUPPLY CHAIN PARTNERS POLICIES
-- =============================================

CREATE POLICY "partners_select" ON public.supply_chain_partners
  FOR SELECT
  USING (
    public.is_system_admin() OR
    organization_id = public.get_user_organization()
  );

CREATE POLICY "partners_insert" ON public.supply_chain_partners
  FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization()
    AND public.can_modify_data()
  );

CREATE POLICY "partners_update" ON public.supply_chain_partners
  FOR UPDATE
  USING (
    organization_id = public.get_user_organization()
    AND public.can_modify_data()
  );

CREATE POLICY "partners_delete" ON public.supply_chain_partners
  FOR DELETE
  USING (
    organization_id = public.get_user_organization()
    AND public.get_user_role() IN ('system_admin', 'org_admin', 'manager')
  );

-- =============================================
-- AUDIT LOG POLICIES
-- =============================================

-- Users can view audit logs for their organization
CREATE POLICY "audit_log_select" ON public.audit_log
  FOR SELECT
  USING (
    public.is_system_admin() OR
    organization_id = public.get_user_organization()
  );

-- System can insert audit logs (no user restrictions)
CREATE POLICY "audit_log_insert" ON public.audit_log
  FOR INSERT
  WITH CHECK (true);

-- No updates or deletes on audit log
-- (Audit logs are immutable)

-- =============================================
-- FDA REQUESTS POLICIES
-- =============================================

CREATE POLICY "fda_requests_select" ON public.fda_requests
  FOR SELECT
  USING (
    public.is_system_admin() OR
    organization_id = public.get_user_organization()
  );

CREATE POLICY "fda_requests_insert" ON public.fda_requests
  FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization()
    AND public.get_user_role() IN ('system_admin', 'org_admin', 'manager')
  );

CREATE POLICY "fda_requests_update" ON public.fda_requests
  FOR UPDATE
  USING (
    organization_id = public.get_user_organization()
    AND public.get_user_role() IN ('system_admin', 'org_admin', 'manager')
  );

-- =============================================
-- COMPLIANCE REPORTS POLICIES
-- =============================================

CREATE POLICY "compliance_reports_select" ON public.compliance_reports
  FOR SELECT
  USING (
    public.is_system_admin() OR
    organization_id = public.get_user_organization()
  );

CREATE POLICY "compliance_reports_insert" ON public.compliance_reports
  FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization()
    AND public.get_user_role() IN ('system_admin', 'org_admin', 'manager')
  );

CREATE POLICY "compliance_reports_update" ON public.compliance_reports
  FOR UPDATE
  USING (
    organization_id = public.get_user_organization()
    AND public.get_user_role() IN ('system_admin', 'org_admin', 'manager')
  );
