"""
Valve Manufacturing Company — BOM Seeder
========================================
Creates 26 realistic BOMs (11 Finished Good + 15 Semi-Finished) via the API.

Requires the 100 inventory items from valve_inventory_import.xlsx
to already be imported into the system.

Run:
    pip install requests
    python seed_valve_boms.py --base-url http://localhost:8080/api \
                              --username admin --password admin

The script will:
  1. Login to get a JWT token
  2. Fetch all inventory items to build itemCode -> inventoryItemId map
  3. POST each BOM with full positions and routing operations
"""

import argparse
import json
import sys
import time
import requests

# ---------------------------------------------------------------------------
# BOM definitions — itemCodes from valve_inventory_import.xlsx
# ---------------------------------------------------------------------------
# Each BOM:  { bomName, parentCode, description, positions[], operations[] }
# Position:  { code, qty, pos, scrap }
# Operation: { seq, name, setupTime, runTime, inspection, notes }
# ---------------------------------------------------------------------------

BOMS = [
    # ===================================================================
    # SEMI-FINISHED BOMs  (build these first so they exist for FG BOMs)
    # ===================================================================

    # --- Gate Valve Body Assemblies ---
    {
        "bomName": "SF-GVA-25 Rev.1",
        "parentCode": "SF-GVA-25",
        "description": "Gate valve body+bonnet machined assembly DN25 PN16. Body shell test @24 bar.",
        "positions": [
            {"code": "RM-GVB-CS-25",    "qty": 1,    "pos": 10, "scrap": 2.0},
            {"code": "RM-GVN-CS-25",    "qty": 1,    "pos": 20, "scrap": 2.0},
            {"code": "RM-SEAT-SS-25",   "qty": 2,    "pos": 30, "scrap": 3.0},
            {"code": "RM-BOLT-B7-M12x60","qty": 8,   "pos": 40, "scrap": 0},
            {"code": "RM-NUT-2H-M12",   "qty": 16,   "pos": 50, "scrap": 0},
            {"code": "RM-GSK-SW-25-PN16","qty": 1,   "pos": 60, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Rough Machining – Body Bore & Flange Face",
             "setupTime": 0.5, "runTime": 1.2, "inspection": False,
             "notes": "CNC lathe: bore body ID, face flange, rough-turn seat bore"},
            {"seq": 20, "name": "Finish Machining – Seat Bore & Gland Box",
             "setupTime": 0.5, "runTime": 1.5, "inspection": False,
             "notes": "Fine-bore seat pocket, thread gland box M30x1.5"},
            {"seq": 30, "name": "Seat Lapping",
             "setupTime": 0.25, "runTime": 0.75, "inspection": True,
             "notes": "Lap both seat faces to Ra 0.4, blue-check contact >85%"},
            {"seq": 40, "name": "Body Assembly & Shell Pressure Test",
             "setupTime": 0.25, "runTime": 0.5, "inspection": True,
             "notes": "Assemble body+bonnet with gasket & studs, hydro-test 24 bar 2 min"},
        ],
    },
    {
        "bomName": "SF-GVA-50 Rev.1",
        "parentCode": "SF-GVA-50",
        "description": "Gate valve body+bonnet machined assembly DN50 PN16. Body shell test @24 bar.",
        "positions": [
            {"code": "RM-GVB-CS-50",    "qty": 1,    "pos": 10, "scrap": 2.0},
            {"code": "RM-GVN-CS-50",    "qty": 1,    "pos": 20, "scrap": 2.0},
            {"code": "RM-SEAT-SS-50",   "qty": 2,    "pos": 30, "scrap": 3.0},
            {"code": "RM-BOLT-B7-M16x80","qty": 8,   "pos": 40, "scrap": 0},
            {"code": "RM-NUT-2H-M16",   "qty": 16,   "pos": 50, "scrap": 0},
            {"code": "RM-GSK-SW-50-PN16","qty": 1,   "pos": 60, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Rough Machining – Body Bore & Flange Face",
             "setupTime": 0.5, "runTime": 1.5, "inspection": False,
             "notes": "CNC lathe: bore body ID DN50, face flanges, rough seat bore"},
            {"seq": 20, "name": "Finish Machining – Seat Bore & Gland Box",
             "setupTime": 0.5, "runTime": 1.8, "inspection": False,
             "notes": "Fine-bore seat pocket, thread gland box M48x1.5"},
            {"seq": 30, "name": "Seat Lapping",
             "setupTime": 0.25, "runTime": 1.0, "inspection": True,
             "notes": "Lap both seat faces Ra 0.4, blue-check contact >85%"},
            {"seq": 40, "name": "Body Assembly & Shell Pressure Test",
             "setupTime": 0.25, "runTime": 0.5, "inspection": True,
             "notes": "Assemble body+bonnet, hydro-test 24 bar 2 min per API 598"},
        ],
    },
    {
        "bomName": "SF-GVA-80 Rev.1",
        "parentCode": "SF-GVA-80",
        "description": "Gate valve body+bonnet machined assembly DN80 PN16. Body shell test @24 bar.",
        "positions": [
            {"code": "RM-GVB-CS-80",    "qty": 1,    "pos": 10, "scrap": 2.0},
            {"code": "RM-GVN-CS-80",    "qty": 1,    "pos": 20, "scrap": 2.0},
            {"code": "RM-SEAT-SS-80",   "qty": 2,    "pos": 30, "scrap": 3.0},
            {"code": "RM-BOLT-B7-M16x80","qty": 12,  "pos": 40, "scrap": 0},
            {"code": "RM-NUT-2H-M16",   "qty": 24,   "pos": 50, "scrap": 0},
            {"code": "RM-GSK-SW-80-PN16","qty": 1,   "pos": 60, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Rough Machining – Body Bore & Flange Face",
             "setupTime": 0.75, "runTime": 2.0, "inspection": False,
             "notes": "CNC lathe: bore body ID DN80, face flanges, rough seat bore"},
            {"seq": 20, "name": "Finish Machining – Seat Bore & Gland Box",
             "setupTime": 0.5, "runTime": 2.5, "inspection": False,
             "notes": "Fine-bore seat pocket, thread gland box"},
            {"seq": 30, "name": "Seat Lapping",
             "setupTime": 0.5, "runTime": 1.5, "inspection": True,
             "notes": "Lap both seat faces Ra 0.4, blue contact >85%"},
            {"seq": 40, "name": "Body Assembly & Shell Pressure Test",
             "setupTime": 0.25, "runTime": 0.75, "inspection": True,
             "notes": "Assemble body+bonnet, hydro-test 24 bar 2 min per API 598"},
        ],
    },

    # --- Ball Valve Body Assemblies ---
    {
        "bomName": "SF-BVA-25 Rev.1",
        "parentCode": "SF-BVA-25",
        "description": "3-piece ball valve body assembly DN25: center body + two end caps machined & assembled.",
        "positions": [
            {"code": "RM-BVB-SS-25",    "qty": 1,    "pos": 10, "scrap": 3.0},
            {"code": "RM-BVEC-SS-25",   "qty": 2,    "pos": 20, "scrap": 2.0},
            {"code": "RM-BOLT-B7-M12x60","qty": 8,   "pos": 30, "scrap": 0},
            {"code": "RM-NUT-2H-M12",   "qty": 8,    "pos": 40, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Bore & Face – Center Body",
             "setupTime": 0.5, "runTime": 1.0, "inspection": False,
             "notes": "CNC: bore ID, face ends, drill stem bore, counterbore seat pockets"},
            {"seq": 20, "name": "Bore & Face – End Caps",
             "setupTime": 0.5, "runTime": 0.8, "inspection": False,
             "notes": "CNC: bore ID, face flanges, drill bolt holes (matched pair)"},
            {"seq": 30, "name": "Body Assembly",
             "setupTime": 0.25, "runTime": 0.5, "inspection": True,
             "notes": "Assemble center+end caps with tie bolts, torque per spec"},
        ],
    },
    {
        "bomName": "SF-BVA-50 Rev.1",
        "parentCode": "SF-BVA-50",
        "description": "3-piece ball valve body assembly DN50: center body + two end caps machined & assembled.",
        "positions": [
            {"code": "RM-BVB-SS-50",    "qty": 1,    "pos": 10, "scrap": 3.0},
            {"code": "RM-BVEC-SS-50",   "qty": 2,    "pos": 20, "scrap": 2.0},
            {"code": "RM-BOLT-B7-M16x80","qty": 8,   "pos": 30, "scrap": 0},
            {"code": "RM-NUT-2H-M16",   "qty": 8,    "pos": 40, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Bore & Face – Center Body",
             "setupTime": 0.5, "runTime": 1.5, "inspection": False,
             "notes": "CNC: bore ID DN50, face ends, drill stem bore, seat pockets"},
            {"seq": 20, "name": "Bore & Face – End Caps",
             "setupTime": 0.5, "runTime": 1.0, "inspection": False,
             "notes": "CNC: bore ID, face flanges, drill bolt holes"},
            {"seq": 30, "name": "Body Assembly",
             "setupTime": 0.25, "runTime": 0.5, "inspection": True,
             "notes": "Assemble center+end caps with tie bolts, torque per spec"},
        ],
    },
    {
        "bomName": "SF-BVA-80 Rev.1",
        "parentCode": "SF-BVA-80",
        "description": "3-piece ball valve body assembly DN80: machined-from-bar center body + two end caps.",
        "positions": [
            {"code": "RM-BAR-SS316-32", "qty": 0.25, "pos": 10, "scrap": 8.0},
            {"code": "RM-BVEC-SS-80",   "qty": 2,    "pos": 20, "scrap": 2.0},
            {"code": "RM-BOLT-B7-M16x80","qty": 12,  "pos": 30, "scrap": 0},
            {"code": "RM-NUT-2H-M16",   "qty": 12,   "pos": 40, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "CNC Turning – Center Body from Bar",
             "setupTime": 0.75, "runTime": 2.5, "inspection": False,
             "notes": "Turn OD, bore ID DN80, face ends, drill stem bore & seat pockets from SS316 bar"},
            {"seq": 20, "name": "Bore & Face – End Caps",
             "setupTime": 0.5, "runTime": 1.5, "inspection": False,
             "notes": "CNC: bore ID, face flanges, drill bolt holes"},
            {"seq": 30, "name": "Body Assembly",
             "setupTime": 0.25, "runTime": 0.75, "inspection": True,
             "notes": "Assemble center+end caps with tie bolts, torque per spec"},
        ],
    },

    # --- Gate / Wedge Disc & Stem Assemblies ---
    {
        "bomName": "SF-GDA-25 Rev.1",
        "parentCode": "SF-GDA-25",
        "description": "Wedge gate + stem assembly DN25: Stellite-6 hardfaced seats, T-slot coupling.",
        "positions": [
            {"code": "RM-WEDGE-25",     "qty": 1,    "pos": 10, "scrap": 5.0},
            {"code": "RM-STM-F6A-25",   "qty": 1,    "pos": 20, "scrap": 3.0},
            {"code": "RM-THRST-BRG-01", "qty": 1,    "pos": 30, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Wedge Rough Machining",
             "setupTime": 0.5, "runTime": 1.0, "inspection": False,
             "notes": "CNC mill: rough-machine wedge OD and seat face angles"},
            {"seq": 20, "name": "Stellite-6 Hardfacing – Seat Faces",
             "setupTime": 0.5, "runTime": 1.5, "inspection": False,
             "notes": "PTA/GTAW deposit Stellite-6 on both seat faces, 2.5mm min deposit"},
            {"seq": 30, "name": "Wedge Finish Machining & Lap",
             "setupTime": 0.25, "runTime": 1.2, "inspection": True,
             "notes": "CNC finish seat faces, lap to Ra 0.4, inspect blue contact"},
            {"seq": 40, "name": "Stem Machining – Thread & T-slot",
             "setupTime": 0.5, "runTime": 1.0, "inspection": False,
             "notes": "CNC lathe: thread Tr20x4, turn T-slot for wedge coupling, turn stem OD"},
            {"seq": 50, "name": "Coupling Assembly & Inspection",
             "setupTime": 0.25, "runTime": 0.3, "inspection": True,
             "notes": "Assemble T-slot, install thrust bearing, check stem travel"},
        ],
    },
    {
        "bomName": "SF-GDA-50 Rev.1",
        "parentCode": "SF-GDA-50",
        "description": "Wedge gate + stem assembly DN50: Stellite-6 hardfaced seats, T-slot coupling.",
        "positions": [
            {"code": "RM-WEDGE-50",     "qty": 1,    "pos": 10, "scrap": 5.0},
            {"code": "RM-STM-F6A-50",   "qty": 1,    "pos": 20, "scrap": 3.0},
            {"code": "RM-THRST-BRG-02", "qty": 1,    "pos": 30, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Wedge Rough Machining",
             "setupTime": 0.5, "runTime": 1.5, "inspection": False,
             "notes": "CNC mill: rough-machine wedge OD and seat face angles DN50"},
            {"seq": 20, "name": "Stellite-6 Hardfacing – Seat Faces",
             "setupTime": 0.5, "runTime": 2.0, "inspection": False,
             "notes": "PTA/GTAW deposit Stellite-6 on both seat faces, 2.5mm deposit"},
            {"seq": 30, "name": "Wedge Finish Machining & Lap",
             "setupTime": 0.25, "runTime": 1.5, "inspection": True,
             "notes": "CNC finish seat faces, lap Ra 0.4, inspect blue contact"},
            {"seq": 40, "name": "Stem Machining – Thread & T-slot",
             "setupTime": 0.5, "runTime": 1.5, "inspection": False,
             "notes": "CNC lathe: thread Tr32x6, T-slot coupling, turn stem OD"},
            {"seq": 50, "name": "Coupling Assembly & Inspection",
             "setupTime": 0.25, "runTime": 0.3, "inspection": True,
             "notes": "Assemble T-slot, install thrust bearing, check travel"},
        ],
    },
    {
        "bomName": "SF-GDA-80 Rev.1",
        "parentCode": "SF-GDA-80",
        "description": "Wedge gate + stem assembly DN80: Stellite-6 hardfaced seats, T-slot coupling.",
        "positions": [
            {"code": "RM-WEDGE-80",     "qty": 1,    "pos": 10, "scrap": 5.0},
            {"code": "RM-STM-F6A-80",   "qty": 1,    "pos": 20, "scrap": 3.0},
            {"code": "RM-THRST-BRG-02", "qty": 1,    "pos": 30, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Wedge Rough Machining",
             "setupTime": 0.75, "runTime": 2.0, "inspection": False,
             "notes": "CNC mill: rough-machine wedge OD and seat face angles DN80"},
            {"seq": 20, "name": "Stellite-6 Hardfacing – Seat Faces",
             "setupTime": 0.5, "runTime": 2.5, "inspection": False,
             "notes": "PTA deposit Stellite-6 on both seat faces, 3mm deposit"},
            {"seq": 30, "name": "Wedge Finish Machining & Lap",
             "setupTime": 0.5, "runTime": 2.0, "inspection": True,
             "notes": "CNC finish seat faces, lap Ra 0.4, blue contact >85%"},
            {"seq": 40, "name": "Stem Machining – Thread & T-slot",
             "setupTime": 0.5, "runTime": 2.0, "inspection": False,
             "notes": "CNC lathe: thread Tr45x8, T-slot coupling, turn stem OD DN80"},
            {"seq": 50, "name": "Coupling Assembly & Inspection",
             "setupTime": 0.25, "runTime": 0.5, "inspection": True,
             "notes": "Assemble T-slot, install thrust bearing, check travel"},
        ],
    },

    # --- Ball & Stem Assemblies ---
    {
        "bomName": "SF-BALL-25 Rev.1",
        "parentCode": "SF-BALL-25",
        "description": "SS316 ball + stem assembly DN25: polished ball bore 25mm, Ra 0.4 surface finish.",
        "positions": [
            {"code": "RM-BALL-SS-25",   "qty": 1,    "pos": 10, "scrap": 3.0},
            {"code": "RM-BAR-SS316-20", "qty": 0.22, "pos": 20, "scrap": 5.0},
        ],
        "operations": [
            {"seq": 10, "name": "Ball Rough Turning",
             "setupTime": 0.5, "runTime": 0.8, "inspection": False,
             "notes": "CNC lathe: rough turn ball sphere OD, bore 25mm through port"},
            {"seq": 20, "name": "Ball Polishing",
             "setupTime": 0.5, "runTime": 1.5, "inspection": True,
             "notes": "CNC ball grinder: finish sphere to Ra 0.4, roundness <0.01mm"},
            {"seq": 30, "name": "Stem Machining",
             "setupTime": 0.25, "runTime": 0.6, "inspection": False,
             "notes": "CNC lathe: turn stem OD, drive slot, flat, groove for O-ring from bar stock"},
            {"seq": 40, "name": "Coupling Assembly",
             "setupTime": 0.25, "runTime": 0.25, "inspection": True,
             "notes": "Insert stem into ball, confirm drive slot engagement"},
        ],
    },
    {
        "bomName": "SF-BALL-50 Rev.1",
        "parentCode": "SF-BALL-50",
        "description": "SS316 ball + stem assembly DN50: polished ball bore 50mm, Ra 0.4 surface finish.",
        "positions": [
            {"code": "RM-BALL-SS-50",   "qty": 1,    "pos": 10, "scrap": 3.0},
            {"code": "RM-BAR-SS316-32", "qty": 0.32, "pos": 20, "scrap": 5.0},
        ],
        "operations": [
            {"seq": 10, "name": "Ball Rough Turning",
             "setupTime": 0.5, "runTime": 1.2, "inspection": False,
             "notes": "CNC lathe: rough turn ball sphere OD, bore 50mm through port"},
            {"seq": 20, "name": "Ball Polishing",
             "setupTime": 0.5, "runTime": 2.0, "inspection": True,
             "notes": "CNC ball grinder: finish sphere Ra 0.4, roundness <0.01mm"},
            {"seq": 30, "name": "Stem Machining",
             "setupTime": 0.25, "runTime": 1.0, "inspection": False,
             "notes": "CNC lathe: turn stem OD, drive flat, O-ring groove from bar DN50"},
            {"seq": 40, "name": "Coupling Assembly",
             "setupTime": 0.25, "runTime": 0.25, "inspection": True,
             "notes": "Insert stem into ball, verify drive slot engagement"},
        ],
    },

    # --- Butterfly Disc Assembly ---
    {
        "bomName": "SF-BFVA-100 Rev.1",
        "parentCode": "SF-BFVA-100",
        "description": "BFV disc + shaft assembly DN100: CI disc machined & hard-chrome shaft.",
        "positions": [
            {"code": "RM-DISC-CI-100",  "qty": 1,    "pos": 10, "scrap": 3.0},
            {"code": "RM-SHAFT-BFV-100","qty": 1,    "pos": 20, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Disc Machining",
             "setupTime": 0.5, "runTime": 1.0, "inspection": False,
             "notes": "CNC: turn disc OD to lining clearance, drill shaft bore & key groove"},
            {"seq": 20, "name": "Disc Epoxy Coating",
             "setupTime": 0.25, "runTime": 0.5, "inspection": False,
             "notes": "Shot-blast disc, apply epoxy coat 75 DFT, cure 4h at 60C"},
            {"seq": 30, "name": "Shaft Machining",
             "setupTime": 0.5, "runTime": 0.8, "inspection": False,
             "notes": "CNC: turn shaft OD, mill Woodruff key, thread lower end"},
            {"seq": 40, "name": "Shaft Assembly & Inspection",
             "setupTime": 0.25, "runTime": 0.3, "inspection": True,
             "notes": "Press shaft through disc, check rotation torque <5 Nm"},
        ],
    },

    # --- Globe Valve Body Assemblies ---
    {
        "bomName": "SF-GLVA-25 Rev.1",
        "parentCode": "SF-GLVA-25",
        "description": "Globe valve body+bonnet assembly DN25 PN16. Shell test @24 bar. Seat machined-in.",
        "positions": [
            {"code": "RM-GLVB-CS-25",   "qty": 1,    "pos": 10, "scrap": 2.0},
            {"code": "RM-SEAT-SS-25",   "qty": 1,    "pos": 20, "scrap": 3.0},
            {"code": "RM-BOLT-B7-M12x60","qty": 8,   "pos": 30, "scrap": 0},
            {"code": "RM-NUT-2H-M12",   "qty": 16,   "pos": 40, "scrap": 0},
            {"code": "RM-GSK-SW-25-PN16","qty": 1,   "pos": 50, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Body Machining – Bore & Seat",
             "setupTime": 0.5, "runTime": 1.5, "inspection": False,
             "notes": "CNC: bore body port, machine seat bore & taper, flange face, gland box"},
            {"seq": 20, "name": "Seat Pressing & Lapping",
             "setupTime": 0.25, "runTime": 0.75, "inspection": True,
             "notes": "Press fit SS316 seat ring, lap to Ra 0.4, check seating blue"},
            {"seq": 30, "name": "Body Assembly & Shell Test",
             "setupTime": 0.25, "runTime": 0.5, "inspection": True,
             "notes": "Assemble body+bonnet, hydro-test body shell 24 bar 2 min"},
        ],
    },
    {
        "bomName": "SF-GLVA-50 Rev.1",
        "parentCode": "SF-GLVA-50",
        "description": "Globe valve body+bonnet assembly DN50 PN16. Shell test @24 bar. Seat machined-in.",
        "positions": [
            {"code": "RM-GVB-CS-50",    "qty": 1,    "pos": 10, "scrap": 2.0},
            {"code": "RM-GVN-CS-50",    "qty": 1,    "pos": 20, "scrap": 2.0},
            {"code": "RM-SEAT-SS-50",   "qty": 1,    "pos": 30, "scrap": 3.0},
            {"code": "RM-BOLT-B7-M16x80","qty": 8,   "pos": 40, "scrap": 0},
            {"code": "RM-NUT-2H-M16",   "qty": 16,   "pos": 50, "scrap": 0},
            {"code": "RM-GSK-SW-50-PN16","qty": 1,   "pos": 60, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Body Machining – Bore & Seat",
             "setupTime": 0.5, "runTime": 2.0, "inspection": False,
             "notes": "CNC: bore body port, machine seat bore & taper, flange face, gland box DN50"},
            {"seq": 20, "name": "Seat Pressing & Lapping",
             "setupTime": 0.25, "runTime": 1.0, "inspection": True,
             "notes": "Press fit SS316 seat ring, lap Ra 0.4, blue check"},
            {"seq": 30, "name": "Body Assembly & Shell Test",
             "setupTime": 0.25, "runTime": 0.5, "inspection": True,
             "notes": "Assemble body+bonnet, hydro-test 24 bar 2 min"},
        ],
    },

    # --- Check Valve Body Assembly ---
    {
        "bomName": "SF-CHKA-50 Rev.1",
        "parentCode": "SF-CHKA-50",
        "description": "Swing check valve body assembly DN50 PN16: body+cover machined, seat hardfaced.",
        "positions": [
            {"code": "RM-CHKB-CS-50",   "qty": 1,    "pos": 10, "scrap": 2.0},
            {"code": "RM-SEAT-SS-50",   "qty": 1,    "pos": 20, "scrap": 3.0},
            {"code": "RM-BOLT-B7-M16x80","qty": 8,   "pos": 30, "scrap": 0},
            {"code": "RM-NUT-2H-M16",   "qty": 16,   "pos": 40, "scrap": 0},
            {"code": "RM-GSK-SW-50-PN16","qty": 1,   "pos": 50, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Body Machining – Bore & Seat",
             "setupTime": 0.5, "runTime": 1.5, "inspection": False,
             "notes": "CNC: bore body ID, hinge lug, seat bore & taper, flange face"},
            {"seq": 20, "name": "Seat Stellite Hardfacing & Lap",
             "setupTime": 0.5, "runTime": 1.0, "inspection": True,
             "notes": "PTA Stellite-6 on body seat face, lap Ra 0.4"},
            {"seq": 30, "name": "Cover Assembly & Shell Test",
             "setupTime": 0.25, "runTime": 0.5, "inspection": True,
             "notes": "Assemble cover+gasket+studs, hydro-test 24 bar 2 min"},
        ],
    },

    # ===================================================================
    # FINISHED GOOD BOMs
    # ===================================================================

    # --- Gate Valves ---
    {
        "bomName": 'FG-GV-25-PN16 Rev.1',
        "parentCode": "FG-GV-25-PN16",
        "description": 'Gate valve 1" DN25 PN16 CS complete assembly per API 600 / BS 1414.',
        "positions": [
            {"code": "SF-GVA-25",       "qty": 1,    "pos": 10, "scrap": 0},
            {"code": "SF-GDA-25",       "qty": 1,    "pos": 20, "scrap": 0},
            {"code": "RM-YOKE-MS-25",   "qty": 1,    "pos": 30, "scrap": 0},
            {"code": "RM-HW-200-CI",    "qty": 1,    "pos": 40, "scrap": 0},
            {"code": "RM-GLAND-25",     "qty": 1,    "pos": 50, "scrap": 0},
            {"code": "RM-ORING-V-25",   "qty": 2,    "pos": 60, "scrap": 0},
            {"code": "CO-GRPH-PACK-5",  "qty": 0.3,  "pos": 70, "scrap": 5.0},
            {"code": "RM-THRST-BRG-01", "qty": 1,    "pos": 80, "scrap": 0},
            {"code": "RM-NP-SS316",     "qty": 1,    "pos": 90, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Incoming Inspection – Sub-Assemblies",
             "setupTime": 0.25, "runTime": 0.5, "inspection": True,
             "notes": "Verify body assy & gate-stem assy certs, dimensions, and test records"},
            {"seq": 20, "name": "Packing & Gland Installation",
             "setupTime": 0.25, "runTime": 0.3, "inspection": False,
             "notes": "Cut graphite packing rings, install in gland box, fit gland nut DN25"},
            {"seq": 30, "name": "Final Assembly – Internals & Handwheel",
             "setupTime": 0.5, "runTime": 0.75, "inspection": False,
             "notes": "Insert gate-stem assy into body, install yoke, handwheel, O-rings, thrust brg"},
            {"seq": 40, "name": "Seat Leak Test (API 598)",
             "setupTime": 0.5, "runTime": 0.5, "inspection": True,
             "notes": "Hydro seat test 17.6 bar, zero leakage, both directions 2 min each"},
            {"seq": 50, "name": "Painting & Nameplate",
             "setupTime": 0.25, "runTime": 0.5, "inspection": False,
             "notes": "Shot-blast, primer coat, epoxy grey finish, attach SS316 nameplate"},
            {"seq": 60, "name": "Final Inspection & Packing",
             "setupTime": 0.25, "runTime": 0.5, "inspection": True,
             "notes": "Dimensional check, flange end protectors, packing in wooden crate"},
        ],
    },
    {
        "bomName": 'FG-GV-50-PN16 Rev.1',
        "parentCode": "FG-GV-50-PN16",
        "description": 'Gate valve 2" DN50 PN16 CS complete assembly per API 600.',
        "positions": [
            {"code": "SF-GVA-50",       "qty": 1,    "pos": 10, "scrap": 0},
            {"code": "SF-GDA-50",       "qty": 1,    "pos": 20, "scrap": 0},
            {"code": "RM-YOKE-MS-50",   "qty": 1,    "pos": 30, "scrap": 0},
            {"code": "RM-HW-250-CI",    "qty": 1,    "pos": 40, "scrap": 0},
            {"code": "RM-GLAND-50",     "qty": 1,    "pos": 50, "scrap": 0},
            {"code": "RM-ORING-V-50",   "qty": 2,    "pos": 60, "scrap": 0},
            {"code": "CO-GRPH-PACK-5",  "qty": 0.5,  "pos": 70, "scrap": 5.0},
            {"code": "RM-THRST-BRG-02", "qty": 1,    "pos": 80, "scrap": 0},
            {"code": "RM-NP-SS316",     "qty": 1,    "pos": 90, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Incoming Inspection – Sub-Assemblies",
             "setupTime": 0.25, "runTime": 0.5, "inspection": True,
             "notes": "Verify body assy & gate-stem assy certs, dimensions, test records"},
            {"seq": 20, "name": "Packing & Gland Installation",
             "setupTime": 0.25, "runTime": 0.4, "inspection": False,
             "notes": "Cut graphite packing rings, install gland box, fit gland nut DN50"},
            {"seq": 30, "name": "Final Assembly – Internals & Handwheel",
             "setupTime": 0.5, "runTime": 1.0, "inspection": False,
             "notes": "Insert gate-stem assy, install yoke, handwheel, O-rings, thrust bearing"},
            {"seq": 40, "name": "Seat Leak Test (API 598)",
             "setupTime": 0.5, "runTime": 0.5, "inspection": True,
             "notes": "Hydro seat test 17.6 bar, zero leakage both directions 2 min"},
            {"seq": 50, "name": "Painting & Nameplate",
             "setupTime": 0.25, "runTime": 0.75, "inspection": False,
             "notes": "Shot-blast, primer, epoxy grey, nameplate"},
            {"seq": 60, "name": "Final Inspection & Packing",
             "setupTime": 0.25, "runTime": 0.5, "inspection": True,
             "notes": "Dimensional check, end protectors, wooden crate"},
        ],
    },
    {
        "bomName": 'FG-GV-80-PN16 Rev.1',
        "parentCode": "FG-GV-80-PN16",
        "description": 'Gate valve 3" DN80 PN16 CS complete assembly per API 600.',
        "positions": [
            {"code": "SF-GVA-80",       "qty": 1,    "pos": 10, "scrap": 0},
            {"code": "SF-GDA-80",       "qty": 1,    "pos": 20, "scrap": 0},
            {"code": "RM-YOKE-MS-80",   "qty": 1,    "pos": 30, "scrap": 0},
            {"code": "RM-HW-320-CI",    "qty": 1,    "pos": 40, "scrap": 0},
            {"code": "RM-GLAND-50",     "qty": 1,    "pos": 50, "scrap": 0},
            {"code": "RM-ORING-V-50",   "qty": 2,    "pos": 60, "scrap": 0},
            {"code": "CO-GRPH-PACK-8",  "qty": 0.6,  "pos": 70, "scrap": 5.0},
            {"code": "RM-THRST-BRG-02", "qty": 1,    "pos": 80, "scrap": 0},
            {"code": "RM-NP-SS316",     "qty": 1,    "pos": 90, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Incoming Inspection – Sub-Assemblies",
             "setupTime": 0.25, "runTime": 0.75, "inspection": True,
             "notes": "Verify body assy & gate-stem assy certs, dims, test records DN80"},
            {"seq": 20, "name": "Packing & Gland Installation",
             "setupTime": 0.25, "runTime": 0.5, "inspection": False,
             "notes": "Cut 8mm graphite rings, install gland box, fit gland nut"},
            {"seq": 30, "name": "Final Assembly – Internals & Handwheel",
             "setupTime": 0.75, "runTime": 1.5, "inspection": False,
             "notes": "Insert gate-stem, install yoke, handwheel 320mm, O-rings, thrust brg"},
            {"seq": 40, "name": "Seat Leak Test (API 598)",
             "setupTime": 0.5, "runTime": 0.5, "inspection": True,
             "notes": "Hydro seat test 17.6 bar, zero leakage both directions"},
            {"seq": 50, "name": "Painting & Nameplate",
             "setupTime": 0.25, "runTime": 1.0, "inspection": False,
             "notes": "Shot-blast, primer, epoxy grey finish, SS316 nameplate"},
            {"seq": 60, "name": "Final Inspection & Packing",
             "setupTime": 0.5, "runTime": 0.75, "inspection": True,
             "notes": "Dimensional check, flange protectors, heavy wooden crate"},
        ],
    },

    # --- Ball Valves ---
    {
        "bomName": 'FG-BV-25-PN16 Rev.1',
        "parentCode": "FG-BV-25-PN16",
        "description": 'Ball valve 1" DN25 PN16 SS316 full bore 3-piece. Fire-safe per API 607.',
        "positions": [
            {"code": "SF-BVA-25",       "qty": 1,    "pos": 10, "scrap": 0},
            {"code": "SF-BALL-25",      "qty": 1,    "pos": 20, "scrap": 0},
            {"code": "RM-PTFE-SEAT-25", "qty": 2,    "pos": 30, "scrap": 2.0},
            {"code": "RM-ORING-V-25",   "qty": 3,    "pos": 40, "scrap": 0},
            {"code": "RM-GSK-SW-25-PN16","qty": 2,   "pos": 50, "scrap": 0},
            {"code": "RM-NP-SS316",     "qty": 1,    "pos": 60, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Incoming Inspection",
             "setupTime": 0.25, "runTime": 0.3, "inspection": True,
             "notes": "Verify body assy & ball-stem assy dimensions and finish"},
            {"seq": 20, "name": "Final Assembly",
             "setupTime": 0.5, "runTime": 0.5, "inspection": False,
             "notes": "Insert PTFE seats, load ball into center body, O-rings, close end caps"},
            {"seq": 30, "name": "Torque Setting & Seat Leak Test",
             "setupTime": 0.25, "runTime": 0.3, "inspection": True,
             "notes": "Set tie-bolt torque, hydro seat test 17.6 bar 2 min zero leakage"},
            {"seq": 40, "name": "Final Inspection & Packing",
             "setupTime": 0.25, "runTime": 0.3, "inspection": True,
             "notes": "Check operation torque, end protectors, box pack"},
        ],
    },
    {
        "bomName": 'FG-BV-50-PN16 Rev.1',
        "parentCode": "FG-BV-50-PN16",
        "description": 'Ball valve 2" DN50 PN16 SS316 full bore 3-piece. Fire-safe per API 607.',
        "positions": [
            {"code": "SF-BVA-50",       "qty": 1,    "pos": 10, "scrap": 0},
            {"code": "SF-BALL-50",      "qty": 1,    "pos": 20, "scrap": 0},
            {"code": "RM-PTFE-SEAT-50", "qty": 2,    "pos": 30, "scrap": 2.0},
            {"code": "RM-ORING-V-50",   "qty": 3,    "pos": 40, "scrap": 0},
            {"code": "RM-GSK-SW-50-PN16","qty": 2,   "pos": 50, "scrap": 0},
            {"code": "RM-NP-SS316",     "qty": 1,    "pos": 60, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Incoming Inspection",
             "setupTime": 0.25, "runTime": 0.4, "inspection": True,
             "notes": "Verify body assy & ball-stem assy dimensions and finish DN50"},
            {"seq": 20, "name": "Final Assembly",
             "setupTime": 0.5, "runTime": 0.75, "inspection": False,
             "notes": "Insert PTFE seats, load ball, O-rings, close end caps, tie bolts"},
            {"seq": 30, "name": "Torque Setting & Seat Leak Test",
             "setupTime": 0.25, "runTime": 0.5, "inspection": True,
             "notes": "Set tie-bolt torque, hydro seat test 17.6 bar 2 min zero leak"},
            {"seq": 40, "name": "Final Inspection & Packing",
             "setupTime": 0.25, "runTime": 0.4, "inspection": True,
             "notes": "Check operation torque, end protectors, box pack"},
        ],
    },
    {
        "bomName": 'FG-BV-80-PN16 Rev.1',
        "parentCode": "FG-BV-80-PN16",
        "description": 'Ball valve 3" DN80 PN16 SS316 full bore 3-piece.',
        "positions": [
            {"code": "SF-BVA-80",       "qty": 1,    "pos": 10, "scrap": 0},
            {"code": "SF-BALL-50",      "qty": 1,    "pos": 20, "scrap": 0},
            {"code": "RM-PTFE-SEAT-50", "qty": 2,    "pos": 30, "scrap": 2.0},
            {"code": "RM-ORING-V-50",   "qty": 3,    "pos": 40, "scrap": 0},
            {"code": "RM-GSK-SW-80-PN16","qty": 2,   "pos": 50, "scrap": 0},
            {"code": "RM-NP-SS316",     "qty": 1,    "pos": 60, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Incoming Inspection",
             "setupTime": 0.25, "runTime": 0.5, "inspection": True,
             "notes": "Verify body assy & ball-stem assy dims and finish DN80"},
            {"seq": 20, "name": "Final Assembly",
             "setupTime": 0.75, "runTime": 1.0, "inspection": False,
             "notes": "Insert PTFE seats, load ball, O-rings, close end caps, tie bolts DN80"},
            {"seq": 30, "name": "Torque Setting & Seat Leak Test",
             "setupTime": 0.25, "runTime": 0.5, "inspection": True,
             "notes": "Set tie-bolt torque, hydro seat test 17.6 bar 2 min"},
            {"seq": 40, "name": "Final Inspection & Packing",
             "setupTime": 0.25, "runTime": 0.5, "inspection": True,
             "notes": "Check operation torque, end protectors, wooden crate"},
        ],
    },

    # --- Butterfly Valve ---
    {
        "bomName": 'FG-BFV-100-PN16 Rev.1',
        "parentCode": "FG-BFV-100-PN16",
        "description": 'Butterfly valve 4" DN100 PN16 CI body + SS316 disc. Wafer type, EPDM seat.',
        "positions": [
            {"code": "RM-BFVB-CI-100",  "qty": 1,    "pos": 10, "scrap": 0},
            {"code": "SF-BFVA-100",     "qty": 1,    "pos": 20, "scrap": 0},
            {"code": "RM-SEAT-EPDM-100","qty": 1,    "pos": 30, "scrap": 0},
            {"code": "RM-BOLT-B7-M12x60","qty": 4,   "pos": 40, "scrap": 0},
            {"code": "RM-NUT-2H-M12",   "qty": 4,    "pos": 50, "scrap": 0},
            {"code": "RM-NP-SS316",     "qty": 1,    "pos": 60, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Body Machining & Seat Installation",
             "setupTime": 0.5, "runTime": 1.0, "inspection": False,
             "notes": "CNC: face CI body OD & bolt holes, press-fit EPDM seat lining"},
            {"seq": 20, "name": "Disc & Shaft Assembly into Body",
             "setupTime": 0.5, "runTime": 0.75, "inspection": False,
             "notes": "Insert disc-shaft assy, install lower bearing, top actuator plate"},
            {"seq": 30, "name": "Seat Leak Test & Torque Check",
             "setupTime": 0.25, "runTime": 0.5, "inspection": True,
             "notes": "Pneumatic seat test 6 bar, zero leakage, check disc operation torque"},
            {"seq": 40, "name": "Painting & Packing",
             "setupTime": 0.25, "runTime": 0.5, "inspection": False,
             "notes": "Epoxy coat body exterior, nameplate, box pack with end protection"},
        ],
    },

    # --- Globe Valves ---
    {
        "bomName": 'FG-GLV-25-PN16 Rev.1',
        "parentCode": "FG-GLV-25-PN16",
        "description": 'Globe valve 1" DN25 PN16 CS complete assembly. API 623 / BS 1873.',
        "positions": [
            {"code": "SF-GLVA-25",      "qty": 1,    "pos": 10, "scrap": 0},
            {"code": "RM-STM-F6A-25",   "qty": 1,    "pos": 20, "scrap": 3.0},
            {"code": "RM-HW-200-CI",    "qty": 1,    "pos": 30, "scrap": 0},
            {"code": "RM-GLAND-25",     "qty": 1,    "pos": 40, "scrap": 0},
            {"code": "RM-ORING-V-25",   "qty": 2,    "pos": 50, "scrap": 0},
            {"code": "CO-GRPH-PACK-5",  "qty": 0.25, "pos": 60, "scrap": 5.0},
            {"code": "RM-THRST-BRG-01", "qty": 1,    "pos": 70, "scrap": 0},
            {"code": "RM-NP-SS316",     "qty": 1,    "pos": 80, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Plug Stem Machining",
             "setupTime": 0.5, "runTime": 0.8, "inspection": False,
             "notes": "CNC: machine plug disc taper & face, thread Tr20x4, turn OD"},
            {"seq": 20, "name": "Packing & Gland Installation",
             "setupTime": 0.25, "runTime": 0.3, "inspection": False,
             "notes": "Install graphite rings in gland box DN25, fit brass gland nut"},
            {"seq": 30, "name": "Final Assembly & Seat Adjust",
             "setupTime": 0.5, "runTime": 0.75, "inspection": False,
             "notes": "Install plug stem into body, handwheel, yoke; adjust plug-to-seat preload"},
            {"seq": 40, "name": "Seat Leak Test (API 598)",
             "setupTime": 0.25, "runTime": 0.5, "inspection": True,
             "notes": "Hydro seat test 17.6 bar 2 min, zero leakage"},
            {"seq": 50, "name": "Painting & Packing",
             "setupTime": 0.25, "runTime": 0.5, "inspection": False,
             "notes": "Primer + epoxy grey, nameplate, end protectors, box"},
        ],
    },
    {
        "bomName": 'FG-GLV-50-PN16 Rev.1',
        "parentCode": "FG-GLV-50-PN16",
        "description": 'Globe valve 2" DN50 PN16 CS complete assembly. API 623.',
        "positions": [
            {"code": "SF-GLVA-50",      "qty": 1,    "pos": 10, "scrap": 0},
            {"code": "RM-STM-F6A-50",   "qty": 1,    "pos": 20, "scrap": 3.0},
            {"code": "RM-HW-250-CI",    "qty": 1,    "pos": 30, "scrap": 0},
            {"code": "RM-GLAND-50",     "qty": 1,    "pos": 40, "scrap": 0},
            {"code": "RM-ORING-V-50",   "qty": 2,    "pos": 50, "scrap": 0},
            {"code": "CO-GRPH-PACK-5",  "qty": 0.4,  "pos": 60, "scrap": 5.0},
            {"code": "RM-THRST-BRG-02", "qty": 1,    "pos": 70, "scrap": 0},
            {"code": "RM-NP-SS316",     "qty": 1,    "pos": 80, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Plug Stem Machining",
             "setupTime": 0.5, "runTime": 1.2, "inspection": False,
             "notes": "CNC: machine plug disc taper, thread Tr32x6, stem OD DN50"},
            {"seq": 20, "name": "Packing & Gland Installation",
             "setupTime": 0.25, "runTime": 0.4, "inspection": False,
             "notes": "Install graphite rings, fit brass gland nut DN50"},
            {"seq": 30, "name": "Final Assembly & Seat Adjust",
             "setupTime": 0.5, "runTime": 1.0, "inspection": False,
             "notes": "Install plug stem, handwheel, adjust plug-to-seat preload"},
            {"seq": 40, "name": "Seat Leak Test (API 598)",
             "setupTime": 0.25, "runTime": 0.5, "inspection": True,
             "notes": "Hydro seat test 17.6 bar 2 min zero leakage"},
            {"seq": 50, "name": "Painting & Packing",
             "setupTime": 0.25, "runTime": 0.75, "inspection": False,
             "notes": "Primer + epoxy grey, nameplate, end protectors, crate"},
        ],
    },

    # --- Check Valve ---
    {
        "bomName": 'FG-CHK-50-PN16 Rev.1',
        "parentCode": "FG-CHK-50-PN16",
        "description": 'Swing check valve 2" DN50 PN16 CS complete assembly. API 594.',
        "positions": [
            {"code": "SF-CHKA-50",      "qty": 1,    "pos": 10, "scrap": 0},
            {"code": "RM-WEDGE-50",     "qty": 1,    "pos": 20, "scrap": 5.0},
            {"code": "RM-STM-F6A-25",   "qty": 1,    "pos": 30, "scrap": 3.0},
            {"code": "RM-GSK-SW-50-PN16","qty": 1,   "pos": 40, "scrap": 0},
            {"code": "RM-BOLT-B7-M16x80","qty": 4,   "pos": 50, "scrap": 0},
            {"code": "RM-NUT-2H-M16",   "qty": 4,    "pos": 60, "scrap": 0},
            {"code": "RM-NP-SS316",     "qty": 1,    "pos": 70, "scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Swing Disc (Clapper) Machining",
             "setupTime": 0.5, "runTime": 1.0, "inspection": False,
             "notes": "CNC: machine disc OD, seat contact face taper, hinge bore, Stellite-6 seat"},
            {"seq": 20, "name": "Hinge Pin Machining",
             "setupTime": 0.25, "runTime": 0.5, "inspection": False,
             "notes": "CNC: turn pin OD, drill cross-hole, thread for locking nut from stem forging"},
            {"seq": 30, "name": "Final Assembly",
             "setupTime": 0.5, "runTime": 0.5, "inspection": False,
             "notes": "Install disc on hinge pin in body, fit cover with gasket & studs"},
            {"seq": 40, "name": "Functional & Leak Test",
             "setupTime": 0.25, "runTime": 0.5, "inspection": True,
             "notes": "Back-pressure test 17.6 bar 2 min zero leakage, check disc free-swing"},
            {"seq": 50, "name": "Painting & Packing",
             "setupTime": 0.25, "runTime": 0.5, "inspection": False,
             "notes": "Primer + epoxy grey, nameplate, end protectors"},
        ],
    },

    # --- Gate Valve DN100 PN40 ---
    {
        "bomName": 'FG-GV-100-PN40 Rev.1',
        "parentCode": "FG-GV-100-PN40",
        "description": 'Gate valve 4" DN100 PN40 CS complete assembly. API 600 Class 300.',
        "positions": [
            {"code": "RM-GVB-CS-80",    "qty": 1,    "pos": 10, "scrap": 2.0},
            {"code": "RM-GVN-CS-80",    "qty": 1,    "pos": 20, "scrap": 2.0},
            {"code": "RM-SEAT-SS-80",   "qty": 2,    "pos": 30, "scrap": 3.0},
            {"code": "RM-WEDGE-80",     "qty": 1,    "pos": 40, "scrap": 5.0},
            {"code": "RM-STM-F6A-80",   "qty": 1,    "pos": 50, "scrap": 3.0},
            {"code": "RM-YOKE-MS-80",   "qty": 1,    "pos": 60, "scrap": 0},
            {"code": "RM-HW-320-CI",    "qty": 1,    "pos": 70, "scrap": 0},
            {"code": "RM-BOLT-B7-M20x100","qty": 16, "pos": 80, "scrap": 0},
            {"code": "RM-NUT-2H-M20",   "qty": 32,   "pos": 90, "scrap": 0},
            {"code": "RM-GSK-RTJ-100",  "qty": 1,    "pos": 100,"scrap": 0},
            {"code": "RM-GLAND-50",     "qty": 1,    "pos": 110,"scrap": 0},
            {"code": "CO-GRPH-PACK-8",  "qty": 0.8,  "pos": 120,"scrap": 5.0},
            {"code": "RM-THRST-BRG-02", "qty": 1,    "pos": 130,"scrap": 0},
            {"code": "RM-NP-SS316",     "qty": 1,    "pos": 140,"scrap": 0},
        ],
        "operations": [
            {"seq": 10, "name": "Body & Bonnet Machining",
             "setupTime": 1.0, "runTime": 3.5, "inspection": False,
             "notes": "CNC: bore body ID DN100, machine RTJ seat grooves, bonnet face & bore"},
            {"seq": 20, "name": "Seat Ring Hardfacing & Lap",
             "setupTime": 0.5, "runTime": 2.0, "inspection": True,
             "notes": "Stellite-6 seat rings, lap Ra 0.4, blue contact check"},
            {"seq": 30, "name": "Wedge & Stem Machining",
             "setupTime": 1.0, "runTime": 3.0, "inspection": False,
             "notes": "Machine wedge seat faces, Stellite-6 deposit, stem thread Tr45x8"},
            {"seq": 40, "name": "Body Assembly & Shell Test",
             "setupTime": 0.5, "runTime": 1.0, "inspection": True,
             "notes": "Assemble with RTJ gasket & M20 studs, hydro shell test 60 bar 2 min"},
            {"seq": 50, "name": "Final Assembly",
             "setupTime": 0.75, "runTime": 2.0, "inspection": False,
             "notes": "Insert wedge-stem, yoke, handwheel, packing, gland nut, thrust bearing"},
            {"seq": 60, "name": "Seat Leak Test (API 598)",
             "setupTime": 0.5, "runTime": 0.75, "inspection": True,
             "notes": "Hydro seat test 44 bar 2 min zero leakage both directions"},
            {"seq": 70, "name": "Painting & Final Packing",
             "setupTime": 0.5, "runTime": 1.5, "inspection": True,
             "notes": "Full shot-blast SA 2.5, primer, epoxy grey, nameplate, heavy crate"},
        ],
    },
]


# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------
# MASTER DATA — Work Centers, Production Jobs, Labor Roles, Machines
# ---------------------------------------------------------------------------

WORK_CENTERS = [
    {"centerCode": "WC-MACH-CNC",  "centerName": "CNC Machining Center",
     "machineCostPerHour": 850,  "overheadPercentage": 18, "availableHoursPerDay": 16,
     "department": "Machining",  "location": "Shop Floor A",
     "description": "CNC lathes and vertical machining centers for body, bonnet, wedge, ball and stem machining"},
    {"centerCode": "WC-LAP",       "centerName": "Lapping & Precision Finishing",
     "machineCostPerHour": 400,  "overheadPercentage": 12, "availableHoursPerDay": 8,
     "department": "Machining",  "location": "Shop Floor A",
     "description": "Lapping machines and precision hand-lapping for valve seat faces Ra 0.4 finish"},
    {"centerCode": "WC-WELD",      "centerName": "Welding & Hardfacing Bay",
     "machineCostPerHour": 600,  "overheadPercentage": 15, "availableHoursPerDay": 8,
     "department": "Welding",    "location": "Shop Floor B",
     "description": "PTA and GTAW hardfacing stations for Stellite-6 seat deposits, TIG repair welding"},
    {"centerCode": "WC-ASSY",      "centerName": "Valve Assembly Bay",
     "machineCostPerHour": 200,  "overheadPercentage": 10, "availableHoursPerDay": 8,
     "department": "Assembly",   "location": "Assembly Hall",
     "description": "Manual assembly stations for sub-assembly and final valve assembly operations"},
    {"centerCode": "WC-TEST",      "centerName": "Pressure Testing Bay",
     "machineCostPerHour": 300,  "overheadPercentage": 10, "availableHoursPerDay": 8,
     "department": "QA",         "location": "Test Bay",
     "description": "Hydraulic and pneumatic test rigs for shell, seat and functional leak testing per API 598"},
    {"centerCode": "WC-PAINT",     "centerName": "Shot Blast & Paint Shop",
     "machineCostPerHour": 350,  "overheadPercentage": 12, "availableHoursPerDay": 8,
     "department": "Finishing",  "location": "Paint Shop",
     "description": "Shot blasting cabinet and paint spray booth for surface preparation and epoxy coating"},
    {"centerCode": "WC-QC",        "centerName": "Quality Control & Inspection",
     "machineCostPerHour": 150,  "overheadPercentage": 8,  "availableHoursPerDay": 8,
     "department": "QA",         "location": "QC Lab",
     "description": "Final dimensional inspection, document review, packing and despatch clearance"},
]

