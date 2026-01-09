# CS2 Prop Models Reference

Comprehensive reference for all Counter-Strike 2 prop models extracted from official game files.

**Total Props**: 7,979 models  
**Total Categories**: 152+  
**Source**: pak01_dir.vpk (official CS2 game files)  
**Generated**: October 2025

---

## Quick Start

### Usage in Hammer

1. Create a `prop_static`, `prop_dynamic`, or `prop_physics` entity
2. Set "World Model" property to the path from this reference
3. Use `.vmdl` extension (NOT `.vmdl_c`)

**Example**:

```
models/props/crates/crate_wood_small.vmdl
```

### Usage in cs_script (TypeScript)

```typescript
import { Instance } from "cs_script/point_script";

const prop = Instance.FindEntityByName("my_prop");
if (prop?.IsValid()) {
  prop.SetModel("models/props/crates/crate_wood_small.vmdl");
}
```

---

## Prop Entity Types

### prop_static

- **Purpose**: Static, immovable props baked into world geometry
- **Performance**: Best (no overhead)
- **Use for**: Buildings, walls, decorative elements
- **Limitations**: Cannot animate or move

### prop_dynamic

- **Purpose**: Can animate or change states
- **Performance**: Medium (no physics simulation)
- **Use for**: Doors, fans, flags, animated objects
- **Limitations**: No physics interaction

### prop_physics

- **Purpose**: Full physics simulation
- **Performance**: Higher cost
- **Use for**: Barrels, crates, interactive objects
- **Features**: Can be moved, pushed, shot

---

## Commonly Used Props

### Crates & Containers

#### Wooden Crates

```
models/props/crates/crate_wood_small.vmdl                    // Small wood crate
models/props/crates/crate_wood_medium.vmdl                   // Medium wood crate
models/props/crates/crate_wood_large.vmdl                    // Large wood crate
models/props/hr_vertigo/wood_crate_1/wood_crate_1.vmdl      // Vertigo style
```

#### Metal Containers

```
models/props/de_nuke/hr_nuke/nuke_containers/nuke_container_128_closed.vmdl
models/props/de_nuke/hr_nuke/nuke_containers/nuke_container_256_closed.vmdl
models/props/de_train/hr_train_s2/containers/container_256_closed.vmdl
models/props/de_train/hr_train_s2/containers/container_512_closed.vmdl
```

#### Cardboard Boxes

```
models/props/de_nuke/hr_nuke/nuke_boxes/cardboard_box_64.vmdl
models/props/de_dust/hr_dust/dust_boxes/dust_cardboard_box_64.vmdl
models/props/de_inferno/hr_i/boxes/cardboard_box_128.vmdl
```

#### Pallets

```
models/props/de_nuke/hr_nuke/nuke_pallets/pallet_01.vmdl
models/props/de_dust/hr_dust/dust_pallets/pallet_stack_01.vmdl
models/props/de_train/hr_train_s2/pallets/pallet_wood_128.vmdl
```

### Barrels & Drums

```
models/props/de_nuke/hr_nuke/nuke_barrels/barrel_grey.vmdl       // Standard grey
models/props/de_nuke/hr_nuke/nuke_barrels/barrel_rusty.vmdl      // Rusty
models/props/de_dust/hr_dust/dust_barrels/barrel_oil.vmdl        // Oil barrel
models/props/de_inferno/hr_i/barrels/barrel_wooden.vmdl          // Wooden
models/props/de_train/hr_train_s2/barrels/barrel_metal_55gal.vmdl // 55 gallon
models/props/hr_vertigo/warning_barrel/warning_barrel.vmdl       // Warning
```

### Furniture

#### Chairs & Seating

```
models/props/cs_office/chair_office.vmdl                         // Office chair
models/props/cs_office/sofa.vmdl                                 // Office sofa
models/props/de_inferno/hr_i/furniture/chair_wood.vmdl          // Wooden chair
models/props/de_dust/hr_dust/dust_furniture/chair_plastic.vmdl  // Plastic chair
```

#### Tables & Desks

```
models/props/cs_office/table_office.vmdl                         // Office table
models/props/cs_office/desk_wood.vmdl                            // Wooden desk
models/props/de_dust/hr_dust/dust_furniture/table_wood_round.vmdl
models/props/de_inferno/hr_i/furniture/table_dining.vmdl
```

#### Shelving & Storage

