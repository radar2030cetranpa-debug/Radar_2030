from app.database.connection import get_db_connection

async def obter_evolucao_temporal():
    conn = await get_db_connection()
    try:
        # Agrupa a contagem de ações por mês (YYYY-MM)
        query = """
            SELECT 
                TO_CHAR("createdAt", 'YYYY-MM') AS mes,
                COUNT(*) AS quantidade
            FROM "Acao"
            GROUP BY mes
            ORDER BY mes ASC;
        """
        try:
            rows = await conn.fetch(query)
            resultado = {row['mes']: row['quantidade'] for row in rows if row['mes']}
        except Exception:
            # Fallback caso a coluna seja diferente ou não haja dados
            resultado = {}

        return resultado
    except Exception as e:
        return {
            "status": "erro",
            "mensagem": str(e)
        }
    finally:
        await conn.close()