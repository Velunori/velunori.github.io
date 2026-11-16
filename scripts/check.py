"""Check site structure, local links/assets, metadata and accessible relationships."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path, self.ids, self.links, self.targets = path, set(), [], []
        self.headings = 0
        self.has_title = False
        self.has_language = False
        self.has_viewport = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, (self.path, 'duplicate id', attrs['id'])
            self.ids.add(attrs['id'])
        if tag == 'h1':
            self.headings += 1
        if tag == 'title':
            self.has_title = True
        if tag == 'html':
            self.has_language = attrs.get('lang') == 'en'
        if tag == 'meta' and attrs.get('name') == 'viewport':
            self.has_viewport = True
        if tag == 'img':
            assert 'alt' in attrs, (self.path, 'missing image alt')
        if tag == 'button':
            assert attrs.get('type') == 'button', (self.path, 'implicit button submit')
        for attr in ['href', 'src']:
            if attr in attrs:
                self.links.append(attrs[attr])
        for attr in ['aria-controls', 'aria-labelledby']:
            self.targets.extend(attrs.get(attr, '').split())


pages = {}
for path in ROOT.glob('*.html'):
    page = Page(path)
    page.feed(path.read_text())
    assert page.headings == 1 and page.has_title and page.has_language and page.has_viewport, path
    pages[path.resolve()] = page

for path, page in pages.items():
    for target in page.targets:
        assert target in page.ids, (path, 'missing accessible target', target)
    for link in page.links:
        parsed = urlsplit(link)
        if parsed.scheme or parsed.netloc:
            assert parsed.scheme in {'https', 'mailto'}, (path, 'unexpected external scheme', link)
            continue
        local_path = unquote(parsed.path)
        destination = ((ROOT / local_path.lstrip('/')) if local_path.startswith('/') else path.parent / local_path).resolve() if local_path else path
        if destination.is_dir():
            destination = destination / 'index.html'
        assert destination.is_relative_to(ROOT) and destination.exists(), (path, 'missing local file', link)
        if parsed.fragment and destination in pages:
            assert unquote(parsed.fragment) in pages[destination].ids, (path, 'missing anchor', link)
    print(f'{path.name}: structure, assets, anchors and ARIA references OK')

for asset in re.findall(r'url\([\'"]?([^\)\'\"]+)', (ROOT / 'styles.css').read_text()):
    assert not asset.startswith(('http:', 'https:')), 'Unexpected external CSS asset'
    assert (ROOT / asset).is_file(), asset

for path in [ROOT / 'index.html', ROOT / 'guide.html']:
    html = path.read_text()
    assert 'rel="canonical"' in html and 'property="og:image"' in html and 'name="description"' in html, path
    for resource in re.findall(r'(?:src|href)="(https?://[^\"]+)"', html):
        # Remote navigational links are expected, but runtime assets must be local.
        assert not re.search(r'<(?:script|img)[^>]+src="https?://', html)
        assert not re.search(r'<link[^>]+href="https?://[^\"]+"[^>]*rel="stylesheet"', html)

ET.parse(ROOT / 'sitemap.xml')
assert (ROOT / '.nojekyll').is_file()
components = ['bar', 'clock', 'control-center', 'notifications', 'menu', 'weather', 'update', 'lockscreen', 'theme']
html = (ROOT / 'index.html').read_text()
assert all(f'https://github.com/Velunori/{name}"' in html for name in components)
assert len(re.findall(r'role="tab" ', html)) == 8
print('Metadata, sitemap, local-only runtime assets and all nine component links OK.')

from seo import check_seo
check_seo(ROOT)
