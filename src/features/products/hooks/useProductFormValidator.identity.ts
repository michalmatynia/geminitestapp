'use client';

import { useMemo, useRef, useState, type MutableRefObject } from 'react';

import type { ProductValidationInstanceScope } from '@/shared/contracts/products/validation';

import {
  buildProductFormValidationScopeKey,
  buildProductFormValidatorEntityIdentity,
  createProductFormValidatorInstanceId,
  resolveProductFormValidationInstanceScope,
} from './useProductFormValidator.helpers';

type UseProductFormValidatorIdentityArgs = {
  draftId: string | null;
  productId: string | null;
  scopeOverride?: string;
  validatorSessionKey?: string;
};

export type ProductFormValidatorIdentityState = {
  entityIdentity: string;
  lastEntityIdentityRef: MutableRefObject<string>;
  validationInstanceScope: ProductValidationInstanceScope;
  validationScopeKey: string;
};

export const useProductFormValidatorIdentity = ({
  draftId,
  productId,
  scopeOverride,
  validatorSessionKey,
}: UseProductFormValidatorIdentityArgs): ProductFormValidatorIdentityState => {
  const [draftValidationInstanceId] = useState<string>(() =>
    createProductFormValidatorInstanceId('draft-validation')
  );
  const [productCreateValidationInstanceId] = useState<string>(() =>
    createProductFormValidatorInstanceId('product-create-validation')
  );
  const entityIdentity = useMemo(
    () => buildProductFormValidatorEntityIdentity({ draftId, productId, validatorSessionKey }),
    [draftId, productId, validatorSessionKey]
  );
  const lastEntityIdentityRef = useRef<string>(entityIdentity);
  const validationInstanceScope = useMemo(
    () => resolveProductFormValidationInstanceScope({ draftId, productId, scopeOverride }),
    [draftId, productId, scopeOverride]
  );
  const validationScopeKey = useMemo(
    () =>
      buildProductFormValidationScopeKey({
        draftId,
        draftValidationInstanceId,
        productCreateValidationInstanceId,
        productId,
        validationInstanceScope,
      }),
    [
      draftId,
      draftValidationInstanceId,
      productCreateValidationInstanceId,
      productId,
      validationInstanceScope,
    ]
  );

  return { entityIdentity, lastEntityIdentityRef, validationInstanceScope, validationScopeKey };
};
