"""Check the SynthID implementation post locally or after exact-SHA deployment."""
import argparse
import json
from pathlib import Path
import re
import unittest
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

import test_topic_guides as common

ROOT = Path(__file__).resolve().parents[1]
POST = ROOT / '_posts/2026-10-22/2026-10-22-synthid-text-watermark-lab.md'
ROUTE = '/llm/ai/deep-implementation/2026/10/22/synthid-text-watermark-lab.html'
DAILY = '/llm/daily/2026/10/22/llm-daily.html'
HOST = 'https://ai.youdonthavefriends.com'
HERO = '/assets/images/2026-10-22/synthid-text-watermark-lab.jpg'
CHART = '/assets/images/2026-10-22/synthid-text-watermark-results.png'
CODE = 'https://github.com/chengwulongxia-rgb/deep-dive-code/tree/157c6791364d50404a0c3ea5ed78979d525574de/synthid-text-lab'


def binary(path):
    if common.OPTIONS.site:
        return (Path(common.OPTIONS.site) / path.lstrip('/')).read_bytes(), ''
    request = Request(common.OPTIONS.base_url.rstrip('/') + path + '?v=' + common.OPTIONS.cache_key,
                      headers={'Cache-Control': 'no-cache'})
    with urlopen(request, timeout=40) as response:
        if response.status != 200:
            raise AssertionError((path, response.status))
        return response.read(), response.headers.get('Content-Type', '')


class SynthIDPublicationTests(unittest.TestCase):
    def test_article_metadata_and_final_content(self):
        text = common.read_target(ROUTE)
        doc = common.Document(text)
        frontmatter = POST.read_text().split('---', 2)[1]
        expected = {}
        for key in ['title', 'description']:
            match = re.search(r'^' + key + r':\s*(".*")$', frontmatter, re.M)
            assert match is not None, 'Missing quoted frontmatter: ' + key
            expected[key] = json.loads(match.group(1))
        self.assertEqual([title for tag, title in doc.headings if tag == 'h1'], [expected['title']])
        self.assertEqual(doc.canonical, [HOST + ROUTE])
        for key in ['description', 'og:description', 'twitter:description']:
            self.assertEqual([m['content'] for m in doc.meta if key in (m.get('name'), m.get('property'))],
                             [expected['description']], key)
        self.assertEqual([s['description'] for s in doc.schema if s.get('@type') == 'BlogPosting'],
                         [expected['description']])
        self.assertEqual([m['content'] for m in doc.meta if m.get('property') == 'og:image'], [HOST + HERO])
        self.assertFalse(any('noindex' in m.get('content', '') for m in doc.meta if m.get('name') == 'robots'))
        self.assertEqual(doc.related, 0, 'Watermarking is not the agent-authorization guide topic')
        for phrase in ['768 條打分紀錄', '16/72', '7/24', '3/12', '9 項測試通過',
                       '那個判你陽性的分數，也該附上它怎麼判錯的紀錄。']:
            self.assertIn(phrase, text)
        self.assertIn(CODE, doc.links)
        for link in doc.links:
            if link.startswith('#'):
                self.assertIn(link[1:], doc.ids)

    def test_images_home_daily_and_sitemap(self):
        text = common.read_target(ROUTE)
        for path, prefix in [(HERO, b'\xff\xd8'), (CHART, b'\x89PNG\r\n\x1a\n')]:
            self.assertIn('src="' + path + '"', text)
            payload, content_type = binary(path)
            self.assertTrue(payload.startswith(prefix), path)
            if content_type:
                self.assertTrue(content_type.startswith('image/'), (path, content_type))
        for path in ['/', DAILY]:
            self.assertIn(ROUTE, common.Document(common.read_target(path)).links, path)
        sitemap = ET.fromstring(common.read_target('/sitemap.xml'))
        urls = [element.text for element in sitemap.iter() if element.tag.endswith('loc')]
        self.assertIn(HOST + ROUTE, urls)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site')
    parser.add_argument('--base-url', default=HOST)
    parser.add_argument('--cache-key', default='')
    common.OPTIONS, rest = parser.parse_known_args()
    unittest.main(argv=['test_synthid_publication.py'] + rest, verbosity=2)
