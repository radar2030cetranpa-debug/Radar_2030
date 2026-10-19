// src/components/Footer.jsx
import React from 'react';

export function Footer({ onNavigate }) {
    return (
        <footer style={{ 
            background: '#ffffff', 
            borderTop: '1px solid #e2e8f0', 
            padding: '1.5rem 2rem', 
            textAlign: 'center', 
            color: '#64748b', 
            fontSize: '0.85rem',
            marginTop: 'auto'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                <p style={{ margin: 0, fontWeight: '500', color: '#1e293b' }}>
                    Radar 2030 &mdash; Sistema de Monitoramento do Plano Estratégico Cetran/PA 2030
                </p>
                <p style={{ margin: 0 }}>
                    Conselho Estadual de Trânsito do Estado do Pará &copy; {new Date().getFullYear()} &mdash; Todos os direitos reservados.
                </p>
                <button
                    type="button"
                    onClick={() => onNavigate?.('suporte')}
                    title="Suporte técnico"
                    aria-label="Suporte técnico"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        border: 'none',
                        background: 'transparent',
                        color: '#2563eb',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        padding: '0.25rem 0.5rem'
                    }}
                >
                    <i className="bi bi-headset" aria-hidden="true"></i>
                    Suporte técnico
                </button>
            </div>
        </footer>
    );
}