import React, { useState } from 'react';
import { api, ApiError } from '../services/api';

export function SuporteTecnico({ onVoltar }) {
    const [nome, setNome] = useState('');
    const [tipoProblema, setTipoProblema] = useState('Acesso');
    const [descricao, setDescricao] = useState('');
    const [email, setEmail] = useState('');
    const [telefone, setTelefone] = useState('');
    const [enviado, setEnviado] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!nome.trim() || !email.trim() || !telefone.trim() || !descricao.trim()) return;
        setEnviando(true);
        setErro('');
        setEnviado(false);
        try {
            await api.post('/suporte', {
                nome: nome.trim(),
                email: email.trim(),
                telefone: telefone.trim(),
                tipoProblema,
                descricao: descricao.trim(),
            }, { autenticado: false, semToken: true });
            setEnviado(true);
            setNome('');
            setEmail('');
            setTelefone('');
            setDescricao('');
        } catch (error) {
            setErro(error instanceof ApiError ? error.message : 'Não foi possível enviar a solicitação.');
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1120px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <div>
                    <p style={{ margin: 0, color: '#2563eb', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Central de atendimento</p>
                    <h1 style={{ margin: '0.45rem 0 0', color: '#0f172a', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)' }}>Suporte técnico</h1>
                    <p style={{ margin: '0.75rem 0 0', color: '#64748b', lineHeight: 1.7, maxWidth: '680px' }}>
                        Encontre orientações para usar o SAEP ou registre uma dificuldade encontrada durante o acesso e o preenchimento das matrizes.
                    </p>
                </div>
                <button type="button" onClick={onVoltar} style={estiloBotaoSecundario}>
                    <i className="bi bi-arrow-left" aria-hidden="true" />
                    Voltar
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={estiloCard}>
                    <i className="bi bi-person-lock" style={estiloIcone('#2563eb')} aria-hidden="true" />
                    <h2 style={estiloTituloCard}>Problemas de acesso</h2>
                    <p style={estiloTexto}>Confira se seu e-mail está correto e se a senha foi digitada respeitando letras maiúsculas e minúsculas.</p>
                </div>
                <div style={estiloCard}>
                    <i className="bi bi-file-earmark-text" style={estiloIcone('#0f766e')} aria-hidden="true" />
                    <h2 style={estiloTituloCard}>Matrizes 5W2H</h2>
                    <p style={estiloTexto}>Use a área de rascunhos para continuar uma matriz salva e envie-a ao Comitê somente após revisar os campos.</p>
                </div>
                <div style={estiloCard}>
                    <i className="bi bi-arrow-clockwise" style={estiloIcone('#d97706')} aria-hidden="true" />
                    <h2 style={estiloTituloCard}>A página não responde?</h2>
                    <p style={estiloTexto}>Atualize a página, confirme sua conexão e tente novamente. Se o problema persistir, registre os detalhes abaixo.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(260px, 0.8fr)', gap: '1.5rem', alignItems: 'start' }} className="suporte-grid">
                <form onSubmit={handleSubmit} style={estiloCard}>
                    <h2 style={{ ...estiloTituloCard, fontSize: '1.2rem' }}>Solicitação de suporte</h2>
                    <p style={{ ...estiloTexto, marginBottom: '1.25rem' }}>Preencha seus dados e descreva o problema para que nossa equipe possa retornar.</p>

                    <label htmlFor="nome-suporte" style={estiloLabel}>Nome</label>
                    <input id="nome-suporte" type="text" value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Seu nome completo" required style={estiloInput} />

                    <label htmlFor="email-suporte" style={estiloLabel}>E-mail</label>
                    <input id="email-suporte" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu.email@exemplo.com" required style={estiloInput} />

                    <label htmlFor="telefone-suporte" style={estiloLabel}>Telefone</label>
                    <input id="telefone-suporte" type="tel" value={telefone} onChange={(event) => setTelefone(event.target.value)} placeholder="(00) 00000-0000" required style={estiloInput} />

                    <label htmlFor="tipo-problema" style={estiloLabel}>Tipo de problema</label>
                    <select id="tipo-problema" value={tipoProblema} onChange={(event) => setTipoProblema(event.target.value)} required style={estiloInput}>
                        <option>Acesso</option>
                        <option>Cadastro de matriz</option>
                        <option>Andamento ou etapas</option>
                        <option>Comitê</option>
                        <option>Outro</option>
                    </select>

                    <label htmlFor="descricao-problema" style={estiloLabel}>Descrição</label>
                    <textarea
                        id="descricao-problema"
                        value={descricao}
                        onChange={(event) => { setDescricao(event.target.value); setEnviado(false); }}
                        placeholder="Ex.: não consigo salvar a matriz depois de preencher o campo..."
                        rows="6"
                        required
                        style={{ ...estiloInput, resize: 'vertical', minHeight: '140px' }}
                    />

                    <button type="submit" disabled={enviando} style={{ ...estiloBotaoPrimario, opacity: enviando ? 0.7 : 1, cursor: enviando ? 'wait' : 'pointer' }}>
                        <i className="bi bi-send" aria-hidden="true" />
                        {enviando ? 'Enviando...' : 'Enviar solicitação'}
                    </button>
                    {enviado && (
                        <p role="status" style={{ margin: '1rem 0 0', color: '#15803d', fontSize: '0.9rem', lineHeight: 1.5 }}>
                            Solicitação enviada com sucesso. Nossa equipe recebeu seus dados e entrará em contato pelo e-mail informado.
                        </p>
                    )}
                    {erro && <p role="alert" style={{ margin: '1rem 0 0', color: '#b91c1c', fontSize: '0.9rem', lineHeight: 1.5 }}>{erro}</p>}
                </form>

                <aside style={{ ...estiloCard, background: '#0f172a', color: '#fff' }}>
                    <i className="bi bi-headset" style={{ fontSize: '1.8rem', color: '#93c5fd' }} aria-hidden="true" />
                    <h2 style={{ margin: '0.8rem 0 0.6rem', fontSize: '1.2rem' }}>Atendimento técnico</h2>
                    <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.7, fontSize: '0.92rem' }}>
                        Ao solicitar ajuda, informe seu usuário, a tela em que estava e uma mensagem de erro, se houver. Essas informações agilizam a análise.
                    </p>
                    <div style={{ borderTop: '1px solid #334155', marginTop: '1.25rem', paddingTop: '1rem', display: 'grid', gap: '0.65rem', color: '#e2e8f0', fontSize: '0.88rem' }}>
                        <span><i className="bi bi-check2-circle" style={{ color: '#86efac', marginRight: '0.5rem' }} aria-hidden="true" />Descreva os passos realizados</span>
                        <span><i className="bi bi-check2-circle" style={{ color: '#86efac', marginRight: '0.5rem' }} aria-hidden="true" />Informe quando o problema começou</span>
                        <span><i className="bi bi-check2-circle" style={{ color: '#86efac', marginRight: '0.5rem' }} aria-hidden="true" />Anexe evidências ao contato externo, se necessário</span>
                    </div>
                </aside>
            </div>
        </div>
    );
}

const estiloCard = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1.35rem',
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)'
};

const estiloIcone = (color) => ({ fontSize: '1.65rem', color });
const estiloTituloCard = { margin: '0.75rem 0 0.4rem', color: '#0f172a', fontSize: '1rem' };
const estiloTexto = { margin: 0, color: '#64748b', fontSize: '0.9rem', lineHeight: 1.65 };
const estiloLabel = { display: 'block', marginBottom: '0.45rem', color: '#475569', fontSize: '0.88rem', fontWeight: 600 };
const estiloInput = { width: '100%', padding: '0.75rem 0.85rem', marginBottom: '1rem', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', background: '#fff', fontSize: '0.92rem' };
const estiloBotaoPrimario = { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', border: 'none', borderRadius: '8px', padding: '0.75rem 1rem', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' };
const estiloBotaoSecundario = { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.7rem 1rem', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer' };
