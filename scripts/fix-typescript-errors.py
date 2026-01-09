import os
import re
from pathlib import Path

def fix_app_error_calls(content):
    """Fix AppError constructor calls from (code, message, status) to (message, code, status)"""
    # Pattern: new AppError("CODE", "message", status)
    pattern = r'new AppError$$"([A-Z_]+)",\s*"([^"]+)",\s*(\d+)$$'
    replacement = r'new AppError("\2", ErrorCode.\1, \3)'
    content = re.sub(pattern, replacement, content)
    
    # Also handle cases already using ErrorCode prefix
    pattern2 = r'new AppError$$ErrorCode\.([A-Z_]+),\s*"([^"]+)",\s*(\d+)$$'
    replacement2 = r'new AppError("\2", ErrorCode.\1, \3)'
    content = re.sub(pattern2, replacement2, content)
    
    return content

def fix_handle_error_calls(content):
    """Fix handleError calls from string context to object context"""
    # Pattern: handleError(error, "string context")
    pattern = r'handleError$$error,\s*"([^"]+)"$$'
    replacement = r'handleError(error, { endpoint: "\1" })'
    content = re.sub(pattern, replacement, content)
    
    return content

def fix_params_in_route(content):
    """Fix params from synchronous to async in Next.js 16 route handlers"""
    # Pattern 1: { params }: { params: { id: string } }
    # Replace with: { params }: { params: Promise<{ id: string }> }
    pattern1 = r'\{\s*params\s*\}:\s*\{\s*params:\s*\{([^}]+)\}\s*\}'
    replacement1 = r'{ params }: { params: Promise<{\1}> }'
    content = re.sub(pattern1, replacement1, content)
    
    # Add await for params access
    # Pattern: params.id or params.lotCode etc
    # Need to add: const { id } = await params before usage
    
    return content

def add_error_code_import(content):
    """Add ErrorCode import if using ErrorCode but not imported"""
    if 'ErrorCode.' in content and 'import' in content:
        # Check if ErrorCode is already imported from error-handler
        if 'import' in content and 'error-handler' in content:
            # Check if ErrorCode is in the import
            import_pattern = r'import\s*\{([^}]+)\}\s*from\s*["\']@/lib/security/error-handler["\']'
            match = re.search(import_pattern, content)
            if match:
                imports = match.group(1)
                if 'ErrorCode' not in imports:
                    # Add ErrorCode to imports
                    new_imports = imports.strip() + ', ErrorCode'
                    content = re.sub(import_pattern, f'import {{ {new_imports} }} from "@/lib/security/error-handler"', content)
        else:
            # Need to add the import
            if 'import { handleError, AppError }' in content:
                content = content.replace(
                    'import { handleError, AppError }',
                    'import { handleError, AppError, ErrorCode }'
                )
    return content

def process_file(filepath):
    """Process a single TypeScript file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Apply fixes
        content = add_error_code_import(content)
        content = fix_app_error_calls(content)
        content = fix_handle_error_calls(content)
        content = fix_params_in_route(content)
        
        # Only write if content changed
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Fixed: {filepath}")
            return True
        return False
    except Exception as e:
        print(f"✗ Error processing {filepath}: {e}")
        return False

def main():
    """Main function to fix all TypeScript errors"""
    api_dir = Path('app/api')
    
    if not api_dir.exists():
        print(f"Error: {api_dir} not found")
        return
    
    # Find all route.ts files
    route_files = list(api_dir.rglob('*.ts'))
    
    print(f"Found {len(route_files)} TypeScript files in app/api")
    print("Fixing TypeScript errors...\n")
    
    fixed_count = 0
    for filepath in route_files:
        if process_file(filepath):
            fixed_count += 1
    
    print(f"\n✓ Fixed {fixed_count} files")
    print("\nPlease run 'npx tsc --noEmit' to verify all errors are fixed")

if __name__ == "__main__":
    main()
