package id.go.kalsel.siperbun.penangkar.data.api

import id.go.kalsel.siperbun.penangkar.BuildConfig
import id.go.kalsel.siperbun.penangkar.data.session.SessionStore
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.JavaNetCookieJar
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.net.CookieManager
import java.net.CookiePolicy
import java.util.concurrent.TimeUnit

class ApiException(message: String) : Exception(message)

class ApiClient(private val session: SessionStore) {
    private val cookieManager = CookieManager().apply {
        setCookiePolicy(CookiePolicy.ACCEPT_ALL)
    }

    private val baseUrl: String
        get() = if (BuildConfig.DEBUG) BuildConfig.API_BASE_URL_DEBUG else BuildConfig.API_BASE_URL

    private val authInterceptor = Interceptor { chain ->
        val token = runBlocking { session.token() }
        val request = if (token.isNullOrBlank()) {
            chain.request()
        } else {
            chain.request().newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        }
        chain.proceed(request)
    }

    private val refreshInterceptor = Interceptor { chain ->
        val request = chain.request()
        val response = chain.proceed(request)
        val path = request.url.encodedPath
        if (response.code != 401 || path.contains("/auth/login") || path.contains("/auth/refresh")) {
            return@Interceptor response
        }
        response.close()
        val refreshed = runBlocking { refreshAccessToken() }
        if (refreshed.isNullOrBlank()) return@Interceptor chain.proceed(request)
        chain.proceed(
            request.newBuilder().header("Authorization", "Bearer $refreshed").build(),
        )
    }

    private val okHttp = OkHttpClient.Builder()
        .cookieJar(JavaNetCookieJar(cookieManager))
        .addInterceptor(authInterceptor)
        .addInterceptor(refreshInterceptor)
        .addInterceptor(
            HttpLoggingInterceptor().apply {
                level = if (BuildConfig.DEBUG) {
                    HttpLoggingInterceptor.Level.BASIC
                } else {
                    HttpLoggingInterceptor.Level.NONE
                }
            },
        )
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    val api: SiperbunApi = Retrofit.Builder()
        .baseUrl(baseUrl)
        .client(okHttp)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(SiperbunApi::class.java)

    private val refreshApi: SiperbunApi = Retrofit.Builder()
        .baseUrl(baseUrl)
        .client(
            OkHttpClient.Builder()
                .cookieJar(JavaNetCookieJar(cookieManager))
                .build(),
        )
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(SiperbunApi::class.java)

    @Synchronized
    private fun refreshAccessToken(): String? = runBlocking {
        runCatching {
            val res = refreshApi.refresh()
            val payload = res.data ?: return@runCatching null
            session.save(payload.accessToken, payload.user)
            payload.accessToken
        }.getOrNull()
    }
}

fun <T> ApiResponse<T>.requireData(fallback: String = "Terjadi kesalahan"): T {
    if (!success || data == null) throw ApiException(message ?: fallback)
    return data
}
