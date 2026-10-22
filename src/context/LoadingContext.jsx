// src/context/LoadingContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { RadarLoadingScreen } from '../components/RadarLoader';

const LoadingContext = createContext({
    carregando: false,
    mensagem: '',
    submensagem: '',
    mostrarLoading: () => {},
    esconderLoading: () => {},
    executarComLoading: async () => {}
});

export function LoadingProvider({ children }) {
    const [estado, setEstado] = useState({
        carregando: false,
        mensagem: 'Carregando...',
        submensagem: 'Aguarde um instante...'
    });

    const mostrarLoading = useCallback((
        mensagem = 'Carregando...',
        submensagem = 'Aguarde um instante...'
    ) => {
        setEstado({
            carregando: true,
            mensagem,
            submensagem
        });
    }, []);

    const esconderLoading = useCallback(() => {
        setEstado(prev => ({
            ...prev,
            carregando: false
        }));
    }, []);

    const executarComLoading = useCallback(async (
        funcaoAsync,
        mensagem = 'Processando...',
        submensagem = 'Aguarde um instante...'
    ) => {
        mostrarLoading(mensagem, submensagem);
        try {
            return await funcaoAsync();
        } finally {
            esconderLoading();
        }
    }, [mostrarLoading, esconderLoading]);

    return (
        <LoadingContext.Provider value={{
            carregando: estado.carregando,
            mensagem: estado.mensagem,
            submensagem: estado.submensagem,
            mostrarLoading,
            esconderLoading,
            executarComLoading
        }}>
            {children}
            {estado.carregando && (
                <RadarLoadingScreen
                    mensagem={estado.mensagem}
                    submensagem={estado.submensagem}
                />
            )}
        </LoadingContext.Provider>
    );
}

export function useLoading() {
    return useContext(LoadingContext);
}
