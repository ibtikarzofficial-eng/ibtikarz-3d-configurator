export const GLASSES_CONFIG = {
    frameColors: [
        { id: 'matte-black', name: 'Matte Black', hex: '#111827', roughness: 0.8, metalness: 0, transmission: 0 },
        { id: 'gloss-white', name: 'Gloss White', hex: '#F9FAFB', roughness: 0.1, metalness: 0, transmission: 0 },
        { id: 'clear-acetate', name: 'Clear Acetate', hex: '#ffffff', roughness: 0.1, metalness: 0, transmission: 0.9 }, // Transparent frame!
        { id: 'champagne', name: 'Champagne Gold', hex: '#F3E5AB', roughness: 0.2, metalness: 0.8, transmission: 0 },
        { id: 'ruby-red', name: 'Ruby Red', hex: '#7f1d1d', roughness: 0.3, metalness: 0.1, transmission: 0 },
    ],
    lensTypes: [
        { id: 'dark-polarized', name: 'Dark Polarized', color: '#050505', transmission: 0.8, metalness: 0.1, roughness: 0, ior: 1.5 },
        { id: 'silver-mirror', name: 'Silver Mirror', color: '#ffffff', transmission: 0, metalness: 1, roughness: 0, ior: 1.5 },
        { id: 'rose-gold', name: 'Rose Gold Mirror', color: '#B76E79', transmission: 0, metalness: 1, roughness: 0, ior: 1.5 },
        { id: 'ocean-blue', name: 'Ocean Blue', color: '#0ea5e9', transmission: 0.85, metalness: 0.1, roughness: 0, ior: 1.5 },
        { id: 'amber-drive', name: 'Amber Drive', color: '#b45309', transmission: 0.9, metalness: 0, roughness: 0.05, ior: 1.5 },
    ],
    handleDesigns: [
        { id: 'match-frame', name: 'Solid Match', type: 'solid' },
        { id: 'frosted-ice', name: 'Frosted Ice', type: 'frosted', hex: '#ffffff' },
        { id: 'brushed-steel', name: 'Brushed Steel', type: 'metallic', hex: '#9CA3AF' },
        { id: 'carbon-black', name: 'Carbon Matte', type: 'metallic', hex: '#0a0a0a' },
    ]
};

export const DEFAULT_GLASSES_STATE = {
    frameColor: GLASSES_CONFIG.frameColors[0],
    lensType: GLASSES_CONFIG.lensTypes[0],
    handleDesign: GLASSES_CONFIG.handleDesigns[0]
};

// Add this below your GLASSES_CONFIG

export const RING_CONFIG = {
    metals: [
        { id: 'yellow-gold', name: '18k Yellow Gold', hex: '#D4AF37', roughness: 0.12, metalness: 1 },
        { id: 'platinum', name: 'Platinum', hex: '#E5E4E2', roughness: 0.08, metalness: 1 },
        { id: 'rose-gold', name: '18k Rose Gold', hex: '#B76E79', roughness: 0.1, metalness: 1 },
    ],
    gems: [
        { id: 'diamond', name: 'Flawless Diamond', color: '#ffffff', transmission: 1, ior: 2.42, chromaticAberration: 0.5 },
        { id: 'sapphire', name: 'Royal Sapphire', color: '#0f52ba', transmission: 0.9, ior: 1.77, chromaticAberration: 0.1 },
        { id: 'emerald', name: 'Colombian Emerald', color: '#50c878', transmission: 0.9, ior: 1.58, chromaticAberration: 0.1 },
        { id: 'onyx', name: 'Black Onyx', color: '#050505', transmission: 0, ior: 1.5, chromaticAberration: 0 }, // Opaque black stone
    ]
};

export const DEFAULT_RING_STATE = {
    metal: RING_CONFIG.metals[0],
    gem: RING_CONFIG.gems[0]
};

// Add this below your RING_CONFIG

export const COMPLEX_CONFIG = {
    environments: [
        { id: 'studio', name: 'Bright Studio', ambientColor: '#ffffff', ambientInt: 1, spotColor: '#ffffff', spotInt: 5 },
        { id: 'sunset', name: 'Evening Mood', ambientColor: '#ff8855', ambientInt: 0.2, spotColor: '#ff4400', spotInt: 40 }, // Cranked to 40
        { id: 'night', name: 'Neon City', ambientColor: '#220044', ambientInt: 0.05, spotColor: '#e900ff', spotInt: 80 }, // Cranked to 80
    ]
};

export const DEFAULT_COMPLEX_STATE = {
    isExploded: false,
    environment: COMPLEX_CONFIG.environments[0]
};