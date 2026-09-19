"""Convert public OSM XML into a small, offline basemap. No network calls.

Usage: python3 scripts/prepare_map.py campus.xml river.xml
Source: OpenStreetMap API map export and relation/4129875/full (ODbL).
"""
import json
import sys
from pathlib import Path
import xml.etree.ElementTree as ET

nodes, ways, relations = {}, {}, {}
for filename in sys.argv[1:]:
    root = ET.parse(filename).getroot()
    for node in root.findall('node'):
        nodes[node.get('id')] = [round(float(node.get('lon')), 6), round(float(node.get('lat')), 6)]
    for way in root.findall('way'):
        ways[way.get('id')] = ([n.get('ref') for n in way.findall('nd')], {t.get('k'): t.get('v') for t in way.findall('tag')})
    for rel in root.findall('relation'):
        relations[rel.get('id')] = rel

def join_segments(segments):
    segments = [list(s) for s in segments if s]
    result = []
    while segments:
        line = segments.pop(0)
        while line[-1] != line[0]:
            for i, segment in enumerate(segments):
                if line[-1] == segment[0]:
                    line += segment[1:]; segments.pop(i); break
                if line[-1] == segment[-1]:
                    line += list(reversed(segment))[1:]; segments.pop(i); break
            else:
                break
        result.append(line)
    return result

features = []
def add_feature(identifier, refs, tags):
    coordinates = [nodes[r] for r in refs if r in nodes]
    if len(coordinates) < 2:
        return
    if tags.get('natural') == 'water': kind = 'water'
    elif tags.get('building'): kind = 'building'
    elif tags.get('leisure') in ['park', 'pitch', 'garden'] or tags.get('landuse') in ['grass', 'recreation_ground']: kind = 'green'
    elif tags.get('highway') and tags['highway'] not in ['steps', 'corridor', 'construction', 'proposed']: kind = 'road'
    else: return
    if not any(-71.113 < lon < -71.083 and 42.352 < lat < 42.367 for lon, lat in coordinates): return
    features.append({'type': 'Feature', 'properties': {'id': str(identifier), 'kind': kind, 'ref': tags.get('ref', ''), 'name': tags.get('name', ''), 'highway': tags.get('highway', '')}, 'geometry': {'type': 'LineString', 'coordinates': coordinates}})

for identifier, (refs, tags) in ways.items():
    add_feature(identifier, refs, tags)
for identifier, relation in relations.items():
    tags = {t.get('k'): t.get('v') for t in relation.findall('tag')}
    segments = [ways[m.get('ref')][0] for m in relation.findall('member') if m.get('role') == 'outer' and m.get('ref') in ways]
    for n, refs in enumerate(join_segments(segments)):
        add_feature(f'r{identifier}-{n}', refs, tags)

codes = ['W7', 'W1', '62', 'W79', 'W71', 'W20', '50', '14', '10', '26', '32', 'E14', 'W35', 'W16']
locations = []
for i, code in enumerate(codes):
    candidates = [f for f in features if f['properties']['ref'] == code and f['properties']['kind'] == 'building']
    if not candidates: raise ValueError(f'Missing building {code}')
    feature = max(candidates, key=lambda f: len(f['geometry']['coordinates']))
    coords = feature['geometry']['coordinates']
    # The center of the outline's bounds is sufficient for a location pin.
    center = [(min(p[axis] for p in coords) + max(p[axis] for p in coords)) / 2 for axis in [0, 1]]
    locations.append({'id': f'building-{i}', 'code': code, 'coordinates': center})

target = Path(__file__).resolve().parents[1] / 'src/data/campus-map.json'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps({'source': 'OpenStreetMap contributors', 'license': 'ODbL 1.0', 'sourceUrl': 'https://www.openstreetmap.org/copyright', 'retrieved': '2026-09-19', 'type': 'FeatureCollection', 'features': features, 'locations': locations}, separators=(',', ':')))
print(f'Prepared {len(features)} map features and {len(locations)} building pins ({target.stat().st_size:,} bytes).')
