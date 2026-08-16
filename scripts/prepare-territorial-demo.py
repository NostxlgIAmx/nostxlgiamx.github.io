"""Build the local WebGIS demo dataset from INEGI's official Shapefiles.

Source: INEGI, Marco Geoestadístico 2024 (UPC 794551132173).
State download: 10_durango.zip.
Layers: 10a (urban AGEB), 10e (road centerlines), 10sip (point services).
Area: Durango (10), municipality Durango (005), Victoria de Durango (0001).
Cartographic cut: August 2024; base cartography: Marco Geoestadístico,
December 2023. This development script is not used by the website at runtime.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections import defaultdict, deque
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path, help="INEGI conjunto_de_datos directory")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--vendor", type=Path, help="Temporary directory containing pyshp and shapely")
    parser.add_argument("--count", type=int, default=42)
    parser.add_argument("--tolerance", type=float, default=3.0, help="Coverage simplification in metres")
    return parser.parse_args()


args = parse_args()
if args.vendor:
    sys.path.insert(0, str(args.vendor))

import shapefile  # type: ignore  # Development dependency only.
from pyproj import CRS, Transformer
from shapely import coverage_simplify, make_valid
from shapely.geometry import mapping, shape
from shapely.ops import linemerge, transform, unary_union
from shapely.strtree import STRtree


ENTITY = "10"
MUNICIPALITY = "005"
LOCALITY = "0001"
SOURCE_URL = (
    "https://www.inegi.org.mx/contenidos/productos/prod_serv/contenidos/"
    "espanol/bvinegi/productos/geografia/marcogeo/794551132173/10_durango.zip"
)


def record_value(record, key: str) -> str:
    return str(record[key]).strip()


def load_agebs():
    reader = shapefile.Reader(str(args.input / "10a.shp"), encoding="latin1")
    items = []
    for item in reader.iterShapeRecords():
        record = item.record
        if record_value(record, "CVE_MUN") != MUNICIPALITY or record_value(record, "CVE_LOC") != LOCALITY:
            continue
        geometry = make_valid(shape(item.shape.__geo_interface__))
        if not geometry.is_empty:
            items.append({"geometry": geometry, "record": record})
    return items


def adjacency_graph(geometries):
    tree = STRtree(geometries)
    graph = [set() for _ in geometries]
    for index, geometry in enumerate(geometries):
        for candidate in tree.query(geometry.buffer(1.25)):
            other = int(candidate)
            if other <= index:
                continue
            if geometry.distance(geometries[other]) <= 1.25:
                graph[index].add(other)
                graph[other].add(index)
    return graph


def connected_components(graph):
    unseen = set(range(len(graph)))
    components = []
    while unseen:
        start = unseen.pop()
        component = {start}
        queue = deque([start])
        while queue:
            current = queue.popleft()
            for neighbor in graph[current]:
                if neighbor in unseen:
                    unseen.remove(neighbor)
                    component.add(neighbor)
                    queue.append(neighbor)
        components.append(component)
    return components


def select_contiguous(items, count: int):
    geometries = [item["geometry"] for item in items]
    graph = adjacency_graph(geometries)
    component = max(connected_components(graph), key=len)
    if len(component) < count:
        raise RuntimeError(f"Largest contiguous component has only {len(component)} AGEB")
    component_union = unary_union([geometries[index] for index in component])
    center = component_union.centroid
    seed = min(component, key=lambda index: geometries[index].centroid.distance(center))
    selected = {seed}
    frontier = set(graph[seed]) & component
    while len(selected) < count:
        if not frontier:
            raise RuntimeError("Could not grow a contiguous AGEB selection")
        candidate = min(
            frontier,
            key=lambda index: (
                geometries[index].centroid.distance(center),
                -len(graph[index] & selected),
            ),
        )
        selected.add(candidate)
        frontier.remove(candidate)
        frontier.update((graph[candidate] & component) - selected)
    return sorted(selected, key=lambda index: record_value(items[index]["record"], "CVEGEO"))


def demo_values(centroid, bounds):
    min_x, min_y, max_x, max_y = bounds
    x = (centroid.x - min_x) / (max_x - min_x)
    y = (centroid.y - min_y) / (max_y - min_y)

    def cluster(cx, cy, spread):
        return math.exp(-(((x - cx) ** 2 + (y - cy) ** 2) / spread))

    participation = 46 + 24 * cluster(0.34, 0.58, 0.10) + 9 * cluster(0.72, 0.30, 0.07) + 4 * x
    intensity = 28 + 57 * cluster(0.53, 0.50, 0.13) + 12 * cluster(0.28, 0.30, 0.06)
    coverage = 52 + 28 * x + 13 * cluster(0.66, 0.66, 0.11) - 7 * cluster(0.18, 0.76, 0.05)
    return {
        "participacion": round(max(42, min(82, participation)), 1),
        "intensidad": round(max(24, min(96, intensity)), 1),
        "cobertura": round(max(45, min(94, coverage)), 1),
    }


def bbox_intersects(first, second):
    return not (first[2] < second[0] or first[0] > second[2] or first[3] < second[1] or first[1] > second[3])


def load_major_roads(selected_union, limit=6):
    reader = shapefile.Reader(str(args.input / "10e.shp"), encoding="latin1")
    allowed = {"Avenida", "Boulevard", "Carretera", "Calzada", "Circuito"}
    search_area = selected_union.buffer(45)
    groups = defaultdict(list)
    for item in reader.iterShapeRecords():
        record = item.record
        if record_value(record, "CVE_MUN") != MUNICIPALITY or record_value(record, "CVE_LOC") != LOCALITY:
            continue
        road_type = record_value(record, "TIPOVIAL")
        road_name = record_value(record, "NOMVIAL")
        if road_type not in allowed or not road_name or road_name == "Ninguno":
            continue
        if not bbox_intersects(item.shape.bbox, search_area.bounds):
            continue
        geometry = shape(item.shape.__geo_interface__).intersection(search_area)
        if not geometry.is_empty and geometry.length > 8:
            groups[(road_name, road_type)].append(geometry)

    roads = []
    for (name, road_type), segments in groups.items():
        merged = unary_union(segments)
        if merged.geom_type == "MultiLineString":
            merged = linemerge(merged)
        roads.append({"name": name, "type": road_type, "geometry": merged, "length": merged.length})
    roads.sort(key=lambda item: item["length"], reverse=True)
    return roads[:limit]


def load_pois(selected_union, limit=4):
    reader = shapefile.Reader(str(args.input / "10sip.shp"), encoding="latin1")
    preferred = {
        "Palacio de Gobierno": 0,
        "Hospital": 1,
        "Centro de Salud": 2,
        "Parque": 3,
        "Jardín": 4,
        "Superior": 5,
        "Unidad Deportiva": 6,
    }
    candidates = []
    for item in reader.iterShapeRecords():
        record = item.record
        if record_value(record, "CVE_MUN") != MUNICIPALITY or record_value(record, "CVE_LOC") != LOCALITY:
            continue
        poi_type = record_value(record, "TIPO")
        name = record_value(record, "NOMSERV")
        if poi_type not in preferred or not name or name == "Ninguno":
            continue
        geometry = shape(item.shape.__geo_interface__)
        if selected_union.contains(geometry):
            candidates.append({"name": name, "type": poi_type, "geometry": geometry, "priority": preferred[poi_type]})

    chosen = []
    used_types = set()
    for candidate in sorted(candidates, key=lambda item: item["priority"]):
        if candidate["type"] in used_types:
            continue
        if chosen and min(candidate["geometry"].distance(item["geometry"]) for item in chosen) < 350:
            continue
        chosen.append(candidate)
        used_types.add(candidate["type"])
        if len(chosen) == limit:
            break
    return chosen


def rounded_coordinates(value):
    if isinstance(value, (list, tuple)):
        return [rounded_coordinates(item) for item in value]
    return round(float(value), 6)


def feature(geometry, properties, transformer):
    projected = transform(transformer.transform, geometry)
    geojson_geometry = mapping(projected)
    geojson_geometry["coordinates"] = rounded_coordinates(geojson_geometry["coordinates"])
    return {"type": "Feature", "properties": properties, "geometry": geojson_geometry}


def main():
    agebs = load_agebs()
    selected_indices = select_contiguous(agebs, args.count)
    selected = [agebs[index] for index in selected_indices]
    selected_geometries = [item["geometry"] for item in selected]
    selected_union = unary_union(selected_geometries)
    simplified = list(coverage_simplify(selected_geometries, tolerance=args.tolerance))
    source_crs = CRS.from_wkt((args.input / "10a.prj").read_text(encoding="utf-8"))
    transformer = Transformer.from_crs(source_crs, "EPSG:4326", always_xy=True)

    features = []
    for item, geometry in zip(selected, simplified):
        record = item["record"]
        features.append(
            feature(
                geometry,
                {
                    "kind": "ageb",
                    "cvegeo": record_value(record, "CVEGEO"),
                    "cve_ageb": record_value(record, "CVE_AGEB"),
                    "municipio": "Durango",
                    "localidad": "Victoria de Durango",
                    "demo": demo_values(item["geometry"].centroid, selected_union.bounds),
                },
                transformer,
            )
        )

    for road in load_major_roads(selected_union):
        features.append(
            feature(
                road["geometry"].simplify(2.0, preserve_topology=True),
                {"kind": "road", "name": road["name"], "road_type": road["type"]},
                transformer,
            )
        )

    for poi in load_pois(selected_union):
        features.append(
            feature(
                poi["geometry"],
                {"kind": "poi", "name": poi["name"], "poi_type": poi["type"]},
                transformer,
            )
        )

    collection = {
        "type": "FeatureCollection",
        "name": "AGEB urbanas de Victoria de Durango — muestra continua para miniatura WebGIS",
        "source": {
            "institution": "INEGI",
            "product": "Marco Geoestadístico 2024",
            "upc": "794551132173",
            "edition": "2024",
            "temporal_coverage": "2023-08-31/2024-08-31",
            "cartographic_cut": "agosto de 2024",
            "base_cartography": "Marco Geoestadístico, diciembre 2023",
            "layers": ["10a — Áreas Geoestadísticas Básicas urbanas", "10e — Ejes de vialidad", "10sip — Servicios puntuales"],
            "territory": "Durango (10), Durango (005), Victoria de Durango (0001)",
            "download": SOURCE_URL,
        },
        "processing": {
            "selection": "42 AGEB contiguas, crecimiento desde el centroide del componente urbano principal",
            "simplification": f"coverage_simplify de Shapely, tolerancia {args.tolerance:g} m",
            "coordinates": "WGS84 (EPSG:4326), 6 decimales",
            "demo_variables": "Valores sintéticos con autocorrelación espacial; no son estadísticas de INEGI",
        },
        "features": features,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(collection, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(
        json.dumps(
            {
                "output": str(args.output),
                "agebs": sum(item["properties"]["kind"] == "ageb" for item in features),
                "roads": sum(item["properties"]["kind"] == "road" for item in features),
                "pois": sum(item["properties"]["kind"] == "poi" for item in features),
                "bytes": args.output.stat().st_size,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
