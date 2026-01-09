import re
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent

def fix_app_error_constructor(content: str) -> str:
    # Sửa lỗi ngoặc đơn lồng nhau trong pattern
    pattern = r'new AppError\(\s*"([A-Z_]+)"\s*,\s*"([^"]+)"\s*(?:,\s*(\d+))?\s*\)'
    def replacer(match):
        code, message, status = match.group(1), match.group(2), match.group(3)
        if status: return f'new AppError("{message}", ErrorCode.{code}, {status})'
        return f'new AppError("{message}", ErrorCode.{code})'
    return re.sub(pattern, replacer, content)

def fix_handle_error_context(content: str) -> str:
    # Pattern linh hoạt hơn cho dấu ngoặc
    pattern = r'handleError\(\s*(\w+)\s*,\s*["\']([^"\']+)["\']\s*\)'
    return re.sub(pattern, r'handleError(\1, { endpoint: "\2" })', content)

def fix_nextjs_params(content: str, is_route_handler: bool = False) -> str:
    if is_route_handler:
        pattern = r'\{\s*params\s*\}:\s*\{\s*params:\s*\{([^}]+)\}\s*\}'
        content = re.sub(pattern, r'{ params }: { params: Promise<{\1}> }', content)
        if 'params.' in content and 'await params' not in content:
            content = re.sub(r'params\.(\w+)', r'(await params).\1', content)
    return content

def fix_file(file_path: Path) -> bool:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()
        content = original_content
        is_route = '/api/' in str(file_path) or '/route.ts' in str(file_path)
        
        content = fix_app_error_constructor(content)
        content = fix_handle_error_context(content)
        content = fix_nextjs_params(content, is_route)

        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"❌ Error fixing {file_path}: {e}")
        return False

def main():
    print("🔧 Đang chạy bản sửa lỗi TypeScript (Updated)...")
    files_to_fix = [
        "app/api/admin/invoices/route.ts", "app/api/analytics/overview/route.ts",
        "app/api/approvals/list/route.ts", "app/api/audit-logs/route.ts",
        "app/api/batch/create-lots-from-harvest/route.ts", "app/api/batch/mass-transformation/route.ts",
        "app/api/dashboards/compliance/route.ts", "app/api/dashboards/loss-rate-trend/route.ts",
        "app/api/email/send/route.ts", "app/api/exports/fda-package/route.ts",
        "app/api/fda/generate-report/[requestId]/route.ts", "app/api/invoices/[id]/upload-proof/route.ts",
        "app/api/invoices/create/route.ts", "app/api/lots/[id]/dispose/route.ts",
        "app/api/lots/[id]/extend-shelf-life/route.ts", "app/api/lots/expiring/route.ts",
        "app/api/notifications/mark-all-read/route.ts", "app/api/partners/lot-chain/[lotCode]/route.ts",
        "app/api/recalls/initiate/route.ts", "app/api/reports/[id]/download/route.ts",
        "app/api/subscriptions/[id]/customize-quota/route.ts", "app/api/subscriptions/[id]/route.ts",
        "app/api/vexim/export-lot-report/route.ts", "app/api/vexim/fda-registrations/route.ts",
        "app/api/vexim/register-fda/route.ts", "app/auth/callback/route.ts",
        "app/dashboard/admin/fda-registrations/page.tsx", "app/dashboard/admin/invoices/page.tsx",
        "app/dashboard/admin/packages/page.tsx", "app/dashboard/cte-events/new/page.tsx",
        "app/dashboard/cte-events/page.tsx", "app/dashboard/fda-compliance/page.tsx",
        "app/dashboard/fda-requests/page.tsx", "app/dashboard/invoices/page.tsx",
        "app/dashboard/locations/[id]/page.tsx", "app/dashboard/locations/page.tsx",
        "app/dashboard/organizations/[id]/page.tsx", "app/dashboard/organizations/page.tsx",
        "app/dashboard/settings/fda/page.tsx", "components/address-autocomplete.tsx",
        "components/fsma/collapsible-sidebar.tsx", "components/fsma/notification-dropdown.tsx",
        "components/fsma/traceability-chain-viewer.tsx", "lib/create-notification.ts",
        "lib/notifications.ts", "lib/vexim-validation.ts"
    ]
    
    fixed_count = 0
    for relative_path in files_to_fix:
        file_path = PROJECT_ROOT / relative_path
        if file_path.exists() and fix_file(file_path):
            print(f"✅ Fixed: {relative_path}")
            fixed_count += 1
    print(f"\n✨ Xong! Đã sửa {fixed_count} file.")

if __name__ == "__main__":
    main()