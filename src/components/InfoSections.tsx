import React, { useState } from 'react';
import {
  Smartphone,
  Trophy,
  ShieldAlert,
  HelpCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface InfoSectionsProps {
  onPlayClick: () => void;
}

export const InfoSections: React.FC<InfoSectionsProps> = ({ onPlayClick }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: 'Quanto custa cada sessão e qual é o tempo limite?',
      a: 'Cada sessão oficial de jogo tem o custo fixo de 100 Kz. Após a confirmação do pagamento pelo Multicaixa Express, o jogador tem exatamente 30 minutos (controlados pelo servidor) para resolver o cubo mágico 3D.',
    },
    {
      q: 'Qual é o valor do prémio se eu resolver o cubo?',
      a: 'Ao resolver o cubo com sucesso dentro dos 30 minutos, ganhas um prémio de 2.000 Kz. O prémio é creditado no teu saldo pendente de validação e transferido para o saldo disponível após auditoria de integridade da sessão.',
    },
    {
      q: 'Como funcionam os saques (levantamentos) de dinheiro?',
      a: 'A regra da plataforma é rigorosa e transparente: cada pedido de saque é de exatamente 10.000 Kz. Não são permitidos saques inferiores nem superiores a esse montante. Assim que acumulares 10.000 Kz ou mais de saldo disponível, podes solicitar o saque via Multicaixa Express.',
    },
    {
      q: 'O que acontece se eu fechar a página ou perder a internet?',
      a: 'O cronómetro oficial é controlado no servidor e continua a decorrer normalmente. Quando voltares a aceder à plataforma e iniciares sessão, a tua sessão continuará exatamente com o tempo restante real.',
    },
    {
      q: 'Como é feito o pagamento de 100 Kz?',
      a: 'O pagamento é efetuado através do Multicaixa Express para o número oficial da plataforma: 944 636 057, com a descrição “CUBO MÁGICO — SESSÃO DE JOGO”. Em seguida, insere a referência ou comprovativo na aplicação para ativação da sessão.',
    },
    {
      q: 'Posso jogar várias sessões consecutivas?',
      a: 'Sim. Cada nova sessão requer um novo pagamento individual de 100 Kz, iniciando um novo cronómetro oficial de 30 minutos e um novo cubo misturado com uma configuração aleatória e válida.',
    },
  ];

  return (
    <div className="w-full space-y-24 py-16">
      {/* SECTION 1: COMO FUNCIONA */}
      <section id="como-funciona" className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs uppercase font-bold tracking-wider text-amber-400">
            Passo a Passo
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1 tracking-tight">
            Como Funciona a Plataforma
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Três passos simples para entrar no desafio do cubo mágico em Angola
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5">
                <Smartphone className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-bold text-amber-400">01. PAGAMENTO</span>
              <h3 className="text-lg font-bold text-white mt-1 mb-2">Paga 100 Kz via Multicaixa</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Transfere 100 Kz pelo Multicaixa Express para o número <strong>944 636 057</strong> com a nota “CUBO MÁGICO — SESSÃO DE JOGO” e envia o código.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
              Ativação após conferência
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5">
                <Clock className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">02. DESAFIO</span>
              <h3 className="text-lg font-bold text-white mt-1 mb-2">30 Minutos de Jogo 3D</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Roda as faces do cubo no ecrã táctil ou computador. O cronómetro do servidor corre continuamente durante 30 minutos oficiais.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
              Cubo 3D dinâmico real
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5">
                <Trophy className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-bold text-amber-400">03. RECOMPENSA</span>
              <h3 className="text-lg font-bold text-white mt-1 mb-2">Ganha 2.000 Kz & Saques</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ao resolver o cubo, recebes 2.000 Kz. Ao acumular o saldo de 10.000 Kz, podes solicitar o levantamento para a tua conta bancária.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
              Levantamento fixo a 10.000 Kz
            </div>
          </div>
        </div>

        {/* Multicaixa Visual Banner */}
        <div className="mt-10 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Rede Oficial Multicaixa Express
            </span>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Paga 100 Kz. Resolve o cubo. Ganha 2.000 Kz!
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              O modelo foi concebido para o público angolano com processos directos, conferência por auditoria e saques certificados no canal bancário nacional.
            </p>
          </div>
          <button
            onClick={onPlayClick}
            className="shrink-0 py-3.5 px-6 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
          >
            Jogar Agora (100 Kz)
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* SECTION 2: REGRAS DO JOGO */}
      <section id="regras" className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs uppercase font-bold tracking-wider text-amber-400">
            Regulamento
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1 tracking-tight">
            Regras Oficiais do Jogo
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Condições claras de participação e transparência
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-mono">1</span>
              Sessão e Cronómetro de 30 Minutos
            </h3>
            <ul className="text-xs text-slate-400 space-y-2.5 leading-relaxed">
              <li>· Cada pagamento de 100 Kz concede direito a uma sessão única e intransmissível.</li>
              <li>· O cronómetro de 30 minutos é gerido no servidor; atualizar ou fechar o navegador não pausa o tempo.</li>
              <li>· Se o tempo chegar a 00:00 sem resolução completa, a sessão encerra sem prémio.</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-mono">2</span>
              Resolução Válida e Prémio de 2.000 Kz
            </h3>
            <ul className="text-xs text-slate-400 space-y-2.5 leading-relaxed">
              <li>· O cubo mágico é considerado resolvido quando todas as 6 faces tiverem os 9 autocolantes da mesma cor.</li>
              <li>· A vitória é verificada matematicamente no servidor antes da concessão do prémio de 2.000 Kz.</li>
              <li>· O prémio é creditado no saldo pendente de validação para auditoria anti-fraude.</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-mono">3</span>
              Regra de Saque Fixo a 10.000 Kz
            </h3>
            <ul className="text-xs text-slate-400 space-y-2.5 leading-relaxed">
              <li>· Valor mínimo por saque: <strong>10.000 Kz</strong>. Valor máximo por saque: <strong>10.000 Kz</strong>.</li>
              <li>· Cada levantamento é de exatamente 10.000 Kz. Saldos inferiores a 10.000 Kz não podem ser sacados.</li>
              <li>· O valor solicitado é reservado para prevenir pedidos duplicados; se rejeitado, é devolvido à carteira.</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-mono">4</span>
              Auditoria e Proteção Contra Fraudes
            </h3>
            <ul className="text-xs text-slate-400 space-y-2.5 leading-relaxed">
              <li>· Comprovativos de pagamento duplicados ou reutilizados são bloqueados e cancelados pelo sistema.</li>
              <li>· Todas as ações do jogador e do administrador são arquivadas num livro de auditoria imutável.</li>
              <li>· Contas com comportamento suspeito de automação ou manipulação são suspensas de imediato.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* SECTION 3: PERGUNTAS FREQUENTES (FAQ) */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs uppercase font-bold tracking-wider text-amber-400">
            Dúvidas
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1 tracking-tight">
            Perguntas Frequentes (FAQ)
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Respostas às principais questões sobre sessões, prémios e levantamentos
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-semibold text-sm text-white hover:text-amber-400 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    {faq.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 4: TERMOS E CONDIÇÕES & CONFORMIDADE EM ANGOLA */}
      <section id="termos" className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg text-slate-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Termos, Condições & Transparência Legal em Angola
              </h3>
              <p className="text-xs text-slate-400">
                Aviso obrigatório de conformidade jurídica e responsabilidade
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400 space-y-2.5 leading-relaxed">
            <p>
              1. <strong>Natureza do Jogo:</strong> O CUBO MÁGICO — COMO SER MILIONÁRIO! é um jogo digital de destreza mental e raciocínio lógico onde a resolução depende exclusivamente da habilidade do utilizador em ordenar as faces do cubo no tempo estipulado.
            </p>
            <p>
              2. <strong>Ausência de Garantia de Enriquecimento:</strong> A plataforma não promete nem garante enriquecimento fácil ou ganhos financeiros garantidos. Os prémios dependem estritamente do cumprimento das metas do jogo dentro das regras estabelecidas.
            </p>
            <p>
              3. <strong>Conformidade Legal:</strong> O promotor da plataforma recomenda e compromete-se a assegurar que as atividades de cobrança de participação e distribuição de prémios monetários operem em estrita conformidade com a legislação aplicável da República de Angola, incluindo normas fiscais, de jogos de habilidade e proteção de dados pessoais.
            </p>
            <p>
              4. <strong>Proteção de Dados:</strong> Os contactos telefónicos e dados fornecidos destinam-se exclusivamente à gestão de contas, identificação de pagamentos Multicaixa Express e liquidação dos respetivos prémios.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
