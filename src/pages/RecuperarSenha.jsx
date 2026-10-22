// src/pages/RecuperarSenha.jsx
import React, { useState, useEffect } from 'react';
import * as authService from '../services/auth';
import { ApiError } from '../services/api';
import Swal from 'sweetalert2';
import { useLoading } from '../context/LoadingContext';

export function RecuperarSenha({ onVoltar, tokenInicial = '' }) {
    const [etapa, setEtapa] = useState(tokenInicial ? 'redefinir' : 'email'); // 'email' | 'redefinir'
    const [email, setEmail] = useState('');
    const [token, setToken] = useState(tokenInicial || '');
    const [novaSenha, setNovaSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [carregando, setCarregando] = useState(false);
    const { mostrarLoading, esconderLoading } = useLoading();

    useEffect(() => {
        if (tokenInicial) {
            setToken(tokenInicial);
            setEtapa('redefinir');
        }
    }, [tokenInicial]);

    const erros = authService.validarForcaSenha(novaSenha);

    const handleSolicitar = async (e) => {
        e.preventDefault();
        setCarregando(true);
        mostrarLoading('Enviando solicitação...', 'Verificando o e-mail no Radar 2030');
        try {
            const resposta = await authService.recuperarSenha(email.trim().toLowerCase());
            if (resposta?.token) {
                setToken(resposta.token);
            }
            setEtapa('redefinir');
            Swal.fire({
                icon: 'info',
                title: 'Verifique seu e-mail',
                text: resposta?.message || 'Se o e-mail existir, um link de recuperação foi enviado.',
                confirmButtonColor: '#2563eb'
            });
        } catch (err) {
            const mensagem = err instanceof ApiError ? err.message : 'Não foi possível solicitar a recuperação.';
            Swal.fire({ icon: 'error', title: 'Erro', text: mensagem, confirmButtonColor: '#2563eb' });
        } finally {
            setCarregando(false);
            esconderLoading();
        }
    };

    const handleRedefinir = async (e) => {
        e.preventDefault();

        if (erros.length > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Senha fraca',
                text: `A nova senha precisa ter: ${erros.join(', ')}.`,
                confirmButtonColor: '#2563eb'
            });
            return;
        }

        if (novaSenha !== confirmarSenha) {
            Swal.fire({ icon: 'warning', title: 'Senhas não conferem', text: 'A confirmação deve ser idêntica à nova senha.', confirmButtonColor: '#2563eb' });
            return;
        }

        setCarregando(true);
        mostrarLoading('Atualizando senha...', 'Salvando novas credenciais com segurança');
        try {
            await authService.redefinirSenha(token.trim(), novaSenha);
            await Swal.fire({
                icon: 'success',
                title: 'Senha cadastrada com sucesso!',
                text: 'Sua senha foi definida. Você já pode fazer login no sistema.',
                confirmButtonColor: '#2563eb'
            });
            // Limpa parâmetros da URL se houver
            if (window.history.replaceState) {
                window.history.replaceState(null, '', window.location.pathname);
            }
            onVoltar();
        } catch (err) {
            const mensagem = err instanceof ApiError ? err.message : 'Não foi possível definir a senha. O link pode ter expirado.';
            Swal.fire({ icon: 'error', title: 'Erro', text: mensagem, confirmButtonColor: '#2563eb' });
        } finally {
            setCarregando(false);
            esconderLoading();
        }
    };

    const titulo = tokenInicial ? 'Cadastrar sua Senha' : 'Recuperar Senha';

    return (
        <div style={{ padding: '2rem 1rem', maxWidth: '440px', margin: '2rem auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 0.75rem auto' }}>
                    <i className="bi bi-shield-lock-fill"></i>
                </div>
                <h2 style={{ color: '#1e293b', margin: '0 0 0.35rem 0', fontSize: '1.4rem' }}>{titulo}</h2>
                <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
                    {etapa === 'email'
                        ? 'Informe seu e-mail para receber o link seguro de acesso.'
                        : 'Defina uma senha segura para acessar o Radar 2030.'}
                </p>
            </div>

            {etapa === 'email' ? (
                <form onSubmit={handleSolicitar} style={{ background: '#fff', padding: '1.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)' }}>
                    <label style={estiloLabel}>E-mail cadastrado *</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="seu.email@orgao.gov.br"
                        style={estiloInput}
                    />

                    <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.25rem' }}>
                        <button type="button" onClick={onVoltar} style={{ flex: 1, background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.7rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>
                            Voltar
                        </button>
                        <button type="submit" disabled={carregando} style={{ flex: 1, background: '#2563eb', color: '#fff', border: 'none', padding: '0.7rem', borderRadius: '8px', cursor: carregando ? 'wait' : 'pointer', fontWeight: '600' }}>
                            {carregando ? 'Enviando...' : 'Enviar Link'}
                        </button>
                    </div>
                </form>
            ) : (
                <form onSubmit={handleRedefinir} style={{ background: '#fff', padding: '1.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)' }}>
                    {!tokenInicial && (
                        <>
                            <label style={estiloLabel}>Token de ativação / recuperação *</label>
                            <input
                                type="text"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                required
                                style={estiloInput}
                                placeholder="Cole o token recebido no link"
                            />
                        </>
                    )}

                    <label style={estiloLabel}>Nova Senha *</label>
                    <input
                        type="password"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        required
                        placeholder="Mínimo 8 caracteres"
                        style={estiloInput}
                    />
                    <p style={{ fontSize: '0.78rem', color: erros.length > 0 && novaSenha ? '#dc2626' : '#64748b', margin: '-0.5rem 0 1rem 0' }}>
                        Mínimo 8 caracteres, com ao menos 1 maiúscula e 1 número.
                    </p>

                    <label style={estiloLabel}>Confirmar Nova Senha *</label>
                    <input
                        type="password"
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        required
                        placeholder="Digite novamente a nova senha"
                        style={estiloInput}
                    />

                    <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.25rem' }}>
                        {!tokenInicial && (
                            <button type="button" onClick={() => setEtapa('email')} style={{ flex: 1, background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.7rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>
                                Voltar
                            </button>
                        )}
                        <button type="submit" disabled={carregando} style={{ flex: 1, background: '#16a34a', color: '#fff', border: 'none', padding: '0.7rem', borderRadius: '8px', cursor: carregando ? 'wait' : 'pointer', fontWeight: '600' }}>
                            {carregando ? 'Salvando...' : 'Cadastrar Senha'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

const estiloLabel = { display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px' };
const estiloInput = { width: '100%', padding: '0.65rem 0.8rem', marginBottom: '1rem', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' };
