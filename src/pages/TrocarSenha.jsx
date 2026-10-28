// src/pages/TrocarSenha.jsx
import React, { useState } from 'react';
import * as authService from '../services/auth';
import { ApiError } from '../services/api';
import Swal from 'sweetalert2';
import { useLoading } from '../context/LoadingContext';

export function TrocarSenha({ onVoltar }) {
    const [senhaAtual, setSenhaAtual] = useState('');
    const [novaSenha, setNovaSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [carregando, setCarregando] = useState(false);
    const { mostrarLoading, esconderLoading } = useLoading();

    const erros = authService.validarForcaSenha(novaSenha);

    const handleSubmit = async (e) => {
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
            Swal.fire({
                icon: 'warning',
                title: 'Senhas não conferem',
                text: 'A confirmação precisa ser igual à nova senha.',
                confirmButtonColor: '#2563eb'
            });
            return;
        }

        setCarregando(true);
        mostrarLoading('Atualizando senha...', 'Salvando nova senha de acesso');
        try {
            await authService.trocarSenha(senhaAtual, novaSenha);
            Swal.fire({
                icon: 'success',
                title: 'Senha alterada!',
                text: 'Sua senha foi atualizada com sucesso.',
                timer: 2000,
                showConfirmButton: false
            });
            setSenhaAtual('');
            setNovaSenha('');
            setConfirmarSenha('');
            onVoltar();
        } catch (err) {
            const mensagem = err instanceof ApiError ? err.message : 'Não foi possível trocar a senha.';
            Swal.fire({ icon: 'error', title: 'Erro', text: mensagem, confirmButtonColor: '#2563eb' });
        } finally {
            setCarregando(false);
            esconderLoading();
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '420px', margin: '0 auto' }}>
            <h2 style={{ color: '#1e293b', marginBottom: '0.3rem' }}>Trocar Senha</h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                Por segurança, sua senha expira automaticamente a cada 6 meses.
            </p>

            <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={estiloLabel}>Senha atual</label>
                <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} required style={estiloInput} />

                <label style={estiloLabel}>Nova senha</label>
                <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required style={estiloInput} />
                <p style={{ fontSize: '0.78rem', color: erros.length > 0 && novaSenha ? '#dc2626' : '#64748b', margin: '0 0 1rem 0' }}>
                    Mínimo 8 caracteres, 1 maiúscula e 1 número.
                </p>

                <label style={estiloLabel}>Confirmar nova senha</label>
                <input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} required style={estiloInput} />

                <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={onVoltar} style={{ flex: 1, background: '#e2e8f0', border: 'none', padding: '0.7rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>
                        Cancelar
                    </button>
                    <button type="submit" disabled={carregando} style={{ flex: 1, background: '#0b4383', color: '#fff', border: 'none', padding: '0.7rem', borderRadius: '6px', cursor: carregando ? 'wait' : 'pointer', fontWeight: '600' }}>
                        {carregando ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </form>
        </div>
    );
}

const estiloLabel = { display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px' };
const estiloInput = { width: '100%', padding: '0.6rem', marginBottom: '1rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' };
