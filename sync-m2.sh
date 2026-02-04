#!/bin/bash

# Sync .m2 repository to this directory without overriding existing files
# Also generates manifest.json for the web interface

M2_REPO="$HOME/.m2/repository"
TARGET_REPO="./repository"
PRISM_ZIP="$HOME/Documents/ornithe-prism-instance.zip"
MANIFEST="./manifest.json"

echo "Syncing Maven repository..."
rsync -av --ignore-existing --exclude='**/submodule/**' "$M2_REPO/" "$TARGET_REPO/"

echo "Copying Prism instance..."
cp -n "$PRISM_ZIP" ./ornithe-prism-instance.zip 2>/dev/null || echo "Prism zip already exists or not found"

# Load existing metadata from manifest.json
declare -A meta_repo meta_branch meta_commit
if [ -f "$MANIFEST" ]; then
    while IFS= read -r line; do
        key=$(echo "$line" | cut -d'|' -f1)
        repo=$(echo "$line" | cut -d'|' -f2)
        branch=$(echo "$line" | cut -d'|' -f3)
        commit=$(echo "$line" | cut -d'|' -f4)
        meta_repo["$key"]="$repo"
        meta_branch["$key"]="$branch"
        meta_commit["$key"]="$commit"
    done < <(python3 -c "
import json
with open('$MANIFEST') as f:
    data = json.load(f)
for jar in data.get('jars', []):
    path = jar['path'].replace('repository/', '', 1)
    print(f\"{path}|{jar.get('repo','')}|{jar.get('branch','')}|{jar.get('commit','')}\")
" 2>/dev/null)
fi

echo ""
echo "Collecting metadata for artifacts..."

# Collect all jars
declare -a jar_list
while IFS= read -r jar; do
    jar_list+=("$jar")
done < <(find ./repository -name "*.jar" -type f \
    ! -path "*/submodule/*" \
    ! -name "*-sources.jar" \
    ! -name "*-javadoc.jar" \
    ! -name "*-tests.jar" \
    ! -name "*-test.jar" \
    ! -name "*-dev.jar" \
    | sort)

# Ask for metadata for new jars
for jar in "${jar_list[@]}"; do
    rel_path="${jar#./repository/}"

    if [ -z "${meta_repo[$rel_path]+set}" ]; then
        filename=$(basename "$jar")
        echo ""
        echo "New artifact: $filename"
        echo "Path: $rel_path"

        read -p "  GitHub repo (e.g. user/repo, or blank to skip): " repo
        if [ -n "$repo" ]; then
            read -p "  Branch: " branch
            read -p "  Commit hash: " commit
            meta_repo["$rel_path"]="$repo"
            meta_branch["$rel_path"]="$branch"
            meta_commit["$rel_path"]="$commit"
        else
            meta_repo["$rel_path"]=""
            meta_branch["$rel_path"]=""
            meta_commit["$rel_path"]=""
        fi
    fi
done

echo ""
echo "Generating manifest.json..."

# Generate manifest
cat > "$MANIFEST" << 'HEADER'
{
  "jars": [
HEADER

first=true
for jar in "${jar_list[@]}"; do
    rel_path="${jar#./repository/}"

    filename=$(basename "$jar")
    dir=$(dirname "$jar")
    version=$(basename "$dir")
    artifact_dir=$(dirname "$dir")
    artifact=$(basename "$artifact_dir")
    group_dir=$(dirname "$artifact_dir")
    group=$(echo "${group_dir#./repository/}" | tr '/' '.')

    repo="${meta_repo[$rel_path]}"
    branch="${meta_branch[$rel_path]}"
    commit="${meta_commit[$rel_path]}"

    if [ "$first" = true ]; then
        first=false
    else
        echo "," >> "$MANIFEST"
    fi

    printf '    {"group": "%s", "artifact": "%s", "version": "%s", "path": "repository/%s", "repo": "%s", "branch": "%s", "commit": "%s"}' \
        "$group" "$artifact" "$version" "$rel_path" "$repo" "$branch" "$commit" >> "$MANIFEST"
done

cat >> "$MANIFEST" << 'FOOTER'

  ]
}
FOOTER

echo "Generating repository-tree.json..."

python3 << 'PYTHONSCRIPT'
import os
import json

def build_tree(path):
    tree = {"children": {}}
    for entry in sorted(os.listdir(path)):
        full_path = os.path.join(path, entry)
        if os.path.isdir(full_path):
            tree["children"][entry] = build_tree(full_path)
        else:
            tree["children"][entry] = {}
    return tree

if os.path.isdir("./repository"):
    tree = build_tree("./repository")
    with open("repository-tree.json", "w") as f:
        json.dump(tree, f)
PYTHONSCRIPT

echo "Done! Files synced and manifests generated."
