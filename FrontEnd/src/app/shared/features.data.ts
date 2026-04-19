export interface FeatureDef {
  slug: string;
  titleKey: string;
  descKey: string;
  icon: string;
}

export const FEATURES: readonly FeatureDef[] = [
  {
    slug: 'transferir',
    titleKey: 'features.transferir.title',
    descKey: 'features.transferir.desc',
    icon: 'ph:arrows-left-right-duotone',
  },
  {
    slug: 'sincronizar',
    titleKey: 'features.sincronizar.title',
    descKey: 'features.sincronizar.desc',
    icon: 'ph:arrows-clockwise-duotone',
  },
  {
    slug: 'partilhar',
    titleKey: 'features.partilhar.title',
    descKey: 'features.partilhar.desc',
    icon: 'ph:share-network-duotone',
  },
];
