'use client';

import { useProductFormParametersModel } from './ProductFormParameters.model';
import { ProductFormParametersView } from './ProductFormParameters.view';

export default function ProductFormParameters(): React.JSX.Element {
  const model = useProductFormParametersModel();
  return <ProductFormParametersView model={model} />;
}