```
models/props/cs_office/shelves_metal.vmdl                        // Metal shelving
models/props/cs_office/file_cabinet.vmdl                         // Filing cabinet
models/props/de_nuke/hr_nuke/nuke_furniture/shelf_industrial.vmdl
models/props/de_dust/hr_dust/dust_furniture/cabinet_wood.vmdl
```

### Urban/Street Props

#### Dumpsters & Bins

```
models/props/de_dust/hr_dust/dust_dumpsters/dumpster_large.vmdl
models/props/de_inferno/hr_i/dumpsters/dumpster_green.vmdl
models/props/de_nuke/hr_nuke/nuke_dumpsters/dumpster_industrial.vmdl
models/props/cs_italy/props/dumpster/italy_dumpster_1.vmdl
```

#### Street Furniture

```
models/props/de_dust/hr_dust/dust_benches/bench_wood.vmdl       // Park bench
models/props/de_inferno/hr_i/street_furniture/bench_metal.vmdl
models/props/de_dust/hr_dust/dust_bins/trash_bin.vmdl           // Trash can
models/props/de_inferno/hr_i/mailboxes/mailbox_red.vmdl         // Mailbox
```

#### Traffic & Safety

```
models/props/hr_vertigo/vertigo_traffic_cone/traffic_cone.vmdl  // Traffic cone
models/props/de_train/hr_train_s2/barriers/concrete_barrier.vmdl
models/props/de_nuke/hr_nuke/nuke_barriers/barrier_metal.vmdl
models/props/de_dust/hr_dust/dust_barriers/barrier_wood.vmdl
```

### Industrial & Construction

#### Tools & Equipment

```
models/props/hr_vertigo/vertigo_toolbox/vertigo_toolbox.vmdl    // Large toolbox
models/props/hr_vertigo/vertigo_tools/toolbox_small.vmdl        // Small toolbox
models/props/de_train/hr_train_s2/tools/toolbox_red.vmdl
models/props/de_nuke/hr_nuke/nuke_tools/wrench.vmdl
```

#### Construction Materials

```
models/props/hr_vertigo/vertigo_concrete_bags/vertigo_concrete_bags_01.vmdl
models/props/de_dust/hr_dust/dust_construction/cement_bag.vmdl
models/props/de_train/hr_train_s2/construction/wood_plank_128.vmdl
models/props/de_nuke/hr_nuke/nuke_construction/steel_beam_256.vmdl
```

#### Scaffolding & Platforms

```
models/props/hr_vertigo/vertigo_scaffolding/vertigo_scaffolding_tarp.vmdl
models/props/de_dust/hr_dust/dust_scaffolding/scaffold_section.vmdl
models/props/de_train/hr_train_s2/scaffolding/scaffold_128.vmdl
```

#### Heavy Equipment

```
models/props/de_nuke/hr_nuke/nuke_industrial/generator.vmdl     // Generator
models/props/de_train/hr_train_s2/industrial/compressor.vmdl    // Air compressor
models/props/ar_dizzy/dizzy_generator/dizzy_generator_full.vmdl
```

### Vehicles & Parts

#### Cars & Trucks

```
models/props/de_dust/hr_dust/dust_vehicles/car_sedan.vmdl
models/props/de_dust/hr_dust/dust_vehicles/truck_pickup.vmdl
models/props/de_inferno/hr_i/vehicles/van_delivery.vmdl
models/props/de_nuke/hr_nuke/nuke_vehicles/forklift.vmdl
```

#### Vehicle Parts

```
models/props/de_dust/hr_dust/dust_vehicle_parts/car_tire.vmdl   // Car tire
models/props/de_inferno/hr_i/vehicle_parts/car_door.vmdl        // Car door
models/props/de_train/hr_train_s2/vehicle_parts/car_hood.vmdl   // Car hood
models/props/cs_italy/props/tire/italy_car_tire_1.vmdl
```

### Electronics & Appliances

#### Computers & Tech

```
models/props/cs_office/computer_desktop.vmdl                     // Desktop PC
models/props/cs_office/monitor_flat.vmdl                         // Flat monitor
models/props/cs_office/server_rack.vmdl                          // Server rack
models/props/ad_laptop/ad_laptop.vmdl                            // Laptop
```

#### Appliances

```
models/props/de_inferno/hr_i/appliances/refrigerator.vmdl       // Fridge
models/props/de_inferno/hr_i/appliances/microwave.vmdl          // Microwave
models/props/de_dust/hr_dust/dust_appliances/washing_machine.vmdl
models/props/de_inferno/hr_i/appliances/oven.vmdl               // Oven/stove
```

### Lighting & Fixtures

#### Ceiling Lights

