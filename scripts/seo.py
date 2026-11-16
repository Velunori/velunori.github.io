"""Offline SEO/metadata consistency checks; no claim of search-engine indexing."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import datetime
import json
import struct
import xml.etree.ElementTree as ET

BASE='https://velunori.github.io'


class Head(HTMLParser):
    def __init__(self):
        super().__init__();self.metadata={};self.links={};self.title='';self.in_title=False;self.in_json=False;self.json_text='';self.schemas=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='meta':
            key=attrs.get('name') or attrs.get('property')
            if key:self.metadata.setdefault(key,[]).append(attrs.get('content',''))
        if tag=='link':self.links.setdefault(attrs.get('rel'),[]).append(attrs.get('href'))
        if tag=='title':self.in_title=True
        if tag=='script' and attrs.get('type')=='application/ld+json':self.in_json=True;self.json_text=''
    def handle_data(self,data):
        if self.in_title:self.title+=data
        if self.in_json:self.json_text+=data
    def handle_endtag(self,tag):
        if tag=='title':self.in_title=False
        if tag=='script' and self.in_json:self.in_json=False;self.schemas.append(json.loads(self.json_text))


def check_seo(root):
    root=Path(root);titles=set();descriptions=set();canonicals=[]
    for name,pathpart in [('index.html','/'),('guide.html','/guide.html')]:
        parsed=Head();text=(root/name).read_text();parsed.feed(text)
        canonical=BASE+pathpart;canonicals.append(canonical)
        assert parsed.links.get('canonical')==[canonical],(name,'canonical')
        assert 20<=len(parsed.title)<=75 and parsed.title not in titles,(name,'title')
        titles.add(parsed.title)
        for field in ['description','robots','og:type','og:site_name','og:title','og:description','og:url','og:image','og:image:alt','og:image:width','og:image:height','twitter:card','twitter:title','twitter:description','twitter:image','twitter:image:alt']:
            assert len(parsed.metadata.get(field,[]))==1,(name,field)
        meta={key:values[0] for key,values in parsed.metadata.items()}
        assert 'noindex' not in meta['robots'] and 'max-image-preview:large' in meta['robots']
        assert 80<=len(meta['description'])<=200 and meta['description'] not in descriptions
        descriptions.add(meta['description'])
        assert meta['og:title']==parsed.title==meta['twitter:title']
        assert meta['og:url']==canonical
        assert meta['og:image']==meta['twitter:image']==BASE+'/assets/social-card.png'
        assert (meta['og:image:width'],meta['og:image:height'])==('1200','630')
        assert meta['twitter:card']=='summary_large_image'
        assert len(parsed.schemas)==1
        graph=parsed.schemas[0]
        assert graph['@context']=='https://schema.org'
        types={node['@type'] for node in graph['@graph']}
        assert {'Organization','WebSite'}<=types
        assert ('SoftwareApplication' in types) if name=='index.html' else {'TechArticle','BreadcrumbList'}<=types
        assert 'aggregateRating' not in json.dumps(graph), 'Do not invent ratings.'
        assert 'https://revolut.me/szalikdev' in text
    image=(root/'assets/social-card.png').read_bytes()
    assert image[:8]==b'\x89PNG\r\n\x1a\n' and struct.unpack('>II',image[16:24])==(1200,630)
    manifest=json.loads((root/'site.webmanifest').read_text())
    assert manifest['display']=='browser' and manifest['name']=='Velunori'
    for icon in manifest['icons']:assert (root/icon['src']).is_file()
    sitemap=ET.parse(root/'sitemap.xml');ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
    urls=sitemap.findall('s:url',ns)
    assert [entry.find('s:loc',ns).text for entry in urls]==canonicals
    for entry in urls:datetime.date.fromisoformat(entry.find('s:lastmod',ns).text)
    assert 'Sitemap: '+BASE+'/sitemap.xml' in (root/'robots.txt').read_text()
    error=Head();error.feed((root/'404.html').read_text());assert 'noindex' in error.metadata['robots'][0]
    print('SEO: canonical URLs, unique metadata, JSON-LD, social card, icons, robots, sitemap and 404 indexing rules OK.')
