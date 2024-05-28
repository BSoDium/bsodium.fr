import { useEffect } from 'react';

export default function Meta({
  title,
  description = '',
}: {title: string, description?: string}) {
  useEffect(() => {
    document.title = title;

    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', description);
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content = description;
      document.head.appendChild(newMeta);
    }
  }, [title]);

  return null;
}
