'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { GET_CATEGORIES } from '@/graphql/queries';

interface Category {
  id: string;
  name: string;
}

// Enlaces a las categorías reales de la base de datos (filtran el catálogo por categoryId)
export function CategoryLinks({ className }: { className: string }) {
  const { data } = useQuery<{ categories: Category[] }>(GET_CATEGORIES);

  return (
    <>
      {data?.categories.map(category => (
        <Link key={category.id} href={`/catalog?categoryId=${category.id}`} className={className}>
          {category.name}
        </Link>
      ))}
    </>
  );
}
