"""Coding-agent guide publication checks: local build or exact live target.

python _tests/test_coding_agent_guide.py --site /scratch/site
python _tests/test_coding_agent_guide.py --base-url https://ai.youdonthavefriends.com
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest
from urllib.parse import unquote, urljoin, urlsplit
import xml.etree.ElementTree as ET

import test_topic_guides as shared

ROOT = Path(__file__).resolve().parents[1]
KEY = 'coding-agent-evaluation'
GUIDE_URL = '/guides/' + KEY + '/'
DOWNLOADS = '/assets/examples/' + KEY + '/'
SOURCE = ROOT / 'guides' / (KEY + '.md')
FIXTURE = ROOT / '_tests/fixtures/coding-agent-evaluation-evidence.json'
ASSETS = ('summarize.py', 'tasks-template.csv', 'attempts-template.csv',
          'illustrative-attempts.csv', 'README.md')
ANCHORS = ('evaluation-question', 'attempts-and-budgets', 'model-and-harness',
           'acceptance', 'completed-cost', 'run-your-evaluation', 'downloads',
           'reading-list', 'evidence-limits')


def frontmatter():
    return SOURCE.read_text().split('---', 2)[1]


def assigned_posts():
    result = {}
    for path in (ROOT / '_posts').rglob('*.md'):
        fm = path.read_text().split('---', 2)[1]
        if re.search(r'^guide:\s*' + KEY + r'\s*$', fm, re.M):
            cats = re.search(r'^categories:\s*\[(.+)\]', fm, re.M)
            date = re.search(r'^date:\s*(\d{4})-(\d{2})-(\d{2})', fm, re.M)
            if not cats or not date:
                raise AssertionError('Unsupported post metadata: ' + str(path))
            route = '/' + '/'.join([c.strip() for c in cats[1].split(',')]
                                   + list(date.groups()) + [path.stem[11:] + '.html'])
            result[path.relative_to(ROOT).as_posix()] = route
    return result


class CodingAgentGuideTests(unittest.TestCase):
    def test_metadata(self):
        text = shared.read_target(GUIDE_URL)
        doc = shared.Document(text)
        fm = frontmatter()
        title = re.search(r'^title:\s*(.+)$', fm, re.M)
        description = re.search(r'^description:\s*(.+)$', fm, re.M)
        assert title and description
        title, description = json.loads(title[1]), json.loads(description[1])
        self.assertTrue(text.lstrip().lower().startswith('<!doctype html>'))
        self.assertEqual([t for tag, t in doc.headings if tag == 'h1'], [title])
        self.assertEqual([m['content'] for m in doc.meta if m.get('name') == 'description'], [description])
        for field in ('og:description', 'twitter:description'):
            values = [m['content'] for m in doc.meta if field in (m.get('name'), m.get('property'))]
            self.assertTrue(values)
            self.assertTrue(all(value == description for value in values))
        self.assertEqual(doc.canonical, ['https://ai.youdonthavefriends.com' + GUIDE_URL])
        self.assertFalse(any('noindex' in m.get('content', '') for m in doc.meta if m.get('name') == 'robots'))
        self.assertTrue(any(s.get('@type') == 'WebPage' and s.get('description') == description for s in doc.schema))
        self.assertEqual(len(doc.ids), len(set(doc.ids)))
        for anchor in ANCHORS:
            self.assertIn(anchor, doc.ids)

    def test_home_and_sitemap(self):
        self.assertIn(GUIDE_URL, shared.Document(shared.read_target('/')).links)
        tree = ET.fromstring(shared.read_target('/sitemap.xml'))
        locations = [node.text or '' for node in tree.findall('.//{*}loc')]
        self.assertEqual(locations.count('https://ai.youdonthavefriends.com' + GUIDE_URL), 1)
        self.assertFalse(any('/search/' in u or '/page/' in u or '/categories/' in u for u in locations))

    def test_registry_and_all_guide_keys_resolve(self):
        registry = json.loads((ROOT / '_data/guides.json').read_text())
        self.assertEqual(registry[KEY]['url'], GUIDE_URL)
        for key, guide in registry.items():
            self.assertTrue(guide['title'])
            self.assertTrue(guide['description'])
            self.assertTrue(shared.Document(shared.read_target(guide['url'])).headings)
        for path in (ROOT / '_posts').rglob('*.md'):
            fm = path.read_text().split('---', 2)[1]
            match = re.search(r'^guide:\s*(\S+)\s*$', fm, re.M)
            if match:
                self.assertIn(match[1], registry, str(path))

    def test_exact_related_post_set_and_two_way_links(self):
        evidence = json.loads(FIXTURE.read_text())
        expected = {post['path']: post['url'] for post in evidence['related_posts']}
        self.assertTrue(expected)
        self.assertEqual(len(expected), len(evidence['related_posts']))
        self.assertEqual(assigned_posts(), expected)
        links = shared.Document(shared.read_target(GUIDE_URL)).links
        for source, route in expected.items():
            with self.subTest(source=source):
                doc = shared.Document(shared.read_target(route))
                self.assertEqual(doc.related, 1)
                self.assertIn(GUIDE_URL, doc.links)
                self.assertIn(route, links)
        unrelated = '/llm/ai/deep-implementation/2026/10/22/synthid-text-watermark-lab.html'
        self.assertEqual(shared.Document(shared.read_target(unrelated)).related, 0)

    def test_internal_links_and_anchors(self):
        doc = shared.Document(shared.read_target(GUIDE_URL))
        for href in doc.links:
            target = urlsplit(urljoin('https://ai.youdonthavefriends.com' + GUIDE_URL, href))
            if target.netloc != 'ai.youdonthavefriends.com' or target.path.startswith('/categories/'):
                continue
            with self.subTest(href=href):
                content = shared.read_target(target.path)
                self.assertTrue(content)
                if target.fragment:
                    self.assertIn(unquote(target.fragment), shared.Document(content).ids)
        for token in ('{% post_url', '{{ site.', 'TODO', '[unverified]'):
            self.assertNotIn(token, shared.read_target(GUIDE_URL))

    def test_downloads_identical_to_repo_and_demo_executes(self):
        links = shared.Document(shared.read_target(GUIDE_URL)).links
        hashes = json.loads(FIXTURE.read_text())['accounting_example']['download_sha256']
        self.assertEqual(set(hashes), set(ASSETS))
        with tempfile.TemporaryDirectory(prefix='coding-guide-downloads-', dir=os.environ.get('TMPDIR')) as folder:
            temporary = Path(folder)
            for filename in ASSETS:
                url = DOWNLOADS + filename
                self.assertIn(url, links)
                content = shared.read_target(url).encode()
                original = (ROOT / url.lstrip('/')).read_bytes()
                self.assertEqual(hashlib.sha256(original).hexdigest(), hashes[filename])
                self.assertEqual(hashlib.sha256(content).hexdigest(), hashlib.sha256(original).hexdigest())
                (temporary / filename).write_bytes(content)
            run = subprocess.run(['python3', 'summarize.py', '--tasks', 'tasks-template.csv',
                                  '--attempts', 'illustrative-attempts.csv'], cwd=temporary,
                                 capture_output=True, text=True, timeout=20, check=True)
            output = json.loads(run.stdout)
            self.assertTrue(output)
            source = SOURCE.read_text()
            blocks = re.findall(r'```json\n(.*?)```', source, re.S)
            self.assertEqual(len(blocks), 1, 'Guide must show the actual complete demo JSON output')
            self.assertEqual(json.loads(blocks[0]), output)

    def test_source_fixtures_and_old_post_content_preservation(self):
        evidence = json.loads(FIXTURE.read_text())
        self.assertEqual(evidence['scope'], 'Methodology sources and synthetic accounting fixture; no coding-agent model benchmark was run.')
        self.assertTrue(evidence['primary_sources'])
        for post in evidence['related_posts']:
            current = (ROOT / post['path']).read_text()
            stripped = current.replace('guide: ' + KEY + '\n', '', 1)
            self.assertEqual(hashlib.sha256(stripped.encode()).hexdigest(), post['source_sha256_without_guide'])

    def test_pagefind_keeps_existing_posts(self):
        entry = json.loads(shared.read_target('/pagefind/pagefind-entry.json'))
        indexed = sum(language['page_count'] for language in entry['languages'].values())
        article_count = sum(1 for _ in (ROOT / '_posts').rglob('*.md'))
        self.assertGreaterEqual(indexed, article_count)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    targets = parser.add_mutually_exclusive_group(required=True)
    targets.add_argument('--site')
    targets.add_argument('--base-url')
    parser.add_argument('--cache-key', default='')
    shared.OPTIONS, remaining = parser.parse_known_args()
    unittest.main(argv=[__file__] + remaining, verbosity=2)
