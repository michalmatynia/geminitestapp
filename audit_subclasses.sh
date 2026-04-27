for file in src/shared/lib/browser-execution/sequencers/{TraderaListingFormCategorySequencer.ts,TraderaSequencer.ts,VintedSequencer.ts}; do
  echo "Auditing: $file"
  grep -hE "^  (protected|public|async) " "$file" | \
  grep -v "constructor" | \
  sed 's/^[ ]*//' | \
  sort | uniq > temp_methods.txt
  
  while read -r line; do
    # Remove everything after the brace to just check the signature.
    sig="${line%%\{*}"
    # Search for this signature in the base class methods.
    if grep -qF "$sig" base_playwright_methods.txt; then
      if ! echo "$line" | grep -q "override"; then
        echo "  [MISSING OVERRIDE]: $line"
      fi
    fi
  done < temp_methods.txt
done
