#!/bin/bash

echo "Testing GitHub repository loading..."
echo "Replace YOUR_USERNAME and YOUR_REPO below:"

# Test your specific repository
curl -v -X POST http://localhost:4000/api/parse-github \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "YOUR_USERNAME",
    "repo": "YOUR_REPO", 
    "branch": "main"
  }' 2>&1 | tee github-test-results.txt

echo ""
echo "Results saved to github-test-results.txt"
echo "Look for detailed error messages above"