PRODUCTION_JOBS = [
    {"jobCode": "PJ-ROUGH-MACH",  "jobName": "Rough Machining – Bore & Turn",
     "defaultSetupTime": 0.5,  "defaultRunTimePerUnit": 1.5,
     "description": "First-op CNC turning/milling: bore body ID, face flanges, rough-turn OD, drill holes", "active": True},
    {"jobCode": "PJ-FINISH-MACH", "jobName": "Finish Machining – Precision CNC",
     "defaultSetupTime": 0.5,  "defaultRunTimePerUnit": 1.8,
     "description": "Finish-op CNC: seat bore, gland box threading, flange face finish, keyways", "active": True},
    {"jobCode": "PJ-STEM-MACH",   "jobName": "Stem & Shaft Machining",
     "defaultSetupTime": 0.5,  "defaultRunTimePerUnit": 1.0,
     "description": "CNC lathe: stem OD, Trapezoidal threading, T-slot/drive features, O-ring grooves", "active": True},
    {"jobCode": "PJ-BALL-POLISH", "jobName": "Ball Turning & Polishing",
     "defaultSetupTime": 0.5,  "defaultRunTimePerUnit": 1.5,
     "description": "CNC rough-turn ball sphere, bore through-port, finish grind to Ra 0.4 sphericity", "active": True},
    {"jobCode": "PJ-HARDFACING",  "jobName": "Stellite-6 Hardfacing (PTA)",
     "defaultSetupTime": 0.5,  "defaultRunTimePerUnit": 2.0,
     "description": "PTA plasma transferred arc Stellite-6 deposit on seat faces, wedge gates; min 2.5mm deposit", "active": True},
    {"jobCode": "PJ-LAPPING",     "jobName": "Seat Lapping & Blue Matching",
     "defaultSetupTime": 0.25, "defaultRunTimePerUnit": 1.0,
     "description": "Machine lap seat rings and body seats to Ra 0.4; blue-check contact area >85%", "active": True},
    {"jobCode": "PJ-BODY-ASSY",   "jobName": "Body / Sub-Assembly",
     "defaultSetupTime": 0.25, "defaultRunTimePerUnit": 0.5,
     "description": "Mechanical assembly of body castings, seats, gaskets, fasteners into a sub-assembly", "active": True},
    {"jobCode": "PJ-FINAL-ASSY",  "jobName": "Final Valve Assembly",
     "defaultSetupTime": 0.5,  "defaultRunTimePerUnit": 1.0,
     "description": "Complete valve assembly: install internals, handwheel/yoke, packing, gland; set operating torque", "active": True},
    {"jobCode": "PJ-HYDRO-TEST",  "jobName": "Hydrostatic Shell / Body Test",
     "defaultSetupTime": 0.5,  "defaultRunTimePerUnit": 0.5,
     "description": "Hydraulic body shell test per API 598 / BS EN 12266 at 1.5× rated pressure, 2 min hold", "active": True},
    {"jobCode": "PJ-SEAT-TEST",   "jobName": "Seat Leak Test (API 598)",
     "defaultSetupTime": 0.25, "defaultRunTimePerUnit": 0.5,
     "description": "Hydraulic seat leak test at 1.1× rated pressure both directions; zero leakage per Class VI", "active": True},
    {"jobCode": "PJ-PAINT",       "jobName": "Shot Blast & Epoxy Painting",
     "defaultSetupTime": 0.25, "defaultRunTimePerUnit": 0.75,
     "description": "SA 2.5 shot blast, zinc-phosphate primer, epoxy grey finish RAL 7040, DFT 75µm", "active": True},
    {"jobCode": "PJ-INSPECT",     "jobName": "Final Inspection & Packing",
     "defaultSetupTime": 0.25, "defaultRunTimePerUnit": 0.5,
     "description": "Dimensional check, MTC review, flange protectors, nameplate verification, despatch packing", "active": True},
]

