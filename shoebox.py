"""Shoebox del look test de la fase 4a (desechable).

Una sala de embarque de 12 x 8 x 4 m con un muro cortina al sur de 9 x 3 m, con las
construcciones, el programa, los horarios, la ventilación y el recuperador de la terminal
del Practicum. Todas las caras exteriores (sin vecinos), solera sobre el terreno.

Uso:  .venv/Scripts/python spikes/fase-4a-look/shoebox.py  ->  spikes/fase-4a-look/shoebox.hbjson
"""
from pathlib import Path

from honeybee.aperture import Aperture
from honeybee.model import Model
from honeybee.room import Room
from honeybee_energy.hvac.idealair import IdealAirSystem
from ladybug_geometry.geometry3d import Face3D, Point3D

from thermalloads import terminal

W, D, H = 12.0, 8.0, 4.0
WIN = (1.5, 10.5, 0.5, 3.5)  # x0, x1, z0, z1 sobre la fachada sur (y = 0)


def build() -> Model:
    room = Room.from_box("shoebox", W, D, H)
    room.display_name = "Boarding lounge (shoebox)"
    cset = terminal.construction_set()
    room.properties.energy.construction_set = cset
    room.properties.energy.program_type = terminal._programs()["embarque_contacto"]
    names = {(0, -1): "Muro_S", (0, 1): "Muro_N", (-1, 0): "Muro_W", (1, 0): "Muro_E"}
    for face in room.faces:
        n = face.normal
        if n.z < -0.5:
            face.identifier = "shoebox_Suelo"
        elif n.z > 0.5:
            face.identifier = "shoebox_Cubierta"
        else:
            face.identifier = "shoebox_" + names[(round(n.x), round(n.y))]
    south = next(f for f in room.faces if f.identifier == "shoebox_Muro_S")
    x0, x1, z0, z1 = WIN
    geo = Face3D([Point3D(x0, 0, z0), Point3D(x1, 0, z0), Point3D(x1, 0, z1), Point3D(x0, 0, z1)])
    if geo.normal.y > 0:
        geo = geo.flip()
    ap = Aperture("shoebox_Muro_S_Glz0", geo)
    ap.properties.energy.construction = cset.aperture_set.window_construction
    south.add_aperture(ap)
    room.properties.energy.hvac = IdealAirSystem(
        "shoebox_aire_ideal", economizer_type="NoEconomizer",
        sensible_heat_recovery=terminal.HEAT_RECOVERY_SENSIBLE,
        latent_heat_recovery=terminal.HEAT_RECOVERY_LATENT)
    model = Model("shoebox_lookTest", [room], units="Meters", tolerance=0.01, angle_tolerance=1.0)
    return model


if __name__ == "__main__":
    out = Path(__file__).with_name("shoebox.hbjson")
    m = build()
    report = m.check_all(raise_exception=False)
    if report:
        raise SystemExit(report)
    import json
    out.write_text(json.dumps(m.to_dict()), encoding="utf-8")
    print(out, "faces:", [f.identifier for f in m.rooms[0].faces])
