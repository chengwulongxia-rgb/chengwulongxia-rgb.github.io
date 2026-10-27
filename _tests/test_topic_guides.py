"""Verify generated topic guides and their links, locally or after deployment.

Run: python _tests/test_topic_guides.py --site /path/to/_site
  or python _tests/test_topic_guides.py --base-url https://example.com
Only stdlib is required. Remote checks do not write to the website.
"""
import argparse
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest
from urllib.parse import unquote, urljoin, urlsplit
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
GUIDE_URL = '/guides/agent-security/'
OPTIONS = argparse.Namespace(site=None, base_url='', cache_key='')

class Document(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.headings = []
        self.heading = None
        self.heading_text = []
        self.links = []
        self.ids = []
        self.meta = []
        self.canonical = []
        self.schema = []
        self.script = None
        self.related = 0
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'a' and attrs.get('href'):
            self.links.append(attrs['href'])
        if tag == 'meta':
            self.meta.append(attrs)
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical.append(attrs.get('href'))
        if tag in ('h1', 'h2', 'h3'):
            self.heading = tag
            self.heading_text = []
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.script = ''
        if 'related-guide' in (attrs.get('class') or '').split():
            self.related += 1

    def handle_data(self, data):
        if self.heading:
            self.heading_text.append(data)
        if self.script is not None:
            self.script += data

    def handle_endtag(self, tag):
        if tag == self.heading:
            self.headings.append((tag, ''.join(self.heading_text).strip()))
            self.heading = None
        if tag == 'script' and self.script is not None:
            self.schema.append(json.loads(self.script))
            self.script = None

_CACHE = {}
def read_target(path):
    path = unquote(urlsplit(path).path)
    if path not in _CACHE:
        if OPTIONS.site:
            relative = path.lstrip('/')
            if not relative or path.endswith('/'):
                relative += 'index.html'
            _CACHE[path] = (Path(OPTIONS.site) / relative).read_text()
        else:
            url = urljoin(OPTIONS.base_url.rstrip('/') + '/', path.lstrip('/'))
            if OPTIONS.cache_key:
                url += '?v=' + OPTIONS.cache_key
            req = Request(url, headers={'Cache-Control': 'no-cache'})
            with urlopen(req, timeout=40) as response:
                if response.status != 200:
                    raise AssertionError((url, response.status))
                _CACHE[path] = response.read().decode()
    return _CACHE[path]

def assigned_posts():
    result = []
    for path in (ROOT / '_posts').rglob('*.md'):
        fm = path.read_text().split('---', 2)[1]
        if re.search(r'^guide:\s*agent-security\s*$', fm, re.M):
            cats = re.search(r'^categories:\s*\[(.+)\]', fm, re.M)
            date = re.search(r'^date:\s*(\d{4})-(\d{2})-(\d{2})', fm, re.M)
            if not cats or not date:
                raise AssertionError('Unsupported post metadata: ' + str(path))
            route = '/' + '/'.join(
                [c.strip() for c in cats[1].split(',')] + list(date.groups())
                + [path.stem[11:] + '.html'])
            result.append(route)
    return result

class TopicGuideTests(unittest.TestCase):
    def test_guide_page_metadata(self):
        text = read_target(GUIDE_URL)
        doc = Document(text)
        source = (ROOT / 'guides' / 'agent-security.md').read_text()
        fm = source.split('---', 2)[1]
        description_match = re.search(r'^description:\s*(.+)$', fm, re.M)
        title_match = re.search(r'^title:\s*(.+)$', fm, re.M)
        assert description_match is not None and title_match is not None
        description = json.loads(description_match[1])
        title = json.loads(title_match[1])
        self.assertTrue(text.lstrip().lower().startswith('<!doctype html>'))
        self.assertEqual([t for tag, t in doc.headings if tag == 'h1'], [title])
        self.assertEqual([m['content'] for m in doc.meta if m.get('name') == 'description'], [description])
        for field in ('og:description', 'twitter:description'):
            values = [m['content'] for m in doc.meta if m.get('name') == field or m.get('property') == field]
            self.assertTrue(values)
            self.assertTrue(all(v == description for v in values))
        self.assertEqual(doc.canonical, ['https://ai.youdonthavefriends.com' + GUIDE_URL])
        self.assertFalse(any('noindex' in m.get('content', '') for m in doc.meta if m.get('name') == 'robots'))
        self.assertTrue(any(s.get('@type') == 'WebPage' and s.get('description') == description for s in doc.schema))
        self.assertGreaterEqual(len([1 for tag, _ in doc.headings if tag == 'h2']), 6)
        self.assertEqual(len(doc.ids), len(set(doc.ids)), 'Duplicate HTML ids')

    def test_homepage_links_to_guide(self):
        self.assertIn(GUIDE_URL, Document(read_target('/')).links)

    def test_guide_is_in_sitemap(self):
        root = ET.fromstring(read_target('/sitemap.xml'))
        locations = [node.text or '' for node in root.findall('.//{*}loc')]
        self.assertEqual(locations.count('https://ai.youdonthavefriends.com' + GUIDE_URL), 1)
        self.assertFalse(any('/categories/' in u or '/page/' in u or '/search/' in u for u in locations))

    def test_guide_links_and_anchors_resolve(self):
        doc = Document(read_target(GUIDE_URL))
        for href in doc.links:
            target = urlsplit(urljoin('https://ai.youdonthavefriends.com' + GUIDE_URL, href))
            if target.netloc != 'ai.youdonthavefriends.com':
                continue
            if target.path.startswith('/categories/'):
                continue
            with self.subTest(href=href):
                linked = Document(read_target(target.path))
                if target.fragment:
                    self.assertIn(unquote(target.fragment), linked.ids)
        for token in ('{% post_url', '{{ site.', 'TODO', '[unverified]'):
            self.assertNotIn(token, read_target(GUIDE_URL))

    def test_registered_posts_link_back_and_are_in_guide(self):
        posts = assigned_posts()
        evidence = json.loads((ROOT / '_tests/fixtures/agent-security-evidence.json').read_text())
        expected = [post['url'] for post in evidence['related_posts']]
        self.assertEqual(len(expected), 10)
        self.assertEqual(set(posts), set(expected))
        guide_links = Document(read_target(GUIDE_URL)).links
        for route in posts:
            with self.subTest(route=route):
                doc = Document(read_target(route))
                self.assertEqual(doc.related, 1)
                self.assertIn(GUIDE_URL, doc.links)
                self.assertIn(route, guide_links)
        unrelated = Document(read_target('/llm/ai/deep-analysis/2026/10/21/anthropic-loss-accounting.html'))
        self.assertEqual(unrelated.related, 0)

    def test_pagefind_still_indexes_existing_posts(self):
        entry = json.loads(read_target('/pagefind/pagefind-entry.json'))
        indexed = sum(language['page_count'] for language in entry['languages'].values())
        article_count = sum(1 for _ in (ROOT / '_posts').rglob('*.md'))
        self.assertGreaterEqual(indexed, article_count, 'A guide-only data-pagefind-body marker can exclude the rest of the site')

    def test_git_example_matches_documented_output(self):
        source = (ROOT / 'guides' / 'agent-security.md').read_text()
        script_match = re.search(r'```bash\n(.*?)```', source, re.S)
        output_match = re.search(r'```text\n(.*?)```', source, re.S)
        assert script_match is not None and output_match is not None
        with tempfile.TemporaryDirectory(prefix='guide-git-test-', dir=os.environ.get('TMPDIR', str(ROOT.parent))) as temporary:
            env = dict(os.environ, TMPDIR=temporary, GIT_CONFIG_NOSYSTEM='1', GIT_CONFIG_GLOBAL=os.devnull)
            result = subprocess.run(['bash'], input=script_match[1], text=True, capture_output=True, env=env, timeout=30, check=True)
        self.assertEqual(result.stdout, output_match[1])

    def test_registry_points_to_guide(self):
        registry = json.loads((ROOT / '_data' / 'guides.json').read_text())
        self.assertEqual(registry['agent-security']['url'], GUIDE_URL)
        self.assertTrue(registry['agent-security']['title'])

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--site')
    group.add_argument('--base-url')
    parser.add_argument('--cache-key', default='')
    OPTIONS, remaining = parser.parse_known_args()
    unittest.main(argv=[__file__] + remaining, verbosity=2)
