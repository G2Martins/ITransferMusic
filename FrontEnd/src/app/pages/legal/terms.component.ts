import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-terms',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container mx-auto max-w-3xl px-6 py-16">
      <h1 class="text-4xl font-bold text-brand dark:text-white">Termos de Uso</h1>
      <p class="mt-2 text-sm text-muted">Última atualização: 20 de abril de 2026</p>

      <div
        class="prose prose-sm mt-8 max-w-none text-brand/80 dark:prose-invert dark:text-white/80"
      >
        <h2 class="mt-8 text-xl font-semibold text-brand dark:text-white">
          1. Aceitação dos termos
        </h2>
        <p>
          Ao acessar ou utilizar o ITransferMusic (“plataforma”, “serviço”,
          “nós” ou “nosso”), você concorda em cumprir estes Termos de Uso.
          Se você não concorda com qualquer parte destes termos, por favor não
          utilize o serviço.
        </p>

        <h2 class="mt-8 text-xl font-semibold text-brand dark:text-white">
          2. Descrição do serviço
        </h2>
        <p>
          O ITransferMusic é uma plataforma que permite transferir e sincronizar
          playlists entre serviços de streaming de música como Spotify, YouTube
          Music, Apple Music, Amazon Music e outros. Utilizamos APIs oficiais
          dessas plataformas via autenticação OAuth.
        </p>

        <h2 class="mt-8 text-xl font-semibold text-brand dark:text-white">
          3. Contas e autenticação
        </h2>
        <p>
          Para usar as funcionalidades completas você precisa criar uma conta
          no ITransferMusic e vincular ao menos uma conta de provedor de música
          via OAuth. Você é responsável por manter a confidencialidade da sua
          senha local e por todas as atividades realizadas a partir da sua
          conta. Nunca solicitamos nem armazenamos as senhas dos provedores de
          streaming.
        </p>

        <h2 class="mt-8 text-xl font-semibold text-brand dark:text-white">
          4. Uso permitido
        </h2>
        <p>
          Você concorda em usar o serviço apenas para finalidades lícitas e em
          conformidade com os termos dos provedores conectados (Spotify, YouTube
          Music, Apple Music, Amazon Music etc). É proibido:
        </p>
        <ul class="list-inside list-disc">
          <li>Fazer uso automatizado em massa que contorne limites das APIs dos provedores;</li>
          <li>Revender o acesso a contas ou dados obtidos pelo serviço;</li>
          <li>Tentar extrair ou reutilizar dados de terceiros sem autorização;</li>
          <li>Usar o serviço para distribuir conteúdo que viole direitos autorais.</li>
        </ul>

        <h2 class="mt-8 text-xl font-semibold text-brand dark:text-white">
          5. Propriedade do conteúdo
        </h2>
        <p>
          Todas as músicas, capas de álbum, nomes de artistas e playlists
          pertencem aos seus respectivos detentores de direitos e aos provedores
          de streaming originais. O ITransferMusic apenas facilita a
          movimentação de referências (IDs e metadados) entre plataformas com
          sua autorização explícita.
        </p>

        <h2 class="mt-8 text-xl font-semibold text-brand dark:text-white">
          6. Limitação de responsabilidade
        </h2>
        <p>
          O serviço é fornecido “como está”. Não garantimos que toda faixa será
          encontrada no destino, pois a correspondência depende da disponibilidade
          regional e do catálogo de cada provedor. Não nos responsabilizamos por
          indisponibilidade, alterações ou descontinuação de funcionalidades
          nas APIs de terceiros.
        </p>

        <h2 class="mt-8 text-xl font-semibold text-brand dark:text-white">
          7. Encerramento
        </h2>
        <p>
          Você pode excluir sua conta a qualquer momento pelo painel de
          configurações. Após a exclusão, todos os tokens, histórico de
          transferências, sincronizações e contas vinculadas são removidos
          permanentemente da nossa base.
        </p>

        <h2 class="mt-8 text-xl font-semibold text-brand dark:text-white">
          8. Alterações nos termos
        </h2>
        <p>
          Podemos atualizar estes termos periodicamente. Mudanças materiais
          serão anunciadas com antecedência. O uso contínuo do serviço após a
          publicação de uma nova versão implica aceitação dos novos termos.
        </p>

        <h2 class="mt-8 text-xl font-semibold text-brand dark:text-white">
          9. Contato
        </h2>
        <p>
          Para dúvidas sobre estes termos, entre em contato pela página
          <a class="text-brand-accent hover:underline" href="/contact">
            Fale Conosco
          </a>
          .
        </p>
      </div>
    </section>
  `,
})
export class TermsComponent {}
