#!/bin/bash
# Add main field to package.json for Electron

python3 << 'EOF'
import json

with open('package.json', 'r') as f:
    data = json.load(f)

# Add main field pointing to electron entry point
data['main'] = 'electron/main.js'

# Also add description and author to quiet the warnings
if 'description' not in data:
    data['description'] = 'Marine Predictive Maintenance & Scheduling System'

if 'author' not in data:
    data['author'] = 'ARUS Team'

with open('package.json', 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')

print('✅ Added main field: electron/main.js')
print('✅ Added description and author')
EOF
