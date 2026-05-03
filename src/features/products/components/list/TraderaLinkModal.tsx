'use client';

import { useTraderaLinkModalController } from './TraderaLinkModal.controller';
import type { TraderaLinkModalProps } from './TraderaLinkModal.types';
import { TraderaLinkModalView } from './TraderaLinkModal.view';

export function TraderaLinkModal(props: TraderaLinkModalProps): React.JSX.Element | null {
  const controller = useTraderaLinkModalController(props);
  if (!props.isOpen) return null;
  return <TraderaLinkModalView controller={controller} isOpen={props.isOpen} />;
}

export default TraderaLinkModal;
