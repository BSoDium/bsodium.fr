import { useEffect } from 'react';

export default function Title({ text }: {text: string}) {
  useEffect(() => {
    document.title = text;
  }, [text]);

  return null;
}
