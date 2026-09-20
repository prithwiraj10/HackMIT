# MIT campus for Patient Zero: what each building does

Status: **building coordinates are OpenStreetMap footprint centroids (`coords_status` = `osm_footprint_centroid`, via `tools/snap_coordinates.py`); open spaces and off-campus areas are still estimates (about +/-100 m). Distances are haversine x1.25, not routed.** Building numbers, names and functions are from public MIT information; rows marked `medium` in `function_confidence` should be checked against whereis.mit.edu or MIT Dining before you rely on them.

Freshman-eligible undergraduate dorms only; graduate housing and fraternity/sorority houses are not modeled individually.


## West dorms (Memorial Dr and Vassar St, west of Mass Ave)

| Building | Does what | Sim place types | Function confidence |
|---|---|---|---|
| W1 Maseeh Hall | Undergraduate residence with house dining hall (Flowers Dining Room). | dorm_room, dorm_common, dining, party | high |
| W4 McCormick Hall | Undergraduate residence with house dining hall. | dorm_room, dorm_common, dining, party | medium |
| W7 Baker House | Undergraduate residence with house dining hall. | dorm_room, dorm_common, dining, party | high |
| W51 Burton-Conner House | Undergraduate residence. | dorm_room, dorm_common, party | high |
| W61 MacGregor House | Undergraduate residence. | dorm_room, dorm_common, party | high |
| W70 New House | Undergraduate residence. | dorm_room, dorm_common, party | high |
| W71 Next House | Undergraduate residence, far west end of campus; house dining. | dorm_room, dorm_common, dining, party | medium |
| W79 Simmons Hall | Undergraduate residence on Vassar St; house dining. | dorm_room, dorm_common, dining, party | medium |

## East side

| Building | Does what | Sim place types | Function confidence |
|---|---|---|---|
| 62 East Campus | Undergraduate residence near Ames St, closest dorm to Kendall Sq. | dorm_room, dorm_common, party | medium |

## Main Group / Infinite Corridor

| Building | Does what | Sim place types | Function confidence |
|---|---|---|---|
| Building 7 (Lobby 7) | Main entrance at 77 Mass Ave; west end of the Infinite Corridor; classrooms and offices. | lecture, orientation | high |
| Building 3 | Main Group link between Bldgs 7 and 10; classrooms, labs, offices. | lecture, lab | medium |
| Building 10 (Great Dome) | Great Dome and Lobby 10; Barker Engineering Library (10-500); Bush Room (10-105). | lecture, library, orientation | high |
| Building 2 (Simons Building) | Mathematics; classrooms such as 2-190. | lecture | high |
| Building 4 | Main Group classrooms (e.g. 4-370 lecture room) and labs. | lecture, lab | medium |
| Building 6 | Chemistry; lecture hall 6-120. | lecture, lab | medium |
| Building 14 (Hayden / Humanities) | Hayden Library and Humanities; Lewis Music Library. | library, lecture | high |
| Killian Court | Great lawn south of Building 10 facing the river; outdoor event space. | outdoor, orientation | high |

## North side (Vassar St)

| Building | Does what | Sim place types | Function confidence |
|---|---|---|---|
| Building 26 (Compton Labs) | Large lecture hall 26-100 and labs. | lecture | medium |
| Building 45 (Schwarzman College of Computing) | Schwarzman College of Computing; labs and classrooms. | lecture, lab | high |
| Building 46 (Brain & Cognitive Sciences) | Brain and Cognitive Sciences complex. | lab, lecture | high |
| Building 32 (Stata Center) | CSAIL and LIDS (Dreyfoos tower); large auditorium 32-123; cafes. | lecture, lab, dining | high |

## Kendall / east campus

| Building | Does what | Sim place types | Function confidence |
|---|---|---|---|
| Media Lab (E14/E15) | Media Lab; Bartos Theatre (E15-070). | lab, lecture | high |
| Sloan School (E62) | MIT Sloan School of Management classrooms. | lecture | medium |
| MIT Medical (E23) | Campus health center: urgent care, primary care, pharmacy. | health_center | high |

## West hub (across Mass Ave)

| Building | Does what | Sim place types | Function confidence |
|---|---|---|---|
| Stratton Student Center (W20) | Student org offices, food court, Tech Coop bookstore, event rooms; hub for student events. | dining, club_room, orientation | high |
| Kresge Auditorium (W16) | Large auditorium for convocation-scale events. | orientation | high |
| MIT Chapel (W15) | Interfaith chapel; small gatherings and concerts. | club_room | high |
| Kresge Oval | Lawn between Kresge, the Chapel and the Student Center. | outdoor, orientation | high |
| Zesiger Sports & Fitness Center (W35) | Gym, pool and courts. | gym | high |
| Johnson Athletics Center (W34) | Rockwell Cage, indoor track and ice rink; large indoor event space. | gym, orientation | medium |

## Off campus

| Building | Does what | Sim place types | Function confidence |
|---|---|---|---|
| Central Square | Restaurants and bars west of campus. | dining, party | high |
| Back Bay fraternity/sorority houses | Cluster of MIT fraternity, sorority and independent living groups across the Harvard Bridge. | party, dorm_room | medium |

## Distances

`distance_matrix_walk_m.csv` and `distance_matrix_walk_min.csv` hold every building pair. Method: straight-line distance x 1.25 for street detours, at 80 m per minute. `distances_long.csv` has the same data as one row per pair. Notable pairs: Bldg 7 to Stratton Student Center is about 2 min, Bldg 7 to Baker House about 9 min, Bldg 7 to Simmons Hall about 12 min.

## Files

- `campus_buildings.csv`: one row per building (id, MIT number, name, zone, primary type, hosted sim place types, what it does, address, lat/lon)
- `distance_matrix_walk_m.csv`, `distance_matrix_walk_min.csv`, `distances_long.csv`
- `campus_map.png`: schematic map, positions approximate
