// src/components/Header.jsx
import React, { useState, useRef, useEffect } from 'react';
import logoImg from '../assets/favicon-radar-2030.png';
import Swal from 'sweetalert2';
import { login as apiLogin, logout as apiLogout } from '../services/auth';
import { ApiError } from '../services/api';
import { ehComiteOuAdminGeral, ehAdmin, labelRole } from '../services/permissoes';

export function Header({ telas = {}, telaAtual, onNavigate, usuarioLogado, setUsuarioLogado }) {
    const [modalLoginAberto, setModalLoginAberto] = useState(false);
    const [menuAberto, setMenuAberto] = useState(false);
    const [dropdownUsuarioAberto, setDropdownUsuarioAberto] = useState(false);
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const dropdownRef = useRef(null);

    const {
        HOME = 'home',
        DASHBOARD = 'dashboard',
        ACOES = 'acoes',
        CONSULTAR = 'consultar',
        RASCUNHOS = 'rascunhos',
        COMITE = 'comite',
        ADMIN = 'admin',
        TROCAR_SENHA = 'trocar-senha',
        RECUPERAR_SENHA = 'recuperar-senha'
    } = telas;

    // Fecha o dropdown ao clicar fora
    useEffect(() => {
        const handleClickFora = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownUsuarioAberto(false);
            }
        };
        document.addEventListener('mousedown', handleClickFora);
        return () => document.removeEventListener('mousedown', handleClickFora);
    }, []);

    const handleNavigate = (tela) => {
        if (typeof onNavigate === 'function') {
            onNavigate(tela);
        }
        setMenuAberto(false);
        setDropdownUsuarioAberto(false);
    };

    const estaLogado = Boolean(usuarioLogado);
    const podeVerComite = ehComiteOuAdminGeral(usuarioLogado);
    const podeVerAdmin = ehAdmin(usuarioLogado);

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        try {
            const usuarioEncontrado = await apiLogin(email.trim().toLowerCase(), senha);
            setUsuarioLogado(usuarioEncontrado);
            setModalLoginAberto(false);
            setEmail('');
            setSenha('');
            Swal.fire({
                icon: 'success',
                title: 'Login realizado!',
                text: `Bem-vindo, ${usuarioEncontrado.email}`,
                timer: 2000,
                showConfirmButton: false
            });
        } catch (err) {
            const mensagem = err instanceof ApiError ? err.message : 'Não foi possível fazer login. Tente novamente.';
            Swal.fire({
                icon: 'error',
                title: 'Erro no login',
                text: mensagem,
                confirmButtonColor: '#2563eb'
            });
        }
    };

    const handleLogoutClick = async () => {
        const result = await Swal.fire({
            title: 'Sair da sessão?',
            text: 'Você tem certeza que deseja fazer logout?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#e63946',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sim, sair',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            apiLogout();
            setUsuarioLogado(null);
            setDropdownUsuarioAberto(false);
            handleNavigate(HOME);
            Swal.fire({
                icon: 'success',
                title: 'Logout realizado!',
                timer: 1500,
                showConfirmButton: false
            });
        }
    };

    // Iniciais do email para o avatar
    const iniciaisUsuario = usuarioLogado?.email
        ? usuarioLogado.email.substring(0, 2).toUpperCase()
        : '';

    return (
        <header className="header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 2rem', background: '#ffffff', borderBottom: '1px solid #e2e8f0', minHeight: '76px' }}>
            <div className="header-brand" onClick={() => handleNavigate(HOME)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                    src={logoImg}
                    alt="Logo Radar 2030"
                    style={{
                        width: '50px',
                        maxWidth: '55vw',
                        height: 'auto',
                        objectFit: 'contain',
                        display: 'block'
                    }}
                />
            </div>

            {/* Menu Desktop */}
            <nav className="header-nav" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {estaLogado && (
                    <>
                        <button className="button" onClick={() => handleNavigate(HOME)} style={estiloBotaoNav(telaAtual === HOME)}>Início</button>
                        <button className="button" onClick={() => handleNavigate(DASHBOARD)} style={estiloBotaoNav(telaAtual === DASHBOARD)}>Dashboard</button>
                        <button className="button" onClick={() => handleNavigate(ACOES)} style={estiloBotaoNav(telaAtual === ACOES)}>Ações Estratégicas</button>
                        <button className="button" onClick={() => handleNavigate(CONSULTAR)} style={estiloBotaoNav(telaAtual === CONSULTAR)}>Minhas Matrizes</button>
                        <button className="button" onClick={() => handleNavigate(RASCUNHOS)} style={estiloBotaoNav(telaAtual === RASCUNHOS)}>Meus Rascunhos</button>
                    </>
                )}

                {estaLogado ? (
                    <div ref={dropdownRef} style={{ position: 'relative', marginLeft: '0.5rem' }}>
                        {/* Botão do Avatar */}
                        <button
                            type="button"
                            onClick={() => setDropdownUsuarioAberto(!dropdownUsuarioAberto)}
                            aria-label="Menu do usuário"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                background: dropdownUsuarioAberto ? '#f1f5f9' : 'transparent',
                                border: '1px solid #e2e8f0',
                                borderRadius: '999px',
                                padding: '0.25rem 0.6rem 0.25rem 0.25rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {/* Ícone de Usuário (avatar com iniciais) */}
                            <span
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '0.8rem',
                                    flexShrink: 0
                                }}
                            >
                                {iniciaisUsuario}
                            </span>
                            {/* Ícone de seta */}
                            <i
                                className="bi bi-chevron-down"
                                style={{
                                    fontSize: '0.7rem',
                                    color: '#64748b',
                                    transition: 'transform 0.2s ease',
                                    transform: dropdownUsuarioAberto ? 'rotate(180deg)' : 'rotate(0deg)'
                                }}
                            ></i>
                        </button>

                        {/* Dropdown */}
                        {dropdownUsuarioAberto && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 8px)',
                                    right: 0,
                                    minWidth: '240px',
                                    background: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                                    padding: '0.5rem',
                                    zIndex: 1001,
                                    animation: 'fadeIn 0.15s ease'
                                }}
                            >
                                {/* Info do usuário */}
                                <div
                                    style={{
                                        padding: '0.75rem',
                                        borderBottom: '1px solid #f1f5f9',
                                        marginBottom: '0.35rem'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        <span
                                            style={{
                                                width: '38px',
                                                height: '38px',
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                                                color: '#fff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 'bold',
                                                fontSize: '0.9rem',
                                                flexShrink: 0
                                            }}
                                        >
                                            {iniciaisUsuario}
                                        </span>
                                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, overflow: 'hidden' }}>
                                            <span
                                                style={{
                                                    fontSize: '0.85rem',
                                                    fontWeight: 600,
                                                    color: '#1e293b',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}
                                            >
                                                {usuarioLogado.email}
                                            </span>
                                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                                {labelRole(usuarioLogado.role)}
                                                {usuarioLogado.setor ? ` • ${usuarioLogado.setor}` : ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Opção Painel Gestor (se tiver permissão) */}
                                {podeVerComite && (
                                    <button
                                        type="button"
                                        onClick={() => handleNavigate(COMITE)}
                                        style={estiloItemDropdown(telaAtual === COMITE)}
                                    >
                                        <i className="bi bi-people-fill" style={{ color: '#d97706', fontSize: '1rem' }}></i>
                                        <span>Painel Gestor</span>
                                        {telaAtual === COMITE && <i className="bi bi-check2" style={{ marginLeft: 'auto', color: '#d97706' }}></i>}
                                    </button>
                                )}

                                {/* Opção Administrador (se tiver permissão) */}
                                {podeVerAdmin && (
                                    <button
                                        type="button"
                                        onClick={() => handleNavigate(ADMIN)}
                                        style={estiloItemDropdown(telaAtual === ADMIN)}
                                    >
                                        <i className="bi bi-shield-lock-fill" style={{ color: '#7c3aed', fontSize: '1rem' }}></i>
                                        <span>Administração</span>
                                        {telaAtual === ADMIN && <i className="bi bi-check2" style={{ marginLeft: 'auto', color: '#7c3aed' }}></i>}
                                    </button>
                                )}

                                {/* Opção Trocar Senha */}
                                <button
                                    type="button"
                                    onClick={() => handleNavigate(TROCAR_SENHA)}
                                    style={estiloItemDropdown(telaAtual === TROCAR_SENHA)}
                                >
                                    <i className="bi bi-key-fill" style={{ color: '#2563eb', fontSize: '1rem' }}></i>
                                    <span>Trocar Senha</span>
                                    {telaAtual === TROCAR_SENHA && <i className="bi bi-check2" style={{ marginLeft: 'auto', color: '#2563eb' }}></i>}
                                </button>

                                {/* Separador */}
                                <div style={{ height: '1px', background: '#f1f5f9', margin: '0.35rem 0' }} />

                                {/* Botão Sair */}
                                <button
                                    type="button"
                                    onClick={handleLogoutClick}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.6rem',
                                        width: '100%',
                                        padding: '0.6rem 0.75rem',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        color: '#e63946',
                                        fontSize: '0.88rem',
                                        fontWeight: 500,
                                        textAlign: 'left',
                                        transition: 'background 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <i className="bi bi-box-arrow-right" style={{ fontSize: '1rem' }}></i>
                                    <span>Sair</span>
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        className="button"
                        onClick={() => setModalLoginAberto(true)}
                        style={{ background: '#2563eb', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                    >
                        Entrar
                    </button>
                )}
            </nav>

            {/* Botão Mobile Toggle */}
            <button className="header-mobile-toggle" onClick={() => setMenuAberto(!menuAberto)} aria-label="Abrir menu" type="button" style={{ display: 'none', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>
                ☰
            </button>

            {/* Modal de Login */}
            {modalLoginAberto && (
                <div className="modal" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="modal-content" style={{ background: '#fff', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                        <span className="close" onClick={() => setModalLoginAberto(false)} style={{ position: 'absolute', top: '14px', right: '18px', cursor: 'pointer', fontSize: '1.5rem', color: '#64748b' }}>&times;</span>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <img src={logoImg} alt="Logo Radar 2030" style={{ width: '180px', maxWidth: '100%', height: 'auto', margin: '0 auto 0.75rem auto', display: 'block' }} />
                            <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem' }}>Acesso ao Radar 2030</h2>
                            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>Sistema de Monitoramento do Plano Estratégico Cetran/PA 2030</p>
                        </div>
                        <form onSubmit={handleLoginSubmit}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>E-mail:</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="seu.email@exemplo.com"
                                style={{ width: '100%', padding: '0.65rem 0.8rem', marginBottom: '1rem', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }}
                            />

                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Senha:</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '0.6rem' }}>
                                <input
                                    type={mostrarSenha ? "text" : "password"}
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
                                    required
                                    placeholder="Sua senha"
                                    style={{ width: '100%', padding: '0.65rem 0.8rem', paddingRight: '40px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }}
                                />
                                <i
                                    className={`bi ${mostrarSenha ? 'bi-eye-slash' : 'bi-eye'}`}
                                    onClick={() => setMostrarSenha(!mostrarSenha)}
                                    style={{ position: 'absolute', right: '12px', cursor: 'pointer', color: '#64748b', fontSize: '1.1rem' }}
                                ></i>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.2rem' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setModalLoginAberto(false);
                                        handleNavigate(RECUPERAR_SENHA);
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#2563eb',
                                        fontSize: '0.82rem',
                                        cursor: 'pointer',
                                        padding: 0,
                                        fontWeight: 500
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                                >
                                    Esqueceu sua senha?
                                </button>
                            </div>

                            <button type="submit" className="button" style={{ width: '100%', background: '#2563eb', color: '#fff', padding: '0.75rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem' }}>Entrar</button>
                        </form>
                    </div>
                </div>
            )}
        </header>
    );
}

const estiloBotaoNav = (ativo) => ({
    background: ativo ? '#2563eb' : 'transparent',
    border: 'none',
    color: ativo ? '#fff' : '#475569',
    cursor: 'pointer',
    fontWeight: '500',
    padding: '0.45rem 0.85rem',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
    boxShadow: ativo ? '0 2px 10px rgba(37, 99, 235, 0.18)' : 'none',
    textAlign: 'center',
    width: 'auto',
    fontSize: '0.9rem'
});

const estiloItemDropdown = (ativo) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    width: '100%',
    padding: '0.6rem 0.75rem',
    background: ativo ? '#f1f5f9' : 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#334155',
    fontSize: '0.88rem',
    fontWeight: ativo ? 600 : 500,
    textAlign: 'left',
    transition: 'background 0.15s ease'
});