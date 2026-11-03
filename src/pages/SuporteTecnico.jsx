import React, { useState } from 'react';
import { ArrowClockwise, ArrowLeft, CheckCircle, FileText, Headset, LockKey, PaperPlaneRight, User } from '@phosphor-icons/react';
import { api, ApiError } from '../services/api';

const AJUDA_ITENS = [
    {
        icone: User,
        cor: '#2563eb',
        titulo: 'Problemas de acesso',
        descricao: 'Confira se seu e-mail está correto e se a senha foi digitada respeitando letras maiúsculas e minúsculas.',
        extra: <LockKey size={16} weight="bold" aria-hidden="true" />,
    },
    {
        icone: FileText,
        cor: '#0f766e',
        titulo: 'Matrizes 5W2H',
        descricao: 'Use a área de rascunhos para continuar uma matriz salva e envie-a ao Comitê somente após revisar os campos.',
    },
    {
        icone: ArrowClockwise,
        cor: '#d97706',
        titulo: 'A página não responde?',
        descricao: 'Atualize a página, confirme sua conexão e tente novamente. Se o problema persistir, registre os detalhes abaixo.',
    },
];

const CHECKLIST = [
    'Descreva os passos realizados',
    'Informe quando o problema começou',
    'Anexe evidências e a tela de erro, se houver',
];

