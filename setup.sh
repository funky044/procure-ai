#!/bin/bash
# Run this after extracting the zip to fix Next.js dynamic route folders

echo "🔧 Fixing Next.js dynamic route folders..."

# Rename __id__ back to [id]
if [ -d "app/requests/__id__" ]; then
  mv "app/requests/__id__" "app/requests/[id]"
  echo "✅ Renamed app/requests/[id]"
fi

if [ -d "app/api/requests/__id__" ]; then
  mv "app/api/requests/__id__" "app/api/requests/[id]"
  echo "✅ Renamed app/api/requests/[id]"
fi

# Rename __nextauth__ back to [...nextauth]
if [ -d "app/api/auth/__nextauth__" ]; then
  mv "app/api/auth/__nextauth__" "app/api/auth/[...nextauth]"
  echo "✅ Renamed app/api/auth/[...nextauth]"
fi

echo ""
echo "✨ Done! Now run:"
echo "   npm install"
echo "   npm run dev"