LABOR_ROLES = [
    {"roleCode": "LR-CNC-OP",    "roleName": "CNC Machine Operator",
     "costPerHour": 320, "description": "Operates CNC lathes and machining centers; reads engineering drawings and programs", "active": True},
    {"roleCode": "LR-WELDER",    "roleName": "Welder / Hardfacer",
     "costPerHour": 420, "description": "Qualified welder for PTA Stellite hardfacing and TIG repair; ASME IX certified", "active": True},
    {"roleCode": "LR-FITTER",    "roleName": "Fitter / Turner",
     "costPerHour": 280, "description": "Precision hand-fitting, lapping, and bench-work for valve seat preparation", "active": True},
    {"roleCode": "LR-ASSEMBLER", "roleName": "Valve Assembler",
     "costPerHour": 250, "description": "Assembly of valve sub-components; torque tightening, packing installation", "active": True},
    {"roleCode": "LR-TESTER",    "roleName": "Pressure Test Technician",
     "costPerHour": 300, "description": "Operates hydraulic/pneumatic test rigs; performs API 598 leak and shell tests", "active": True},
    {"roleCode": "LR-PAINTER",   "roleName": "Shot Blaster / Painter",
     "costPerHour": 220, "description": "Surface preparation (shot blasting SA 2.5) and spray application of industrial coatings", "active": True},
    {"roleCode": "LR-QC-INSP",  "roleName": "QC Inspector",
     "costPerHour": 350, "description": "Dimensional inspection, document review, test witness, and certificate preparation", "active": True},
]

