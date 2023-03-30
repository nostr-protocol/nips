#!/bin/bash

# Create graph dot file
echo "digraph {" > dependency_graph.dot

# Loop over files in current directory starting with two or more numbers and ending in .md
for file in [0-9][0-9]*.md; do
  # Check if file exists
  if [ -e "$file" ]; then

    current_nip=$(echo $file | grep -o "^[0-9]\+")

    # Add NIP label for node
    title=$(echo "$(head -n 1 "$file"): $(sed '4q;d' "$file" | sed 's/"/\\"/g' | sed 's/\`//g')")
    echo -e "\t${current_nip} [label=\"${title}\"]" >> dependency_graph.dot

    # Extract NIP dependencies
    depends=$(grep -o "depends:[0-9]\+" "$file" | grep -o "[0-9]\+")
    if [ -n "$depends" ]; then
      # Add graph dependency edge
      for dep_nip in $depends; do
        echo -e "\t${current_nip}->${dep_nip}" >> dependency_graph.dot
      done
    fi
  fi
done

# Close graph file
echo -n "}" >> dependency_graph.dot

# Generate dependency graph
dot -Tsvg dependency_graph.dot > dependency_graph.svg
