package id.go.kalsel.siperbun.penangkar.data.session

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import id.go.kalsel.siperbun.penangkar.data.api.AuthUser
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore("siperbun_session")

class SessionStore(private val context: Context, private val gson: Gson = Gson()) {
    private val tokenKey = stringPreferencesKey("access_token")
    private val userKey = stringPreferencesKey("user_json")

    val tokenFlow: Flow<String?> = context.dataStore.data.map { it[tokenKey] }
    val userFlow: Flow<AuthUser?> = context.dataStore.data.map { prefs ->
        prefs[userKey]?.let { runCatching { gson.fromJson(it, AuthUser::class.java) }.getOrNull() }
    }

    suspend fun token(): String? = context.dataStore.data.first()[tokenKey]

    suspend fun user(): AuthUser? = userFlow.first()

    suspend fun save(token: String, user: AuthUser) {
        context.dataStore.edit {
            it[tokenKey] = token
            it[userKey] = gson.toJson(user)
        }
    }

    suspend fun saveToken(token: String) {
        context.dataStore.edit { it[tokenKey] = token }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }
}