# Machines reference workCenterCode — resolved to IDs before POST
MACHINES = [
    {"machineCode": "MCH-LAT-01",   "machineName": "CNC Lathe #1 – Mazak QT-350",
     "status": "ACTIVE", "workCenterCode": "WC-MACH-CNC", "costPerHour": 420,
     "description": "Mazak QT-350 2-axis CNC lathe, max swing 350mm, for body bore and stem machining"},
    {"machineCode": "MCH-LAT-02",   "machineName": "CNC Lathe #2 – Mazak QT-250",
     "status": "ACTIVE", "workCenterCode": "WC-MACH-CNC", "costPerHour": 380,
     "description": "Mazak QT-250 CNC lathe, max swing 250mm, ball turning and small components"},
    {"machineCode": "MCH-MILL-01",  "machineName": "VMC – Haas VF-3",
     "status": "ACTIVE", "workCenterCode": "WC-MACH-CNC", "costPerHour": 500,
     "description": "Haas VF-3 vertical machining center, table 1016x508mm, for bonnet, wedge, disc milling"},
    {"machineCode": "MCH-LAP-01",   "machineName": "Lapping Machine – Peter Wolters LM-200",
     "status": "ACTIVE", "workCenterCode": "WC-LAP", "costPerHour": 180,
     "description": "Double-disc lapping machine for precision seat ring and body seat face finishing to Ra 0.4"},
    {"machineCode": "MCH-PTA-01",   "machineName": "PTA Hardfacing Unit – Kennametal",
     "status": "ACTIVE", "workCenterCode": "WC-WELD", "costPerHour": 650,
     "description": "Plasma Transferred Arc unit for Stellite-6 powder hardfacing on seat faces and wedge gates"},
    {"machineCode": "MCH-TIG-01",   "machineName": "TIG Welding Station – Lincoln Electric",
     "status": "ACTIVE", "workCenterCode": "WC-WELD", "costPerHour": 280,
     "description": "GTAW TIG station for stainless steel seat repair, overlay welding and small structural welds"},
    {"machineCode": "MCH-HYDRO-01", "machineName": "Hydraulic Test Pump #1 – 600 bar",
     "status": "ACTIVE", "workCenterCode": "WC-TEST", "costPerHour": 150,
     "description": "Electric-driven hydraulic test pump, max 600 bar, for valve shell and seat hydrostatic tests"},
    {"machineCode": "MCH-HYDRO-02", "machineName": "Hydraulic Test Pump #2 – 400 bar",
     "status": "ACTIVE", "workCenterCode": "WC-TEST", "costPerHour": 120,
     "description": "Electric-driven hydraulic test pump, max 400 bar, for smaller valve seat leak tests"},
    {"machineCode": "MCH-BLAST-01", "machineName": "Shot Blast Cabinet – Wheelabrator",
     "status": "ACTIVE", "workCenterCode": "WC-PAINT", "costPerHour": 200,
     "description": "Wheelabrator rotary-table shot blasting cabinet, achieves SA 2.5 surface cleanliness"},
    {"machineCode": "MCH-SPRAY-01", "machineName": "Paint Spray Booth – Binks",
     "status": "ACTIVE", "workCenterCode": "WC-PAINT", "costPerHour": 180,
     "description": "Pressurised spray booth with extraction; applies primer and epoxy topcoat to valve exteriors"},
]

