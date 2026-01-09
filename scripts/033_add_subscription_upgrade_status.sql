-- Add support for upgrade/downgrade subscription status

-- Add new subscription statuses for upgrade/downgrade flow
ALTER TABLE organization_subscriptions 
DROP CONSTRAINT IF EXISTS organization_subscriptions_subscription_status_check;

ALTER TABLE organization_subscriptions 
ADD CONSTRAINT organization_subscriptions_subscription_status_check 
CHECK (subscription_status IN ('active', 'pending', 'cancelled', 'expired', 'suspended', 'pending_upgrade', 'pending_downgrade'));

-- Add comment
COMMENT ON COLUMN organization_subscriptions.subscription_status IS 'Subscription status: active, pending, cancelled, expired, suspended, pending_upgrade (waiting payment for upgrade), pending_downgrade (waiting payment for downgrade)';
