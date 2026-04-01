import React from 'react';
import { GLASSES_CONFIG } from './productData';

export default function GlassesConfigurator({ config, setConfig }) {
    return (
        <div className="configurator-panel">
            {/* Frame Colors */}
            <fieldset className="color-picker-wrapper">
                <legend className="color-title">Frame Finish: {config.frameColor.name}</legend>
                <div className="color-dots" role="radiogroup">
                    {GLASSES_CONFIG.frameColors.map((color) => (
                        <button
                            key={color.id}
                            onClick={() => setConfig({ ...config, frameColor: color })}
                            className={`color-dot ${config.frameColor.id === color.id ? 'active' : ''}`}
                            style={{
                                backgroundColor: color.hex,
                                border: config.frameColor.id === color.id ? '2px solid #000' : '2px solid transparent',
                                opacity: color.transmission > 0 ? 0.6 : 1 // Makes the clear acetate button look slightly transparent
                            }}
                            aria-label={color.name}
                            title={color.name}
                        />
                    ))}
                </div>
            </fieldset>

            {/* Lens Types */}
            <fieldset className="color-picker-wrapper">
                <legend className="color-title">Lens Option: {config.lensType.name}</legend>
                <div className="design-pills"> {/* REMOVED INLINE STYLES */}
                    {GLASSES_CONFIG.lensTypes.map((lens) => (
                        <button
                            key={lens.id}
                            onClick={() => setConfig({ ...config, lensType: lens })}
                            className={`nav-btn ${config.lensType.id === lens.id ? 'active' : ''}`}
                            style={{ padding: '6px 12px', fontSize: '11px', margin: 0 }}
                        >
                            {lens.name}
                        </button>
                    ))}
                </div>
            </fieldset>

            {/* Handle Designs */}
            {/* Handle Designs */}
            <fieldset className="color-picker-wrapper">
                <legend className="color-title">Handle Design: {config.handleDesign.name}</legend>
                <div className="design-pills"> {/* REMOVED INLINE STYLES */}
                    {GLASSES_CONFIG.handleDesigns.map((design) => (
                        <button
                            key={design.id}
                            onClick={() => setConfig({ ...config, handleDesign: design })}
                            className={`nav-btn ${config.handleDesign.id === design.id ? 'active' : ''}`}
                            style={{ padding: '6px 12px', fontSize: '11px', margin: 0 }}
                        >
                            {design.name}
                        </button>
                    ))}
                </div>
            </fieldset>
        </div>
    );
}