# ---------------------------------------------------------------------------
# OPERATION → MASTER DATA MAPPING
# First matching keyword wins (most-specific first).
# Tuple: (keyword_substr, prod_job_code, wc_code, labor_role_code, machine_code_or_None)
# ---------------------------------------------------------------------------
OP_MAP = [
    ("ball rough",        "PJ-BALL-POLISH", "WC-MACH-CNC", "LR-CNC-OP",    "MCH-LAT-02"),
    ("ball polish",       "PJ-BALL-POLISH", "WC-LAP",      "LR-CNC-OP",    "MCH-LAP-01"),
    ("rough machin",      "PJ-ROUGH-MACH",  "WC-MACH-CNC", "LR-CNC-OP",    "MCH-LAT-01"),
    ("finish machin",     "PJ-FINISH-MACH", "WC-MACH-CNC", "LR-CNC-OP",    "MCH-LAT-01"),
    ("cnc turning",       "PJ-ROUGH-MACH",  "WC-MACH-CNC", "LR-CNC-OP",    "MCH-LAT-01"),
    ("bore & face",       "PJ-FINISH-MACH", "WC-MACH-CNC", "LR-CNC-OP",    "MCH-MILL-01"),
    ("body machin",       "PJ-ROUGH-MACH",  "WC-MACH-CNC", "LR-CNC-OP",    "MCH-MILL-01"),
    ("disc machin",       "PJ-FINISH-MACH", "WC-MACH-CNC", "LR-CNC-OP",    "MCH-MILL-01"),
    ("wedge rough",       "PJ-ROUGH-MACH",  "WC-MACH-CNC", "LR-CNC-OP",    "MCH-MILL-01"),
    ("wedge finish",      "PJ-FINISH-MACH", "WC-MACH-CNC", "LR-CNC-OP",    "MCH-MILL-01"),
    ("swing disc",        "PJ-FINISH-MACH", "WC-MACH-CNC", "LR-CNC-OP",    "MCH-MILL-01"),
    ("stem machin",       "PJ-STEM-MACH",   "WC-MACH-CNC", "LR-CNC-OP",    "MCH-LAT-01"),
    ("plug stem",         "PJ-STEM-MACH",   "WC-MACH-CNC", "LR-CNC-OP",    "MCH-LAT-01"),
    ("hinge pin",         "PJ-STEM-MACH",   "WC-MACH-CNC", "LR-CNC-OP",    "MCH-LAT-01"),
    ("shaft machin",      "PJ-STEM-MACH",   "WC-MACH-CNC", "LR-CNC-OP",    "MCH-LAT-01"),
    ("stellite",          "PJ-HARDFACING",  "WC-WELD",     "LR-WELDER",    "MCH-PTA-01"),
    ("hardfac",           "PJ-HARDFACING",  "WC-WELD",     "LR-WELDER",    "MCH-PTA-01"),
    ("seat lapp",         "PJ-LAPPING",     "WC-LAP",      "LR-FITTER",    "MCH-LAP-01"),
    ("lapp",              "PJ-LAPPING",     "WC-LAP",      "LR-FITTER",    "MCH-LAP-01"),
    ("seat press",        "PJ-LAPPING",     "WC-LAP",      "LR-FITTER",    "MCH-LAP-01"),
    ("disc epoxy",        "PJ-PAINT",       "WC-PAINT",    "LR-PAINTER",   "MCH-SPRAY-01"),
    ("final assembl",     "PJ-FINAL-ASSY",  "WC-ASSY",     "LR-ASSEMBLER", None),
    ("torque",            "PJ-FINAL-ASSY",  "WC-ASSY",     "LR-ASSEMBLER", None),
    ("packing & gland",   "PJ-FINAL-ASSY",  "WC-ASSY",     "LR-ASSEMBLER", None),
    ("body assembl",      "PJ-BODY-ASSY",   "WC-ASSY",     "LR-ASSEMBLER", None),
    ("shaft assembl",     "PJ-BODY-ASSY",   "WC-ASSY",     "LR-ASSEMBLER", None),
    ("coupling",          "PJ-BODY-ASSY",   "WC-ASSY",     "LR-ASSEMBLER", None),
    ("assembl",           "PJ-BODY-ASSY",   "WC-ASSY",     "LR-ASSEMBLER", None),
    ("shell test",        "PJ-HYDRO-TEST",  "WC-TEST",     "LR-TESTER",    "MCH-HYDRO-01"),
    ("hydro",             "PJ-HYDRO-TEST",  "WC-TEST",     "LR-TESTER",    "MCH-HYDRO-01"),
    ("pressure test",     "PJ-HYDRO-TEST",  "WC-TEST",     "LR-TESTER",    "MCH-HYDRO-01"),
    ("seat leak",         "PJ-SEAT-TEST",   "WC-TEST",     "LR-TESTER",    "MCH-HYDRO-02"),
    ("leak test",         "PJ-SEAT-TEST",   "WC-TEST",     "LR-TESTER",    "MCH-HYDRO-02"),
    ("functional",        "PJ-SEAT-TEST",   "WC-TEST",     "LR-TESTER",    "MCH-HYDRO-02"),
    ("paint",             "PJ-PAINT",       "WC-PAINT",    "LR-PAINTER",   "MCH-SPRAY-01"),
    ("blast",             "PJ-PAINT",       "WC-PAINT",    "LR-PAINTER",   "MCH-BLAST-01"),
    ("incoming",          "PJ-INSPECT",     "WC-QC",       "LR-QC-INSP",   None),
    ("final inspect",     "PJ-INSPECT",     "WC-QC",       "LR-QC-INSP",   None),
    ("inspect",           "PJ-INSPECT",     "WC-QC",       "LR-QC-INSP",   None),
]


