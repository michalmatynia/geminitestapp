import React from 'react';
import { type NavItem } from './admin-menu-utils';
import { PackageIcon } from './icons';

export const getCommerceNav = (): NavItem => ({
  id: 'commerce',
  label: 'Commerce',
  href: '/admin/products',
  icon: <PackageIcon className='size-4' />,
  children: [
    {
      id: 'commerce/products',
      label: 'Products',
      href: '/admin/products',
      children: [
        {
          id: 'commerce/products/all',
          label: 'All Products',
          href: '/admin/products',
          exact: true,
        },
        { id: 'commerce/products/drafts', label: 'Drafts', href: '/admin/drafts' },
        {
          id: 'commerce/products/producers',
          label: 'Producers',
          href: '/admin/products/producers',
        },
        {
          id: 'commerce/products/orders-import',
          label: 'Orders Import',
          href: '/admin/products/orders-import',
        },
        { id: 'commerce/products/import', label: 'Import', href: '/admin/products/import' },
        {
          id: 'commerce/products/preferences',
          label: 'Preferences',
          href: '/admin/products/preferences',
        },
        { id: 'commerce/products/settings', label: 'Settings', href: '/admin/products/settings' },
      ],
    },
    {
      id: 'commerce/assets',
      label: 'Assets',
      href: '/admin/3d-assets',
      children: [
        { id: 'commerce/assets/3d', label: '3D Assets', href: '/admin/3d-assets' },
        { id: 'commerce/assets/3d-list', label: '3D Asset List', href: '/admin/3d-assets/list' },
      ],
    },
    {
      id: 'commerce/job-board',
      label: 'Job Board',
      href: '/admin/job-board',
    },
  ],
});
