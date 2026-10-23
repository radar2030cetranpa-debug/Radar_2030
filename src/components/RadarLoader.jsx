// src/components/RadarLoader.jsx
import React from 'react';
import logoImg from '../assets/favicon-radar-2030.png';
import '../styles/radarLoader.css';

/**
 * Componente do Radar 2030 animado com ondas circulares em takes (1, 2, 3 sinais).
 */
export function RadarLoader({
    tamanho = 'md',
    mensagem = '',
    submensagem = '',
    mostrarTextoLogo = true,
    className = '',
    style = {}
}) {
    // Normalização do tamanho
    const dimensoes = typeof tamanho === 'number'
        ? tamanho
        : tamanho === 'sm'
            ? 56
            : tamanho === 'lg'
                ? 160
                : 110;

    const viewBox = mostrarTextoLogo ? '0 0 200 190' : '20 0 160 125';
    const alturaSvg = mostrarTextoLogo ? dimensoes * 0.95 : dimensoes * 0.78;

    return (
        <div className={`radar-loader-wrapper ${className}`} style={style} role="status" aria-live="polite">
            <svg
                className="radar-loader-svg"
                width={dimensoes}
                height={alturaSvg}
                viewBox={viewBox}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* 3 Sinais Circulares Concêntricos (Estilo Takes 4G / Radar) */}
                {/* 1º Sinal Circular (Interno) */}
                <circle
                    className="radar-signal-1"
                    cx="100"
                    cy="62"
                    r="28"
                    stroke="#e5242a"
                    strokeWidth="5"
                    strokeLinecap="round"
                />

                {/* 2º Sinal Circular (Intermediário) */}
                <circle
                    className="radar-signal-2"
                    cx="100"
                    cy="62"
                    r="44"
                    stroke="#e5242a"
                    strokeWidth="5"
                    strokeLinecap="round"
                />

                {/* 3º Sinal Circular (Externo) */}
                <circle
                    className="radar-signal-3"
                    cx="100"
                    cy="62"
                    r="60"
                    stroke="#e5242a"
                    strokeWidth="5"
                    strokeLinecap="round"
                />

                {/* Haste / Mastro Vertical da Antena */}
                <rect
                    x="96"
                    y="62"
                    width="8"
                    height="44"
                    rx="4"
                    fill="#e5242a"
                />

                {/* Transmissor Central (Bulbo do Radar com pulso) */}
                <circle
                    className="radar-transmitter"
                    cx="100"
                    cy="62"
                    r="14"
                    fill="#e5242a"
                />

                {/* Tipografia 2030 institucional (quando habilitada) */}
                {mostrarTextoLogo && (
                    <g>
                        <svg
                            x="17"
                            y="113"
                            width="166"
                            height="56"
                            viewBox="20 270 472 185"
                            preserveAspectRatio="xMidYMid meet"
                            aria-hidden="true"
                        >
                            <image href={logoImg} width="512" height="512" />
                        </svg>
                        <text
                            x="100"
                            y="174"
                            textAnchor="middle"
                            fill="#64748b"
                            fontSize="10"
                            fontWeight="800"
                            letterSpacing="4.5px"
                            fontFamily="'Inter', system-ui, -apple-system, sans-serif"
                        >
                            RADAR
                        </text>
                    </g>
                )}
            </svg>

            {mensagem && (
                <div style={{ maxWidth: '380px' }}>
                    <p style={{
                        margin: '0.25rem 0 0 0',
                        fontSize: tamanho === 'sm' ? '0.85rem' : '0.98rem',
                        fontWeight: 600,
                        color: '#1e293b'
                    }}>
                        {mensagem}
                    </p>
                    {submensagem && (
                        <p style={{
                            margin: '0.2rem 0 0 0',
                            fontSize: '0.82rem',
                            color: '#64748b',
                            lineHeight: 1.4
                        }}>
                            {submensagem}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Tela de carregamento cheia (Overlay) para bloqueio com feedback durante autenticação,
 * requisições pesadas ou carregamento inicial.
 */
export function RadarLoadingScreen({
    mensagem = 'Processando...',
    submensagem = 'Aguarde um instante enquanto conectamos ao Radar 2030'
}) {
    return (
        <div className="radar-overlay-backdrop" aria-modal="true" role="dialog">
            <div className="radar-overlay-card">
                <RadarLoader
                    tamanho="lg"
                    mostrarTextoLogo={true}
                />
                <h3 className="radar-loading-title">{mensagem}</h3>
                <p className="radar-loading-subtitle">{submensagem}</p>
                <div className="radar-signal-status">
                    <span className="radar-signal-dot"></span>
                    <span>Conectando aos servidores</span>
                </div>
            </div>
        </div>
    );
}
