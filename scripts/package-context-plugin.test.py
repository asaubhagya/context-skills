import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
sys.dont_write_bytecode = True
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('package_context_plugin', Path(__file__).with_name('package-context-plugin.py'))
pkg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pkg)


class PackagingTests(unittest.TestCase):
    def fixture(self, mutate=lambda m: None):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        repo = Path(temp.name)
        subprocess.run(['git', 'init', '-q', str(repo)], check=True)
        for key, value in [('user.name', 'Test'), ('user.email', 'test@example.com')]:
            pkg.git(repo, 'config', key, value)
        skills = []
        for key, product, deps in [('context', 'context', ['helper']), ('helper', 'shared', []), ('site', 'context-sites', [])]:
            path = f'skills/{key}/SKILL.md'
            data = f'# {key}\n'.encode()
            (repo / path).parent.mkdir(parents=True)
            (repo / path).write_bytes(data)
            skills.append(dict(key=key, product=product, deps=deps, license='MIT', source_url=None, primary=path, version=1,
                               files=[dict(path='SKILL.md', src=path, sha256=pkg.sha256(data), bytes=len(data))]))
        manifest = {'skills': skills}
        mutate(manifest)
        (repo / 'manifest.json').write_text(json.dumps(manifest))
        (repo / 'GUIDE.md').write_text('guide')
        (repo / 'LICENSE').write_text('MIT License')
        pkg.git(repo, 'add', '.')
        pkg.git(repo, 'commit', '-qm', 'stable')
        sha = pkg.git(repo, 'rev-parse', 'HEAD').decode().strip()
        (repo / 'channels.json').write_text(json.dumps({'latest': {'sha': sha}}))
        # Beta/worktree content must not contaminate stable package.
        (repo / 'GUIDE.md').write_text('beta guide')
        pkg.git(repo, 'add', '.')
        pkg.git(repo, 'commit', '-qm', 'beta channels')
        return repo, sha

    def test_reproducible_stable_dependency_closure(self):
        repo, sha = self.fixture()
        stable, outputs = pkg.build(repo)
        self.assertEqual(sha, stable)
        self.assertEqual(outputs, pkg.build(repo)[1])
        self.assertEqual(set(outputs), {'context.zip', 'helper.zip', 'provenance.json', 'SHA256SUMS'})
        with zipfile.ZipFile(io.BytesIO(outputs['context.zip'])) as archive:
            self.assertEqual(archive.read('context/GUIDE.md'), b'guide')
            self.assertIn('context/LICENSE', archive.namelist())
        for line in outputs['SHA256SUMS'].decode().splitlines():
            digest, name = line.split('  ')
            self.assertEqual(digest, pkg.sha256(outputs[name]))

    def test_hash_mismatch(self):
        repo, _ = self.fixture(lambda m: m['skills'][0]['files'][0].update(sha256='0' * 64))
        with self.assertRaisesRegex(ValueError, 'Hash/size mismatch'):
            pkg.build(repo)

    def test_missing_dependency(self):
        repo, _ = self.fixture(lambda m: m['skills'][0].update(deps=['absent']))
        with self.assertRaisesRegex(ValueError, 'Missing dependency'):
            pkg.build(repo)

    def test_dependency_cycle(self):
        repo, _ = self.fixture(lambda m: m['skills'][1].update(deps=['context']))
        with self.assertRaisesRegex(ValueError, 'cycle'):
            pkg.build(repo)

    def test_traversal(self):
        for path in ['../bad', '/tmp/bad', 'a/../bad', 'a\\bad', 'a//b', 'C:bad']:
            with self.subTest(path=path), self.assertRaises(ValueError):
                pkg.safe_path(path)
        repo, _ = self.fixture(lambda m: m['skills'][0]['files'][0].update(path='../bad'))
        with self.assertRaisesRegex(ValueError, 'Unsafe path'):
            pkg.build(repo)

    def test_missing_source(self):
        repo, _ = self.fixture(lambda m: m['skills'][0]['files'][0].update(src='missing.md'))
        with self.assertRaisesRegex(ValueError, 'Missing or non-regular'):
            pkg.build(repo)

    def test_collision(self):
        repo, _ = self.fixture(lambda m: m['skills'][0]['files'].append(m['skills'][0]['files'][0]))
        with self.assertRaisesRegex(ValueError, 'duplicate/reserved'):
            pkg.build(repo)

    def test_site_downloads_repeatable_and_immutable(self):
        repo, sha = self.fixture()
        _, outputs = pkg.build(repo)
        destination = pkg.write_site(repo / 'site', sha, outputs)
        self.assertEqual(destination, repo / 'site/downloads/context' / sha)
        self.assertEqual(destination, pkg.write_site(repo / 'site', sha, outputs))
        self.assertEqual((destination / 'context.zip').read_bytes(), outputs['context.zip'])
        with self.assertRaisesRegex(ValueError, 'Immutable download differs'):
            pkg.write_site(repo / 'site', sha, {**outputs, 'context.zip': b'different'})

    def test_git_symlink_rejected(self):
        repo, _ = self.fixture()
        (repo / 'link.md').symlink_to('GUIDE.md')
        pkg.git(repo, 'add', 'link.md')
        pkg.git(repo, 'commit', '-qm', 'symlink')
        sha = pkg.git(repo, 'rev-parse', 'HEAD').decode().strip()
        with self.assertRaisesRegex(ValueError, 'non-regular'):
            pkg.blob(repo, sha, 'link.md')

    def test_license_requires_review(self):
        repo, _ = self.fixture(lambda m: m['skills'][0].update(license='Unknown'))
        with self.assertRaisesRegex(ValueError, 'unsupported license'):
            pkg.build(repo)


if __name__ == '__main__':
    unittest.main()
