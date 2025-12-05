// src/app/page.tsx
import CsvUploader from '@/components/CsvUploader';

export default function Page() {
  return (
    <main className="page-center">
      <div className="container-max">
        <CsvUploader />
      </div>
    </main>
  );
}
