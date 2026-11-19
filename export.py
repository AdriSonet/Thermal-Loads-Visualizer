"""Exporta del bundle del shoebox lo que necesita el look test (desechable).

Escribe spikes/fase-4a-look/data.js con `window.SHOEBOX = {...}`: un día por estación
(el del pico, del conjunto detail_pico_*), paso de 3 min, todas las series en W, °C, kg/kg.
"""
import json
from pathlib import Path

import numpy as np

from thermalloads.bundle import read_bundle

HERE = Path(__file__).parent
b = read_bundle(HERE / "run" / "bundle")
m = b.manifest
FACES = m["entities"]["surface"]
WIN = m["entities"]["window"][0]

ZONE = {
    "Tair": "zone_mean_air_temperature", "MRT": "zone_mean_radiant_temperature", "Top": "zone_operative_temperature",
    "wIn": "zone_air_humidity_ratio", "RH": "zone_air_relative_humidity", "occ": "zone_people_occupant_count",
    "pplRad": "zone_people_radiant_heating_rate", "pplConv": "zone_people_convective_heating_rate",
    "pplSens": "zone_people_sensible_heating_rate", "pplLat": "zone_people_latent_gain_rate",
    "litVis": "zone_lights_visible_radiation_heating_rate", "litRad": "zone_lights_radiant_heating_rate",
    "litConv": "zone_lights_convective_heating_rate", "litRet": "zone_lights_return_air_heating_rate",
    "eqRad": "zone_electric_equipment_radiant_heating_rate", "eqConv": "zone_electric_equipment_convective_heating_rate",
    "infGain": "zone_infiltration_sensible_heat_gain_rate", "infLoss": "zone_infiltration_sensible_heat_loss_rate",
    "infFlow": "zone_infiltration_standard_density_volume_flow_rate",
    "oaFlow": "zone_ideal_loads_outdoor_air_standard_density_volume_flow_rate",
    "oaSensCool": "zone_ideal_loads_outdoor_air_sensible_cooling_rate", "oaSensHeat": "zone_ideal_loads_outdoor_air_sensible_heating_rate",
    "oaLatCool": "zone_ideal_loads_outdoor_air_latent_cooling_rate", "oaLatHeat": "zone_ideal_loads_outdoor_air_latent_heating_rate",
    "hrSensCool": "zone_ideal_loads_heat_recovery_sensible_cooling_rate", "hrSensHeat": "zone_ideal_loads_heat_recovery_sensible_heating_rate",
    "hrLatCool": "zone_ideal_loads_heat_recovery_latent_cooling_rate", "hrLatHeat": "zone_ideal_loads_heat_recovery_latent_heating_rate",
    "zSensCool": "zone_ideal_loads_zone_sensible_cooling_rate", "zSensHeat": "zone_ideal_loads_zone_sensible_heating_rate",
    "zLatCool": "zone_ideal_loads_zone_latent_cooling_rate", "zLatHeat": "zone_ideal_loads_zone_latent_heating_rate",
    "supSensCool": "zone_ideal_loads_supply_air_sensible_cooling_rate", "supSensHeat": "zone_ideal_loads_supply_air_sensible_heating_rate",
    "Tsup": "zone_ideal_loads_supply_air_temperature", "Tmix": "zone_ideal_loads_mixed_air_temperature",
    "mSup": "zone_ideal_loads_supply_air_mass_flow_rate",
    "surfConv": "zone_air_heat_balance_surface_convection_rate", "intConv": "zone_air_heat_balance_internal_convective_heat_gain_rate",
    "oaTransfer": "zone_air_heat_balance_outdoor_air_transfer_rate", "sysConv": "zone_air_heat_balance_system_air_transfer_rate",
    "airStore": "zone_air_heat_balance_air_energy_storage_rate",
    "solarTrans": "enclosure_windows_total_transmitted_solar_radiation_rate",
}
SITE = {
    "Tout": "site_outdoor_air_drybulb_temperature", "wOut": "site_outdoor_air_humidity_ratio",
    "DNI": "site_direct_solar_radiation_rate_per_area", "DHI": "site_diffuse_solar_radiation_rate_per_area",
    "alt": "site_solar_altitude_angle", "az": "site_solar_azimuth_angle", "Tsky": "site_sky_temperature",
}
SURF = {
    "Tin": "surface_inside_face_temperature", "Tout": "surface_outside_face_temperature",
    "solIn": "surface_inside_face_solar_radiation_heat_gain_rate",
    "intRad": "surface_inside_face_internal_gains_radiation_heat_gain_rate",
    "lw": "surface_inside_face_net_surface_thermal_radiation_heat_gain_rate",
    "conv": "surface_inside_face_convection_heat_gain_rate",
    "cond": "surface_inside_face_conduction_heat_transfer_rate",
    "incOut": "surface_outside_face_incident_solar_radiation_rate_per_area",
    "sunlit": "surface_outside_face_sunlit_fraction",
}
WINV = {
    "Tin": "surface_inside_face_temperature", "Tout": "surface_outside_face_temperature",
    "lw": "surface_inside_face_net_surface_thermal_radiation_heat_gain_rate", "conv": "surface_inside_face_convection_heat_gain_rate",
    "incOut": "surface_outside_face_incident_solar_radiation_rate_per_area",
    "trBeam": "surface_window_transmitted_beam_solar_radiation_rate", "trDiff": "surface_window_transmitted_diffuse_solar_radiation_rate",
    "tr": "surface_window_transmitted_solar_radiation_rate", "abs": "surface_window_total_glazing_layers_absorbed_solar_radiation_rate",
    "gain": "surface_window_heat_gain_rate", "loss": "surface_window_heat_loss_rate", "cond": "conduccion_vidrio",
}