const CONTATO_INFO = [
    { label: 'Tempo médio de resposta', value: 'até 24h úteis' },
    { label: 'Canal de atendimento', value: 'portal interno + e-mail institucional' },
];

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
        <div style={estiloPagina}>
            <header style={estiloCabecalho}>
                <div>
                    <div style={estiloBadge}>Central de atendimento</div>
                    <h1 style={estiloTitulo}>Suporte técnico</h1>
                    <p style={estiloDescricao}>
                        Encontre orientações para usar o Radar 2030 ou registre uma dificuldade encontrada durante o acesso e o preenchimento das matrizes.
                    </p>
                </div>

                <button type="button" onClick={onVoltar} style={estiloBotaoSecundario}>
                    <ArrowLeft size={18} weight="bold" aria-hidden="true" />
                    Voltar
                </button>
            </header>

            <section aria-label="Como posso ajudar?" style={estiloSecao}>
                <div style={estiloCabecalhoSecao}>
                    <p style={estiloEyebrow}>Como posso ajudar?</p>
                    <h2 style={estiloTituloSecao}>Atendimento sob medida</h2>
                </div>

                <div style={estiloListaAjuda}>
                    {AJUDA_ITENS.map(({ icone: Icone, cor, titulo, descricao, extra }) => (
                        <article key={titulo} style={estiloCard}>
                            <div style={{ ...estiloIconeWrap, background: `${cor}12`, color: cor }} aria-hidden="true">
                                <Icone size={24} weight="regular" />
                                {extra ? <span style={estiloIconeExtra}>{extra}</span> : null}
                            </div>
                            <h3 style={estiloTituloCard}>{titulo}</h3>
                            <p style={estiloTexto}>{descricao}</p>
                        </article>
                    ))}
                </div>
            </section>

            <main style={estiloConteudo}>
                <form onSubmit={handleSubmit} style={{ ...estiloCard, ...estiloFormulario }}>
                    <div style={estiloCabecalhoFormulario}>
                        <p style={estiloEyebrow}>Contato</p>
                        <h2 style={estiloTituloFormulario}>Solicitação de suporte</h2>
                        <p style={estiloTexto}>Preencha seus dados e descreva o problema para que nossa equipe possa retornar.</p>
                    </div>

                    <div style={estiloCampos}>
                        <div>
                            <label htmlFor="nome-suporte" style={estiloLabel}>Nome</label>
                            <input id="nome-suporte" type="text" value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Seu nome completo" required style={estiloInput} />
                        </div>

                        <div>
                            <label htmlFor="email-suporte" style={estiloLabel}>E-mail</label>
                            <input id="email-suporte" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu.email@exemplo.com" required style={estiloInput} />
                        </div>

                        <div>
                            <label htmlFor="telefone-suporte" style={estiloLabel}>Telefone</label>
                            <input id="telefone-suporte" type="tel" value={telefone} onChange={(event) => setTelefone(event.target.value)} placeholder="(00) 00000-0000" required style={estiloInput} />
                        </div>

                        <div>
                            <label htmlFor="tipo-problema" style={estiloLabel}>Tipo de problema</label>
                            <select id="tipo-problema" value={tipoProblema} onChange={(event) => setTipoProblema(event.target.value)} required style={estiloInput}>
                                <option>Acesso</option>
                                <option>Cadastro de matriz</option>
                                <option>Andamento ou etapas</option>
                                <option>Comitê</option>
                                <option>Outro</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="descricao-problema" style={estiloLabel}>Descrição</label>
                            <textarea
                                id="descricao-problema"
                                value={descricao}
                                onChange={(event) => {
                                    setDescricao(event.target.value);
                                    setEnviado(false);
                                    setErro('');
                                }}
                                placeholder="Ex.: não consigo salvar a matriz depois de preencher o campo..."
                                rows="6"
                                required
                                style={{ ...estiloInput, resize: 'vertical', minHeight: '140px' }}
                            />
                        </div>
                    </div>

                    <button type="submit" disabled={enviando} style={{ ...estiloBotaoPrimario, opacity: enviando ? 0.7 : 1, cursor: enviando ? 'wait' : 'pointer' }}>
                        <PaperPlaneRight size={18} weight="bold" aria-hidden="true" />
                        {enviando ? 'Enviando...' : 'Enviar solicitação'}
                    </button>

                    {enviado && (
                        <p role="status" style={estiloMensagemSucesso}>
                            Solicitação enviada com sucesso. Nossa equipe recebeu seus dados e entrará em contato pelo e-mail informado.
                        </p>
                    )}
                    {erro && <p role="alert" style={estiloMensagemErro}>{erro}</p>}
                </form>

                <aside aria-label="Checklist e contato" style={estiloPainelLateral}>
                    <div style={estiloHeaderPainel}>
                        <div style={estiloPanelBadge}>
                            <Headset size={24} weight="regular" aria-hidden="true" />
                        </div>
                        <div>
                            <p style={estiloPanelEyebrow}>Checklist</p>
                            <h3 style={estiloTituloPainel}>Antes de abrir o chamado</h3>
                        </div>
                    </div>

                    <ul style={estiloListaDicas}>
                        {CHECKLIST.map((item) => (
                            <li key={item} style={estiloItemLista}>
                                <CheckCircle size={16} weight="bold" style={{ color: '#86efac', flexShrink: 0 }} aria-hidden="true" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>

                    <div style={estiloContatoBox}>
                        <p style={estiloPanelEyebrow}>Contato</p>
                        <h4 style={estiloTituloContato}>Equipe de suporte</h4>
                        <p style={estiloTextoContato}>Acompanhe sua solicitação e priorize detalhes do erro para agilizar a análise.</p>
                        <div style={estiloGridContato}>
                            {CONTATO_INFO.map(({ label, value }) => (
                                <div key={label} style={estiloContatoItem}>
                                    <span style={estiloContatoLabel}>{label}</span>
                                    <strong style={estiloContatoValor}>{value}</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
}

const estiloPagina = {
    padding: '2rem',
    maxWidth: '1180px',
    margin: '0 auto',
    width: '100%',
};

const estiloCabecalho = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1.5rem',
    marginBottom: '2rem',
    flexWrap: 'wrap',
};

const estiloBadge = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.45rem 0.7rem',
    borderRadius: '999px',
    background: '#eff6ff',
    border: '1px solid rgba(37, 99, 235, 0.15)',
    color: '#1d4ed8',
    fontSize: '0.72rem',
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
};

const estiloTitulo = {
    margin: '0.7rem 0 0',
    color: '#0f172a',
    fontSize: 'clamp(2rem, 3vw, 3rem)',
    lineHeight: 1.05,
    letterSpacing: '-0.04em',
};

const estiloDescricao = {
    margin: '0.9rem 0 0',
    color: '#64748b',
    lineHeight: 1.7,
    maxWidth: '720px',
    fontSize: '1rem',
};

const estiloBotaoSecundario = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    border: '1px solid #dbe3ee',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    background: '#fff',
    color: '#334155',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 6px 16px rgba(15, 23, 42, 0.04)',
};

const estiloSecao = {
    marginBottom: '2rem',
};

const estiloCabecalhoSecao = {
    marginBottom: '1rem',
};

const estiloEyebrow = {
    margin: 0,
    color: '#2563eb',
    fontSize: '0.72rem',
    fontWeight: 800,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
};

const estiloTituloSecao = {
    margin: '0.45rem 0 0',
    color: '#0f172a',
    fontSize: 'clamp(1.3rem, 2vw, 2rem)',
    lineHeight: 1.2,
};

const estiloListaAjuda = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
};

const estiloCard = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '1.35rem',
    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)',
};

const estiloIconeWrap = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2.9rem',
    height: '2.9rem',
    borderRadius: '12px',
    fontSize: '1.5rem',
};

