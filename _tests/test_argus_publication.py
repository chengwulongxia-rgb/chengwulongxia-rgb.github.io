"""Verify the Argus article, image, evidence links and daily/guide entry points."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import unittest
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

import test_topic_guides as common

ROOT = Path(__file__).resolve().parents[1]
POST = ROOT / '_posts/2026-10-27/2026-10-27-argus-action-broker-boundaries.md'
HOST = 'https://ai.youdonthavefriends.com'
ROUTE = '/llm/ai/deep-analysis/2026/10/27/argus-action-broker-boundaries.html'
DAILY = '/llm/daily/2026/10/26/llm-daily.html'
HERO = '/assets/images/2026-10-27/argus-action-broker-boundaries.jpg'
HERO_SHA256 = '53a64897942fc6d2fa82f2004d86b92ec5f5d32e04411a988ed37b80ca71ea16'
CODE_REVISION = 'e99508df4350f805ed303c6236e20a327463cda9'
CODE = 'https://github.com/chengwulongxia-rgb/deep-dive-code/tree/' + CODE_REVISION + '/argus-boundary-audit'


class TextDocument(common.Document):
    def __init__(self, source):
        self.parts = []
        super().__init__(source)

    def handle_data(self, data):
        self.parts.append(data)
        super().handle_data(data)


def image_bytes():
    if common.OPTIONS.site:
        return (Path(common.OPTIONS.site) / HERO.lstrip('/')).read_bytes(), ''
    request = Request(common.OPTIONS.base_url.rstrip('/') + HERO + '?v=' + common.OPTIONS.cache_key,
                      headers={'Cache-Control': 'no-cache'})
    with urlopen(request, timeout=40) as response:
        if response.status != 200:
            raise AssertionError(response.status)
        return response.read(), response.headers.get('Content-Type', '')


class ArgusPublicationTests(unittest.TestCase):
    def test_article_metadata_and_evidence(self):
        source = common.read_target(ROUTE)
        doc = TextDocument(source)
        frontmatter, body = POST.read_text().split('---', 2)[1:]
        expected = {}
        for key in ('title', 'description'):
            match = re.search(r'^' + key + r':\s*(".*")$', frontmatter, re.M)
            assert match is not None, key
            expected[key] = json.loads(match.group(1))
        self.assertEqual([text for tag, text in doc.headings if tag == 'h1'], [expected['title']])
        self.assertEqual(doc.canonical, [HOST + ROUTE])
        for key in ('description', 'og:description', 'twitter:description'):
            self.assertEqual([m['content'] for m in doc.meta if key in (m.get('name'), m.get('property'))],
                             [expected['description']], key)
        self.assertEqual([s['description'] for s in doc.schema if s.get('@type') == 'BlogPosting'],
                         [expected['description']])
        self.assertEqual([m['content'] for m in doc.meta if m.get('property') == 'og:image'], [HOST + HERO])
        self.assertEqual(doc.related, 1)
        self.assertTrue(body.lstrip().startswith('![hero]('))
        self.assertIn(('h2', '原文摘要'), doc.headings)
        self.assertNotIn(('h2', '城武觀點'), doc.headings)
        self.assertNotIn('城武的未解檔案', body)
        self.assertNotIn('🦞', body)
        self.assertRegex(CODE_REVISION, r'^[0-9a-f]{40}$')
        self.assertNotIn('ARGUS_CODE_SHA', body)
        self.assertIn(CODE, doc.links)
        self.assertFalse(any('noindex' in m.get('content', '') for m in doc.meta if m.get('name') == 'robots'))
        text = ''.join(doc.parts)
        for phrase in ('18 項', '8 passed', '10 passed', '不是可單獨執行的腳本',
                       '沒有第三次 kill switch', 'rollback', '不是一次真實攻擊的攔截紀錄',
                       '不是上游全部測試套件', '不需要 GPU'):
            self.assertIn(phrase, text, phrase)

    def test_hero_and_home_sitemap(self):
        self.assertIn('src="' + HERO + '"', common.read_target(ROUTE))
        data, content_type = image_bytes()
        self.assertTrue(data.startswith(b'\xff\xd8'))
        self.assertEqual(hashlib.sha256(data).hexdigest(), HERO_SHA256)
        if content_type:
            self.assertTrue(content_type.startswith('image/'), content_type)
        self.assertIn(ROUTE, common.Document(common.read_target('/')).links)
        tree = ET.fromstring(common.read_target('/sitemap.xml'))
        self.assertIn(HOST + ROUTE, [e.text for e in tree.iter() if e.tag.endswith('loc')])

    def test_daily_and_guide_read_back_new_material(self):
        daily = TextDocument(common.read_target(DAILY))
        self.assertEqual(daily.links.count(ROUTE), 1)
        self.assertIn('10 月 27 日查核補充', ''.join(daily.parts))
        self.assertIn('原始來源', ''.join(daily.parts))
        guide = TextDocument(common.read_target('/guides/agent-security/'))
        self.assertIn(ROUTE, guide.links)
        self.assertIn('恢復已變更資源', ''.join(guide.parts))
        self.assertIn('Argus', ''.join(guide.parts))
        self.assertIn('/guides/agent-security/', common.Document(common.read_target(ROUTE)).links)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site')
    parser.add_argument('--base-url', default=HOST)
    parser.add_argument('--cache-key', default='')
    common.OPTIONS, rest = parser.parse_known_args()
    unittest.main(argv=['test_argus_publication.py'] + rest, verbosity=2)
