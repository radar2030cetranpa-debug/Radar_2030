-- Radar 2030: o 5W2H passa a ser preenchido por tarefa (dentro do JSON "etapas"
-- de AcoesMatriz). Os campos 5W2H da Matriz deixam de ser obrigatorios; os dados
-- antigos sao preservados.
ALTER TABLE "Matriz" ALTER COLUMN "oque" DROP NOT NULL;
ALTER TABLE "Matriz" ALTER COLUMN "porque" DROP NOT NULL;
ALTER TABLE "Matriz" ALTER COLUMN "como" DROP NOT NULL;
ALTER TABLE "Matriz" ALTER COLUMN "quando" DROP NOT NULL;
ALTER TABLE "Matriz" ALTER COLUMN "onde" DROP NOT NULL;
ALTER TABLE "Matriz" ALTER COLUMN "quanto" DROP NOT NULL;
