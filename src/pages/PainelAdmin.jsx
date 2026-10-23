// src/pages/PainelAdmin.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    listarUsuarios,
    criarUsuario,
    atualizarUsuario,
    removerUsuario,
    ativarUsuario,
    desativarUsuario,
    atualizarRoleUsuario
} from '../services/usuarios';
import { importarAcoes, listarAcoes, atualizarAcao, removerAcao } from '../services/acoes';
import { ApiError } from '../services/api';
import { labelRole } from '../services/permissoes';
import { SETORES_RADAR } from '../services/progresso';
import Swal from 'sweetalert2';
import { RadarLoader } from '../components/RadarLoader';

const ROLES = ['USUARIO', 'ADMIN_SETOR', 'COMITE', 'ADMIN_GERAL'];
const PRAZOS = [
    { valor: 'CURTO_PRAZO', rotulo: 'Curto Prazo' },
    { valor: 'MEDIO_PRAZO', rotulo: 'Médio Prazo' },
    { valor: 'LONGO_PRAZO', rotulo: 'Longo Prazo' }
];

const formVazio = { email: '', role: 'USUARIO', setor: '' };
const acaoVazia = {
    id: '',
    diretriz: '',
    prazo: 'CURTO_PRAZO',
    meta: '',
    indicador: '',
    linhaPlanilha: '',
    og: '',
    lae: '',
    setor: '',
    responsavel: '',
    restricoes: ''
};

