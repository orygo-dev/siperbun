import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable, type DataTableColumn } from '../../components/tables/DataTable';
import { useDebounce } from '../../hooks/useDebounce';
import { regionsApi, type Region } from '../../services/regions';

export function RegionsSettingsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('KABUPATEN');
  const debouncedSearch = useDebounce(search, 300);

  const query = useQuery({
    queryKey: ['regions', page, debouncedSearch, type],
    queryFn: async () => {
      const res = await regionsApi.list({
        page,
        limit: 20,
        search: debouncedSearch || undefined,
        type: type || undefined,
      });
      return res.data;
    },
  });

  const columns: DataTableColumn<Region>[] = [
    {
      key: 'code',
      header: 'Kode',
      render: (row) => <span className="font-medium">{row.code}</span>,
    },
    { key: 'name', header: 'Nama', render: (row) => row.name },
    { key: 'type', header: 'Tipe', render: (row) => row.type },
    {
      key: 'parent',
      header: 'Induk',
      render: (row) => row.parent?.name ?? '—',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Wilayah"
        subtitle="Data wilayah administratif"
        actions={
          <Link
            to="/pengaturan"
            className="h-10 rounded-lg border border-border px-4 text-sm leading-10"
          >
            Kembali
          </Link>
        }
      />
      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        page={page}
        limit={20}
        total={(query.data?.meta?.total as number) ?? 0}
        onPageChange={setPage}
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        loading={query.isLoading}
        filters={
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-border px-3 text-sm"
          >
            <option value="">Semua tipe</option>
            <option value="PROVINSI">Provinsi</option>
            <option value="KABUPATEN">Kabupaten</option>
            <option value="KECAMATAN">Kecamatan</option>
            <option value="DESA">Desa</option>
          </select>
        }
      />
    </div>
  );
}
