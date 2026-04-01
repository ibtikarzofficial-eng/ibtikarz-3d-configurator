import React from 'react';
import { RING_CONFIG } from './productData';

export default function RingConfigurator({ config, setConfig }) {
    return (
        <div className="configurator-panel">
            {/* Metal Colors */}
            <fieldset className="color-picker-wrapper">
                <legend className="color-title">Band Metal: {config.metal.name}</legend>
                <div className="color-dots" role="radiogroup">
                    {RING_CONFIG.metals.map((metal) => (
                        <button
                            key={metal.id}
                            onClick={() => setConfig({ ...config, metal: metal })}
                            className={`color-dot ${config.metal.id === metal.id ? 'active' : ''}`}
                            style={{
                                backgroundColor: metal.hex,
                                border: config.metal.id === metal.id ? '2px solid #000' : '2px solid transparent'
                            }}
                            aria-label={metal.name}
                            title={metal.name}
                        />
                    ))}
                </div>
            </fieldset>

            {/* Gemstone Types */}
            <fieldset className="color-picker-wrapper">
                <legend className="color-title">Center Stone: {config.gem.name}</legend>
                <div className="design-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {RING_CONFIG.gems.map((gem) => (
                        <button
                            key={gem.id}
                            onClick={() => setConfig({ ...config, gem: gem })}
                            className={`nav-btn ${config.gem.id === gem.id ? 'active' : ''}`}
                            style={{ padding: '6px 12px', fontSize: '11px', margin: 0 }}
                        >
                            {gem.name}
                        </button>
                    ))}
                </div>
            </fieldset>
        </div>
    );
}