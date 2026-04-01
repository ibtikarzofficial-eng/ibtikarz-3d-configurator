import React from 'react';
import { COMPLEX_CONFIG } from './productData';

export default function ComplexConfigurator({ config, setConfig }) {
    return (
        <div className="configurator-panel">
            {/* The OMG WOW Feature: Explode Toggle */}
            <fieldset className="color-picker-wrapper" style={{ background: config.isExploded ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.5)', transition: 'background 0.3s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <legend className="color-title" style={{ marginBottom: 4 }}>Craftsmanship View</legend>
                        <p style={{ fontSize: '11px', color: '#666' }}>Deconstruct the setting</p>
                    </div>

                    {/* Custom Toggle Switch */}
                    <button
                        onClick={() => setConfig({ ...config, isExploded: !config.isExploded })}
                        style={{
                            width: '48px', height: '24px', borderRadius: '12px',
                            background: config.isExploded ? '#000' : '#ccc',
                            border: 'none', position: 'relative', cursor: 'pointer',
                            transition: 'background 0.3s'
                        }}
                    >
                        <div style={{
                            width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                            position: 'absolute', top: '2px', left: config.isExploded ? '26px' : '2px',
                            transition: 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
                    </button>
                </div>
            </fieldset>

            {/* Environment Lighting */}
            <fieldset className="color-picker-wrapper">
                <legend className="color-title">Lighting Environment</legend>
                <div className="design-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {COMPLEX_CONFIG.environments.map((env) => (
                        <button
                            key={env.id}
                            onClick={() => setConfig({ ...config, environment: env })}
                            className={`nav-btn ${config.environment.id === env.id ? 'active' : ''}`}
                            style={{ padding: '6px 12px', fontSize: '11px', margin: 0 }}
                        >
                            {env.name}
                        </button>
                    ))}
                </div>
            </fieldset>
        </div>
    );
}