const estiloIconeExtra = {
    position: 'absolute',
    right: '-0.2rem',
    bottom: '-0.2rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1.1rem',
    height: '1.1rem',
    borderRadius: '50%',
    background: '#fff',
    color: '#0f172a',
    boxShadow: '0 0 0 2px rgba(148, 163, 184, 0.18)',
};

const estiloTituloCard = {
    margin: '0.9rem 0 0.5rem',
    color: '#0f172a',
    fontSize: '1.05rem',
    lineHeight: 1.4,
};

const estiloTexto = {
    margin: 0,
    color: '#64748b',
    fontSize: '0.92rem',
    lineHeight: 1.7,
};

const estiloConteudo = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.25fr) minmax(300px, 0.75fr)',
    gap: '1.5rem',
    alignItems: 'start',
};

const estiloFormulario = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    padding: '1.5rem',
};

const estiloCabecalhoFormulario = {
    marginBottom: '0.5rem',
};

const estiloTituloFormulario = {
    margin: '0.4rem 0 0.3rem',
    color: '#0f172a',
    fontSize: '1.3rem',
    lineHeight: 1.3,
};

const estiloCampos = {
    display: 'grid',
    gap: '0.2rem',
};

const estiloLabel = {
    display: 'block',
    marginBottom: '0.45rem',
    color: '#475569',
    fontSize: '0.88rem',
    fontWeight: 600,
};

const estiloInput = {
    width: '100%',
    padding: '0.8rem 0.9rem',
    marginBottom: '1rem',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    color: '#0f172a',
    background: '#fff',
    fontSize: '0.93rem',
    outline: 'none',
    boxSizing: 'border-box',
};

const estiloBotaoPrimario = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    border: 'none',
    borderRadius: '10px',
    padding: '0.8rem 1rem',
    background: 'linear-gradient(135deg, #0b4383 0%, #1557a1 100%)',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 10px 20px rgba(11, 67, 131, 0.2)',
};

const estiloMensagemSucesso = {
    margin: '1rem 0 0',
    color: '#15803d',
    fontSize: '0.9rem',
    lineHeight: 1.5,
};

const estiloMensagemErro = {
    margin: '1rem 0 0',
    color: '#b91c1c',
    fontSize: '0.9rem',
    lineHeight: 1.5,
};

const estiloPainelLateral = {
    background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
    color: '#fff',
    borderRadius: '16px',
    padding: '1.5rem',
    border: '1px solid rgba(148, 163, 184, 0.15)',
    boxShadow: '0 16px 28px rgba(15, 23, 42, 0.12)',
};

const estiloHeaderPainel = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
    marginBottom: '0.5rem',
};

const estiloPanelBadge = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2.5rem',
    height: '2.5rem',
    borderRadius: '10px',
    background: 'rgba(147, 197, 253, 0.12)',
    color: '#93c5fd',
};

const estiloPanelEyebrow = {
    margin: 0,
    color: '#93c5fd',
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
};

const estiloTituloPainel = {
    margin: '0.35rem 0 0',
    fontSize: '1.2rem',
    color: '#fff',
    lineHeight: 1.3,
};

const estiloListaDicas = {
    listStyle: 'none',
    margin: '1.1rem 0 0',
    padding: 0,
    display: 'grid',
    gap: '0.8rem',
    color: '#e2e8f0',
    fontSize: '0.9rem',
};

const estiloItemLista = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.65rem',
    lineHeight: 1.6,
};

const estiloContatoBox = {
    marginTop: '1.5rem',
    paddingTop: '1.1rem',
    borderTop: '1px solid rgba(148, 163, 184, 0.2)',
};

const estiloTituloContato = {
    margin: '0.4rem 0 0.25rem',
    color: '#fff',
    fontSize: '1.3rem',
};

const estiloTextoContato = {
    margin: 0,
    color: '#cbd5e1',
    fontSize: '0.9rem',
    lineHeight: 1.7,
};

const estiloGridContato = {
    display: 'grid',
    gap: '0.8rem',
    marginTop: '1rem',
};

const estiloContatoItem = {
    display: 'grid',
    gap: '0.2rem',
    padding: '0.75rem 0.9rem',
    borderRadius: '12px',
    background: 'rgba(15, 23, 42, 0.25)',
    border: '1px solid rgba(148, 163, 184, 0.15)',
};

const estiloContatoLabel = {
    color: '#94a3b8',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
};

const estiloContatoValor = {
    color: '#f8fafc',
    fontSize: '0.88rem',
    lineHeight: 1.5,
};
