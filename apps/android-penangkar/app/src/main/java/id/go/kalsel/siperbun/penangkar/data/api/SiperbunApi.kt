package id.go.kalsel.siperbun.penangkar.data.api

import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.HTTP
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

interface SiperbunApi {
    @POST("auth/login")
    suspend fun login(@Body body: LoginBody): ApiResponse<AuthPayload>

    @POST("auth/refresh")
    suspend fun refresh(): ApiResponse<AuthPayload>

    @POST("auth/logout")
    suspend fun logout(): ApiResponse<Any>

    @GET("auth/me")
    suspend fun me(): ApiResponse<AuthUser>

    @PATCH("auth/profile")
    suspend fun updateProfile(@Body body: UpdateProfileBody): ApiResponse<AuthUser>

    @POST("auth/change-password")
    suspend fun changePassword(@Body body: ChangePasswordBody): ApiResponse<Any>

    @GET("dashboard/summary")
    suspend fun dashboardSummary(): ApiResponse<DashboardSummary>

    @GET("dashboard/recent-applications")
    suspend fun recentApplications(): ApiResponse<List<RecentApplication>>

    @GET("dashboard/banners")
    suspend fun banners(@Query("placement") placement: String = "MOBILE"): ApiResponse<List<DashboardBanner>>

    @GET("certification-applications")
    suspend fun applications(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("search") search: String? = null,
        @Query("status") status: String? = null,
    ): ApiResponse<List<ApplicationItem>>

    @GET("certification-applications/{id}")
    suspend fun application(@Path("id") id: String): ApiResponse<ApplicationItem>

    @POST("certification-applications")
    suspend fun createApplication(@Body body: CreateApplicationBody): ApiResponse<ApplicationItem>

    @POST("certification-applications/{id}/submit")
    suspend fun submitApplication(@Path("id") id: String): ApiResponse<ApplicationItem>

    @Multipart
    @POST("certification-applications/{id}/payment-proof")
    suspend fun uploadPaymentProof(
        @Path("id") id: String,
        @Part file: MultipartBody.Part,
        @Part("notes") notes: RequestBody?,
    ): ApiResponse<ApplicationItem>

    @GET("production-batches")
    suspend fun productions(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): ApiResponse<List<ProductionItem>>

    @POST("production-batches")
    suspend fun createProduction(@Body body: CreateProductionBody): ApiResponse<ProductionItem>

    @GET("seed-distributions")
    suspend fun distributions(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): ApiResponse<List<DistributionItem>>

    @POST("seed-distributions")
    suspend fun createDistribution(@Body body: CreateDistributionBody): ApiResponse<DistributionItem>

    @GET("certificates")
    suspend fun certificates(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): ApiResponse<List<CertificateItem>>

    @GET("notifications")
    suspend fun notifications(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): ApiResponse<List<NotificationItem>>

    @POST("notifications/read-all")
    suspend fun markAllNotificationsRead(): ApiResponse<Any>

    @POST("notifications/devices")
    suspend fun registerDevice(@Body body: RegisterDeviceBody): ApiResponse<Any>

    @HTTP(method = "DELETE", path = "notifications/devices", hasBody = true)
    suspend fun unregisterDevice(@Body body: RegisterDeviceBody): Response<ApiResponse<Any>>

    @GET("public/commodities")
    suspend fun commodities(): ApiResponse<List<CommodityItem>>
}
