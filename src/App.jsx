// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { usuarioEmCache, revalidarSessao } from './services/auth';
import { AcoesEstrategicas } from './pages/AcoesEstrategicas';
import { FormularioMatriz } from './pages/FormularioMatriz';
import { ConsultarMatrizes } from './pages/ConsultarMatrizes';
import { PainelComite } from './pages/PainelComite';
import { PainelAdmin } from './pages/PainelAdmin';
import { Footer } from './components/Footer';
import { PainelAndamento } from './pages/PainelAndamento';
import { TrocarSenha } from './pages/TrocarSenha';
import { RecuperarSenha } from './pages/RecuperarSenha';
import { SuporteTecnico } from './pages/SuporteTecnico';
import { DashboardEstrategico } from './pages/DashboardEstrategico';
import { LoadingProvider, useLoading } from './context/LoadingContext';

const TELAS = {
    HOME: 'home',
    DASHBOARD: 'dashboard',
    ACOES: 'acoes',
    FORMULARIO: 'formulario',
    CONSULTAR: 'consultar',
    RASCUNHOS: 'rascunhos',
    COMITE: 'comite',
    ADMIN: 'admin',
    TROCAR_SENHA: 'trocar-senha',
    RECUPERAR_SENHA: 'recuperar-senha',
    SUPORTE: 'suporte'
};

function ConteudoApp() {
    const [usuarioLogado, setUsuarioLogado] = useState(usuarioEmCache());
    const tokenInicial = new URLSearchParams(window.location.search).get('token') || '';
    const [telaAtual, setTelaAtual] = useState(tokenInicial ? TELAS.RECUPERAR_SENHA : TELAS.HOME);
    const { mostrarLoading, esconderLoading } = useLoading();

    // Ref para saber se o usuário estava deslogado no render anterior.
    // Assim só redirecionamos para o painel quando ocorrer uma transição null -> usuário.
    const estavaDeslogadoRef = useRef(!usuarioEmCache());

    useEffect(() => {
        if (usuarioEmCache()) {
            mostrarLoading('Validando acesso...', 'Conectando ao Radar 2030');
            revalidarSessao()
                .then((usuario) => setUsuarioLogado(usuario))
                .catch(() => {})
                .finally(() => esconderLoading());
        }
    }, [mostrarLoading, esconderLoading]);

    // Quando o usuário faz login (null -> usuário), vai direto para o painel home.
    useEffect(() => {
        if (usuarioLogado && estavaDeslogadoRef.current) {
            setTelaAtual(TELAS.HOME);
        }
        estavaDeslogadoRef.current = !usuarioLogado;
    }, [usuarioLogado]);

    const [acoesSelecionadas, setAcoesSelecionadas] = useState([]);
    const [modoFormulario, setModoFormulario] = useState('novo');
    const [matrizAtual, setMatrizAtual] = useState(null);
    const [paginaAnterior, setPaginaAnterior] = useState(TELAS.ACOES);

    const abrirFormularioNovo = (acoes) => {
        setAcoesSelecionadas(acoes);
        setModoFormulario('novo');
        setMatrizAtual(null);
        setPaginaAnterior(TELAS.ACOES);
        setTelaAtual(TELAS.FORMULARIO);
    };

    const abrirFormularioEdicao = (registro, origem) => {
        const acoes = (registro.acoes || registro.acoesEstrategicas || []).map(a => a.acao || a);
        setAcoesSelecionadas(acoes);
        setModoFormulario('editar');
        setMatrizAtual(registro);
        setPaginaAnterior(origem || TELAS.CONSULTAR);
        setTelaAtual(TELAS.FORMULARIO);
    };

    const voltarPaginaAnterior = () => setTelaAtual(paginaAnterior || TELAS.CONSULTAR);

    const handleSalvoSucesso = () => {
        setTelaAtual(paginaAnterior === TELAS.RASCUNHOS ? TELAS.RASCUNHOS : TELAS.CONSULTAR);
    };

    const renderizarTela = () => {
        switch (telaAtual) {
            case TELAS.HOME:
                return (
                    <PainelAndamento
                        usuarioLogado={usuarioLogado}
                        onNavigate={(tela) => setTelaAtual(tela)}
                        telas={TELAS}
                    />
                );
            case TELAS.DASHBOARD:
                return <DashboardEstrategico usuarioLogado={usuarioLogado} />;
            case TELAS.ACOES:
                return (
                    <AcoesEstrategicas
                        onSelecionarAcoes={(acoes) => abrirFormularioNovo(acoes)}
                    />
                );
            case TELAS.FORMULARIO:
                return (
                    <FormularioMatriz
                        modo={modoFormulario}
                        matrizId={matrizAtual?.id}
                        matrizExistente={matrizAtual}
                        acoesSelecionadas={acoesSelecionadas}
                        usuarioLogado={usuarioLogado}
                        onVoltar={voltarPaginaAnterior}
                        onSalvoSucesso={handleSalvoSucesso}
                    />
                );
            case TELAS.CONSULTAR:
                return <ConsultarMatrizes usuarioLogado={usuarioLogado} modo="todas" onNavigate={(tela) => setTelaAtual(tela)} onEditar={(registro) => abrirFormularioEdicao(registro, TELAS.CONSULTAR)} />;
            case TELAS.RASCUNHOS:
                return <ConsultarMatrizes usuarioLogado={usuarioLogado} modo="rascunhos" onNavigate={(tela) => setTelaAtual(tela)} onEditar={(registro) => abrirFormularioEdicao(registro, TELAS.RASCUNHOS)} />;
            case TELAS.COMITE:
                return <PainelComite usuarioLogado={usuarioLogado} />;
            case TELAS.ADMIN:
                return <PainelAdmin usuarioLogado={usuarioLogado} />;
            case TELAS.TROCAR_SENHA:
                return <TrocarSenha onVoltar={() => setTelaAtual(TELAS.HOME)} />;
            case TELAS.RECUPERAR_SENHA:
                return <RecuperarSenha tokenInicial={tokenInicial} onVoltar={() => setTelaAtual(TELAS.HOME)} />;
            case TELAS.SUPORTE:
                return <SuporteTecnico onVoltar={() => setTelaAtual(usuarioLogado ? TELAS.HOME : TELAS.RECUPERAR_SENHA)} />;
            default:
                return <div style={{ padding: '2rem' }}><h2>Página não encontrada</h2></div>;
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'transparent', fontFamily: 'sans-serif', margin: 0 }}>
            <Header
                telaAtual={telaAtual}
                onNavigate={(novaTela) => setTelaAtual(novaTela)}
                usuarioLogado={usuarioLogado}
                setUsuarioLogado={setUsuarioLogado}
                telas={TELAS}
            />

            <main style={{ flex: 1 }}>
                {renderizarTela()}
            </main>

            <Footer onNavigate={(tela) => setTelaAtual(tela)} />
        </div>
    );
}

export default function App() {
    return (
        <LoadingProvider>
            <ConteudoApp />
        </LoadingProvider>
    );
}
