-- Radar 2030: sincroniza ações que faltavam na base após a correção do patch.
INSERT INTO "Acao" (
  "id",
  "og",
  "lae",
  "diretriz",
  "prazo",
  "setor",
  "meta",
  "indicador",
  "restricoes",
  "linhaPlanilha",
  "responsavel",
  "dadosIncompletos",
  "projetoCodigo",
  "projetoNome",
  "projetoTema"
)
VALUES
  (
    'AE 2.2.1.10B',
    NULL,
    NULL,
    'Estruturar equipe multidisciplinar com expertise em ciência de dados, IA e segurança viária.',
    'MEDIO_PRAZO',
    'Secretaria-Executiva',
    'Equipe multidisciplinar para IA e segurança viária estruturada e em operação até o final de 2028.',
    '% de efetivação da equipe multidisciplinar.',
    NULL,
    148,
    'Secretaria-Executiva',
    ARRAY['og', 'lae']::text[],
    NULL,
    NULL,
    NULL
  ),
  (
    'AE 3.5.2.3',
    NULL,
    NULL,
    'Elaborar Manuais de procedimentos de forma faseada, contemplando processos da rotina administrativa e de atividades finalísticas do Conselho.',
    'CURTO_PRAZO',
    'Secretaria-Executiva',
    '50% Manuais de rotinas administrativas implementados até o final de 2026 e 100% até o final de 2027 e 50% de atividades finalísticas até final de 2027 e 100% até final de 2028.',
    '% de manuais de procedimentos implementados.',
    NULL,
    149,
    'Secretaria-Executiva',
    ARRAY['og', 'lae']::text[],
    NULL,
    NULL,
    NULL
  )
ON CONFLICT ("id") DO UPDATE
SET
  "diretriz" = EXCLUDED."diretriz",
  "prazo" = EXCLUDED."prazo",
  "setor" = EXCLUDED."setor",
  "meta" = EXCLUDED."meta",
  "indicador" = EXCLUDED."indicador",
  "restricoes" = EXCLUDED."restricoes",
  "linhaPlanilha" = EXCLUDED."linhaPlanilha",
  "responsavel" = EXCLUDED."responsavel",
  "dadosIncompletos" = EXCLUDED."dadosIncompletos",
  "projetoCodigo" = EXCLUDED."projetoCodigo",
  "projetoNome" = EXCLUDED."projetoNome",
  "projetoTema" = EXCLUDED."projetoTema";
