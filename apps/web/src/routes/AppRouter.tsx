import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { ProducerDetailPage } from '../pages/penangkar/ProducerDetailPage';
import { ProducerFormPage } from '../pages/penangkar/ProducerFormPage';
import { ProducersListPage } from '../pages/penangkar/ProducersListPage';
import { NurseryDetailPage } from '../pages/lokasi-pembibitan/NurseryDetailPage';
import { NurseryFormPage } from '../pages/lokasi-pembibitan/NurseryFormPage';
import { NurseriesListPage } from '../pages/lokasi-pembibitan/NurseriesListPage';
import { SeedGardenDetailPage } from '../pages/kebun-sumber/SeedGardenDetailPage';
import { SeedGardenFormPage } from '../pages/kebun-sumber/SeedGardenFormPage';
import { SeedGardensListPage } from '../pages/kebun-sumber/SeedGardensListPage';
import { SeedSourceDetailPage } from '../pages/sumber-benih/SeedSourceDetailPage';
import { SeedSourceFormPage } from '../pages/sumber-benih/SeedSourceFormPage';
import { SeedSourcesListPage } from '../pages/sumber-benih/SeedSourcesListPage';
import { ProductionDetailPage } from '../pages/produksi/ProductionDetailPage';
import { ProductionFormPage } from '../pages/produksi/ProductionFormPage';
import { ProductionListPage } from '../pages/produksi/ProductionListPage';
import { ApplicationDetailPage } from '../pages/pengajuan/ApplicationDetailPage';
import { ApplicationFormPage } from '../pages/pengajuan/ApplicationFormPage';
import { ApplicationsListPage } from '../pages/pengajuan/ApplicationsListPage';
import {
  AssignmentDetailPage,
  AssignmentsListPage,
} from '../pages/penugasan/AssignmentsListPage';
import {
  InspectionDetailPage,
  InspectionsListPage,
} from '../pages/pemeriksaan/InspectionsListPage';
import {
  FindingDetailPage,
  FindingsListPage,
} from '../pages/temuan/FindingsListPage';
import { CertificateDetailPage } from '../pages/sertifikat/CertificateDetailPage';
import { CertificateFormPage } from '../pages/sertifikat/CertificateFormPage';
import { CertificatesListPage } from '../pages/sertifikat/CertificatesListPage';
import { CertificateUploadScanPage } from '../pages/sertifikat/CertificateUploadScanPage';
import { LabelsHubPage } from '../pages/label-distribusi/LabelsHubPage';
import { LabelFormPage } from '../pages/label-distribusi/LabelFormPage';
import { LabelDetailPage } from '../pages/label-distribusi/LabelDetailPage';
import { DistributionFormPage } from '../pages/label-distribusi/DistributionFormPage';
import { DistributionDetailPage } from '../pages/label-distribusi/DistributionDetailPage';
import { DistributionsListPage } from '../pages/distribusi/DistributionsListPage';
import {
  CirculationDetailPage,
  CirculationFormPage,
  CirculationsListPage,
} from '../pages/pengawasan/CirculationsPages';
import {
  ReportDetailPage,
  ReportsHubPage,
} from '../pages/laporan/ReportsPages';
import { MapPage } from '../pages/peta/MapPage';
import { AuditLogPage } from '../pages/audit-log/AuditLogPage';
import { BrandingSettingsPage } from '../pages/pengaturan/BrandingSettingsPage';
import { BannersSettingsPage, MobileBannersSettingsPage } from '../pages/pengaturan/BannersSettingsPage';
import { CatalogListingsPage } from '../pages/pengaturan/CatalogListingsPage';
import { RegistrationsPage } from '../pages/pengaturan/RegistrationsPage';
import { CommoditiesSettingsPage } from '../pages/pengaturan/CommoditiesSettingsPage';
import { RegionsSettingsPage } from '../pages/pengaturan/RegionsSettingsPage';
import { SettingsHubPage } from '../pages/pengaturan/SettingsHubPage';
import { UsersSettingsPage } from '../pages/pengaturan/UsersSettingsPage';
import { PortalContentSettingsPage } from '../pages/pengaturan/PortalContentSettingsPage';
import { PortalLayout } from '../components/portal/PortalLayout';
import { PortalHomePage } from '../pages/portal/PortalHomePage';
import { PortalLandingPage } from '../pages/portal/PortalLandingPage';
import { PortalBibitDetailPage } from '../pages/portal/PortalBibitDetailPage';
import { PortalPenangkarPage } from '../pages/portal/PortalPenangkarPage';
import { PortalPenangkarDetailPage } from '../pages/portal/PortalPenangkarDetailPage';
import { PortalDaftarPage } from '../pages/portal/PortalDaftarPage';
import { ProfilePage } from '../pages/profil/ProfilePage';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/portal" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route path="/portal" element={<PortalLayout />}>
        <Route index element={<PortalLandingPage />} />
        <Route path="bibit" element={<PortalHomePage />} />
        <Route path="bibit/:id" element={<PortalBibitDetailPage />} />
        <Route path="penangkar" element={<PortalPenangkarPage />} />
        <Route path="penangkar/:id" element={<PortalPenangkarDetailPage />} />
        <Route path="daftar" element={<PortalDaftarPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profil" element={<ProfilePage />} />

        <Route path="/penangkar" element={<ProducersListPage />} />
        <Route path="/penangkar/tambah" element={<PortalDaftarPage adminMode />} />
        <Route path="/penangkar/:id" element={<ProducerDetailPage />} />
        <Route path="/penangkar/:id/edit" element={<ProducerFormPage mode="edit" />} />

        <Route path="/lokasi-pembibitan" element={<NurseriesListPage />} />
        <Route
          path="/lokasi-pembibitan/tambah"
          element={<NurseryFormPage mode="create" />}
        />
        <Route path="/lokasi-pembibitan/:id" element={<NurseryDetailPage />} />
        <Route
          path="/lokasi-pembibitan/:id/edit"
          element={<NurseryFormPage mode="edit" />}
        />

        <Route path="/kebun-sumber" element={<SeedGardensListPage />} />
        <Route path="/kebun-sumber/tambah" element={<SeedGardenFormPage mode="create" />} />
        <Route path="/kebun-sumber/:id" element={<SeedGardenDetailPage />} />
        <Route
          path="/kebun-sumber/:id/edit"
          element={<SeedGardenFormPage mode="edit" />}
        />

        <Route path="/sumber-benih" element={<SeedSourcesListPage />} />
        <Route path="/sumber-benih/tambah" element={<SeedSourceFormPage mode="create" />} />
        <Route path="/sumber-benih/:id" element={<SeedSourceDetailPage />} />
        <Route
          path="/sumber-benih/:id/edit"
          element={<SeedSourceFormPage mode="edit" />}
        />

        <Route path="/produksi" element={<ProductionListPage />} />
        <Route path="/produksi/tambah" element={<ProductionFormPage mode="create" />} />
        <Route path="/produksi/:id" element={<ProductionDetailPage />} />
        <Route
          path="/produksi/:id/edit"
          element={<ProductionFormPage mode="edit" />}
        />

        <Route path="/pengajuan" element={<ApplicationsListPage />} />
        <Route path="/pengajuan/tambah" element={<ApplicationFormPage />} />
        <Route path="/pengajuan/:id/edit" element={<ApplicationFormPage />} />
        <Route path="/pengajuan/:id" element={<ApplicationDetailPage />} />
        <Route path="/pengajuan/:id/verifikasi" element={<ApplicationDetailPage />} />

        <Route path="/penugasan" element={<AssignmentsListPage />} />
        <Route path="/penugasan/:id" element={<AssignmentDetailPage />} />
        <Route path="/pemeriksaan" element={<InspectionsListPage />} />
        <Route path="/pemeriksaan/:id" element={<InspectionDetailPage />} />
        <Route path="/temuan" element={<FindingsListPage />} />
        <Route path="/temuan/:id" element={<FindingDetailPage />} />
        <Route path="/sertifikat" element={<CertificatesListPage />} />
        <Route path="/sertifikat/tambah" element={<CertificateFormPage />} />
        <Route
          path="/sertifikat/:id/upload-scan"
          element={<CertificateUploadScanPage />}
        />
        <Route path="/sertifikat/:id" element={<CertificateDetailPage />} />

        <Route path="/label-distribusi" element={<LabelsHubPage />} />
        <Route path="/label-distribusi/label/tambah" element={<LabelFormPage />} />
        <Route path="/label-distribusi/label/:id" element={<LabelDetailPage />} />
        <Route
          path="/label-distribusi/distribusi/tambah"
          element={<DistributionFormPage />}
        />
        <Route
          path="/label-distribusi/distribusi/:id"
          element={<DistributionDetailPage />}
        />
        <Route path="/distribusi" element={<DistributionsListPage />} />
        <Route path="/distribusi/tambah" element={<DistributionFormPage />} />
        <Route path="/distribusi/:id" element={<DistributionDetailPage />} />

        <Route path="/pengawasan" element={<CirculationsListPage />} />
        <Route path="/pengawasan/tambah" element={<CirculationFormPage />} />
        <Route path="/pengawasan/:id" element={<CirculationDetailPage />} />

        <Route path="/laporan" element={<ReportsHubPage />} />
        <Route path="/laporan/:type" element={<ReportDetailPage />} />

        <Route path="/peta" element={<MapPage />} />
        <Route path="/audit-log" element={<AuditLogPage />} />

        <Route path="/pengaturan" element={<SettingsHubPage />} />
        <Route path="/pengaturan/branding" element={<BrandingSettingsPage />} />
        <Route
          path="/pengaturan/konten-portal"
          element={<PortalContentSettingsPage />}
        />
        <Route path="/pengaturan/banner" element={<BannersSettingsPage />} />
        <Route
          path="/pengaturan/banner-mobile"
          element={<MobileBannersSettingsPage />}
        />
        <Route path="/pengaturan/katalog" element={<CatalogListingsPage />} />
        <Route
          path="/pengaturan/pendaftaran-penangkar"
          element={<RegistrationsPage />}
        />
        <Route path="/pengaturan/pengguna" element={<UsersSettingsPage />} />
        <Route path="/pengaturan/komoditas" element={<CommoditiesSettingsPage />} />
        <Route path="/pengaturan/wilayah" element={<RegionsSettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/portal" replace />} />
    </Routes>
  );
}