def resolve_op_masters(op_name: str, masters: dict) -> dict:
    """Match operation name against OP_MAP and return nested master objects."""
    low = op_name.lower()
    for kw, pj_code, wc_code, lr_code, mach_code in OP_MAP:
        if kw in low:
            result = {}
            pj  = masters["jobs"].get(pj_code)
            wc  = masters["work_centers"].get(wc_code)
            lr  = masters["labor_roles"].get(lr_code)
            mch = masters["machines"].get(mach_code) if mach_code else None
            if pj:  result["productionJob"]   = {"id": pj["id"]}
            if wc:  result["workCenter"]       = {"id": wc["id"]}
            if lr:  result["laborRole"]        = {"id": lr["id"]}
            if mch: result["machineDetails"]   = {"id": mch["id"]}
            return result
    return {}


# ---------------------------------------------------------------------------

def login(session: requests.Session, base_url: str, username: str, password: str) -> str:
    resp = session.post(f"{base_url}/auth/login",
                        json={"username": username, "password": password},
                        timeout=15)
    resp.raise_for_status()
    data = resp.json()
    token = (data.get("accessToken") or data.get("token") or
             data.get("data", {}).get("accessToken") or "")
    if not token:
        raise RuntimeError(f"Could not parse token from login response: {data}")
    return token


def fetch_all_items(session: requests.Session, base_url: str) -> dict:
    """Returns {itemCode: inventoryItemId} for all items in the system."""
    code_to_id: dict = {}

    def extract_items(body):
        for key in ("content", "data"):
            val = body.get(key)
            if isinstance(val, list):
                return val
            if isinstance(val, dict):
                inner = val.get("content") or val.get("data") or []
                if isinstance(inner, list):
                    return inner
        return []

    # Try filter endpoint first (paginated)
    page, size = 0, 200
    filter_ok = True
    while filter_ok:
        try:
            resp = session.post(
                f"{base_url}/inventory_item/filter",
                json={"page": page, "size": size, "sortBy": "itemCode", "sortDir": "asc", "filters": []},
                timeout=20,
            )
            resp.raise_for_status()
            body = resp.json()
            items = extract_items(body)
            if not items:
                break
            for item in items:
                code = item.get("itemCode") or item.get("item_code")
                iid  = item.get("inventoryItemId") or item.get("id")
                if code and iid:
                    code_to_id[code] = iid
            if len(items) < size:
                break
            page += 1
        except Exception as exc:
            print(f"  filter endpoint failed ({exc}), trying /all ...")
            filter_ok = False

    if not code_to_id:
        # Fallback: GET /inventory_item/all
        resp = session.get(f"{base_url}/inventory_item/all", params={"size": 500}, timeout=20)
        resp.raise_for_status()
        body = resp.json()
        items = extract_items(body) or (body if isinstance(body, list) else [])
        for item in items:
            code = item.get("itemCode") or item.get("item_code")
            iid  = item.get("inventoryItemId") or item.get("id")
            if code and iid:
                code_to_id[code] = iid

    return code_to_id


def _extract_id(resp_body: dict) -> int | None:
    """Best-effort ID extraction from various response wrapper shapes."""
    return (resp_body.get("id") or resp_body.get("data", {}).get("id")
            if isinstance(resp_body, dict) else None)


def _post(session, url, payload, label):
    resp = session.post(url, json=payload, timeout=20)
    if resp.status_code == 409:
        print(f"    [SKIP – already exists] {label}")
        return None
    resp.raise_for_status()
    return resp.json()


def create_work_centers(session: requests.Session, base_url: str) -> dict:
    """POST each work center. Returns {centerCode: {id, ...}}."""
    print("Creating Work Centers ...")
    result = {}
    for wc in WORK_CENTERS:
        body = _post(session, f"{base_url}/manufacturing/work-center", wc, wc["centerCode"])
        if body:
            wc_id = _extract_id(body)
            result[wc["centerCode"]] = {**wc, "id": wc_id}
            print(f"    {wc['centerCode']}  id={wc_id}")
        time.sleep(0.1)
    print(f"  Done — {len(result)} work centers.\n")
    return result


def create_production_jobs(session: requests.Session, base_url: str) -> dict:
    """POST each production job. Returns {jobCode: {id, ...}}."""
    print("Creating Production Jobs ...")
    result = {}
    for pj in PRODUCTION_JOBS:
        body = _post(session, f"{base_url}/production/production-job", pj, pj["jobCode"])
        if body:
            pj_id = _extract_id(body)
            result[pj["jobCode"]] = {**pj, "id": pj_id}
            print(f"    {pj['jobCode']}  id={pj_id}")
        time.sleep(0.1)
    print(f"  Done — {len(result)} production jobs.\n")
    return result


def create_labor_roles(session: requests.Session, base_url: str) -> dict:
    """POST each labor role. Returns {roleCode: {id, ...}}."""
    print("Creating Labor Roles ...")
    result = {}
    for lr in LABOR_ROLES:
        body = _post(session, f"{base_url}/production/labor-role", lr, lr["roleCode"])
        if body:
            lr_id = _extract_id(body)
            result[lr["roleCode"]] = {**lr, "id": lr_id}
            print(f"    {lr['roleCode']}  id={lr_id}")
        time.sleep(0.1)
    print(f"  Done — {len(result)} labor roles.\n")
    return result


def create_machines(session: requests.Session, base_url: str, wc_map: dict) -> dict:
    """POST each machine (requires resolved workCenter id). Returns {machineCode: {id, ...}}."""
    print("Creating Machines ...")
    result = {}
    for mach in MACHINES:
        wc = wc_map.get(mach["workCenterCode"])
        if not wc:
            print(f"    [SKIP] Work center not found for {mach['machineCode']}: {mach['workCenterCode']}")
            continue
        payload = {k: v for k, v in mach.items() if k != "workCenterCode"}
        payload["workCenter"] = {"id": wc["id"]}
        body = _post(session, f"{base_url}/machine-details", payload, mach["machineCode"])
        if body:
            m_id = _extract_id(body)
            result[mach["machineCode"]] = {**mach, "id": m_id}
            print(f"    {mach['machineCode']}  id={m_id}")
        time.sleep(0.1)
    print(f"  Done — {len(result)} machines.\n")
    return result


def build_bom_payload(bom_def: dict, code_to_id: dict, masters: dict) -> dict | None:
    """Build the POST /bom payload. Returns None if parent item code is missing."""
    parent_id = code_to_id.get(bom_def["parentCode"])
    if not parent_id:
        print(f"  [SKIP] Parent item not found: {bom_def['parentCode']}")
        return None

    positions = []
    for p in bom_def["positions"]:
        child_id = code_to_id.get(p["code"])
        if not child_id:
            print(f"  [WARN] Component not found: {p['code']} — skipping position")
            continue
        positions.append({
            "childInventoryItem": {"inventoryItemId": child_id},
            "quantity":          p["qty"],
            "position":          p["pos"],
            "scrapPercentage":   p.get("scrap", 0),
            "routingOperationId": None,
            "routingOperationSequenceNumber": None,
        })

    operations = []
    for op in bom_def.get("operations", []):
        op_payload = {
            "sequenceNumber":    op["seq"],
            "name":              op["name"],
            "setupTime":         op.get("setupTime"),
            "runTime":           op.get("runTime"),
            "inspection":        op.get("inspection", False),
            "notes":             op.get("notes", ""),
            "numberOfOperators": op.get("numberOfOperators", 1),
            "costType":          "CALCULATED",
        }
        # Enrich with master data references
        op_payload.update(resolve_op_masters(op["name"], masters))
        operations.append(op_payload)

    return {
        "bom": {
            "id":                  None,
            "bomName":             bom_def["bomName"],
            "parentInventoryItem": {"inventoryItemId": parent_id},
            "description":         bom_def.get("description", ""),
            "isActive":            False,
            "isDefault":           False,
            "revision":            "1",
            "effectiveFrom":       None,
            "effectiveTo":         None,
            "bomStatus":           "DRAFT",
            "positions":           positions,
        },
        "routing": {
            "status":    None,
            "createdBy": None,
            "operations": operations,
        },
    }