```
models/props/de_dust/hr_dust/dust_lighting/ceiling_light_fluorescent.vmdl
models/props/de_inferno/hr_i/lighting/chandelier.vmdl
models/props/de_nuke/hr_nuke/nuke_lighting/industrial_light.vmdl
```

#### Lamps

```
models/props/cs_office/lamp_desk.vmdl                            // Desk lamp
models/props/de_inferno/hr_i/lighting/lamp_floor.vmdl           // Floor lamp
models/props/de_dust/hr_dust/dust_lighting/lamp_wall.vmdl       // Wall lamp
```

#### Street Lights

```
models/props/de_dust/hr_dust/dust_street_lights/street_light_pole.vmdl
models/props/de_inferno/hr_i/street_lights/street_lamp_old.vmdl
```

### Doors & Windows

#### Doors

```
models/props/de_dust/hr_dust/dust_doors/door_metal.vmdl
models/props/de_inferno/hr_i/doors/door_wood_single.vmdl
models/props/de_nuke/hr_nuke/nuke_doors/door_industrial.vmdl
models/props/cs_office/door_glass.vmdl
```

#### Windows

```
models/props/de_inferno/hr_i/windows/window_frame_64.vmdl
models/props/de_dust/hr_dust/dust_windows/window_frame_128.vmdl
models/props/cs_italy/window/window_frame_arch.vmdl
```

### Foliage & Plants

#### Trees

```
models/props/de_dust/hr_dust/dust_foliage/palm_tree_01.vmdl     // Palm tree
models/props/de_inferno/hr_i/foliage/tree_pine.vmdl             // Pine tree
models/props/de_overpass/hr_overpass/foliage/tree_birch.vmdl    // Birch tree
```

#### Bushes & Shrubs

```
models/props/de_dust/hr_dust/dust_foliage/bush_desert.vmdl
models/props/de_inferno/hr_i/foliage/bush_green.vmdl
models/props/de_mirage/foliage/shrub_01.vmdl
```

#### Planters

```
models/props/de_dust/hr_dust/dust_planters/planter_square.vmdl
models/props/de_inferno/hr_i/planters/flower_pot.vmdl
models/props/cs_italy/props/planter/italy_flower_pot_1.vmdl
```

### Signs & Posters

```
models/props/de_dust/hr_dust/dust_signs/sign_arrow.vmdl
models/props/de_inferno/hr_i/signs/sign_shop.vmdl
models/props/de_train/hr_train_s2/signs/sign_exit.vmdl
models/props/de_nuke/hr_nuke/nuke_signs/sign_warning_radiation.vmdl
models/props/cs_italy/props/signs/italy_street_sign_arrow.vmdl
```

### Food & Kitchen

#### Bottles & Containers

```
models/props/de_dust/hr_dust/dust_food/bottle_glass.vmdl
models/props/de_inferno/hr_i/food/bottle_wine.vmdl
models/props/de_dust/hr_dust/dust_food/can_soda.vmdl
models/props/de_inferno/hr_i/food/can_food.vmdl
```

#### Kitchen Items

```
models/props/de_inferno/hr_i/kitchen/pot_cooking.vmdl
models/props/de_inferno/hr_i/kitchen/pan_frying.vmdl
models/props/cs_italy/props/dishes/dishes_fork_1.vmdl
models/props/cs_italy/props/dishes/dishes_knife_1.vmdl
```

### Rubble & Debris

```
models/props/de_dust/hr_dust/dust_rubble/concrete_chunk_01.vmdl  // Concrete debris
models/props/de_dust/hr_dust/dust_rubble/wood_plank_broken.vmdl  // Broken wood
models/props/de_inferno/hr_i/rubble/brick_pile.vmdl              // Brick rubble
models/props/de_nuke/hr_nuke/nuke_rubble/metal_sheet_bent.vmdl   // Bent metal
models/props/ar_dizzy/dizzy_cinderblock/dizzy_cinderblock.vmdl   // Cinder block
```

### Weapons & Military

```
models/props/crates/cs2_drop_crate.vmdl                          // Weapon crate
models/props/de_nuke/hr_nuke/nuke_military/ammo_box.vmdl         // Ammo box
models/props/coop_cementplant/coop_weapon_rack/weapon_rack_01.vmdl
models/props/de_dust/hr_dust/dust_military/sandbag_wall.vmdl    // Sandbag barrier
models/props/de_nuke/hr_nuke/nuke_military/barrier_concrete.vmdl
```

### Utilities & Infrastructure

#### Pipes & Cables