def r(a, nd=2):
    a = np.asarray(a, dtype=float)
    return [None if not np.isfinite(x) else round(float(x), nd) for x in a]


def season(dataset, peak_var):
    ax = m["datasets"][dataset]["axis"]
    per_day = 24 * 60 // ax["interval_minutes"]
    peak = int(np.nanargmax(b.load(dataset, peak_var)[:, 0]))
    d0 = (peak // per_day) * per_day
    sl = slice(d0, d0 + per_day)
    out = {"dataset": dataset, "start": ax["start"], "day_index": d0 // per_day, "step_min": ax["interval_minutes"],
           "peak_step": peak - d0, "zone": {}, "site": {}, "surf": {}, "win": {}, "nodes": {}}
    vars_ = m["datasets"][dataset]["variables"]
    for k, v in ZONE.items():
        out["zone"][k] = r(b.load(dataset, v)[sl, 0]) if v in vars_ else None
    for k, v in SITE.items():
        out["site"][k] = r(b.load(dataset, v)[sl, 0], 5 if k == "wOut" else 2)
    out["zone"]["wIn"] = r(b.load(dataset, ZONE["wIn"])[sl, 0], 5)
    for k, v in SURF.items():
        a = b.load(dataset, v, "surface")[sl]
        out["surf"][k] = {f.replace("shoebox_", ""): r(a[:, i]) for i, f in enumerate(FACES)}
    for k, v in WINV.items():
        cls = "window" if "window" in vars_[v]["classes"] else list(vars_[v]["classes"])[0]
        a = b.load(dataset, v, cls)[sl]
        out["win"][k] = r(a[:, 0])
    nodes = m["entities"]["node"]
    T = b.load(dataset, "condfd_surface_temperature", "node")[sl]
    for fi, face in enumerate(nodes["faces"]):
        s, c = nodes["start"][fi], nodes["count"][fi]
        out["nodes"][face.replace("shoebox_", "")] = {"x": nodes["positions"][fi], "layer": nodes["layer_of_node"][fi],
                                                      "T": [r(T[:, s + j]) for j in range(c)]}
    return out


cons = {}
for face in m["geometry"]["faces"]:
    cons[face["id"].replace("shoebox_", "")] = face.get("construction")
data = {
    "note": "EnergyPlus 25.2, CondFD detail run, Zaragoza TMYx; shoebox with the terminal's constructions and boarding-room program",
    "constructions": m["constructions"], "materials": m["materials"], "face_construction": cons,
    "radiant_split": m["derived"]["tables"]["radiant_split"],
    "summer": season("detail_pico_refrigeracion", "zone_ideal_loads_zone_sensible_cooling_rate"),
    "winter": season("detail_pico_calefaccion", "zone_ideal_loads_zone_sensible_heating_rate"),
}
txt = "window.SHOEBOX = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
(HERE / "data.js").write_text(txt, encoding="utf-8")
print("data.js", len(txt) // 1024, "kB; summer peak step", data["summer"]["peak_step"], "winter", data["winter"]["peak_step"])
