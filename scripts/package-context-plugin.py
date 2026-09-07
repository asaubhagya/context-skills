#!/usr/bin/env python3
"""Build reproducible portal skill ZIPs from the stable git snapshot (stdlib only)."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import zipfile


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def safe_path(value):
    if not isinstance(value, str) or not value or '\\' in value or '\x00' in value:
        raise ValueError(f'Unsafe path: {value!r}')
    if value.startswith('/') or any(p in ('', '.', '..') for p in value.split('/')) or ':' in value:
        raise ValueError(f'Unsafe path: {value!r}')
    return value


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], stderr=subprocess.PIPE)


def blob(repo, sha, path):
    safe_path(path)
    # Reject symlinks, directories and submodules even though git show cannot escape Git.
    entry = git(repo, 'ls-tree', sha, '--', path).decode().strip()
    if not entry.startswith(('100644 blob ', '100755 blob ')):
        raise ValueError(f'Missing or non-regular source file: {path}')
    return git(repo, 'show', f'{sha}:{path}')


def zip_bytes(files):
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w', compression=zipfile.ZIP_STORED) as archive:
        for path, data in sorted(files.items()):
            info = zipfile.ZipInfo(safe_path(path), (1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
    return stream.getvalue()


def build(repo, source_ref='HEAD'):
    source = git(repo, 'rev-parse', '--verify', f'{source_ref}^{{commit}}').decode().strip()
    channels = json.loads(blob(repo, source, 'channels.json'))
    stable = channels['latest']['sha']
    if not re.fullmatch(r'[0-9a-f]{40}', stable):
        raise ValueError('latest.sha must be a full commit SHA')
    if git(repo, 'rev-parse', '--verify', f'{stable}^{{commit}}').decode().strip() != stable:
        raise ValueError('Stable commit unavailable')
    manifest_bytes = blob(repo, stable, 'manifest.json')
    manifest = json.loads(manifest_bytes)
    skills = {}
    for skill in manifest['skills']:
        key = skill['key']
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', key) or key in skills:
            raise ValueError(f'Invalid or duplicate skill key: {key}')
        skills[key] = skill
    selected = set()
    visiting = set()

    def visit(key):
        if key not in skills:
            raise ValueError(f'Missing dependency: {key}')
        if key in visiting:
            raise ValueError(f'Dependency cycle: {key}')
        if key in selected:
            return
        visiting.add(key)
        for dep in skills[key]['deps']:
            visit(dep)
        visiting.remove(key)
        selected.add(key)

    for key, skill in skills.items():
        if skill['product'] == 'context':
            visit(key)
    if 'context' not in selected:
        raise ValueError('Context skill missing')
    guide = blob(repo, stable, 'GUIDE.md')
    license_text = blob(repo, stable, 'LICENSE')
    outputs = {}
    records = []
    for key in sorted(selected):
        skill = skills[key]
        if skill['license'] != 'MIT':
            raise ValueError(f'{key}: unsupported license; review redistribution first')
        files = {}
        inputs = []
        for file in skill['files']:
            path = safe_path(file['path'])
            if path in files or path in ('GUIDE.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md'):
                raise ValueError(f'{key}: duplicate/reserved destination {path}')
            data = blob(repo, stable, file['src'])
            if len(data) != file['bytes'] or sha256(data) != file['sha256']:
                raise ValueError(f'Hash/size mismatch: {file["src"]}')
            files[path] = data
            inputs.append(file)
        if 'SKILL.md' not in files or not any(f['src'] == skill['primary'] and f['path'] == 'SKILL.md' for f in inputs):
            raise ValueError(f'{key}: primary SKILL.md missing')
        files['GUIDE.md'] = guide
        files['LICENSE'] = license_text
        if skill['source_url']:
            if b'Matt Pocock' not in license_text or 'github.com/mattpocock/skills/' not in skill['source_url']:
                raise ValueError(f'{key}: third-party attribution needs review')
            files['THIRD_PARTY_NOTICES.md'] = (f'# Third-party attribution\n\n{key}: Matt Pocock, MIT.\nSource: {skill["source_url"]}\n\nFull copyright and permission notice: LICENSE.\n').encode()
        name = f'{key}.zip'
        outputs[name] = zip_bytes({f'{key}/{path}': data for path, data in files.items()})
        records.append({'key': key, 'version': skill['version'], 'product': skill['product'], 'dependencies': skill['deps'], 'files': inputs, 'archive': name})
    provenance = {'schema': 'context-plugin-package/1', 'product': 'context', 'stable_sha': stable,
                  'source': 'https://agents.onecontext.me', 'manifest_sha256': sha256(manifest_bytes),
                  'guide_sha256': sha256(guide), 'license_sha256': sha256(license_text),
                  'skills': records, 'archives': {name: sha256(data) for name, data in sorted(outputs.items())}}
    outputs['provenance.json'] = (json.dumps(provenance, indent=2, sort_keys=True) + '\n').encode()
    outputs['SHA256SUMS'] = ''.join(f'{sha256(data)}  {name}\n' for name, data in sorted(outputs.items())).encode()
    return stable, outputs


def write_site(root, stable, outputs):
    destination = root / 'downloads' / 'context' / stable
    destination.mkdir(parents=True, exist_ok=True)
    for name, data in outputs.items():
        path = destination / name
        if path.exists() and path.read_bytes() != data:
            raise ValueError(f'Immutable download differs: {path}')
        path.write_bytes(data)
    return destination


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument('--source-ref', default='HEAD', help='Commit containing canonical channels.json; defaults to HEAD')
    output = parser.add_mutually_exclusive_group(required=True)
    output.add_argument('--out', type=Path, help='New or empty artifact directory')
    output.add_argument('--site-out', type=Path, help='Site root: write repeatable immutable downloads')
    args = parser.parse_args()
    stable, outputs = build(args.repo, args.source_ref)
    if args.site_out:
        destination = write_site(args.site_out, stable, outputs)
        print(f'Packaged Context stable {stable} at {destination}')
        return
    if args.out.exists() and any(args.out.iterdir()):
        parser.error('--out must be new or empty (prevent stale upload files)')
    args.out.mkdir(parents=True, exist_ok=True)
    for name, data in outputs.items():
        (args.out / name).write_bytes(data)
    print(f'Packaged Context stable {stable}: {len(outputs) - 2} skill ZIPs in {args.out}')


if __name__ == '__main__':
    main()