export function PainelAdmin({ usuarioLogado }) {
    const [pagina, setPagina] = useState('usuarios');
    const [usuarios, setUsuarios] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [form, setForm] = useState(formVazio);
    const [busca, setBusca] = useState('');
    const [mostrarFormAcoes, setMostrarFormAcoes] = useState(false);
    const [acoesForm, setAcoesForm] = useState([{ ...acaoVazia }]);
    const [enviandoAcoes, setEnviandoAcoes] = useState(false);
    const [acoes, setAcoes] = useState([]);
    const [carregandoAcoes, setCarregandoAcoes] = useState(false);
    const [buscaAcao, setBuscaAcao] = useState('');
    const [acaoEditando, setAcaoEditando] = useState(null);
    const [salvandoAcao, setSalvandoAcao] = useState(false);
    const ehAdminGeral = usuarioLogado?.role === 'ADMIN_GERAL';

    const carregarUsuarios = useCallback(async () => {
        setCarregando(true);
        try {
            const dados = await listarUsuarios(busca);
            setUsuarios(Array.isArray(dados) ? dados : []);
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : 'Erro ao carregar usuários.';
            Swal.fire({ icon: 'error', title: 'Erro', text: msg, confirmButtonColor: '#2563eb' });
        } finally {
            setCarregando(false);
        }
    }, [busca]);

    useEffect(() => {
        carregarUsuarios();
    }, [carregarUsuarios]);

    const carregarAcoes = useCallback(async () => {
        setCarregandoAcoes(true);
        try {
            const dados = await listarAcoes();
            setAcoes(Array.isArray(dados) ? dados : []);
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : 'Erro ao carregar ações.';
            Swal.fire({ icon: 'error', title: 'Erro', text: msg, confirmButtonColor: '#2563eb' });
        } finally {
            setCarregandoAcoes(false);
        }
    }, []);

    useEffect(() => {
        if (pagina === 'editar-dashboard') carregarAcoes();
    }, [pagina, carregarAcoes]);

    const handleCriarUsuario = async (e) => {
        e.preventDefault();
        if (!form.email) {
            Swal.fire({ icon: 'warning', title: 'Campo obrigatório', text: 'Informe o e-mail institucional.', confirmButtonColor: '#2563eb' });
            return;
        }
        setEnviando(true);
        try {
            const usuarioCriado = await criarUsuario({
                email: form.email.trim().toLowerCase(),
                role: form.role,
                setor: form.setor ? form.setor.trim() : undefined
            });

            const linkDefinicao = usuarioCriado?.resetToken
                ? `${window.location.origin}/?token=${usuarioCriado.resetToken}#definir-senha`
                : null;

            if (linkDefinicao) {
                Swal.fire({
                    icon: 'success',
                    title: 'Convite Gerado!',
                    html: `
                        <p style="font-size:0.95rem; color:#475569; margin-bottom:1rem;">
                            O usuário <strong>${form.email}</strong> foi cadastrado. Um link para criação de senha foi gerado.
                        </p>
                        <div style="background:#f1f5f9; padding:0.75rem; border-radius:8px; font-size:0.8rem; word-break:break-all; text-align:left; color:#1e293b; border:1px solid #cbd5e1; margin-bottom:0.75rem;">
                            <strong>Link de ativação:</strong><br/>
                            <a href="${linkDefinicao}" target="_blank" style="color:#2563eb;">${linkDefinicao}</a>
                        </div>
                        <p style="font-size:0.8rem; color:#64748b; margin:0;">
                            Você pode copiar o link acima ou o usuário poderá acessar diretamente pelo e-mail.
                        </p>
                    `,
                    confirmButtonText: 'Copiar Link e Fechar',
                    confirmButtonColor: '#2563eb',
                    showCancelButton: true,
                    cancelButtonText: 'Fechar',
                    cancelButtonColor: '#64748b',
                    preConfirm: () => {
                        navigator.clipboard?.writeText(linkDefinicao);
                    }
                }).then((res) => {
                    if (res.isConfirmed) {
                        Swal.fire({ icon: 'success', title: 'Link copiado!', timer: 1200, showConfirmButton: false });
                    }
                });
            } else {
                Swal.fire({
                    icon: 'success',
                    title: 'Usuário cadastrado!',
                    text: `O link para cadastrar a senha foi enviado para ${form.email}.`,
                    confirmButtonColor: '#2563eb'
                });
            }

            setForm(formVazio);
            setMostrarForm(false);
            carregarUsuarios();
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : 'Erro ao criar usuário.';
            Swal.fire({ icon: 'error', title: 'Erro', text: msg, confirmButtonColor: '#2563eb' });
        } finally {
            setEnviando(false);
        }
    };

    const handleRemover = async (usuario) => {
        if (usuario.id === usuarioLogado?.id) {
            Swal.fire({ icon: 'error', title: 'Ação não permitida', text: 'Você não pode remover sua própria conta.', confirmButtonColor: '#2563eb' });
            return;
        }
        const result = await Swal.fire({
            title: 'Remover usuário?',
            text: `Deseja revogar o acesso de ${usuario.email}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sim, remover',
            cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) return;
        try {
            await removerUsuario(usuario.id);
            Swal.fire({ icon: 'success', title: 'Removido!', timer: 1500, showConfirmButton: false });
            carregarUsuarios();
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : 'Erro ao remover usuário.';
            Swal.fire({ icon: 'error', title: 'Erro', text: msg, confirmButtonColor: '#2563eb' });
        }
    };

    const handleToggleAtivo = async (usuario) => {
        if (usuario.id === usuarioLogado?.id) {
            Swal.fire({ icon: 'error', title: 'Ação não permitida', text: 'Você não pode desativar sua própria conta.', confirmButtonColor: '#2563eb' });
            return;
        }
        try {
            if (usuario.ativo) {
                await desativarUsuario(usuario.id);
            } else {
                await ativarUsuario(usuario.id);
            }
            carregarUsuarios();
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : 'Erro ao alterar status do usuário.';
            Swal.fire({ icon: 'error', title: 'Erro', text: msg, confirmButtonColor: '#2563eb' });
        }
    };

    const handleAlterarRole = async (usuario, novaRole) => {
        if (usuario.id === usuarioLogado?.id) {
            Swal.fire({ icon: 'error', title: 'Ação não permitida', text: 'Você não pode alterar sua própria role.', confirmButtonColor: '#2563eb' });
            return;
        }
        try {
            await atualizarRoleUsuario(usuario.id, novaRole);
            carregarUsuarios();
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : 'Erro ao alterar role.';
            Swal.fire({ icon: 'error', title: 'Erro', text: msg, confirmButtonColor: '#2563eb' });
        }
    };

    const handleAlterarSetorUsuario = async (usuario, setor) => {
        if (!setor && (usuario.role === 'USUARIO' || usuario.role === 'ADMIN_SETOR')) {
            Swal.fire({
                icon: 'warning',
                title: 'Setor obrigatório',
                text: 'Usuários e Admins do Setor precisam permanecer vinculados a um setor.',
                confirmButtonColor: '#2563eb'
            });
            return;
        }
        try {
            await atualizarUsuario(usuario.id, { setor: setor || null });
            await carregarUsuarios();
            Swal.fire({ icon: 'success', title: 'Setor atualizado!', timer: 1300, showConfirmButton: false });
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : 'Erro ao alterar setor do usuário.';
            Swal.fire({ icon: 'error', title: 'Erro', text: msg, confirmButtonColor: '#2563eb' });
        }
    };

    const podeGerenciarUsuario = (usuario) => (
        usuario.id !== usuarioLogado?.id &&
        !(usuarioLogado?.role === 'ADMIN_SETOR' && usuario.role === 'ADMIN_GERAL')
    );

    const atualizarAcaoForm = (indice, campo, valor) => {
        setAcoesForm(linhas => linhas.map((linha, index) => (
            index === indice ? { ...linha, [campo]: valor } : linha
        )));
    };

    const adicionarLinhaAcao = () => {
        setAcoesForm(linhas => [...linhas, { ...acaoVazia }]);
    };

    const removerLinhaAcao = (indice) => {
        setAcoesForm(linhas => linhas.length === 1 ? linhas : linhas.filter((_, index) => index !== indice));
    };

    const handleImportarAcoes = async (e) => {
        e.preventDefault();
        const camposObrigatorios = ['id', 'diretriz', 'meta', 'indicador', 'linhaPlanilha'];
        const acaoInvalida = acoesForm.find(linha => (
            camposObrigatorios.some(campo => !String(linha[campo]).trim()) ||
            !Number.isInteger(Number(linha.linhaPlanilha))
        ));

        if (acaoInvalida) {
            Swal.fire({ icon: 'warning', title: 'Dados incompletos', text: 'Preencha ID, diretriz, meta, indicador e uma linha de planilha inteira para cada ação.', confirmButtonColor: '#2563eb' });
            return;
        }

        setEnviandoAcoes(true);
        try {
            const resultado = await importarAcoes(acoesForm.map(linha => {
                const acao = { ...linha, linhaPlanilha: Number(linha.linhaPlanilha) };
                Object.keys(acao).forEach(campo => {
                    if (typeof acao[campo] === 'string') acao[campo] = acao[campo].trim();
                    if (acao[campo] === '') delete acao[campo];
                });
                return acao;
            }));

            if (resultado.erro > 0) {
                Swal.fire({
                    icon: resultado.sucesso > 0 ? 'warning' : 'error',
                    title: resultado.sucesso > 0 ? 'Importação parcial' : 'Nenhuma ação adicionada',
                    text: `${resultado.sucesso} adicionada(s) e ${resultado.erro} com erro. ${resultado.erros?.join(' ') || ''}`,
                    confirmButtonColor: '#2563eb'
                });
            } else {
                Swal.fire({ icon: 'success', title: 'Ações adicionadas!', text: `${resultado.sucesso} ação(ões) adicionada(s) com sucesso.`, timer: 2000, showConfirmButton: false });
            }

            if (resultado.sucesso > 0) {
                setAcoesForm([{ ...acaoVazia }]);
                setMostrarFormAcoes(false);
                setPagina('editar-dashboard');
            }
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : 'Erro ao adicionar ações.';
            Swal.fire({ icon: 'error', title: 'Erro', text: msg, confirmButtonColor: '#2563eb' });
        } finally {
            setEnviandoAcoes(false);
        }
    };

    const handleSalvarAcao = async (e) => {
        e.preventDefault();
        if (!acaoEditando) return;
        if (ehAdminGeral && (
            !acaoEditando.diretriz?.trim() ||
            !acaoEditando.meta?.trim() ||
            !acaoEditando.indicador?.trim() ||
            !Number.isInteger(Number(acaoEditando.linhaPlanilha)) ||
            Number(acaoEditando.linhaPlanilha) < 1
        )) {
            Swal.fire({
                icon: 'warning',
                title: 'Dados incompletos',
                text: 'Diretriz, meta, indicador e uma linha de planilha inteira maior que zero são obrigatórios.',
                confirmButtonColor: '#2563eb'
            });
            return;
        }

        setSalvandoAcao(true);
        try {
            const dados = ehAdminGeral
                ? {
                    og: acaoEditando.og || '',
                    lae: acaoEditando.lae || '',
                    diretriz: acaoEditando.diretriz,
                    prazo: acaoEditando.prazo,
                    setor: acaoEditando.setor || '',
                    meta: acaoEditando.meta,
                    indicador: acaoEditando.indicador,
                    restricoes: acaoEditando.restricoes || '',
                    linhaPlanilha: Number(acaoEditando.linhaPlanilha),
                    responsavel: acaoEditando.responsavel || ''
                }
                : { setor: acaoEditando.setor || '' };
            await atualizarAcao(acaoEditando.id, dados);
            setAcaoEditando(null);
            await carregarAcoes();
            Swal.fire({ icon: 'success', title: 'Ação atualizada!', timer: 1600, showConfirmButton: false });
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : 'Erro ao atualizar ação.';
            Swal.fire({ icon: 'error', title: 'Erro', text: msg, confirmButtonColor: '#2563eb' });
        } finally {
            setSalvandoAcao(false);
        }
    };

    const handleRemoverAcao = async (acao) => {
        const resultado = await Swal.fire({
            title: 'Excluir ação?',
            text: `A ação ${acao.id} será removida. Ações vinculadas a matrizes não podem ser excluídas.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Excluir',
            cancelButtonText: 'Cancelar'
        });
        if (!resultado.isConfirmed) return;

        try {
            await removerAcao(acao.id);
            await carregarAcoes();
            Swal.fire({ icon: 'success', title: 'Ação excluída!', timer: 1500, showConfirmButton: false });
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : 'Erro ao excluir ação.';
            Swal.fire({ icon: 'error', title: 'Erro', text: msg, confirmButtonColor: '#2563eb' });
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ color: '#1e293b', margin: 0 }}>Painel do Administrador</h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Gerencie usuários e os dados exibidos nos dashboards do Radar 2030.</p>
            </div>

            <nav aria-label="Seções do painel administrativo" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                <BotaoPagina ativo={pagina === 'usuarios'} onClick={() => setPagina('usuarios')}>Usuários</BotaoPagina>
                {ehAdminGeral && (
                    <BotaoPagina ativo={pagina === 'adicionar-acoes'} onClick={() => { setPagina('adicionar-acoes'); setMostrarFormAcoes(true); }}>Adicionar ações</BotaoPagina>
                )}
                <BotaoPagina ativo={pagina === 'editar-dashboard'} onClick={() => setPagina('editar-dashboard')}>Editar dados do dashboard</BotaoPagina>
            </nav>

            {/* Seção de Usuários */}
            {pagina === 'usuarios' && <div style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <h3 style={{ color: '#334155', margin: 0 }}>Usuários Cadastrados</h3>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            placeholder="Buscar por e-mail..."
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            style={{ padding: '0.5rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', minWidth: '200px' }}
                        />
                        <button
                            onClick={() => setMostrarForm(v => !v)}
                            style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                        >
                            {mostrarForm ? 'Cancelar' : '+ Novo Usuário'}
                        </button>
                    </div>
                </div>

                {/* Formulário de criação */}
                {mostrarForm && (
                    <form onSubmit={handleCriarUsuario} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.5rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <label style={estiloLabel}>E-mail institucional *</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                placeholder="usuario@cetran.pa.gov.br"
                                required
                                style={estiloInput}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <label style={estiloLabel}>Perfil (Role) *</label>
                            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={estiloInput}>
                                {ROLES.map(r => <option key={r} value={r}>{labelRole(r)}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <label style={estiloLabel}>Setor {form.role === 'USUARIO' || form.role === 'ADMIN_SETOR' ? '*' : '(opcional)'}</label>
                            <select
                                value={form.setor}
                                onChange={e => setForm(f => ({ ...f, setor: e.target.value }))}
                                required={form.role === 'USUARIO' || form.role === 'ADMIN_SETOR'}
                                style={estiloInput}
                            >
                                <option value="">Selecione um setor</option>
                                {SETORES_RADAR.map(setor => <option key={setor.chave} value={setor.chave}>{setor.rotulo}</option>)}
                            </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#1e40af' }}>
                            <i className="bi bi-info-circle-fill"></i>
                            <span>O usuário receberá um link seguro para cadastrar e confirmar sua própria senha no primeiro acesso.</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gridColumn: '1 / -1', marginTop: '0.25rem' }}>
                            <button
                                type="submit"
                                disabled={enviando}
                                style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '0.65rem 1.5rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                            >
                                <i className="bi bi-send-fill"></i>
                                {enviando ? 'Cadastrando...' : 'Enviar Convite e Cadastrar'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Tabela de usuários */}
                <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    {carregando ? (
                        <div style={{ padding: '3.5rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
                            <RadarLoader
                                tamanho="md"
                                mensagem="Carregando usuários..."
                                submensagem="Consultando perfis de acesso e permissões"
                            />
                        </div>
                    ) : usuarios.length === 0 ? (
                        <p style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Nenhum usuário encontrado.</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                                    <th style={{ padding: '12px' }}>E-mail</th>
                                    <th style={{ padding: '12px' }}>Perfil</th>
                                    <th style={{ padding: '12px' }}>Setor</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuarios.map(u => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: u.ativo ? 1 : 0.5 }}>
                                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#1e293b' }}>{u.email}</td>
                                        <td style={{ padding: '12px' }}>
                                            {u.id === usuarioLogado?.id || !ehAdminGeral ? (
                                                <span style={estiloBadgeRole(u.role)}>{labelRole(u.role)}</span>
                                            ) : (
                                                <select
                                                    value={u.role}
                                                    onChange={e => handleAlterarRole(u, e.target.value)}
                                                    style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 'bold', ...corRole(u.role) }}
                                                >
                                                    {ROLES.map(r => <option key={r} value={r}>{labelRole(r)}</option>)}
                                                </select>
                                            )}
                                        </td>
                                        <td style={{ padding: '8px 12px', minWidth: '190px' }}>
                                            <select
                                                aria-label={`Setor de ${u.email}`}
                                                value={u.setor || ''}
                                                onChange={e => handleAlterarSetorUsuario(u, e.target.value)}
                                                style={{ ...estiloInput, padding: '0.4rem 0.5rem', minWidth: '180px' }}
                                            >
                                                <option value="" disabled={u.role === 'USUARIO' || u.role === 'ADMIN_SETOR'}>Sem setor</option>
                                                {u.setor && !SETORES_RADAR.some(setor => setor.chave === u.setor) && (
                                                    <option value={u.setor}>{u.setor} (atual)</option>
                                                )}
                                                {SETORES_RADAR.map(setor => <option key={setor.chave} value={setor.chave}>{setor.rotulo}</option>)}
                                            </select>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, background: u.ativo ? '#dcfce7' : '#fee2e2', color: u.ativo ? '#166534' : '#991b1b' }}>
                                                {u.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                            {podeGerenciarUsuario(u) && (
                                                <>
                                                    <button
                                                        onClick={() => handleToggleAtivo(u)}
                                                        style={{ background: 'transparent', border: '1px solid #cbd5e1', color: u.ativo ? '#d97706' : '#16a34a', cursor: 'pointer', borderRadius: '6px', padding: '4px 10px', fontSize: '0.82rem', fontWeight: 600 }}
                                                    >
                                                        {u.ativo ? 'Desativar' : 'Ativar'}
                                                    </button>
                                                    {ehAdminGeral && (
                                                        <button
                                                            onClick={() => handleRemover(u)}
                                                            style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                                                        >
                                                            Remover
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>}

            {/* Seção de Ações Estratégicas Base */}
            {pagina === 'adicionar-acoes' && ehAdminGeral && <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '1rem' }}>
                    <h3 style={{ color: '#334155', margin: 0 }}>Adicionar ações estratégicas</h3>
                    <button
                        type="button"
                        onClick={() => setMostrarFormAcoes(v => !v)}
                        style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        {mostrarFormAcoes ? 'Fechar formulário' : '+ Adicionar ações'}
                    </button>
                </div>

                {mostrarFormAcoes && (
                    <form onSubmit={handleImportarAcoes} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
                        <p style={{ color: '#475569', fontSize: '0.9rem', marginTop: 0 }}>Adicione uma ou várias ações de uma vez. Os campos com * são obrigatórios.</p>
                        {acoesForm.map((linha, indice) => (
                            <div key={indice} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', padding: '1rem 0', borderTop: '1px solid #e2e8f0' }}>
                                <CampoAcao label="ID *" value={linha.id} onChange={valor => atualizarAcaoForm(indice, 'id', valor)} placeholder="AE 1.1.1.1" />
                                <CampoAcao label="Linha da planilha *" type="number" value={linha.linhaPlanilha} onChange={valor => atualizarAcaoForm(indice, 'linhaPlanilha', valor)} />
                                <CampoAcao label="Diretriz *" value={linha.diretriz} onChange={valor => atualizarAcaoForm(indice, 'diretriz', valor)} />
                                <CampoAcao label="Meta *" value={linha.meta} onChange={valor => atualizarAcaoForm(indice, 'meta', valor)} />
                                <CampoAcao label="Indicador *" value={linha.indicador} onChange={valor => atualizarAcaoForm(indice, 'indicador', valor)} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={estiloLabel}>Prazo *</label>
                                    <select value={linha.prazo} onChange={e => atualizarAcaoForm(indice, 'prazo', e.target.value)} style={estiloInput}>
                                        {PRAZOS.map(prazo => <option key={prazo.valor} value={prazo.valor}>{prazo.rotulo}</option>)}
                                    </select>
                                </div>
                                <CampoAcao label="OG" value={linha.og} onChange={valor => atualizarAcaoForm(indice, 'og', valor)} />
                                <CampoAcao label="LAE" value={linha.lae} onChange={valor => atualizarAcaoForm(indice, 'lae', valor)} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={estiloLabel}>Setor</label>
                                    <select value={linha.setor} onChange={e => atualizarAcaoForm(indice, 'setor', e.target.value)} style={estiloInput}>
                                        <option value="">Selecione um setor</option>
                                        {SETORES_RADAR.map(setor => <option key={setor.chave} value={setor.chave}>{setor.rotulo}</option>)}
                                    </select>
                                </div>
                                <CampoAcao label="Responsável" value={linha.responsavel} onChange={valor => atualizarAcaoForm(indice, 'responsavel', valor)} />
                                <CampoAcao label="Restrições" value={linha.restricoes} onChange={valor => atualizarAcaoForm(indice, 'restricoes', valor)} />
                                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                    <button type="button" onClick={() => removerLinhaAcao(indice)} disabled={acoesForm.length === 1} style={{ color: '#dc2626', background: '#fff', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.55rem 0.8rem', cursor: acoesForm.length === 1 ? 'not-allowed' : 'pointer' }}>
                                        Remover linha
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button type="button" onClick={adicionarLinhaAcao} style={{ background: '#fff', color: '#2563eb', border: '1px solid #93c5fd', padding: '0.55rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                                + Outra ação
                            </button>
                            <button type="submit" disabled={enviandoAcoes} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '0.55rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: enviandoAcoes ? 'wait' : 'pointer' }}>
                                {enviandoAcoes ? 'Adicionando...' : 'Adicionar ações'}
                            </button>
                        </div>
                    </form>
                )}

            </div>}

            {pagina === 'editar-dashboard' && <section>
                <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ color: '#334155', margin: 0 }}>Editar dados do dashboard</h3>
                    <p style={{ color: '#64748b', margin: '0.35rem 0 0' }}>
                        {ehAdminGeral
                            ? 'Edite os dados das ações estratégicas. Somente Admin Geral pode excluir ações.'
                            : 'Admin do Setor pode alterar o setor de qualquer ação.'}
                    </p>
                </div>

                <input
                    type="search"
                    value={buscaAcao}
                    onChange={e => setBuscaAcao(e.target.value)}
                    placeholder="Buscar ação por ID, diretriz ou setor..."
                    aria-label="Buscar ações"
                    style={{ ...estiloInput, maxWidth: '420px', marginBottom: '1rem' }}
                />

                {acaoEditando && (
                    <form onSubmit={handleSalvarAcao} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <h4 style={{ color: '#1e293b', margin: 0 }}>Editando {acaoEditando.id}</h4>
                            <button type="button" onClick={() => setAcaoEditando(null)} style={botaoSecundario}>Cancelar</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={estiloLabel}>Setor</label>
                                <select
                                    value={acaoEditando.setor || ''}
                                    onChange={e => setAcaoEditando(acao => ({ ...acao, setor: e.target.value }))}
                                    style={estiloInput}
                                >
                                    <option value="">Sem setor</option>
                                    {acaoEditando.setor && !SETORES_RADAR.some(setor => setor.chave === acaoEditando.setor) && (
                                        <option value={acaoEditando.setor}>{acaoEditando.setor} (atual)</option>
                                    )}
                                    {SETORES_RADAR.map(setor => <option key={setor.chave} value={setor.chave}>{setor.rotulo}</option>)}
                                </select>
                            </div>
                            {ehAdminGeral && (
                                <>
                                    <CampoAcao label="OG" value={acaoEditando.og || ''} onChange={valor => setAcaoEditando(acao => ({ ...acao, og: valor }))} />
                                    <CampoAcao label="LAE" value={acaoEditando.lae || ''} onChange={valor => setAcaoEditando(acao => ({ ...acao, lae: valor }))} />
                                    <CampoAcao label="Diretriz" value={acaoEditando.diretriz || ''} onChange={valor => setAcaoEditando(acao => ({ ...acao, diretriz: valor }))} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        <label style={estiloLabel}>Prazo</label>
                                        <select value={acaoEditando.prazo} onChange={e => setAcaoEditando(acao => ({ ...acao, prazo: e.target.value }))} style={estiloInput}>
                                            {PRAZOS.map(prazo => <option key={prazo.valor} value={prazo.valor}>{prazo.rotulo}</option>)}
                                        </select>
                                    </div>
                                    <CampoAcao label="Meta" value={acaoEditando.meta || ''} onChange={valor => setAcaoEditando(acao => ({ ...acao, meta: valor }))} />
                                    <CampoAcao label="Indicador" value={acaoEditando.indicador || ''} onChange={valor => setAcaoEditando(acao => ({ ...acao, indicador: valor }))} />
                                    <CampoAcao label="Linha da planilha" type="number" value={acaoEditando.linhaPlanilha ?? ''} onChange={valor => setAcaoEditando(acao => ({ ...acao, linhaPlanilha: valor }))} />
                                    <CampoAcao label="Responsável" value={acaoEditando.responsavel || ''} onChange={valor => setAcaoEditando(acao => ({ ...acao, responsavel: valor }))} />
                                    <CampoAcao label="Restrições" value={acaoEditando.restricoes || ''} onChange={valor => setAcaoEditando(acao => ({ ...acao, restricoes: valor }))} />
                                </>
                            )}
                        </div>
                        <button type="submit" disabled={salvandoAcao} style={{ ...botaoPrimario, marginTop: '1rem' }}>
                            {salvandoAcao ? 'Salvando...' : 'Salvar alterações'}
                        </button>
                    </form>
                )}

                <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    {carregandoAcoes ? (
                        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
                            <RadarLoader tamanho="md" mensagem="Carregando ações..." submensagem="Consultando dados do dashboard" />
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                                    <th style={{ padding: '12px' }}>ID</th>
                                    <th style={{ padding: '12px' }}>Diretriz</th>
                                    <th style={{ padding: '12px' }}>Setor</th>
                                    <th style={{ padding: '12px' }}>Prazo</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {acoes
                                    .filter(acao => `${acao.id} ${acao.diretriz} ${acao.setor || ''}`.toLowerCase().includes(buscaAcao.toLowerCase()))
                                    .map(acao => (
                                        <tr key={acao.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px', fontWeight: 700, color: '#2563eb', whiteSpace: 'nowrap' }}>{acao.id}</td>
                                            <td style={{ padding: '12px', color: '#1e293b', minWidth: '250px' }}>{acao.diretriz}</td>
                                            <td style={{ padding: '12px', fontWeight: 500, whiteSpace: 'nowrap' }}>{acao.setor || '—'}</td>
                                            <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>{acao.prazo}</td>
                                            <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                <button type="button" onClick={() => setAcaoEditando({ ...acao })} style={botaoSecundario}>Editar</button>
                                                {ehAdminGeral && (
                                                    <button type="button" onClick={() => handleRemoverAcao(acao)} style={{ ...botaoSecundario, color: '#dc2626', borderColor: '#fecaca', marginLeft: '0.4rem' }}>Excluir</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                {acoes.length === 0 && (
                                    <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Nenhuma ação encontrada.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>}
        </div>
    );
}

function CampoAcao({ label, type = 'text', value, onChange, placeholder }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={estiloLabel}>{label}</label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={estiloInput} />
        </div>
    );
}

const estiloLabel = { fontSize: '0.82rem', fontWeight: 600, color: '#475569' };
const estiloInput = { padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' };
const botaoPrimario = { background: '#2563eb', color: '#fff', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' };
const botaoSecundario = { background: '#fff', color: '#334155', border: '1px solid #cbd5e1', padding: '0.45rem 0.75rem', borderRadius: '7px', fontWeight: 600, cursor: 'pointer' };

function BotaoPagina({ ativo, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={ativo}
            style={{
                background: ativo ? '#2563eb' : '#fff',
                color: ativo ? '#fff' : '#334155',
                border: `1px solid ${ativo ? '#2563eb' : '#cbd5e1'}`,
                padding: '0.55rem 0.9rem',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer'
            }}
        >
            {children}
        </button>
    );
}

function corRole(role) {
    if (role === 'ADMIN_GERAL' || role === 'ADMIN_SETOR') return { background: '#ede9fe', color: '#7c3aed' };
    if (role === 'COMITE') return { background: '#fef3c7', color: '#d97706' };
    return { background: '#e0f2fe', color: '#0284c7' };
}

function estiloBadgeRole(role) {
    return {
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        display: 'inline-block',
        ...corRole(role)
    };
}