def create_bom(session: requests.Session, base_url: str, payload: dict) -> dict:
    resp = session.post(f"{base_url}/bom", json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def activate_all_boms(session: requests.Session, base_url: str):
    """Set every non-ACTIVE BOM to ACTIVE in one direct transition."""
    print("Fetching all BOMs ...")

    bom_summaries: list[dict] = []
    page, size = 0, 100
    while True:
        resp = session.post(
            f"{base_url}/bom/filter",
            json={"page": page, "size": size, "sortBy": "id", "sortDir": "asc", "filters": []},
            timeout=20,
        )
        resp.raise_for_status()
        body = resp.json()
        items = body.get("content") or []
        bom_summaries.extend(items)
        if len(items) < size:
            break
        page += 1

    print(f"  Found {len(bom_summaries)} BOMs.\n")

    activated, skipped, failed = 0, 0, 0
    for bom in bom_summaries:
        bom_id   = bom.get("id")
        bom_name = bom.get("bomName", f"id={bom_id}")
        status   = bom.get("bomStatus") or bom.get("status") or ""

        if status == "ACTIVE":
            print(f"  [SKIP – already ACTIVE] {bom_name}")
            skipped += 1
            continue

        payload = {
            "nextStatus":       "ACTIVE",
            "ecoNumber":        "",
            "changeReason":     "Activated via seed script",
            "approvalComments": "",
        }
        try:
            resp = session.post(
                f"{base_url}/bom/changeStatus/{bom_id}",
                json=payload, timeout=15,
            )
            resp.raise_for_status()
            print(f"  Activated: {bom_name}  (was {status})")
            activated += 1
        except requests.HTTPError as exc:
            try:
                body = exc.response.json()
            except Exception:
                body = exc.response.text[:300]
            print(f"  [FAIL] {bom_name}: HTTP {exc.response.status_code}: {body}")
            failed += 1
        except Exception as exc:
            print(f"  [FAIL] {bom_name}: {exc}")
            failed += 1

        time.sleep(0.1)

    print(f"\nDone — Activated: {activated}  Already active: {skipped}  Failed: {failed}")
    if failed:
        sys.exit(1)


def update_bom_routing(session: requests.Session, base_url: str, masters: dict):
    """
    For every existing BOM, fetch its full details, enrich each routing
    operation with productionJob / workCenter / laborRole / machineDetails
    using OP_MAP keyword matching, then PUT it back.
    """
    print("Fetching all existing BOMs ...")

    # Collect all BOM IDs via paginated POST /bom/filter
    bom_ids: list[int] = []
    page, size = 0, 100
    while True:
        resp = session.post(
            f"{base_url}/bom/filter",
            json={"page": page, "size": size, "sortBy": "id", "sortDir": "asc", "filters": []},
            timeout=20,
        )
        resp.raise_for_status()
        body = resp.json()
        items = body.get("content") or []
        for item in items:
            bid = item.get("id")
            if bid:
                bom_ids.append(bid)
        if len(items) < size:
            break
        page += 1

    print(f"  Found {len(bom_ids)} BOMs.\n")

    updated, skipped, failed = 0, 0, 0

    for bom_id in bom_ids:
        # Fetch full BOM details
        try:
            detail = session.get(f"{base_url}/bom/{bom_id}", timeout=15)
            detail.raise_for_status()
            data = detail.json()
        except Exception as exc:
            print(f"  [FAIL] GET /bom/{bom_id}: {exc}")
            failed += 1
            continue

        bom     = data.get("bom") or {}
        routing = data.get("routing") or {}
        ops     = routing.get("operations") or []

        bom_name = bom.get("bomName", f"id={bom_id}")

        # Skip only when every operation has BOTH productionJob AND workCenter set
        already_wired = sum(1 for op in ops if op.get("productionJob") and op.get("workCenter"))
        if already_wired == len(ops) and len(ops) > 0:
            print(f"  [SKIP – already wired] {bom_name}")
            skipped += 1
            continue

        # Enrich operations
        enriched_ops = []
        for op in ops:
            enriched = {**op}
            masters_for_op = resolve_op_masters(op.get("name", ""), masters)
            # Only set fields that are not already populated
            for key, val in masters_for_op.items():
                if not enriched.get(key):
                    enriched[key] = val
            enriched_ops.append(enriched)

        # Rebuild PUT payload — keep all existing BOM fields, replace operations
        parent_item = bom.get("parentInventoryItem") or {}

        positions = []
        for pos in bom.get("positions") or []:
            child = pos.get("childInventoryItem") or {}
            child_id = (child.get("inventoryItemId")
                        or pos.get("childInventoryItemId")
                        or pos.get("inventoryItemId"))
            if not child_id:
                continue
            positions.append({
                "childInventoryItem": {"inventoryItemId": child_id},
                "quantity":          pos.get("quantity", 1),
                "position":          pos.get("position", 0),
                "scrapPercentage":   pos.get("scrapPercentage", 0),
                "routingOperationId":             pos.get("routingOperationId"),
                "routingOperationSequenceNumber": pos.get("routingOperationSequenceNumber"),
            })

        payload = {
            "bom": {
                "id":                  bom_id,
                "bomName":             bom.get("bomName"),
                "parentInventoryItem": {"inventoryItemId": parent_item.get("inventoryItemId")},
                "description":         bom.get("description"),
                "isActive":            bom.get("isActive", False),
                "isDefault":           bom.get("isDefault", False),
                "revision":            bom.get("revision"),
                "effectiveFrom":       bom.get("effectiveFrom"),
                "effectiveTo":         bom.get("effectiveTo"),
                "bomStatus":           bom.get("bomStatus", "DRAFT"),
                "positions":           positions,
            },
            "routing": {
                "status":     routing.get("status"),
                "createdBy":  routing.get("createdBy"),
                "operations": enriched_ops,
            },
        }

        try:
            resp = session.put(f"{base_url}/bom/{bom_id}", json=payload, timeout=30)
            resp.raise_for_status()
            wired = sum(1 for op in enriched_ops if op.get("productionJob") or op.get("workCenter"))
            print(f"  Updated: {bom_name}  ops={len(enriched_ops)}  wired={wired}")
            updated += 1
        except requests.HTTPError as exc:
            try:
                body = exc.response.json()
            except Exception:
                body = exc.response.text[:300]
            print(f"  [FAIL] PUT /bom/{bom_id}: HTTP {exc.response.status_code}: {body}")
            failed += 1
        except Exception as exc:
            print(f"  [FAIL] PUT /bom/{bom_id}: {exc}")
            failed += 1

        time.sleep(0.15)

    print(f"\nDone — Updated: {updated}  Skipped (already wired): {skipped}  Failed: {failed}")
    if failed:
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Seed valve manufacturing master data + BOMs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Steps performed:
  1. Login
  2. Create Work Centers  (7)
  3. Create Production Jobs (12)
  4. Create Labor Roles    (7)
  5. Create Machines       (10)
  6. Fetch inventory items -> code->id map
  7. Create 26 BOMs with routing ops wired to master data
        """)
    parser.add_argument("--base-url",  default="http://localhost:8080/api")
    parser.add_argument("--username",  default="admin")
    parser.add_argument("--password",  default="admin")
    parser.add_argument("--dry-run",   action="store_true",
                        help="Build payloads and print without calling the API")
    parser.add_argument("--skip-masters", action="store_true",
                        help="Skip master data creation (use if already seeded); "
                             "still fetches existing masters to resolve operation references")
    parser.add_argument("--masters-only", action="store_true",
                        help="Create only master data (Work Centers, Production Jobs, "
                             "Labor Roles, Machines) — skip BOM creation")
    parser.add_argument("--update-routing", action="store_true",
                        help="Fetch all existing BOMs and enrich their routing operations "
                             "with ProductionJob / WorkCenter / LaborRole / Machine references")
    parser.add_argument("--activate-all", action="store_true",
                        help="Set all non-ACTIVE BOMs to ACTIVE status")
    args = parser.parse_args()

    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})

    # ── 1. Authenticate ──────────────────────────────────────────────────────
    if not args.dry_run:
        print(f"Logging in as '{args.username}' ...")
        token = login(session, args.base_url, args.username, args.password)
        session.headers["Authorization"] = f"Bearer {token}"
        print("  OK\n")

    # ── shortcuts that need no master data ───────────────────────────────────
    if args.activate_all:
        activate_all_boms(session, args.base_url)
        return

    # ── 2-5. Masters ─────────────────────────────────────────────────────────
    if args.dry_run:
        # Fake masters for dry-run payload inspection
        masters = {
            "work_centers": {wc["centerCode"]: {**wc, "id": i+1}
                             for i, wc in enumerate(WORK_CENTERS)},
            "jobs":         {pj["jobCode"]:    {**pj, "id": i+1}
                             for i, pj in enumerate(PRODUCTION_JOBS)},
            "labor_roles":  {lr["roleCode"]:   {**lr, "id": i+1}
                             for i, lr in enumerate(LABOR_ROLES)},
            "machines":     {m["machineCode"]: {**m,  "id": i+1}
                             for i, m in enumerate(MACHINES)},
        }
    elif args.skip_masters:
        print("--skip-masters: fetching existing master data IDs ...\n")
        masters = fetch_existing_masters(session, args.base_url)
    else:
        wc_map  = create_work_centers(session, args.base_url)
        pj_map  = create_production_jobs(session, args.base_url)
        lr_map  = create_labor_roles(session, args.base_url)
        mch_map = create_machines(session, args.base_url, wc_map)
        masters = {"work_centers": wc_map, "jobs": pj_map,
                   "labor_roles": lr_map, "machines": mch_map}

    if args.masters_only:
        print("--masters-only: done. Skipping BOM creation.")
        return

    if args.update_routing:
        update_bom_routing(session, args.base_url, masters)
        return

    # ── 6. Inventory item map ─────────────────────────────────────────────────
    if not args.dry_run:
        print("Fetching inventory items ...")
        code_to_id = fetch_all_items(session, args.base_url)
        print(f"  Found {len(code_to_id)} inventory items.\n")
    else:
        all_codes = set()
        for bom in BOMS:
            all_codes.add(bom["parentCode"])
            for p in bom["positions"]:
                all_codes.add(p["code"])
        code_to_id = {c: i + 1 for i, c in enumerate(sorted(all_codes))}

    # ── 7. Create BOMs ────────────────────────────────────────────────────────
    print("Creating BOMs ...")
    success, skipped, failed = 0, 0, 0
    for bom_def in BOMS:
        name = bom_def["bomName"]
        print(f"  {name}")
        payload = build_bom_payload(bom_def, code_to_id, masters)
        if payload is None:
            skipped += 1
            continue

        if args.dry_run:
            print(json.dumps(payload, indent=2))
            success += 1
            continue

        try:
            result = create_bom(session, args.base_url, payload)
            bom_id = result.get("id") or result.get("bom", {}).get("id") or "?"
            n_pos  = len(payload["bom"]["positions"])
            n_ops  = len(payload["routing"]["operations"])
            n_wired = sum(1 for op in payload["routing"]["operations"]
                          if op.get("productionJob") or op.get("workCenter"))
            print(f"    id={bom_id}  pos={n_pos}  ops={n_ops}  ops-wired={n_wired}")
            success += 1
        except requests.HTTPError as exc:
            try:
                body = exc.response.json()
            except Exception:
                body = exc.response.text[:300]
            print(f"    [FAIL] HTTP {exc.response.status_code}: {body}")
            failed += 1
        except Exception as exc:
            print(f"    [FAIL] {exc}")
            failed += 1

        time.sleep(0.2)

    print(f"\nDone — BOMs created: {success}  skipped: {skipped}  failed: {failed}")
    if failed:
        sys.exit(1)


def fetch_existing_masters(session: requests.Session, base_url: str) -> dict:
    """Fetch already-seeded master records to build code->id maps."""
    def get_list(url, code_field):
        try:
            r = session.get(url, params={"size": 200}, timeout=15)
            r.raise_for_status()
            body = r.json()
            items = (body if isinstance(body, list)
                     else body.get("content") or body.get("data") or [])
            return {item[code_field]: item for item in items if item.get(code_field)}
        except Exception as e:
            print(f"  [WARN] Could not fetch {url}: {e}")
            return {}

    wc  = get_list(f"{base_url}/manufacturing/work-center/search",  "centerCode")
    pj  = get_list(f"{base_url}/production/production-job",  "jobCode")
    lr  = get_list(f"{base_url}/production/labor-role",      "roleCode")
    mch = get_list(f"{base_url}/machine-details",            "machineCode")
    print(f"  Fetched: {len(wc)} work centers, {len(pj)} jobs, "
          f"{len(lr)} labor roles, {len(mch)} machines\n")
    return {"work_centers": wc, "jobs": pj, "labor_roles": lr, "machines": mch}


if __name__ == "__main__":
    main()
