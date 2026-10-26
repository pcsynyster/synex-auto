# Synex Auto

Micro-SaaS mobile-first para estética automotiva: entrada por placa, vistoria fotográfica, planos mensais com créditos, acompanhamento público da OS e aviso no WhatsApp.

## Stack

Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Supabase (Postgres, Auth, Storage, RLS), Zod.

## Como rodar

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha as variáveis.
3. Aplique a migração em `supabase/migrations/` (`supabase db push` ou cole no SQL Editor).
4. `npm run dev`

## Decisões de regra de negócio

- **Placa única por empresa:** `UNIQUE (tenant_id, placa)`. Duas estéticas podem atender o mesmo carro.
- **Isolamento:** toda tabela tem `tenant_id`. As policies usam `tenant_atual()`, que lê o tenant do perfil do usuário logado. As FKs são compostas (`tenant_id`, `id`), então uma OS não aponta para um veículo de outra empresa nem por erro de aplicação.
- **Criação da OS:** passa apenas pela função `criar_ordem_servico`. O insert direto na tabela é revogado para impedir que alguém crie uma OS vinculada a um plano sem debitar o crédito. O débito usa `FOR UPDATE`, então duas entradas simultâneas não consomem o mesmo crédito.
- **Crédito:** um crédito por OS, debitado na abertura. O plano com validade mais próxima é usado primeiro. Ao zerar, o status muda para `esgotado`; planos vencidos viram `expirado` na próxima tentativa de uso.
- **Valor:** `valor_total` é a soma dos `servicos_avulsos`, calculada no banco. Com plano, os avulsos são os extras cobrados à parte.
- **Status:** só avança (`recebido` → `lavando` → `acabamento` → `pronto` → `entregue`), via `avancar_status_os`. `pronto_em` e `entregue_em` são preenchidos automaticamente.
- **Link público:** o token tem 48 caracteres hex (192 bits). O acesso anônimo só funciona quando o cabeçalho `x-os-token` é igual ao token da OS, então não é possível listar ordens com a chave pública. O anônimo vê apenas colunas liberadas: nada de WhatsApp do cliente, observações internas ou plano.
- **Fotos:** até 6 por OS, comprimidas no celular para 1600 px antes do envio. O caminho segue `tenant_id/os_id/arquivo`. A policy de upload exige que a primeira pasta seja o tenant do usuário. O bucket é público para leitura por link.
- **Pix:** a página pública gera o código copia e cola (BR Code com valor e CRC16) a partir da `chave_pix` e da `cidade` da empresa. Chaves de telefone devem ser salvas no formato `+5584999999999`.
- **WhatsApp:** a mensagem com o link de vistoria é enviada na abertura da OS. Os status notificados são definidos em `WHATSAPP_NOTIFICAR_STATUS` (padrão `pronto`). Falhas no envio não desfazem a OS; a interface mostra um aviso.
- **Tempo real:** a página pública consulta `/api/os/[token]` a cada 15 s e quando a aba volta ao foco. O Realtime do Supabase não repassa o cabeçalho do token para o RLS.

## Agenda

- **Link público:** `/agendar/[slug]`. O cliente escolhe serviço, dia e horário, informa nome, WhatsApp e, se quiser, placa e modelo. Recebe um link `/agendamento/[token]` para acompanhar e cancelar até 2 horas antes.
- **Horários livres:** calculados no banco por `horarios_disponiveis`, a partir do horário de funcionamento do dia, do intervalo da grade, da duração do serviço, da antecedência mínima, dos dias fechados e da capacidade (carros ao mesmo tempo). Um serviço de 3h ocupa a vaga pelas 3h.
- **Sem conflito:** `criar_agendamento_publico` trava a agenda da empresa durante a gravação e confere o horário de novo, então dois clientes não pegam a mesma vaga. Cada WhatsApp pode ter até 3 agendamentos ativos por loja.
- **Painel:** aba Agenda com os dias, contagem por dia e ações por status (confirmar, recusar, não veio, cancelar). "Cliente chegou" abre a entrada por placa já preenchida; ao abrir a OS, o agendamento vira "Atendido".
- **Configuração:** `/painel/agenda/config` para ligar a agenda, confirmação automática, horários por dia, intervalo, capacidade, antecedência, janela de dias, serviços e dias fechados.
- **WhatsApp:** o cliente recebe a confirmação do pedido, a loja recebe o aviso de novo agendamento, e o cliente é avisado quando o dono confirma ou cancela.
- Toda empresa nova já nasce com horário de segunda a sábado e 4 serviços de exemplo, editáveis.

## Estrutura

```
supabase/migrations/   schema, RLS, funções e bucket
types/                 database.types.ts
lib/supabase/          clientes server, browser, proxy e por token
app/actions/           auth, veiculos, ordens
app/os/[token]/        página pública do cliente
app/api/os/[token]/    status para polling
app/painel/            pátio e nova entrada
```

Para regenerar os tipos a partir do banco: `npm run db:types`.
