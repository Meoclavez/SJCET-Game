import { ShopItem } from '../types';

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'soap_neutralizer',
    name: 'Alkaline Soap Solution (Base)',
    category: 'chemical',
    icon: '🧼',
    costGold: 35,
    tagline: 'Acid-Base Neutralization: pH 2 -> pH 7',
    scientificLogic: 'Chemical Reaction: 2 H⁺ + CO₃²⁻ → H₂O + CO₂. Basic alkaline soaps react with toxic cavern acids to precipitate harmless salts and clean water.',
    description: 'Pours a barrel of concentrated alkaline soap down the drainage grate into the cavern. Instantly neutralizes 45% Toxicity and turns the bubbling acid pool into fresh healing water!',
    inStock: true
  },
  {
    id: 'ceiling_jack',
    name: 'Hydraulic Steel Ceiling Jack',
    category: 'engineering',
    icon: '🔩',
    costGold: 45,
    costMaterials: { iron: 10, stone: 15 },
    tagline: 'Structural Load Redistribution',
    scientificLogic: 'Distributes downward vertical load along triangulated steel trusses, preventing cavern ceiling sag caused by heavy town structures.',
    description: 'Installs reinforced steel support columns underground. Reduces Tectonic Weight strain by 30% and prevents stalactite drop hazards.',
    inStock: true
  },
  {
    id: 'root_fertilizer',
    name: 'Deep-Mycelium Root Elixir',
    category: 'ecological',
    icon: '🧪',
    costGold: 30,
    costMaterials: { lumens: 8 },
    tagline: 'Bio-Polymer Soil Solidification',
    scientificLogic: 'Fungal mycelium threads bond loose soil grains into cohesive aggregate matrix, reversing erosion caused by deforestation.',
    description: 'Sprays subterranean root beds with high-potency bio-nutrients. Restores +40% Root Stability and converts slippery mud back to solid stone footing!',
    inStock: true
  },
  {
    id: 'sonic_dampener',
    name: 'Acoustic Resonance Absorber',
    category: 'engineering',
    icon: '🎛️',
    costGold: 40,
    costMaterials: { iron: 8 },
    tagline: 'Acoustic Destructive Interference',
    scientificLogic: 'Emits inverted phase waves to cancel out 90% of surface music festival shockwaves before they reach fragile subterranean crystal beds.',
    description: 'Cancels 100% of festival vibration tremors, allowing citizens to celebrate without triggering crystal cave-ins.',
    inStock: true
  },
  {
    id: 'castle_spire_kit',
    name: 'Royal Castle Spire & Battlements',
    category: 'prestige',
    icon: '🚩',
    costGold: 70,
    costMaterials: { stone: 50, iron: 20 },
    tagline: 'Monarchic Architectural Upgrade',
    scientificLogic: 'Uses interlocking vaulted arches to build towering Gothic spires without adding excess ground stress.',
    description: 'Unlocks Royal Castle expansions in the 3D Showcase and adds golden banners and glowing auras to your town!',
    inStock: true
  },
  {
    id: 'ration_packs',
    name: 'Sylvan Grain Rations',
    category: 'ecological',
    icon: '🌾',
    costGold: 25,
    tagline: 'High-Calorie Agricultural Provisions',
    scientificLogic: 'Nutrient-dense grain storage preserves caloric density and vitamins, ensuring stable population sustenance without overburdening farmlands.',
    description: 'Purchases a supply convoy of preserved grain packs (+35 Food). Feeds citizens and supports military recruitment.',
    inStock: true
  },
  {
    id: 'mana_distiller',
    name: 'Aetherium Mana Condenser',
    category: 'arcane',
    icon: '🔮',
    costGold: 35,
    costMaterials: { lumens: 5 },
    tagline: 'Ambient Crystalline Condensation',
    scientificLogic: 'Condenses vaporized aether particulates through prismatic quartz lenses into liquid crystalline mana energy.',
    description: 'Generates +40 pure Mana for spell wards, magical disaster mitigation, and coronation ceremonies.',
    inStock: true
  },
  {
    id: 'mercenary_contract',
    name: 'Royal Garrison Mercenary Charter',
    category: 'military',
    icon: '⚔️',
    costGold: 45,
    costMaterials: { food: 15, iron: 10 },
    tagline: 'Standing Professional Armed Guard',
    scientificLogic: 'Professional martial formations with balanced logistics and iron weaponry improve defensive deterrence by orders of magnitude.',
    description: 'Enlists +6 trained soldiers into the city garrison, defending the kingdom against demon scout patrols and abyssal sieges.',
    inStock: true
  },
  {
    id: 'demon_shard_crucible',
    name: 'Abyssal Shard Crucible & Purifier',
    category: 'arcane',
    icon: '💜',
    costGold: 55,
    costMaterials: { mana: 20 },
    tagline: 'Dark Matter Transmutation & Detoxification',
    scientificLogic: 'High-temperature thermal plasma disintegrates chaotic demon resonance into stable elemental gold and luminous aether, neutralizing toxic fallout.',
    description: 'Purifies cavern air (-15% Toxicity). Transmutes 10 Demon Shards into +30 Mana, +20 Lumens, and +40 Gold.',
    inStock: true
  }
];

