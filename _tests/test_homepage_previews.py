"""Verify homepage previews without altering posts; local build or live site."""
import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import unittest
from urllib.parse import urlsplit
from typing import Optional, TypedDict

import test_topic_guides as shared

class Card(TypedDict):
    url: str
    title: str
    summary: str
    images: list[dict[str, Optional[str]]]

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / '_tests/fixtures/homepage-previews.json'

class Previews(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.cards: list[Card] = []
        self.card: Optional[Card] = None
        self.summary = False
        self.title = False
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = (attrs.get('class') or '').split()
        if tag == 'article' and 'post-preview' in classes:
            self.card = {'url': '', 'title': '', 'summary': '', 'images': []}
        if self.card is not None:
            if tag == 'a' and 'post-link' in classes:
                self.card['url'] = attrs.get('href') or ''
                self.title = True
            if tag == 'p' and 'post-excerpt' in classes:
                self.summary = True
            if tag == 'img':
                self.card['images'].append(attrs)

    def handle_data(self, data):
        if self.card is not None:
            if self.summary:
                self.card['summary'] += data
            if self.title:
                self.card['title'] += data

    def handle_endtag(self, tag):
        if tag == 'a':
            self.title = False
        if tag == 'p':
            self.summary = False
        if tag == 'article' and self.card is not None:
            self.cards.append(self.card)
            self.card = None

class HomepagePreviewTests(unittest.TestCase):
    def setUp(self):
        self.evidence = json.loads(FIXTURE.read_text())
        self.html = shared.read_target('/')
        self.cards = Previews(self.html).cards

    def test_current_page_preserves_count_and_existing_article_order(self):
        expected = self.evidence['posts']
        urls = [card['url'] for card in self.cards]
        per_page = re.search(r'^  per_page:\s*(\d+)', (ROOT / '_config.yml').read_text(), re.M)
        assert per_page
        self.assertEqual(len(urls), int(per_page[1]))
        self.assertEqual(len(urls), len(set(urls)))
        known = {post['url']: post for post in expected}
        self.assertEqual([url for url in urls if url in known],
                         [post['url'] for post in expected if post['url'] in urls])
        for card in self.cards:
            if card['url'] in known:
                self.assertEqual(card['title'].strip(), known[card['url']]['title'])

    def test_new_posts_do_not_shift_historical_fixture_pairing(self):
        # A synthetic future card tests fixture lookup only; it is never published.
        new_card: Card = {**self.cards[0], 'url': '/synthetic-next-post-for-test.html', 'title': '僅供測試的新文章'}
        self.cards = [new_card] + self.cards[:-1]
        self.test_current_page_preserves_count_and_existing_article_order()
        self.test_every_card_has_clean_content_preview()
        self.test_real_local_images_only_and_no_broken_placeholders()

    def test_every_card_has_clean_content_preview(self):
        self.assertTrue(self.cards)
        known = {post['url']: post for post in self.evidence['posts']}
        for card in self.cards:
            post = known.get(card['url'])
            with self.subTest(url=card['url']):
                summary = card['summary'].strip()
                self.assertGreater(len(summary), 20)
                self.assertLessEqual(len(summary), 160)
                self.assertNotRegex(summary, r'^(原文|來源|作者|日期)[：:]')
                self.assertNotIn('{{', summary)
                self.assertNotIn('![hero]', summary)
                if post and post['description']:
                    description = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', post['description'])).strip()
                    self.assertTrue(summary.startswith(description[:40]), (summary, description))

    def test_real_local_images_only_and_no_broken_placeholders(self):
        self.assertTrue(self.cards)
        known = {post['url']: post for post in self.evidence['posts']}
        for card in self.cards:
            post = known.get(card['url'])
            with self.subTest(url=card['url']):
                if post:
                    expected_images = [post['image']] if post['image'] else []
                    self.assertEqual([image['src'] for image in card['images']], expected_images)
                self.assertLessEqual(len(card['images']), 1)
                for image in card['images']:
                    source = image['src']
                    assert source is not None
                    path = urlsplit(source)
                    self.assertFalse(path.netloc)
                    self.assertTrue(path.path.startswith('/assets/'))
                    self.assertTrue((ROOT / path.path.lstrip('/')).is_file())
                    self.assertTrue(image.get('width') and image.get('height'))
                    self.assertEqual(image.get('alt'), '')
                    self.assertIn(image.get('loading'), ('lazy', 'eager'))

    def test_intro_shortened_but_guides_and_pagination_remain(self):
        doc = shared.Document(self.html)
        self.assertIn('/guides/agent-security/', doc.links)
        self.assertIn('/guides/coding-agent-evaluation/', doc.links)
        self.assertIn('/page/2/', doc.links)
        self.assertIn('最新文章', [text for tag, text in doc.headings if tag == 'h2'])
        intro = self.html.split('<ul class="post-list">', 1)[0]
        self.assertNotIn('不定期出刊，精選近期最重要', intro)
        self.assertNotIn('由 Hermes Agent 自動化管線驅動', intro)

    def test_posts_and_frozen_subtitle_preserved(self):
        for post in self.evidence['posts']:
            raw = (ROOT / post['path']).read_bytes()
            self.assertEqual(hashlib.sha256(raw).hexdigest(), post['sha256'], post['path'])
        value = re.search(r'^description:\s*(.+)$', (ROOT / '_config.yml').read_text(), re.M)
        assert value
        self.assertEqual(json.loads(value[1]), self.evidence['frozen_site_description'])

    def test_paginated_home_also_has_previews_without_changing_indexing(self):
        page = shared.read_target('/page/2/')
        cards = Previews(page).cards
        self.assertTrue(cards)
        self.assertTrue(all(card['summary'].strip() for card in cards))
        doc = shared.Document(page)
        self.assertTrue(any('noindex' in m.get('content', '') for m in doc.meta if m.get('name') == 'robots'))
        self.assertEqual(shared.Document(self.html).canonical, ['https://ai.youdonthavefriends.com/'])

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--site')
    group.add_argument('--base-url')
    parser.add_argument('--cache-key', default='')
    shared.OPTIONS, remaining = parser.parse_known_args()
    unittest.main(argv=[__file__] + remaining, verbosity=2)