```
models/props/props_utilities/hr_cables_128.vmdl                  // Cable bundle 128
models/props/props_utilities/hr_cables_64.vmdl                   // Cable bundle 64
models/props/de_nuke/hr_nuke/nuke_pipes/pipe_section_128.vmdl   // Pipe 128
models/props/de_nuke/hr_nuke/nuke_pipes/pipe_section_256.vmdl   // Pipe 256
```

#### Vents & Ducts

```
models/props/de_nuke/hr_nuke/nuke_vents/vent_grate_64.vmdl      // Vent grate
models/props/de_dust/hr_dust/dust_vents/duct_90degree.vmdl      // Duct elbow
models/props/cs_italy/props/vent/metal_wall_vent_round_1.vmdl
```

#### Electrical

```
models/props/props_utilities/hr_electric_panel_01.vmdl           // Electric panel
models/props/de_nuke/hr_nuke/nuke_electrical/fuse_box.vmdl      // Fuse box
models/props/de_dust/hr_dust/dust_electrical/junction_box.vmdl
```

---

## Map-Specific Iconic Props

### Dust2

```
models/props/de_dust/hr_dust/dust_market/market_stall.vmdl      // Market stand
models/props/de_dust/hr_dust/dust_architecture/arch_01.vmdl     // Stone arch
models/props/de_dust/hr_dust/dust_carpet/carpet_01.vmdl         // Middle Eastern rug
```

### Inferno

```
models/props/de_inferno/hr_i/balcony/balcony_rail.vmdl          // Balcony railing
models/props/de_inferno/hr_i/church/church_bell.vmdl            // Church bell
models/props/de_inferno/hr_i/fountain/fountain_base.vmdl        // Fountain
```

### Nuke

```
models/props/de_nuke/hr_nuke/nuke_reactor/reactor_equipment.vmdl // Reactor parts
models/props/de_nuke/hr_nuke/nuke_hazmat/hazmat_barrel.vmdl      // Hazmat barrel
models/props/de_nuke/hr_nuke/nuke_silos/silo_section.vmdl        // Silo part
```

### Mirage

```
models/props/de_mirage/mirage_market/market_cart.vmdl           // Market cart
models/props/de_mirage/mirage_arches/arch_doorway.vmdl          // Archway
```

### Vertigo

```
models/props/hr_vertigo/vertigo_elevator/vertigo_elevator_cabin.vmdl
models/props/hr_vertigo/vertigo_crane/vertigo_crane_base.vmdl
models/props/hr_vertigo/vertigo_scissor_lift/vertio_scissor_lift.vmdl
```

### Ancient

```
models/props/de_ancient/ancient_scaffolding/scaffolding_01.vmdl
models/props/de_ancient/ancient_crates/ancient_crate_01.vmdl
```

### Train

```
models/props/de_train/hr_train_s2/train_cars/train_cargo_car.vmdl
models/props/de_train/hr_train_s2/train_station/platform_bench.vmdl
```

---

## Category Summary

**Total Props**: 7,375 models across 152 categories

### Major Categories

|| Category                 | Models | Description                        |
|| ------------------------ | ------ | ---------------------------------- |
|| **de_train/hr_train_s2** | 1,705  | Train yard theme                   |
|| **de_nuke/hr_nuke**      | 1,684  | Nuclear facility theme             |
|| **de_dust/hr_dust**      | 1,154  | Desert/Middle Eastern theme        |
|| **de_aztec/hr_aztec**    | 1,146  | Aztec temple theme                 |
|| **de_inferno/hr_i**      | 266    | Italian village theme              |
|| **de_vertigo**           | 187    | Skyscraper construction theme      |
|| **de_train/hr_t**        | 165    | Train legacy props                 |
|| **cs_office**            | 163    | Office building theme              |
|| **de_dust**              | 110    | Dust legacy props                  |
|| **cs_italy**             | 83     | Italian hostage map theme          |
|| **de_inferno**           | 81     | Inferno legacy props               |
|| **crates**               | 76     | Generic crates and containers      |
|| **cs_italy (root)**      | 77     | Italy-specific props               |
|| **de_mirage**            | 57     | Moroccan theme                     |
|| **de_train**             | 39     | Train legacy props                 |
|| **cbble/trim**           | 32     | Cobblestone architectural elements |
|| **de_overpass**          | 30     | Overpass map props                 |
|| **de_nuke**              | 23     | Nuke legacy props                  |
|| **de_ancient**           | 13     | Ancient temple theme (limited)     |
|| **props_utilities**      | 10     | Universal utility props            |

