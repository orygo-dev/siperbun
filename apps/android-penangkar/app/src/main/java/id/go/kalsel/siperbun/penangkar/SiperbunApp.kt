package id.go.kalsel.siperbun.penangkar

import android.app.Application
import id.go.kalsel.siperbun.penangkar.data.SiperbunRepository
import id.go.kalsel.siperbun.penangkar.data.api.ApiClient
import id.go.kalsel.siperbun.penangkar.data.session.SessionStore

class SiperbunApp : Application() {
    lateinit var session: SessionStore
        private set
    lateinit var repository: SiperbunRepository
        private set

    override fun onCreate() {
        super.onCreate()
        session = SessionStore(this)
        repository = SiperbunRepository(ApiClient(session), session)
    }
}

val Application.siperbun: SiperbunApp
    get() = this as SiperbunApp
