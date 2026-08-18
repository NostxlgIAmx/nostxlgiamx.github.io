#!/usr/bin/env python3
"""Build lightweight local road-network cuts for the NostxlgIA ambient canvas.

Usage:
    python scripts/build-ambient-road-cuts.py 10e.shp \
        --output assets/data/ambient-road-cuts.json \
        --cuts 16 --simplify-m 2.5

The SHP is processed offline only. The browser consumes the generated JSON.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from collections import defaultdict, deque

import geopandas as gpd
from shapely.geometry import LineString, MultiLineString, box
from shapely.ops import unary_union


def iter_lines(geom):
    if geom is None or geom.is_empty:
        return
    if isinstance(geom, LineString):
        yield geom
    elif isinstance(geom, MultiLineString):
        yield from geom.geoms
    elif hasattr(geom, "geoms"):
        for part in geom.geoms:
            yield from iter_lines(part)


def point_key(pt, precision=2):
    return (round(pt[0], precision), round(pt[1], precision))


def largest_connected_component(lines):
    """Return a predominantly connected noded component using endpoint adjacency."""
    if not lines:
        return []
    noded = list(iter_lines(unary_union(lines)))
    if not noded:
        return []

    endpoints = defaultdict(list)
    for i, line in enumerate(noded):
        coords = list(line.coords)
        endpoints[point_key(coords[0])].append(i)
        endpoints[point_key(coords[-1])].append(i)

    adjacency = defaultdict(set)
    for ids in endpoints.values():
        for i in ids:
            adjacency[i].update(j for j in ids if j != i)

    seen = set()
    components = []
    for start in range(len(noded)):
        if start in seen:
            continue
        q = deque([start])
        seen.add(start)
        comp = []
        while q:
            i = q.popleft()
            comp.append(i)
            for j in adjacency[i]:
                if j not in seen:
                    seen.add(j)
                    q.append(j)
        components.append(comp)

    best = max(
        components,
        key=lambda comp: sum(noded[i].length for i in comp)
    )
    return [noded[i] for i in best]


def intersection_count(lines):
    """Approximate junction count after noding: endpoint degree >= 3."""
    degree = defaultdict(int)
    for line in lines:
        coords = list(line.coords)
        degree[point_key(coords[0])] += 1
        degree[point_key(coords[-1])] += 1
    return sum(1 for value in degree.values() if value >= 3)


def detect_hierarchy_column(columns):
    names = {c.lower(): c for c in columns}
    for candidate in (
        "jerarquia", "jerarquía", "tipo_vial", "tipovial", "tipo",
        "clase", "categoria", "categoría", "nivel", "admin"
    ):
        if candidate in names:
            return names[candidate]
    return None


def classify_primary(gdf):
    """Best-effort two-level hierarchy. Uses semantic attributes when present."""
    column = detect_hierarchy_column(gdf.columns)
    if column:
        text = gdf[column].fillna("").astype(str).str.lower()
        primary_words = (
            "principal", "primaria", "troncal", "federal", "estatal",
            "carretera", "avenida", "arterial", "boulevard", "blvd"
        )
        mask = text.apply(lambda value: any(word in value for word in primary_words))
        if 0 < int(mask.sum()) < len(gdf):
            return mask

    lengths = gdf.geometry.length
    threshold = lengths.quantile(.72)
    return lengths >= threshold


def svg_path(lines, minx, miny, scale, offx, offy):
    parts = []
    for line in lines:
        coords = list(line.coords)
        if len(coords) < 2:
            continue
        normalized = [
            ((x - minx) * scale + offx, (y - miny) * scale + offy)
            for x, y, *_ in coords
        ]
        parts.append(
            "M" + " L".join(f"{x:.2f},{100-y:.2f}" for x, y in normalized)
        )
    return " ".join(parts)


def normalize(primary, secondary):
    all_lines = primary + secondary
    minx = min(line.bounds[0] for line in all_lines)
    miny = min(line.bounds[1] for line in all_lines)
    maxx = max(line.bounds[2] for line in all_lines)
    maxy = max(line.bounds[3] for line in all_lines)
    spanx = max(maxx - minx, 1e-9)
    spany = max(maxy - miny, 1e-9)
    padding = 4.0
    scale = (100 - 2 * padding) / max(spanx, spany)
    offx = padding + (100 - 2 * padding - spanx * scale) / 2
    offy = padding + (100 - 2 * padding - spany * scale) / 2
    return {
        "viewBox": [0, 0, 100, 100],
        "primary": svg_path(primary, minx, miny, scale, offx, offy),
        "secondary": svg_path(secondary, minx, miny, scale, offx, offy),
    }


def make_candidates(gdf, target):
    """Create local windows across the source extent and score network quality."""
    minx, miny, maxx, maxy = gdf.total_bounds
    width, height = maxx - minx, maxy - miny
    nx = max(5, round((target * 1.6) ** .5 * max(width / max(height, 1), .65)))
    ny = max(5, round((target * 1.6) / nx) + 2)
    win_w = width / max(nx - 1, 1) * 1.55
    win_h = height / max(ny - 1, 1) * 1.55

    candidates = []
    for yi in range(ny):
        cy = miny + (yi + .5) / ny * height
        for xi in range(nx):
            cx = minx + (xi + .5) / nx * width
            window = box(cx - win_w / 2, cy - win_h / 2, cx + win_w / 2, cy + win_h / 2)
            subset = gdf[gdf.intersects(window)].copy()
            if len(subset) < 5:
                continue
            subset["geometry"] = subset.geometry.intersection(window)
            subset = subset[~subset.geometry.is_empty]
            lines = [line for geom in subset.geometry for line in iter_lines(geom)]
            component = largest_connected_component(lines)
            if len(component) < 6:
                continue
            junctions = intersection_count(component)
            if junctions < 2:
                continue
            score = junctions * 8 + min(len(component), 80) + min(sum(x.length for x in component) / 100, 80)
            candidates.append((score, window, subset, component))
    return sorted(candidates, key=lambda item: item[0], reverse=True)


def spatially_diverse(candidates, target):
    chosen = []
    for candidate in candidates:
        _, window, _, _ = candidate
        center = window.centroid
        too_close = False
        for _, existing, _, _ in chosen:
            distance = center.distance(existing.centroid)
            threshold = .42 * max(window.bounds[2] - window.bounds[0],
                                  window.bounds[3] - window.bounds[1])
            if distance < threshold:
                too_close = True
                break
        if not too_close:
            chosen.append(candidate)
        if len(chosen) >= target:
            break
    return chosen


def build(source, output, cuts, simplify_m):
    gdf = gpd.read_file(source)
    gdf = gdf[gdf.geometry.notna() & ~gdf.geometry.is_empty].copy()
    if gdf.empty:
        raise SystemExit("10e.shp does not contain usable geometries.")

    source_crs = str(gdf.crs) if gdf.crs else None
    if gdf.crs is None:
        raise SystemExit("The SHP has no CRS. Define it before generating ambient cuts.")

    metric_crs = gdf.estimate_utm_crs() if gdf.crs.is_geographic else gdf.crs
    metric = gdf.to_crs(metric_crs)
    metric["geometry"] = metric.geometry.simplify(simplify_m, preserve_topology=True)
    metric = metric[~metric.geometry.is_empty].copy()

    candidates = make_candidates(metric, cuts)
    chosen = spatially_diverse(candidates, cuts)
    if len(chosen) < 12:
        raise SystemExit(
            f"Only {len(chosen)} suitable connected windows found; at least 12 are required."
        )

    output_cuts = []
    for index, (_, window, subset, component) in enumerate(chosen, 1):
        primary_mask = classify_primary(subset)
        primary_source = [line for geom in subset.loc[primary_mask, "geometry"] for line in iter_lines(geom)]
        primary_union = unary_union(primary_source) if primary_source else None

        primary = []
        secondary = []
        for line in component:
            if primary_union and not primary_union.is_empty and line.distance(primary_union) < .25:
                primary.append(line)
            else:
                secondary.append(line)

        if not primary:
            by_length = sorted(component, key=lambda x: x.length, reverse=True)
            primary = by_length[:max(1, len(by_length) // 4)]
            secondary = by_length[max(1, len(by_length) // 4):]

        normalized = normalize(primary, secondary)
        output_cuts.append({
            "id": f"10e-cut-{index:02d}",
            "junctions": intersection_count(component),
            "segments": len(component),
            **normalized,
        })

    payload = {
        "version": 2,
        "source": {
            "file": Path(source).name,
            "source_crs": source_crs,
            "metric_crs": str(metric_crs),
            "generated_utc": datetime.now(timezone.utc).isoformat(),
            "runtime_processing": False,
        },
        "processing": {
            "simplify_m": simplify_m,
            "requested_cuts": cuts,
            "actual_cuts": len(output_cuts),
            "selection": "local windows; largest connected noded component; >=2 junctions",
            "hierarchy": "source attribute when available; otherwise length quantile",
        },
        "normalization": {
            "viewBox": [0, 0, 100, 100],
            "preserveAspectRatio": True,
            "per_cut": True,
        },
        "cuts": output_cuts,
    }
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    Path(output).write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(output_cuts)} cuts to {output}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", nargs="?", default="10e.shp")
    parser.add_argument("--output", default="assets/data/ambient-road-cuts.json")
    parser.add_argument("--cuts", type=int, default=16, choices=range(12, 21), metavar="12..20")
    parser.add_argument("--simplify-m", type=float, default=2.5)
    args = parser.parse_args()
    if not 1.5 <= args.simplify_m <= 4.0:
        parser.error("--simplify-m must be between 1.5 and 4.0 metres")
    build(args.source, args.output, args.cuts, args.simplify_m)


if __name__ == "__main__":
    main()
