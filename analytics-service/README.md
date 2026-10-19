# SAEP - Serviço Analítico (FastAPI / Python)

Motor de inteligência estatística e consolidação em cascata do **SAEP (Sistema de Ações Estratégicas do PETRANS)** para o **CETRAN-PA**.

---

## 🚀 Como Executar

1. Crie e ative o ambiente virtual:
   ```bash
   cd analytics-service
   python3 -m venv venv
   source venv/bin/activate  # Linux/Mac
   # ou: venv\Scripts\activate no Windows
   ```

2. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure a variável `DATABASE_URL` no arquivo `.env`:
   ```env
   DATABASE_URL="postgresql://usuario:senha@host:5432/banco"
   ```

4. Inicie o servidor FastAPI:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

5. Acesse a documentação interativa Swagger:
   - **Swagger UI**: `http://localhost:8000/docs`
   - **Redoc**: `http://localhost:8000/redoc`

---

## 📊 As 5 Visões Analíticas (Endpoints REST)

| Endpoint | Visão | Descrição |
|---|---|---|
| `GET /analytics/resumo` | **Resumo Integrado** | KPIs gerais e resumo executivo unificado das 5 visões com suporte a `?setor=...`. |
| `GET /analytics/eixos` | **Visão 1: Avanço por Eixos** | Percentual consolidado dos **4 Eixos** centrais do PETRANS e distribuição de status. |
| `GET /analytics/projetos` | **Visão 2: Todos os Projetos** | Progresso dos **21 Projetos** com flag e destaque para os **8 Projetos Estratégicos** (`isEstrategico`). |
| `GET /analytics/objetivos` | **Visão 3: Objetivos & Linhas** | Agrupamento por **Objetivos Gerais (OG)** e **Linhas de Ação (LAE)** e projetos contribuintes. |
| `GET /analytics/prazos` | **Visão 4: Horizontes de Prazo** | Métricas por **Curto Prazo** (até 12 meses), **Médio Prazo** (12-36m) e **Longo Prazo** (36m+). |
| `GET /analytics/setores` | **Visão 5: Lente de Setor** | Desempenho dos 4 macro-setores e subsetores, com detalhamento via `?setor=...`. |

---

## 🧮 Lógica de Cálculo em Cascata

1. **Ação**: Calculada automaticamente pela proporção de etapas marcadas como concluídas nas matrizes com status `APROVADO`.
2. **Projetos e Objetivos**: Médias aritméticas das ações vinculadas a cada Projeto e OG.
3. **Eixos**: Média consolidada de todas as iniciativas do Eixo correspondente.