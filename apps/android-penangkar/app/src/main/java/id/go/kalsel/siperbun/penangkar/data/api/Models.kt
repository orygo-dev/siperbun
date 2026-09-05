package id.go.kalsel.siperbun.penangkar.data.api

data class ApiResponse<T>(
    val success: Boolean = false,
    val message: String? = null,
    val data: T? = null,
    val meta: Any? = null,
)

data class AuthUser(
    val id: String,
    val email: String,
    val name: String,
    val phone: String? = null,
    val avatarUrl: String? = null,
    val producerId: String? = null,
    val roles: List<String> = emptyList(),
    val permissions: List<String> = emptyList(),
) {
    val isPenangkar: Boolean get() = roles.contains("PENANGKAR")
}

data class LoginBody(val email: String, val password: String)

data class AuthPayload(
    val accessToken: String,
    val user: AuthUser,
)

data class DashboardSummary(
    val nurseryLocations: Double? = 0.0,
    val activeBatches: Double? = 0.0,
    val activeSeedlings: Double? = 0.0,
    val applicationsThisMonth: Double? = 0.0,
    val scannedCertificates: Double? = 0.0,
)

data class RecentApplication(
    val id: String,
    val applicationNumber: String,
    val producer: String? = null,
    val commodity: String? = null,
    val seedlingCount: Double? = 0.0,
    val status: String,
    val submittedAt: String? = null,
    val href: String? = null,
)

data class DashboardBanner(
    val id: String,
    val title: String? = null,
    val subtitle: String? = null,
    val imageUrl: String? = null,
    val linkUrl: String? = null,
)

data class NamedRef(
    val id: String? = null,
    val name: String? = null,
    val code: String? = null,
    val businessName: String? = null,
    val registrationNumber: String? = null,
    val certificateNumber: String? = null,
    val batchNumber: String? = null,
    val status: String? = null,
)

data class ApplicationItem(
    val id: String,
    val applicationNumber: String,
    val producerId: String? = null,
    val seedlingCount: Double? = 0.0,
    val status: String,
    val submittedAt: String? = null,
    val notes: String? = null,
    val producer: NamedRef? = null,
    val commodity: NamedRef? = null,
    val variety: NamedRef? = null,
    val nursery: NamedRef? = null,
    val invoice: InvoiceInfo? = null,
    val inspectionReport: InspectionReportInfo? = null,
    val certificate: NamedRef? = null,
)

data class InvoiceInfo(
    val id: String? = null,
    val invoiceNumber: String? = null,
    val amount: Double? = null,
    val dueDate: String? = null,
    val paymentInstructions: String? = null,
    val status: String? = null,
)

data class InspectionReportInfo(
    val id: String? = null,
    val reportNumber: String? = null,
    val issuedAt: String? = null,
    val notes: String? = null,
)

data class ProductionItem(
    val id: String,
    val batchNumber: String,
    val status: String,
    val initialCount: Double? = 0.0,
    val activeCount: Double? = 0.0,
    val commodity: NamedRef? = null,
    val variety: NamedRef? = null,
    val nursery: NamedRef? = null,
    val startedAt: String? = null,
)

data class DistributionItem(
    val id: String,
    val buyerName: String,
    val destinationKab: String? = null,
    val quantity: Double? = 0.0,
    val distributedAt: String? = null,
    val deliveryNoteNo: String? = null,
    val certificate: NamedRef? = null,
)

data class CertificateItem(
    val id: String,
    val certificateNumber: String,
    val status: String,
    val certifiedCount: Double? = 0.0,
    val issuedAt: String? = null,
    val expiresAt: String? = null,
    val application: ApplicationLite? = null,
)

data class ApplicationLite(
    val id: String? = null,
    val applicationNumber: String? = null,
    val commodity: NamedRef? = null,
)

data class NotificationItem(
    val id: String,
    val type: String? = null,
    val title: String,
    val body: String? = null,
    val link: String? = null,
    val isRead: Boolean = false,
    val createdAt: String? = null,
)

data class CommodityItem(
    val id: String,
    val name: String,
    val unit: String? = null,
    val code: String? = null,
)

data class RegisterDeviceBody(
    val token: String,
    val platform: String = "ANDROID",
    val deviceId: String? = null,
    val appVersion: String? = null,
)

data class CreateApplicationBody(
    val producerId: String,
    val commodityId: String,
    val seedlingCount: Int,
    val notes: String? = null,
)

data class CreateProductionBody(
    val producerId: String,
    val commodityId: String,
    val initialCount: Int,
    val activeCount: Int,
    val notes: String? = null,
)

data class CreateDistributionBody(
    val producerId: String,
    val buyerName: String,
    val destinationKab: String,
    val quantity: Int,
    val distributedAt: String,
    val certificateId: String? = null,
    val deliveryNoteNo: String? = null,
    val notes: String? = null,
)

data class ChangePasswordBody(
    val currentPassword: String,
    val newPassword: String,
    val confirmPassword: String,
)

data class UpdateProfileBody(
    val name: String,
    val phone: String? = null,
)
