package id.go.kalsel.siperbun.penangkar.data

import android.os.Build
import id.go.kalsel.siperbun.penangkar.BuildConfig
import id.go.kalsel.siperbun.penangkar.data.api.ApiClient
import id.go.kalsel.siperbun.penangkar.data.api.ApiException
import id.go.kalsel.siperbun.penangkar.data.api.ChangePasswordBody
import id.go.kalsel.siperbun.penangkar.data.api.CreateApplicationBody
import id.go.kalsel.siperbun.penangkar.data.api.CreateDistributionBody
import id.go.kalsel.siperbun.penangkar.data.api.CreateProductionBody
import id.go.kalsel.siperbun.penangkar.data.api.LoginBody
import id.go.kalsel.siperbun.penangkar.data.api.RegisterDeviceBody
import id.go.kalsel.siperbun.penangkar.data.api.UpdateProfileBody
import id.go.kalsel.siperbun.penangkar.data.api.requireData
import id.go.kalsel.siperbun.penangkar.data.session.SessionStore
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File

class SiperbunRepository(
    private val client: ApiClient,
    private val session: SessionStore,
) {
    private val api get() = client.api

    suspend fun login(email: String, password: String) {
        val payload = api.login(LoginBody(email.trim(), password)).requireData("Login gagal")
        if (!payload.user.isPenangkar) {
            runCatching { api.logout() }
            session.clear()
            throw ApiException("Aplikasi ini khusus akun Penangkar.")
        }
        session.save(payload.accessToken, payload.user)
    }

    suspend fun logout() {
        runCatching { api.logout() }
        session.clear()
    }

    suspend fun dashboard() = Triple(
        api.dashboardSummary().requireData(),
        api.recentApplications().data.orEmpty(),
        api.banners().data.orEmpty(),
    )

    suspend fun applications(search: String? = null, status: String? = null) =
        api.applications(search = search?.ifBlank { null }, status = status?.ifBlank { null }).data.orEmpty()

    suspend fun application(id: String) = api.application(id).requireData()

    suspend fun createAndSubmitApplication(commodityId: String, seedlingCount: Int, notes: String?) {
        val user = session.user() ?: throw ApiException("Sesi berakhir")
        val producerId = user.producerId ?: throw ApiException("Akun belum terhubung ke data penangkar")
        val created = api.createApplication(
            CreateApplicationBody(producerId, commodityId, seedlingCount, notes),
        ).requireData()
        runCatching { api.submitApplication(created.id) }
    }

    suspend fun uploadPayment(id: String, file: File, notes: String?) {
        val part = MultipartBody.Part.createFormData(
            "file",
            file.name,
            file.asRequestBody("image/*".toMediaType()),
        )
        api.uploadPaymentProof(id, part, notes?.toRequestBody("text/plain".toMediaType())).requireData()
    }

    suspend fun productions() = api.productions().data.orEmpty()

    suspend fun createProduction(commodityId: String, count: Int, notes: String?) {
        val user = session.user() ?: throw ApiException("Sesi berakhir")
        val producerId = user.producerId ?: throw ApiException("Akun belum terhubung ke data penangkar")
        api.createProduction(
            CreateProductionBody(producerId, commodityId, count, count, notes),
        ).requireData()
    }

    suspend fun distributions() = api.distributions().data.orEmpty()

    suspend fun createDistribution(
        buyerName: String,
        destinationKab: String,
        quantity: Int,
        distributedAt: String,
        certificateId: String?,
        deliveryNoteNo: String?,
        notes: String?,
    ) {
        val user = session.user() ?: throw ApiException("Sesi berakhir")
        val producerId = user.producerId ?: throw ApiException("Akun belum terhubung ke data penangkar")
        api.createDistribution(
            CreateDistributionBody(
                producerId = producerId,
                buyerName = buyerName,
                destinationKab = destinationKab,
                quantity = quantity,
                distributedAt = distributedAt,
                certificateId = certificateId,
                deliveryNoteNo = deliveryNoteNo,
                notes = notes,
            ),
        ).requireData()
    }

    suspend fun certificates() = api.certificates().data.orEmpty()

    suspend fun notifications() = api.notifications().data.orEmpty()

    suspend fun markNotificationsRead() {
        runCatching { api.markAllNotificationsRead() }
    }

    suspend fun commodities() = api.commodities().data.orEmpty()

    suspend fun updateProfile(name: String, phone: String?) {
        val user = api.updateProfile(UpdateProfileBody(name, phone)).requireData()
        val token = session.token() ?: return
        session.save(token, user)
    }

    suspend fun changePassword(current: String, next: String, confirm: String) {
        api.changePassword(ChangePasswordBody(current, next, confirm)).requireData("Gagal mengganti password")
    }

    suspend fun registerPushToken(token: String) {
        runCatching {
            api.registerDevice(
                RegisterDeviceBody(
                    token = token,
                    deviceId = Build.MODEL,
                    appVersion = BuildConfig.VERSION_NAME,
                ),
            )
        }
    }
}
