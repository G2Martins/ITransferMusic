import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-privacy',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container mx-auto max-w-3xl px-6 py-16">
      <h1 class="text-4xl font-bold text-brand dark:text-white">
        Política de Privacidade
      </h1>
      <p class="mt-2 text-sm text-muted">Última atualização: 20 de abril de 2026</p>

      <div
        class="prose prose-sm mt-8 max-w-none text-brand/80 dark:prose-invert dark:text-white/80"
      >
        <h2 class="mt-8 text-xl font-semibold text-brand dark:text-white">
          1. Introdução
        </h2>
        <p>
          Esta Política de Privacidade explica como o ITransferMusic coleta,
          usa e protege seus dados ao usar nossa plataforma de transferência e
          sincronização de playlists.
        </p>

        <h2 class="mt-8 text-xl font-semibold text-brand dark:text-white">
          2. Dados que coletamos
        </h2>
        <ul class="list-inside list-disc">
          <li>
            <strong>Dados da conta local:</strong> nome, e-mail, senha (hash
            bcrypt), fuso horário, data de criação.
          </li>
          <li>
            <strong>Tokens OAuth dos provedores:</strong> access_token e
            refresh_token retornados por Spotify, YouTube, Apple Music ou
            Amazon Music, armazenados criptografados (Fernet / AES-128).
          </li>
          <li>
            <strong>Metadados de transferências:</strong> IDs de playlists
            origem e destino, nomes, descrições, resultados de correspondência
            entre faixas, capas, carimbos de data/hora.
          </li>
          <li>
            <strong>Dados de sincronização:</strong> frequência, horário, método
            (adicionar apenas / espelho) e histórico da última execução.
          </li>
          <li>
            <strong>Dados do Google Sign-in:</strong> google_id, foto de
            avatar, nome e e-mail (quando você opta por logar via Google).
          </li>
        </ul>

        <h2 class="mt-8 text-xl font-semibold text-brand dark:text-white">
          3. Como usamos seus dados
        </h2>
        <ul class="list-inside list-disc">
          <li>Autenticar você na plataforma e nas contas de streaming vinculadas;</li>
          <li>Executar as transferências e sincronizações que você solicitar;</li>
          <li>Exibir seu histórico, playlists compartilhadas e preferências;</li>
          <li>Detectar problemas (ex: playlist apagada no provedor) para manter a UI coerente;</li>
          <li>Melhorar e manter a qualidade do serviço.</li>
        </ul>

        <h2 class="mt-8 text-xl font-semibold text-brand dark:text-white">
          4. Nunca compartilhamos com terceiros
        </h2>
        <p>
          Não vendemos, alugamos nem compartilhamos dados pessoais com
          anunciantes ou terceiros. As únicas chamadas externas são para as
          APIs oficiais dos provedores de streaming — e apenas com os tokens
          que você autorizou explicitamente via OAuth.
        </p>

        <h2 class="mt-8 text-xl font-semibold text-brand dark:text-white">
          5. Segurança
        </h2>
        <ul class="list-inside list-disc">
          <li>
            Tokens de acesso aos provedores são <strong>criptografados</strong>
            antes de serem salvos no MongoDB usando uma chave Fernet
            (AES-128).
          </li>
          <li>
            Senhas locais ficam armazenadas apenas como hash bcrypt — nunca em
            texto puro.
          </li>
          <li>
            Todas as comunicações com nosso backend usam HTTPS/TLS 1.2+.
          </li>
          <li>
            Usamos JWT com expiração curta para autenticar chamadas à API.
          </li>
        </ul>

        <h2 class="mt-8 text-xl font-semibold text-brand dark:text-white">
          6. Cookies
        </h2>
        <p>
          O ITransferMusic usa apenas armazenamento local do navegador
          (localStorage) para guardar seu token JWT e a preferência de tema
          (claro/escuro). Não usamos cookies de rastreamento nem cookies de
          terceiros para publicidade.
        </p>

        <h2 class="mt-8 text-xl font-semibold text-brand dark:text-white">
          7. Seus direitos
        </h2>
        <p>
          Você pode, a qualquer momento:
        </p>
        <ul class="list-inside list-disc">
          <li>Ver e editar seus dados em <em>Configurações</em>;</li>
          <li>Desvincular uma conta de streaming;</li>
          <li>Excluir sua conta (o que apaga permanentemente todos os seus dados na nossa base).</li>
        </ul>

        <h2 class="mt-8 text-xl font-semibold text-brand dark:text-white">
          8. Retenção
        </h2>
        <p>
          Dados são mantidos enquanto sua conta estiver ativa. Ao excluir a
          conta, a remoção é imediata e irreversível em todas as coleções
          relacionadas (usuários, contas vinculadas, transferências,
          sincronizações).
        </p>

        <h2 class="mt-8 text-xl font-semibold text-brand dark:text-white">
          9. Contato
        </h2>
        <p>
          Para dúvidas de privacidade, entre em contato pela página
          <a class="text-brand-accent hover:underline" href="/contact">
            Fale Conosco
          </a>
          .
        </p>
      </div>
    </section>
  `,
})
export class PrivacyComponent {}
