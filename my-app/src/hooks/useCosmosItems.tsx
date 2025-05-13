import { useQuery } from '@tanstack/react-query';

export function useCosmosItem(id: string | undefined) {
  return useQuery({
    queryKey: ['cosmosItem', id],
    enabled: !!id,                            // don’t run when id = undefined
    queryFn: async () => {
      const res = await fetch(`/api/items/${id}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }
  });
}