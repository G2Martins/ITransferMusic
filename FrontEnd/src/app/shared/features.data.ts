export interface FeatureDef {
  slug: string;
  titleKey: string;
  descKey: string;
  icon: string;
  /** Rota de destino quando o usuario clica "Comecar agora". Se nao estiver logado,
   *  o frontend redireciona para /auth/login primeiro. */
  cta: string;
}

export const FEATURES: readonly FeatureDef[] = [
  {
    slug: 'transferir',
    titleKey: 'features.transferir.title',
    descKey: 'features.transferir.desc',
    icon: 'ph:arrows-left-right-duotone',
    cta: '/dashboard',
  },
  {
    slug: 'sincronizar',
    titleKey: 'features.sincronizar.title',
    descKey: 'features.sincronizar.desc',
    icon: 'ph:arrows-clockwise-duotone',
    cta: '/account/syncs',
  },
  {
    slug: 'partilhar',
    titleKey: 'features.partilhar.title',
    descKey: 'features.partilhar.desc',
    icon: 'ph:share-network-duotone',
    cta: '/account/history',
  },
];
