#!/usr/bin/env python3

import os
import json
import subprocess
import shutil
import sys
from pathlib import Path

M2_REPO = Path.home() / ".m2" / "repository"
TARGET_REPO = Path("./repository")
PRISM_ZIP = Path.home() / "Documents" / "ornithe-prism-instance.zip"
MANIFEST = Path("./manifest.json")
TREE_FILE = Path("./repository-tree.json")


def build_tree(path):
    """Build directory tree structure for repository-tree.json."""
    tree = {"children": {}}
    for entry in sorted(os.listdir(path)):
        full_path = os.path.join(path, entry)
        if os.path.isdir(full_path):
            tree["children"][entry] = build_tree(full_path)
        else:
            tree["children"][entry] = {}
    return tree


def regenerate_tree():
    """Regenerate repository-tree.json from current repository state."""
    if TARGET_REPO.is_dir():
        tree = build_tree(str(TARGET_REPO))
        with open(TREE_FILE, "w") as f:
            json.dump(tree, f)


def list_artifacts():
    """List all artifacts in the manifest with their versions."""
    if not MANIFEST.exists():
        print("No manifest.json found.")
        return []

    with open(MANIFEST) as f:
        data = json.load(f)

    # Group by artifact
    artifacts = {}
    for jar in data.get("jars", []):
        key = f"{jar['group']}:{jar['artifact']}"
        if key not in artifacts:
            artifacts[key] = []
        artifacts[key].append(jar)

    return artifacts


def delete_artifact():
    """Interactive deletion of maven artifacts."""
    artifacts = list_artifacts()
    if not artifacts:
        return

    # Display artifacts
    print("\nAvailable artifacts:\n")
    artifact_list = list(artifacts.keys())
    for i, key in enumerate(artifact_list, 1):
        versions = [jar['version'] for jar in artifacts[key]]
        print(f"  {i}. {key}")
        for v in versions:
            print(f"      - {v}")

    print(f"\n  0. Cancel")

    # Select artifact
    try:
        choice = input("\nSelect artifact number: ").strip()
        if choice == "0" or choice == "":
            print("Cancelled.")
            return
        idx = int(choice) - 1
        if idx < 0 or idx >= len(artifact_list):
            print("Invalid selection.")
            return
    except ValueError:
        print("Invalid input.")
        return

    selected_key = artifact_list[idx]
    versions = artifacts[selected_key]

    # If multiple versions, ask which to delete
    if len(versions) > 1:
        print(f"\nVersions of {selected_key}:")
        for i, jar in enumerate(versions, 1):
            print(f"  {i}. {jar['version']}")
        print(f"  A. All versions")
        print(f"  0. Cancel")

        version_choice = input("\nSelect version(s) to delete: ").strip()
        if version_choice == "0" or version_choice == "":
            print("Cancelled.")
            return
        elif version_choice.lower() == "a":
            to_delete = versions
        else:
            try:
                v_idx = int(version_choice) - 1
                if v_idx < 0 or v_idx >= len(versions):
                    print("Invalid selection.")
                    return
                to_delete = [versions[v_idx]]
            except ValueError:
                print("Invalid input.")
                return
    else:
        to_delete = versions

    # Confirm deletion
    print("\nWill delete:")
    for jar in to_delete:
        print(f"  - {jar['group']}:{jar['artifact']}:{jar['version']}")
        print(f"    Path: {jar['path']}")

    confirm = input("\nConfirm deletion? (y/N): ").strip().lower()
    if confirm != "y":
        print("Cancelled.")
        return

    # Delete from filesystem
    for jar in to_delete:
        jar_path = Path(jar['path'])
        version_dir = jar_path.parent

        if version_dir.exists():
            print(f"Deleting {version_dir}...")
            shutil.rmtree(version_dir)

            # Clean up empty parent directories
            parent = version_dir.parent
            while parent != TARGET_REPO and parent.exists():
                if not any(parent.iterdir()):
                    print(f"Removing empty directory {parent}...")
                    parent.rmdir()
                    parent = parent.parent
                else:
                    break

    # Update manifest.json
    with open(MANIFEST) as f:
        data = json.load(f)

    deleted_paths = {jar['path'] for jar in to_delete}
    data['jars'] = [j for j in data['jars'] if j['path'] not in deleted_paths]

    with open(MANIFEST, "w") as f:
        json.dump(data, f, indent=2)

    # Regenerate tree
    print("Regenerating repository-tree.json...")
    regenerate_tree()

    print("Done! Artifacts deleted.")


def sync():
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
    regenerate_tree()

    print("Done! Files synced and manifests generated.")


def main():
    if len(sys.argv) < 2:
        sync()
    elif sys.argv[1] == "delete":
        delete_artifact()
    elif sys.argv[1] == "sync":
        sync()
    elif sys.argv[1] == "list":
        artifacts = list_artifacts()
        if artifacts:
            print("\nArtifacts in repository:\n")
            for key, versions in artifacts.items():
                print(f"  {key}")
                for jar in versions:
                    print(f"    - {jar['version']}")
    else:
        print("Usage: sync-m2.py [sync|delete|list]")
        print("  sync   - Sync from ~/.m2 and update manifests (default)")
        print("  delete - Interactively delete artifacts")
        print("  list   - List all artifacts")


if __name__ == "__main__":
    main()
