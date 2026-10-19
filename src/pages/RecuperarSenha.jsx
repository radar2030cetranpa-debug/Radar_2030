// src/pages/RecuperarSenha.jsx
import React, { useState } from 'react';
import * as authService from '../services/auth';
import { ApiError } from '../services/api';
import Swal from 'sweetalert2';

export function RecuperarSenha({ onVoltar }) {
    const [etapa, setEtapa] = useState('email'); // 'email' | 'redefinir'
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [novaSenha, setNovaSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [carregando, setCarregando] = useState(false);

    const erros = authService.validarForcaSenha(novaSenha);

    const handleSolicitar = async (e) => {
        e.preventDefault();
        setCarregando(true);
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
            Swal.fire({ icon: 'warning', title: 'Senhas não conferem', confirmButtonColor: '#2563eb' });
            return;
        }

        setCarregando(true);
        try {
            await authService.redefinirSenha(token.trim(), novaSenha);
            Swal.fire({
                icon: 'success',
                title: 'Senha redefinida!',
                text: 'Faça login com a nova senha.',
                timer: 2200,
                showConfirmButton: false
            });
            onVoltar();
        } catch (err) {
            const mensagem = err instanceof ApiError ? err.message : 'Não foi possível redefinir a senha.';
            Swal.fire({ icon: 'error', title: 'Erro', text: mensagem, confirmButtonColor: '#2563eb' });
        } finally {
            setCarregando(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '420px', margin: '0 auto' }}>
            <h2 style={{ color: '#1e293b', marginBottom: '0.3rem' }}>Recuperar Senha</h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                {etapa === 'email'
                    ? 'Informe seu e-mail para receber o link de recuperação.'
                    : 'Cole o token recebido por e-mail e defina a nova senha.'}
            </p>

            {etapa === 'email' ? (
                <form onSubmit={handleSolicitar} style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <label style={estiloLabel}>E-mail</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={estiloInput} />

                    <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
                        <button type="button" onClick={onVoltar} style={{ flex: 1, background: '#e2e8f0', border: 'none', padding: '0.7rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>
                            Voltar
                        </button>
                        <button type="submit" disabled={carregando} style={{ flex: 1, background: '#2563eb', color: '#fff', border: 'none', padding: '0.7rem', borderRadius: '6px', cursor: carregando ? 'wait' : 'pointer', fontWeight: '600' }}>
                            {carregando ? 'Enviando...' : 'Enviar'}
                        </button>
                    </div>
                </form>
            ) : (
                <form onSubmit={handleRedefinir} style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <label style={estiloLabel}>Token de recuperação</label>
                    <input type="text" value={token} onChange={(e) => setToken(e.target.value)} required style={estiloInput} placeholder="Cole o token recebido por e-mail" />

                    <label style={estiloLabel}>Nova senha</label>
                    <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required style={estiloInput} />
                    <p style={{ fontSize: '0.78rem', color: erros.length > 0 && novaSenha ? '#dc2626' : '#64748b', margin: '0 0 1rem 0' }}>
                        Mínimo 8 caracteres, 1 maiúscula e 1 número.
                    </p>

                    <label style={estiloLabel}>Confirmar nova senha</label>
                    <input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} required style={estiloInput} />

                    <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
                        <button type="button" onClick={() => setEtapa('email')} style={{ flex: 1, background: '#e2e8f0', border: 'none', padding: '0.7rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>
                            Voltar
                        </button>
                        <button type="submit" disabled={carregando} style={{ flex: 1, background: '#2563eb', color: '#fff', border: 'none', padding: '0.7rem', borderRadius: '6px', cursor: carregando ? 'wait' : 'pointer', fontWeight: '600' }}>
                            {carregando ? 'Salvando...' : 'Redefinir'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

const estiloLabel = { display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px' };
const estiloInput = { width: '100%', padding: '0.6rem', marginBottom: '1rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' };
