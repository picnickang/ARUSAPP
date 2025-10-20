#!/bin/bash
# Fix package.json - Move electron packages to devDependencies

echo "Fixing package.json..."

# Create a backup
cp package.json package.json.backup

# Use Python to properly edit the JSON
python3 << 'EOF'
import json

with open('package.json', 'r') as f:
    data = json.load(f)

# Remove from dependencies if present
if 'electron' in data.get('dependencies', {}):
    electron_version = data['dependencies'].pop('electron')
    print(f"Removed electron {electron_version} from dependencies")
    
if 'electron-builder' in data.get('dependencies', {}):
    builder_version = data['dependencies'].pop('electron-builder')
    print(f"Removed electron-builder {builder_version} from dependencies")
    
    # Add to devDependencies
    if 'devDependencies' not in data:
        data['devDependencies'] = {}
    
    data['devDependencies']['electron'] = electron_version
    data['devDependencies']['electron-builder'] = builder_version
    print(f"Added electron and electron-builder to devDependencies")

# Write back
with open('package.json', 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')

print("✅ package.json fixed!")
EOF

echo ""
echo "Changes made:"
echo "-------------"
grep -A 1 '"electron"' package.json || echo "Not found in package.json"
echo ""
echo "Backup saved as package.json.backup"