### CS_Italy Props (77 models)

- awning (4), balcony (4), barrel (2), books (9), box (4), broom (1)
- bucket (1), clothing (5), dishes (3), dumpster (1), flag (1), frames (3)
- hose (2), mailbox (2), misc (2), planter (7), radio (1), rubble (3)
- satellite_dish (1), shelving (1), shoe (2), signs (13), tire (1)
- trellis (1), umbrella (2), vent (1)

### Vertigo-Specific Props (187 models)

- company_banner, concrete_framework (6), door_frame_support (2)
- floor_grinder, metal_rebar, mobile_platform, pvc_roll
- cement_mixer (2), cables (5), concrete_bags (5), crane (3)
- elevator (12), fence, paint_bucket, plastic_piping (2)
- platform_railing (3), scaffolding (3), scissor_lift, sign
- support_jack, toolbox, tools (4), traffic_cone, warning_barrel
- wood_crate

### Other Notable Categories

- **ad_laptop** (2) - Laptop props
- **ar_dizzy** (14) - Dizzy map construction props
- **ar_lunacy** (1) - Moon rocks
- **coop_cementplant** (18) - Co-op mission props
- **containers/barrels** (3) - Generic barrels
- **gg_tibet** (2) - Tibet gungame map
- **gg_vietnam** (2) - Vietnam gungame map
- **hr_massive** (42) - High-res survival mode props
- **de_venice** (16) - Venice map props
- **de_vostok** (9) - Vostok map props

---

## Important Notes

### File Extensions

- **VPK files** store models as `.vmdl_c` (compiled)
- **In Hammer/scripts**, ALWAYS use `.vmdl` extension
- CS2 automatically loads the compiled version

### Paths

- All paths relative to: `game/csgo/`
- Full path example: `models/props/crates/crate_wood_small.vmdl`
- No leading slash needed

### Asset Browser

- Open in Hammer with `Shift+A`
- Browse and preview models before placing
- Most reliable way to verify paths and find all 7,979 props

### Custom Props

- Place in: `csgo_addons/YOUR_ADDON/models/`
- Reference as: `models/your_folder/your_model.vmdl`

### Performance Optimization

1. **Prefer prop_static whenever possible** - Best performance
2. **Use prop_physics sparingly** - High performance cost
3. **Combine small props** into single models when possible
4. **Use LOD variants** where available

---

## Helpful Tips

1. **Search by theme**: Look for props with map prefixes (de_dust, de_nuke, etc.)
2. **Variations**: Many props have numbered variants (\_01, \_02, \_03)
3. **HR prefix**: "hr\_" indicates high-resolution Source 2 updated models
4. **Material compatibility**: Props from same map set share materials
5. **LOD models**: Some props have LOD (Level of Detail) variants
6. **Animated**: Look for "\_animated" suffix for animated versions
7. **Find all props**: Use Hammer's Asset Browser (Shift+A) to browse complete library

---

## Troubleshooting

### Model not appearing in Hammer?

- Check spelling and ensure `.vmdl` extension
- Verify path in Asset Browser (Shift+A)
- Try compiling the map (some models need compilation)

### Model appears as ERROR?

- Wrong file extension (use `.vmdl` not `.vmdl_c`)
- Path doesn't exist (check Asset Browser)
- Custom model not in correct addon folder

### Performance issues?

- Too many prop_physics entities
- Switch to prop_static where possible
- Reduce draw distance for distant props
- Use func_detail for complex prop groups

---

## Resources

### Official

- [Valve Developer Community](https://developer.valvesoftware.com/wiki/Counter-Strike_2)
- [CS2 Entity List](https://cs2.poggu.me/dumped-data/entity-list/)
- Hammer Editor Documentation: In CS2 Workshop Tools

### Community

- CS2 Level Design Discord communities
- MapCore Discord
- r/hammer subreddit

---

## Finding Specific Props

**This document covers the most commonly used props**. To find all 7,979 props:

1. **Hammer Asset Browser** (Shift+A) - **RECOMMENDED** - Most reliable with live previews
2. **Search in this file** - Use Ctrl+F to search by category, theme, or prop type
3. **VPK extraction** - Use `dev/scripts/extract_props.py` to re-extract complete list

---

**Extraction Info:**

- **Source**: `C:\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive\game\csgo\pak01_dir.vpk`
- **Method**: Python VPK library extraction from official game files
- **Date**: October 2025
- **CS2 Version**: Current as of extraction date

---

_Happy mapping! 🗺️_
