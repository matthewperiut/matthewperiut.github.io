#!/usr/bin/env python3

import os
import json
import subprocess
import shutil
from pathlib import Path

M2_REPO = Path.home() / ".m2" / "repository"
TARGET_REPO = Path("./repository")
PRISM_ZIP = Path.home() / "Documents" / "ornithe-prism-instance.zip"
MANIFEST = Path("./manifest.json")

def main():
    print("Syncing Maven repository...")
    subprocess.run([
        "rsync", "-av", "--ignore-existing",
        f"{M2_REPO}/", f"{TARGET_REPO}/"
    ])

    print("Copying Prism instance...")
    dest_zip = Path("./ornithe-prism-instance.zip")
    if not dest_zip.exists() and PRISM_ZIP.exists():
        shutil.copy(PRISM_ZIP, dest_zip)
    elif not PRISM_ZIP.exists():
        print("Prism zip not found")
    else:
        print("Prism zip already exists")

    # Load existing metadata from manifest.json
    metadata = {}
    if MANIFEST.exists():
        try:
            with open(MANIFEST) as f:
                data = json.load(f)
            for jar in data.get("jars", []):
                path = jar["path"].replace("repository/", "", 1)
                metadata[path] = {
                    "repo": jar.get("repo", ""),
                    "branch": jar.get("branch", ""),
                    "commit": jar.get("commit", "")
                }
        except (json.JSONDecodeError, KeyError):
            pass

    print("\nCollecting metadata for artifacts...")

    # Find all jars
    jar_list = sorted([
        p for p in TARGET_REPO.rglob("*.jar")
        if "/submodule/" not in str(p)
        and not p.name.endswith("-sources.jar")
        and not p.name.endswith("-javadoc.jar")
        and not p.name.endswith("-tests.jar")
        and not p.name.endswith("-test.jar")
        and not p.name.endswith("-dev.jar")
    ])

    # Ask for metadata for new jars
    for jar in jar_list:
        rel_path = str(jar).replace("repository/", "", 1)
        if rel_path.startswith("./"):
            rel_path = rel_path[2:]
        rel_path = rel_path.replace("repository/", "", 1)

        if rel_path not in metadata:
            print(f"\nNew artifact: {jar.name}")
            print(f"Path: {rel_path}")

            repo = input("  GitHub repo (e.g. user/repo, or blank to skip): ").strip()
            if repo:
                branch = input("  Branch: ").strip()
                commit = input("  Commit hash: ").strip()
                metadata[rel_path] = {"repo": repo, "branch": branch, "commit": commit}
            else:
                metadata[rel_path] = {"repo": "", "branch": "", "commit": ""}

    print("\nGenerating manifest.json...")

    # Generate manifest
    jars_data = []
    for jar in jar_list:
        rel_path = str(jar).replace("repository/", "", 1)
        if rel_path.startswith("./"):
            rel_path = rel_path[2:]
        rel_path = rel_path.replace("repository/", "", 1)

        version = jar.parent.name
        artifact = jar.parent.parent.name
        group = str(jar.parent.parent.parent).replace("repository/", "", 1)
        if group.startswith("./"):
            group = group[2:]
        group = group.replace("repository/", "", 1).replace("/", ".")

        meta = metadata.get(rel_path, {"repo": "", "branch": "", "commit": ""})

        jars_data.append({
            "group": group,
            "artifact": artifact,
            "version": version,
            "path": f"repository/{rel_path}",
            "repo": meta["repo"],
            "branch": meta["branch"],
            "commit": meta["commit"]
        })

    with open(MANIFEST, "w") as f:
        json.dump({"jars": jars_data}, f, indent=2)

    print("Generating repository-tree.json...")

    def build_tree(path):
        tree = {"children": {}}
        for entry in sorted(os.listdir(path)):
            full_path = os.path.join(path, entry)
            if os.path.isdir(full_path):
                tree["children"][entry] = build_tree(full_path)
            else:
                tree["children"][entry] = {}
        return tree

    if TARGET_REPO.is_dir():
        tree = build_tree(str(TARGET_REPO))
        with open("repository-tree.json", "w") as f:
            json.dump(tree, f)

    print("Done! Files synced and manifests generated.")

if __name__ == "__main__":
    main()
