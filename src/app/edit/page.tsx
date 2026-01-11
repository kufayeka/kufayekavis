"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createShortId } from "../../lib/shortId";

export default function EditPage() {
  const router = useRouter();

  useEffect(() => {
    const id = createShortId();
    router.replace(`/edit/${id}`);
  }, [router]);

  return null;
}
